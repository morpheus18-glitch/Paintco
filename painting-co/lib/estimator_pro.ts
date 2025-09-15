import type { EstimateInputType } from './schema';
import { estimateFromPhotos as wallsHeuristic } from './estimator';
import { detectProjectType } from './detect_type';
import { priceByType } from './costing_models';
import { inferFeatures } from './features';

type ProEstimate = {
  subtotal: number;
  total: number;
  rangeLow: number;
  rangeHigh: number;
  labor: number;
  materials: number;
  prep: number;
  difficulty: 'low'|'medium'|'high';
  sqft: number;
  notes: string[];
  crew: { people:number; days:number; hoursTotal:number; productivitySqftHr:number; };
  materialsDetail?: { gallons:number; unitCost:number; wastePct:number; };
  lineItems: { label:string; amount:number; }[];
  detected: { type: string; confidence: number; complexity: string };
};

export async function estimatePro(files: Buffer[], input: EstimateInputType & {
  distanceMiles?: number;
  preferredDays?: number;
  rush?: boolean;
  weekend?: boolean;
}): Promise<ProEstimate> {

  const [detected, walls, feats] = await Promise.all([
    detectProjectType(files),
    wallsHeuristic(files, input),
    inferFeatures(files)
  ]);

  const priced = priceByType(detected.type, {
    filesCount: files.length,
    inferredSqftFromWalls: detected.type === 'interior_walls' ? walls.sqft : undefined,
    coats: input.coats,
    finish: input.finish,
    difficulty: walls.difficulty,
    distanceMiles: input.distanceMiles ?? 0,
    rush: input.rush,
    weekend: input.weekend,
    preferredDays: input.preferredDays,
    complexity: detected.complexity,
    __ctx: {
      interior: feats.interior,
      trim: feats.trimDensity,
      heightFt: feats.estHeightFt ?? undefined,
      drywall: feats.drywallRepair
    }
  });

  const typeUnc = detected.type === 'interior_walls' ? 0.10 : detected.type === 'custom_shoes' ? 0.20 : 0.18;
  const diffAdj = walls.difficulty === 'high' ? 0.06 : walls.difficulty === 'medium' ? 0.04 : 0.02;
  const unc = Math.min(0.35, typeUnc + diffAdj);
  const low = round2(priced.total * (1 - unc));
  const high = round2(priced.total * (1 + unc));

  const lineItems = [
    { label: 'Labor (crew time)', amount: priced.baseLabor },
    { label: 'Materials', amount: priced.materials.subtotal },
    { label: 'Consumables', amount: priced.consumables.subtotal },
    { label: 'Mobilization', amount: priced.mobilization.subtotal },
    { label: 'Travel', amount: priced.travel.subtotal },
    { label: `Overhead (${Math.round(priced.overhead.pct*100)}%)`, amount: priced.overhead.subtotal },
    { label: `Margin (${Math.round(priced.margin.pct*100)}%)`, amount: priced.margin.subtotal },
  ];

  const notes = [
    `Detected project: ${detected.type.replace('_',' ')} (conf ${Math.round(detected.confidence*100)}%).`,
    feats.interior ? 'Interior' : 'Exterior',
    `Trim: ${feats.trimDensity}`,
    feats.estHeightFt ? `Estimated height ≈ ${feats.estHeightFt} ft` : '',
    `Drywall repair: ${feats.drywallRepair}`,
    ...(detected.type === 'interior_walls' ? walls.notes : []),
    detected.type !== 'interior_walls' ? 'Scope from photo count; verified on walkthrough.' : ''
  ].filter(Boolean);

  return {
    subtotal: priced.subtotal,
    total: priced.total,
    rangeLow: low,
    rangeHigh: high,
    labor: priced.baseLabor,
    materials: priced.materials.subtotal,
    prep: priced.overhead.subtotal,
    difficulty: walls.difficulty,
    sqft: detected.type === 'interior_walls' ? walls.sqft : Math.round(estimatePseudoSqft(detected.type, files.length)),
    notes,
    crew: priced.crew,
    materialsDetail: (priced as any).materials ? { gallons: (priced as any).materials.gallons, unitCost: (priced as any).materials.unitCost, wastePct: (priced as any).materials.wastePct } : undefined,
    lineItems,
    detected: { type: detected.type, confidence: detected.confidence, complexity: detected.complexity }
  };
}

function estimatePseudoSqft(type: string, photos: number) {
  if (type === 'fence') return photos * 18 * 6;
  if (type === 'deck') return photos * 40;
  if (type === 'custom_shoes') return 6;
  return photos * 90;
}
function round2(n:number){ return Math.round(n*100)/100; }
