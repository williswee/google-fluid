export const UNIT_GROUPS = {
  Length: ['km', 'm', 'cm', 'mi', 'ft', 'in'],
  Weight: ['kg', 'g', 'lb', 'oz'],
  Temperature: ['C', 'F', 'K'],
} as const;
export type Unit = typeof UNIT_GROUPS[keyof typeof UNIT_GROUPS][number];
export const UNIT_LABELS: Record<Unit, string> = { km: 'Kilometers', m: 'Meters', cm: 'Centimeters', mi: 'Miles', ft: 'Feet', in: 'Inches', kg: 'Kilograms', g: 'Grams', lb: 'Pounds', oz: 'Ounces', C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin' };
const aliases: Record<string, Unit> = { kilometer:'km',kilometers:'km',kilometre:'km',kilometres:'km',meter:'m',meters:'m',metres:'m',centimeter:'cm',centimeters:'cm',mile:'mi',miles:'mi',feet:'ft',foot:'ft',inch:'in',inches:'in',kilogram:'kg',kilograms:'kg',gram:'g',grams:'g',pound:'lb',pounds:'lb',lbs:'lb',ounce:'oz',ounces:'oz',celsius:'C',fahrenheit:'F',kelvin:'K',c:'C',f:'F',k:'K' };
export function unitGroup(unit: Unit) { return (Object.keys(UNIT_GROUPS) as (keyof typeof UNIT_GROUPS)[]).find(group => (UNIT_GROUPS[group] as readonly string[]).includes(unit))!; }
export function convertValue(value: number, from: Unit, to: Unit): number | null {
  if (!Number.isFinite(value) || unitGroup(from) !== unitGroup(to)) return null;
  if (unitGroup(from) === 'Temperature') {
    let c = from === 'F' ? (value - 32) * (5 / 9) : from === 'K' ? value - 273.15 : value;
    if (c < -273.15 - 1e-10) return null;
    c = Math.max(c, -273.15);
    const result = to === 'F' ? c * (9 / 5) + 32 : to === 'K' ? c + 273.15 : c;
    return Number.isFinite(result) ? result : null;
  }
  const factors: Partial<Record<Unit, number>> = { km:1000,m:1,cm:.01,mi:1609.344,ft:.3048,in:.0254,kg:1,g:.001,lb:.45359237,oz:.028349523125 };
  const result = value * (factors[from]! / factors[to]!);
  return Number.isFinite(result) ? result : null;
}
export function parseConversion(draft: string): { value: number; from: Unit; to: Unit } | null {
  const match = draft.match(/(?:^|\s)(-?\d+(?:\.\d+)?)\s*°?([a-z]+)\s+(?:into|in|to|as)\s+°?([a-z]+)\b/i);
  if (!match) return null;
  function unit(text: string): Unit | undefined { const key=text.toLowerCase(); return aliases[key] ?? (Object.keys(UNIT_LABELS).find(value=>value.toLowerCase()===key) as Unit | undefined); }
  const from=unit(match[2]),to=unit(match[3]),value=Number(match[1]);
  return from && to && convertValue(value,from,to)!==null ? {value,from,to} : null;
}
