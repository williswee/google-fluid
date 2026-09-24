import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { chromium, expect } from '@playwright/test';
import ffmpeg from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
const base = 'https://googlefluid.vercel.app';
const wait = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
const font = '/System/Library/Fonts/Supplemental/Arial.ttf';
const playbackRate = 1.3;
const footageDuration = 27.5;
const captureDuration = footageDuration * playbackRate;
const outputStem = 'google-fluid-demo-30s-v3';
const endCopy = 'Fluid search that changes shape :)';
const cues = [
  [0, 4.3, 'Start with a trip.'],
  [4.3, 8.05, 'Then find somewhere to stay.'],
  [8.05, 12.15, 'A different view.'],
  [12.15, 16.75, 'A new day.'],
  [16.75, 20.6, 'A word worth knowing.'],
  [20.6, 27.5, 'And a little time to play.'],
];
// Camera timing is in finished-video seconds; actions below use real capture time.
const camera = [
  [0, 1.12, 470], [0.75, 1.12, 470], [1.6, 1.65, 440],
  [2.65, 1.30, 638], [4.3, 1.30, 638], [5.1, 1.4, 610],
  [6.3, 1.24, 640], [8.05, 1.24, 640], [9.8, 1.45, 599],
  [12.15, 1.45, 599], [14.25, 1.8, 550], [15.3, 1.8, 550],
  [16.75, 1.8, 550], [18.5, 1.9, 540], [20.6, 1.9, 540],
  [22.5, 1.55, 590], [26.5, 1.55, 590], [27.3, 1.12, 470], [30, 1.12, 470],
];
function run(args, logLevel = 'error') {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', logLevel, ...args]);
    let output = '';
    child.stderr.on('data', chunk => output = (output + chunk).slice(-24000));
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(output)));
  });
}
function expression(index) {
  let expr = String(camera.at(-1)[index]);
  for (let i = camera.length - 2; i >= 0; i--) {
    const a = camera[i], b = camera[i + 1];
    const mix = `(${a[index]}+(${b[index]-a[index]})*(1-cos(PI*(on/30-${a[0]})/${b[0]-a[0]}))/2)`;
    expr = `if(lt(on/30,${b[0]}),${mix},${expr})`;
  }
  return expr;
}
function stamp(seconds) {
  return `00:00:${seconds.toFixed(3).padStart(6, '0')}`;
}
async function render(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.version !== 2) throw new Error('This edit requires a v2 take with the revised six-search sequence.');
  const scan = await run(['-i', manifest.rawVideo, '-vf', 'blackdetect=d=0.15:pix_th=0.02', '-an', '-f', 'null', '-'], 'info');
  const markers = [...scan.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)];
  if (!markers.length) throw new Error('Start marker missing; refusing an unaligned edit.');
  const start = Number(markers.at(-1)[2]);
  const filter = [
    `trim=start=${start}:duration=${captureDuration},setpts=(PTS-STARTPTS)/${playbackRate},fps=30,tpad=stop_mode=clone:stop_duration=3,trim=duration=30`,
    `zoompan=z='${expression(1)}':x='iw/2-iw/zoom/2':y='max(0,min(ih-ih/zoom,${expression(2)}-ih/zoom/2))':d=1:s=1920x1080:fps=30`,
  ];
  // A dedicated caption band keeps text clear of the logo during camera moves.
  filter.push('drawbox=x=0:y=0:w=iw:h=112:color=white:t=fill');
  for (const [i, cue] of cues.entries()) {
    const textfile = path.join(path.dirname(manifestPath), `caption-${i}.txt`);
    await writeFile(textfile, cue[2]);
    filter.push(`drawtext=fontfile='${font}':textfile='${textfile}':fontsize=34:fontcolor=0x202124:x=(w-tw)/2:y=40:enable='between(t,${cue[0]},${cue[1]})':alpha='min(1,(t-${cue[0]})/0.18)'`);
  }
  // Freeze the final recorded frame beneath the closing editorial overlay.
  filter.push(`drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='gte(t,${footageDuration})'`);
  const endFile = path.join(path.dirname(manifestPath), 'end.txt');
  await writeFile(endFile, endCopy);
  filter.push(`drawtext=fontfile='${font}':textfile='${endFile}':fontsize=58:fontcolor=0x202124:x=(w-tw)/2:y=(h-th)/2:enable='gte(t,${footageDuration})':alpha='min(1,(t-${footageDuration})/0.25)'`);
  const filterFile = path.join(path.dirname(manifestPath), 'edit.ffmpeg');
  await writeFile(filterFile, filter.join(','));
  const output = path.join(artifacts, `${outputStem}.mp4`);
  await run(['-y', '-i', manifest.rawVideo, '-filter_script:v', filterFile, '-t', '30', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
  const metadata = await run(['-i', output, '-f', 'null', '-'], 'info');
  if (!/Duration: 00:00:30\.00/.test(metadata) || !/Video: h264[^\n]*1920x1080/.test(metadata)) throw new Error('Final MP4 did not verify as 30 seconds, 1920×1080 H.264.');
  await run(['-y', '-ss', '11', '-i', output, '-frames:v', '1', path.join(artifacts, `${outputStem}-poster.png`)]);
  await run(['-y', '-i', output, '-vf', 'fps=1/2,scale=480:-1,tile=3x5', '-frames:v', '1', path.join(artifacts, `${outputStem}-contact.png`)]);
  const allCues = [...cues, [footageDuration, 30, endCopy]];
  await writeFile(path.join(artifacts, `${outputStem}.vtt`), 'WEBVTT\n\n' + allCues.map(([a,b,text])=>`${stamp(a)} --> ${stamp(b)}\n${text}`).join('\n\n') + '\n');
  await writeFile(path.join(artifacts, `${outputStem}.json`), JSON.stringify({...manifest, output, duration:30, width:1920, height:1080, fps:30, playbackRate, playbackLabel:false, capture:manifest.capture.replace('with an on-screen playback label', 'without a playback label'), captureDuration, trimStart:start, camera, captions:allCues, verified:true}, null, 2)+'\n');
  console.log(`Verified: ${output}`);
}
async function record() {
  const status = await fetch(`${base}/api/status`).then(r=>r.json());
  if (!status.liveAvailable) throw new Error('Live Jev is unavailable; recording stopped.');
  const take = path.join(artifacts, 'recordings', `search-v2-${new Date().toISOString().replace(/[:.]/g,'-')}`);
  await mkdir(take, {recursive:true});
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  const context = await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:take,size:{width:1920,height:1080}}});
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const video = page.video();
  const decisions = [], errors = [];
  const recordedAt = new Date().toISOString();
  const requests = new Map();
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>{if(new URL(r.url()).pathname==='/api/intent') requests.set(r,performance.now());});
  page.on('response', async r=>{
    if(new URL(r.url()).pathname!=='/api/intent') return;
    if(!r.ok()) errors.push(`Intent HTTP ${r.status()}`);
  });
  let start;
  const elapsed=()=> (performance.now()-start)/1000;
  async function at(time) {
    if(elapsed()>time+0.3) throw new Error(`Take exceeded capture timing at ${time}s.`);
    await wait((time-elapsed())*1000);
  }
  async function moveTo(locator) {
    const box=await locator.boundingBox();
    if(!box) throw new Error('Missing interaction target');
    await page.mouse.move(box.x+box.width/2, box.y+box.height/2,{steps:12});
  }
  async function click(locator) { await moveTo(locator); await locator.click(); }
  const input=page.getByRole('combobox',{name:'Search query'});
  async function live(draft,mode) {
    const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intent' && r.request().postDataJSON()?.draft===draft,{timeout:7000});
    // Handle rejection immediately if a preceding interaction fails.
    const outcome=responsePromise.then(r=>({r}),error=>({error}));
    await click(input);
    await input.press('Meta+A');
    await input.pressSequentially(draft,{delay:36});
    const {r,error}=await outcome;
    if(error) throw error;
    const data=await r.json();
    if(!r.ok() || data.source!=='live' || data.mode!==mode) throw new Error(`Live route failed: ${mode}; got ${data.mode ?? r.status()}`);
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-mode',mode);
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-pending','false');
    await expect(page.locator('.decision-source')).toContainText('Jev');
    decisions.push({mode,source:data.source,model:data.model,serverLatencyMs:data.latencyMs,requestToConfirmedUiMs:Math.round(performance.now()-requests.get(r.request())),atSeconds:elapsed()});
    console.log(`Live ${mode} settled at ${elapsed().toFixed(2)}s`);
  }
  try {
    await page.goto(base,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('#privacy-note')).toContainText('Your search is sent to TypeSafe');
    // A visible pointer and a removable alignment marker only; no app state, routing or response modification.
    await page.evaluate(()=>{
      const pointer=document.createElement('div'); pointer.id='film-pointer';
      pointer.innerHTML='<svg width="24" height="30" viewBox="0 0 24 30"><path d="M2 2v22l6-5 5 9 4-2-5-9h9Z" fill="#202124" stroke="white" stroke-width="1.6"/></svg>';
      Object.assign(pointer.style,{position:'fixed',left:'1480px',top:'500px',pointerEvents:'none',zIndex:'999999',filter:'drop-shadow(0 2px 3px #0002)'});
      document.body.append(pointer);
      document.addEventListener('mousemove',e=>{pointer.style.left=e.clientX+'px';pointer.style.top=e.clientY+'px';});
      document.addEventListener('mousedown',e=>{const dot=document.createElement('div'); Object.assign(dot.style,{position:'fixed',left:(e.clientX-18)+'px',top:(e.clientY-18)+'px',width:'36px',height:'36px',border:'2px solid #4285f4',borderRadius:'50%',pointerEvents:'none',zIndex:'999998'}); document.body.append(dot); dot.animate([{transform:'scale(.4)',opacity:.7},{transform:'scale(1.5)',opacity:0}],{duration:400}).finished.then(()=>dot.remove());});
      const marker=document.createElement('div');marker.id='film-start';Object.assign(marker.style,{position:'fixed',inset:'0',background:'#000',zIndex:'1000000'});document.body.append(marker);
    });
    await wait(400);
    await page.locator('#film-start').evaluate(e=>e.remove());
    start=performance.now();
    await at(1);
    await live('flights from Singapore to Tokyo','flights');
    await at(4.4);
    await click(page.getByRole('button',{name:'One way',exact:true}));
    await at(5.6);
    await live('hotels in Tokyo for 2 guests','hotels');
    await at(8.9);
    await click(page.getByRole('button',{name:'Pool',exact:true}));
    await at(10.5);
    await live('images of the earth','images');
    await expect(page.locator('.dt-photo-frame img')).toBeVisible();
    await page.waitForFunction(()=>{const img=document.querySelector('.dt-photo-frame img');return img?.complete && img.naturalWidth>0;});
    await page.mouse.move(1370,900,{steps:12});
    await at(15.8);
    await live('sunrise in Singapore tomorrow','weather');
    await expect(page.locator('.knowledge-weather .forecast-facts')).toBeVisible();
    await expect(page.getByRole('button',{name:/Tomorrow/})).toHaveAttribute('aria-pressed','true');
    await moveTo(page.locator('.forecast-facts span').nth(1));
    await at(21.8);
    await live('what does serendipity mean','define');
    await expect(page.locator('.knowledge-dictionary h2')).toHaveText('serendipity');
    await page.mouse.move(1370,780,{steps:12});
    await at(26.8);
    await live('play the dinosaur game','dino');
    await at(29.6);
    await click(page.getByRole('button',{name:'Start game',exact:true}));
    await page.mouse.move(1400,720,{steps:10});
    // Actual keyboard gameplay: jump when the visible cactus approaches the player.
    await at(30.5);
    await page.keyboard.press('Space');
    await expect(page.locator('.dino-player')).toHaveAttribute('data-grounded','false');
    let jumps=1;
    while(elapsed()<35.3){
      const state=await page.evaluate(()=>{
        const player=document.querySelector('.dino-player');
        const obstacles=[...document.querySelectorAll('.dino-cactus')].map(e=>Number(e.getAttribute('transform')?.match(/translate\(([-\d.]+)/)?.[1]));
        return {grounded:player?.getAttribute('data-grounded')==='true',nearest:Math.min(...obstacles.filter(x=>x>30)),phase:document.querySelector('.dino-game')?.getAttribute('data-state')};
      });
      if(state.phase==='crashed') throw new Error('Dinosaur crashed before the closing shot.');
      if(state.grounded && state.nearest<130){await page.keyboard.press('Space');jumps++;}
      await wait(25);
    }
    if(!jumps) throw new Error('No playable dinosaur jump was captured.');
    await at(captureDuration);
    await wait(250);
    if(errors.length) throw new Error(errors.join('; '));
    const manifest={version:2,recordedAt:new Date().toISOString(),baseUrl:base,decisions,paidRequests:requests.size,jumps,errors,capture:'Actual live browser captured continuously at 1×, then played at the requested 1.3× speed without a playback label. All six routes use real Jev responses. Editorial camera crops, visible pointer, captions and end card. No mocked/replayed responses or modified application state.',rawVideo:await video.path()};
    await writeFile(path.join(take,'take.json'),JSON.stringify(manifest,null,2));
  } catch (error) {
    errors.push(error.message);
    throw error;
  } finally {
    await context.close();await browser.close();
    await writeFile(path.join(take, 'capture-log.json'), JSON.stringify({recordedAt,baseUrl:base,decisions,paidRequests:requests.size,errors,rawVideo:await video.path()},null,2));
  }
  await render(path.join(take,'take.json'));
}
if(process.argv.includes('--help')) console.log('Record: node scripts/record-search-demo.mjs\nRe-edit existing take without inference: node scripts/record-search-demo.mjs --render /absolute/path/take.json\nRequires ffmpeg-static, Playwright, and Arial.ttf on macOS. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if needed.');
else (process.argv[2]==='--render' ? render(process.argv[3]) : record()).catch(e=>{console.error(e.message);process.exitCode=1;});
