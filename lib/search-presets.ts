import type { ModeId } from './intent';

export const SEARCH_MODES: Record<ModeId, { label: string; hint: string; example: string }> = {
  flights: { label: 'Flights', hint: 'Your next departure.', example: 'flights from Singapore to Tokyo' },
  hotels: { label: 'Hotels', hint: 'Find a place to settle in.', example: 'hotels in Tokyo for 2 guests' },
  video: { label: 'Videos', hint: 'Find something worth watching.', example: 'videos about the northern lights' },
  shopping: { label: 'Shopping', hint: 'Find the right fit.', example: 'noise cancelling headphones under $200' },
  images: { label: 'Images', hint: 'A little visual inspiration.', example: 'images of Earth from space' },
  general: { label: 'Search', hint: 'A little curiosity goes a long way.', example: 'why do cats purr' },
  weather: { label: 'Weather', hint: 'A forecast, shaped around your plans.', example: 'will I need an umbrella in Tokyo tomorrow' },
  finance: { label: 'Finance', hint: 'Follow the company. Find the context.', example: 'AAPL stock performance' },
  places: { label: 'Maps', hint: 'Somewhere worth going.', example: 'quiet cafes in Singapore' },
  movies: { label: 'Movies', hint: 'Find your next watch.', example: 'Dune Part Two' },
  convert: { label: 'Convert', hint: 'A different unit. The same idea.', example: '10 km in miles' },
  define: { label: 'Dictionary', hint: 'Find just the right meaning.', example: 'what does serendipity mean' },
  documents: { label: 'Documents', hint: 'The right information. In the right format.', example: 'climate change report filetype:pdf' },
  site: { label: 'Website', hint: 'One corner of the web.', example: 'design systems site:github.com' },
  news: { label: 'News', hint: 'Catch up on what is happening.', example: 'latest news about reusable rockets' },
  date: { label: 'Date range', hint: 'Put a little time around your search.', example: 'solar energy after:2024-01-01 before:2025-01-01' },
  precise: { label: 'Fine-tune', hint: 'A few details make all the difference.', example: '"jaguar speed" -car' },
  calculate: { label: 'Calculator', hint: 'A little less mental maths.', example: '24 * 18 + 6' },
  timer: { label: 'Timer', hint: 'Make a little time.', example: 'set a timer for 5 minutes' },
  stopwatch: { label: 'Stopwatch', hint: 'See how long it takes.', example: 'start a stopwatch' },
  metronome: { label: 'Metronome', hint: 'Find your rhythm.', example: 'metronome at 80 bpm' },
  color: { label: 'Color picker', hint: 'Find your shade.', example: 'color picker #4285f4' },
  compare: { label: 'Compare', hint: 'See both sides.', example: 'Earth vs Mars' },
  science: { label: 'Orbit lab', hint: 'A little space to experiment.', example: 'show me how gravity affects an orbit' },
  game: { label: 'Tic-tac-toe', hint: 'Your move.', example: 'play tic-tac-toe' },
  dino: { label: 'Dinosaur run', hint: 'One more jump.', example: 'play the dinosaur game' },
  play: { label: 'Easter eggs', hint: 'A small surprise.', example: 'do a barrel roll' },
};

export const EXAMPLES: ModeId[] = ['flights','hotels','shopping','images','video','calculate','timer','convert','weather','color','stopwatch','metronome','define','movies','compare','science','game','dino','play','places','finance','documents','site','news','date','precise','general'];

export type SearchExample = { id: string; mode: ModeId; query: string; title?: string };
const alternatives: Partial<Record<ModeId, string>> = {
  flights: 'one way flights from London to New York',
  hotels: 'hotels in Singapore with a pool',
  video: 'short videos about sourdough bread',
  shopping: 'running shoes under $150',
  images: 'images of the Moon',
  finance: 'compound interest on $1000 over 10 years',
  news: 'latest technology news',
  places: 'parks in Tokyo',
  convert: '100 USD to EUR',
  calculate: 'split $84 between 3 people with a 15% tip',
  weather: 'sunrise in Singapore tomorrow',
  color: 'color picker coral',
  movies: 'Interstellar',
  define: 'define:ephemeral',
  play: 'askew',
  dino: '404 dinosaur game',
};
const exampleTitles: Partial<Record<ModeId, [string, string]>> = {
  flights: ['Round-trip flights', 'One-way flights'],
  hotels: ['City stays', 'Hotels with a pool'],
  shopping: ['Headphone finder', 'Running shoe finder'],
  images: ['Earth imagery', 'Moon imagery'],
  video: ['Nature videos', 'Cooking videos'],
  finance: ['Stock explorer', 'Compound growth'],
  news: ['Space news', 'Technology news'],
  places: ['Nearby cafes', 'City parks'],
  calculate: ['Calculator', 'Tip & bill split'],
  convert: ['Unit converter', 'Currency converter'],
  weather: ['Weather forecast', 'Sunrise & sunset'],
  color: ['Hex color picker', 'Named color picker'],
  define: ['Define serendipity', 'Define ephemeral'],
  movies: ['Dune: Part Two', 'Interstellar'],
  dino: ['Dinosaur runner', '404 Easter egg'],
  play: ['Barrel roll', 'Tilt the page'],
};
export const SEARCH_EXAMPLES: SearchExample[] = EXAMPLES.flatMap(mode => [
  { id: mode, mode, query: SEARCH_MODES[mode].example, title: exampleTitles[mode]?.[0] ?? SEARCH_MODES[mode].label },
  ...(alternatives[mode] ? [{ id: `${mode}-2`, mode, query: alternatives[mode]!, title: exampleTitles[mode]?.[1] ?? SEARCH_MODES[mode].label }] : []),
]);
export function filterExamples(filter: string): SearchExample[] {
  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SEARCH_EXAMPLES.filter(item => words.every(word =>
    `${SEARCH_MODES[item.mode].label} ${item.title ?? ''} ${item.query}`.toLowerCase().includes(word)));
}
