import sharp from 'sharp';
import { baseRates, finishMultiplier, Difficulty } from './pricing';
import type { EstimateInputType } from './schema';

type PhotoStat = {
  w: number; h: number;
  brightness: number;
  contrast: number;
  saturation: number;
  edgeDensity: number;
  lineStrengthV: number;
  lineStrengthH: number;
  openingPct: number;
  perPhotoAreaSqft: number;
};

const RESIZE_WIDTH = 768;
const TILE = 32;
const EDGE_THRESH = 52;
const PER_PHOTO_WIDTH_FT = 10;
const FOV_SCALE = 0.72;

export async function estimateFromPhotos(
  files: Buffer[],
  input: EstimateInputType
) {
  const stats: PhotoStat[] = [];
  for (const f of files) stats.push(await analyzeBuffer(f, input.heightFt));

  const adjAreas = stats.map(s => s.perPhotoAreaSqft * (1 - s.openingPct));
  const keepMask = rejectOutliersMask(adjAreas);
  const kept = stats.filter((_,i)=>keepMask[i]);

  const difficulty = classifyDifficulty(kept);
  const sqft = estimateSqft(kept);

  const finishMul = finishMultiplier(input.finish);
  const rates = baseRates(difficulty);

  const labor = sqft * rates.laborSqft * finishMul * (1 + 0.15*(input.coats-1));
  const materials = sqft * rates.materialsSqftPerCoat * input.coats * finishMul;
  const prep = sqft * rates.prepFactor * prepBump(kept);

  const subtotal = round2(labor + materials + prep);

  const dispersion = pStd(adjAreas.filter((_,i)=>keepMask[i])) / Math.max(1, pMean(adjAreas.filter((_,i)=>keepMask[i])));
  const baseUnc = clamp(0.08 + dispersion * 0.6, 0.08, 0.22);
  const diffUnc = difficulty === 'high' ? 0.08 : difficulty === 'medium' ? 0.05 : 0.03;
  const unc = clamp(baseUnc + diffUnc, 0.12, 0.30);

  const low = round2(subtotal * (1 - unc));
  const high = round2(subtotal * (1 + unc));

  const notes = [
    `Photos analyzed: ${files.length} (used ${kept.length}; dropped ${files.length-kept.length} outlier${files.length-kept.length===1?'':'s'}).`,
    `Inferred difficulty: ${difficulty} (edges/contrast/saturation).`,
    `Openings/fixtures deducted automatically (est. ${(100*avg(kept.map(k=>k.openingPct))).toFixed(0)}% of surfaces).`,
    `Ballpark only; on-site prep/access/special coatings can adjust.`
  ];

  return {
    subtotal,
    rangeLow: low,
    rangeHigh: high,
    labor: round2(labor),
    materials: round2(materials),
    prep: round2(prep),
    difficulty,
    sqft,
    notes
  };
}

