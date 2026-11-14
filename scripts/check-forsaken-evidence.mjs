import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { runCalibration } from './forsaken-calibration.mjs';
const recorded=JSON.parse(readFileSync(new URL('../docs/benchmarks/forsaken-calibration.json',import.meta.url),'utf8'));
const measured=runCalibration();
if(!isDeepStrictEqual(recorded,measured)){
  const index=measured.rows.findIndex((row,i)=>!isDeepStrictEqual(row,recorded.rows?.[i]));
  console.error('Recorded Forsaken evidence differs from the production engine'+(index<0?' metadata.':': level '+measured.rows[index].level+' / '+measured.rows[index].variant));
  process.exitCode=1;
}else console.log('All 175 recorded Forsaken battle rows match a fresh production-engine run.');
