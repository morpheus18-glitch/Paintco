import sharp from 'sharp';
import { baseRates, finishMultiplier, Difficulty } from './pricing';
import type { EstimateInputType } from './schema';

/**
 * Lightweight heuristic “vision”:
 * - Downscale to 640px width for speed.
 * - Compute grayscale contrast (std dev) and edge proxy via Laplacian kernel.
 * - Use brightness/edge density as proxy for clutter/trim/windows => difficulty.
 * - Estimate paintable area by rough framing: assume the primary wall spans ~70% of width x provided height,
 *   scaled by the number of photos and penalized by detected openings (edge bursts).
 * This is intentionally conservative; it’s a ballpark, not a contract.
 */

export type PhotoStat = {
  width: number; height: number;
  brightness: number; // 0..255
  contrast: number;   // relative
  edgeDensity: number; // 0..1
};

async function analyzeBuffer(buf: Buffer): Promise<PhotoStat> {
  const img = sharp(buf).resize({ width: 640, withoutEnlargement: true }).grayscale();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const n = data.length;
  // brightness (mean) & contrast (stddev)
  let sum = 0; for (let i=0;i<n;i++) sum += data[i];
  const mean = sum / n;
  let varSum = 0; for (let i=0;i<n;i++) { const d = data[i]-mean; varSum += d*d; }
  const std = Math.sqrt(varSum / n);

  // very rough edge proxy: sample every 2nd pixel with abs diff to right/bottom
  let edges = 0, samples = 0;
  for (let y=0; y<info.height-1; y+=2) {
    for (let x=0; x<info.width-1; x+=2) {
      const idx = y*info.width + x;
      const dx = Math.abs(data[idx] - data[idx+1]);
      const dy = Math.abs(data[idx] - data[idx+info.width]);
      edges += (dx+dy);
      samples += 2;
    }
  }
  const edgeDensity = Math.min(1, edges/(samples*64)); // normalize

  return {
    width: info.width,
    height: info.height,
    brightness: mean,
    contrast: std,
    edgeDensity
  };
}

function classifyDifficulty(stats: PhotoStat[]): Difficulty {
  const avgEdge = stats.reduce((a,s)=>a+s.edgeDensity,0)/stats.length;
  const avgContrast = stats.reduce((a,s)=>a+s.contrast,0)/stats.length;

  // Simple rules of thumb:
  // more edges/contrast => more trim/fixtures/windows => higher difficulty.
  if (avgEdge > 0.28 || avgContrast > 28) return 'high';
  if (avgEdge > 0.18 || avgContrast > 18) return 'medium';
  return 'low';
}

function estimateAreaSqft(stats: PhotoStat[], heightFt: number) {
  // Assume each photo frames a ~single wall span occupying ~70% of horizontal FOV.
  // Map pixel width to linear feet scale proxy via a nominal camera FOV factor (very rough).
  // To stay conservative and avoid overestimates, clamp contribution.
  const PER_PHOTO_WIDTH_FT = 10; // heuristic span representation
  const FOV_SCALE = 0.7; // ~70% of span is paintable surface visible
  const perPhotoArea = PER_PHOTO_WIDTH_FT * heightFt * FOV_SCALE; // ft^2 per photo
  let area = perPhotoArea * stats.length;

  // Penalize openings based on edge bursts
  const avgEdge = stats.reduce((a,s)=>a+s.edgeDensity,0)/stats.length;
  if (avgEdge > 0.25) area *= 0.82;
  else if (avgEdge > 0.15) area *= 0.9;

  // Keep within sane band
  return Math.max(60, Math.min(area, 1200));
}

export async function estimateFromPhotos(
  files: Buffer[],
  input: EstimateInputType
) {
  const stats: PhotoStat[] = [];
  for (const f of files) stats.push(await analyzeBuffer(f));

  const diff = classifyDifficulty(stats);
  const sqft = estimateAreaSqft(stats, input.heightFt);
  const rates = baseRates(diff);
  const finishMul = finishMultiplier(input.finish);

  const labor = sqft * rates.laborSqft * finishMul * (1 + 0.15*(input.coats-1));
  const materials = sqft * rates.materialsSqftPerCoat * input.coats * finishMul;
  const prep = sqft * rates.prepFactor;

  const subtotal = round2(labor + materials + prep);

  const notes = [
    `Assumed average height ${input.heightFt} ft; ${input.coats} coat(s); ${input.finish} finish.`,
    `Difficulty inferred from photo texture/edges: ${diff}.`,
    `Area heuristics are conservative; site visit can reduce price if surfaces are simpler.`,
    `Price excludes major drywall repairs and specialty coatings (stain-blocking, cabinet enamel, etc.).`
  ];

  return { subtotal, labor: round2(labor), materials: round2(materials), prep: round2(prep), difficulty: diff, sqft, notes };
}

function round2(n:number){ return Math.round(n*100)/100; }