async function analyzeBuffer(buf: Buffer, heightFt: number): Promise<PhotoStat> {
  const { data, info } = await sharp(buf)
    .resize({ width: RESIZE_WIDTH, withoutEnlargement: true })
    .toColorspace('rgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width, h = info.height;
  const N = w*h;
  const gray = new Uint8Array(N);

  let sum=0, sumsq=0, satSum=0;
  for (let i=0, p=0; i<N; i++, p+=3) {
    const r = data[p], g = data[p+1], b = data[p+2];
    const y = (0.299*r + 0.587*g + 0.114*b) | 0;
    gray[i] = y;
    sum += y; sumsq += y*y;

    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const sat = max === 0 ? 0 : (max - min)/max;
    satSum += sat;
  }
  const mean = sum / N;
  const variance = sumsq / N - mean*mean;
  const std = Math.sqrt(Math.max(0, variance));
  const avgSat = satSum / N;

  let edgeCount = 0, accDx=0, accDy=0;
  const edgeMask = new Uint8Array(N);

  for (let y=1; y<h-1; y++) {
    for (let x=1; x<w-1; x++) {
      const i = y*w + x;

      const g00=gray[(y-1)*w + (x-1)], g01=gray[(y-1)*w + x], g02=gray[(y-1)*w + (x+1)];
      const g10=gray[y*w + (x-1)],   g11=gray[i],      g12=gray[y*w + (x+1)];
      const g20=gray[(y+1)*w + (x-1)], g21=gray[(y+1)*w + x], g22=gray[(y+1)*w + (x+1)];

      const dx = (g02 + 2*g12 + g22) - (g00 + 2*g10 + g20);
      const dy = (g20 + 2*g21 + g22) - (g00 + 2*g01 + g02);
      const mag = Math.abs(dx) + Math.abs(dy);

      if (mag > EDGE_THRESH) {
        edgeMask[i] = 1;
        edgeCount++;
        accDx += Math.abs(dx);
        accDy += Math.abs(dy);
      }
    }
  }

  const edgeDensity = edgeCount / N;
  const lineStrengthV = accDy / Math.max(1, accDx + accDy);
  const lineStrengthH = accDx / Math.max(1, accDx + accDy);

  const rectScore = rectangleScore(edgeMask, w, h);
  const openingPct = clamp(0.05*rectScore + (lineStrengthV > 0.64 ? 0.12 : 0), 0, 0.35);

  const perPhotoAreaSqft = PER_PHOTO_WIDTH_FT * heightFt * FOV_SCALE;

  return { w,h, brightness:mean, contrast:std, saturation:avgSat, edgeDensity, lineStrengthV, lineStrengthH, openingPct, perPhotoAreaSqft };
}

function rectangleScore(edgeMask: Uint8Array, w: number, h: number) {
  const stepY = TILE, stepX = TILE;
  let score = 0;
  for (let y=0; y<=h-TILE; y+=stepY) {
    for (let x=0; x<=w-TILE; x+=stepX) {
      let border=0, interior=0, bcount=0, icount=0;
      for (let yy=0; yy<TILE; yy++) for (let xx=0; xx<TILE; xx++) {
        const i = (y+yy)*w + (x+xx);
        const isBorder = (yy<2 || yy>TILE-3 || xx<2 || xx>TILE-3);
        if (isBorder) { border += edgeMask[i]; bcount++; }
        else { interior += edgeMask[i]; icount++; }
      }
      const bd = border / Math.max(1,bcount);
      const id = interior / Math.max(1,icount);
      if (bd > 0.18 && id < 0.06) score += 1;
    }
  }
  return Math.min(6, Math.round(score / 6));
}

function classifyDifficulty(stats: PhotoStat[]): Difficulty {
  if (stats.length === 0) return 'medium';
  const ed = avg(stats.map(s=>s.edgeDensity));
  const ct = avg(stats.map(s=>s.contrast));
  const sat = avg(stats.map(s=>s.saturation));
  if (ed > 0.26 || ct > 28 || sat > 0.34) return 'high';
  if (ed > 0.16 || ct > 18 || sat > 0.22) return 'medium';
  return 'low';
}
function prepBump(stats: PhotoStat[]) {
  if (stats.length === 0) return 1.0;
  const sat = avg(stats.map(s=>s.saturation));
  const ct = avg(stats.map(s=>s.contrast));
  const bump = (sat>0.34?0.15: sat>0.22?0.08:0) + (ct>26?0.06: ct>18?0.03:0);
  return 1 + bump;
}
function estimateSqft(stats: PhotoStat[]) {
  if (stats.length === 0) return 120;
  const per = stats.map(s => s.perPhotoAreaSqft * (1 - s.openingPct));
  return clamp(avg(per) * stats.length, 60, 1600);
}
function rejectOutliersMask(values: number[]) {
  if (values.length <= 2) return values.map(()=>true);
  const sorted = [...values].sort((a,b)=>a-b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5*iqr, hi = q3 + 1.5*iqr;
  return values.map(v => v >= lo && v <= hi);
}
function quantile(sorted: number[], q: number) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return sorted[base+1] !== undefined ? sorted[base] + rest * (sorted[base+1]-sorted[base]) : sorted[base];
}
function pMean(a:number[]){ return a.reduce((x,y)=>x+y,0)/a.length; }
function pStd(a:number[]){ const m=pMean(a); return Math.sqrt(pMean(a.map(v=>(v-m)*(v-m)))); }
function avg(a:number[]){ return a.reduce((x,y)=>x+y,0)/Math.max(1,a.length); }
function round2(n:number){ return Math.round(n*100)/100; }
function clamp(n:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, n)); }
