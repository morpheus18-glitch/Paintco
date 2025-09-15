import type { EstimateInputType } from './schema';
import { estimateFromPhotos as heuristicV2 } from './estimator';
import { priceJob } from './costing';

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
  materialsDetail: { gallons:number; unitCost:number; wastePct:number; };
  lineItems: { label:string; amount:number; }[];
};

export async function estimatePro(files: Buffer[], input: EstimateInputType & {
  distanceMiles?: number;
  preferredDays?: number;
  rush?: boolean;
  weekend?: boolean;
}): Promise<ProEstimate> {
  const base = await heuristicV2(files, input);
  const sqft = base.sqft;

  const priced = priceJob({
    sqft,
    coats: input.coats,
    finish: input.finish,
    difficulty: base.difficulty,
    distanceMiles: input.distanceMiles ?? 0,
    preferredDays: input.preferredDays,
    rush: input.rush,
    weekend: input.weekend
  });

  const diffAdj = base.difficulty === 'high' ? 0.12 : base.difficulty === 'medium' ? 0.08 : 0.05;
  const low = Math.round(priced.total * (1 - diffAdj) * 100) / 100;
  const high = Math.round(priced.total * (1 + diffAdj) * 100) / 100;

  const lineItems = [
    { label: 'Labor (crew time)', amount: priced.baseLabor },
    { label: 'Materials (paint)', amount: priced.materials.subtotal },
    { label: 'Consumables', amount: priced.consumables.subtotal },
    { label: 'Mobilization', amount: priced.mobilization.subtotal },
    { label: 'Travel', amount: priced.travel.subtotal },
    { label: `Overhead (${Math.round(priced.overhead.pct*100)}%)`, amount: priced.overhead.subtotal },
    { label: `Premiums (rush/weekend/seasonal + equipment)`, amount:
      Math.round((priced.subtotal - priced.baseLabor - priced.materials.subtotal - priced.consumables.subtotal - priced.mobilization.subtotal - priced.travel.subtotal - priced.overhead.subtotal)*100)/100
    },
    { label: `Margin (${Math.round(priced.margin.pct*100)}%)`, amount: priced.margin.subtotal }
  ];

  const notes = [
    ...base.notes,
    `Crew plan: ${priced.crew.people} painters × ${priced.crew.days} day(s) (~${priced.crew.hoursTotal} labor-hours).`,
    `Budgeted materials: ${priced.materials.gallons} gal @ $${priced.materials.unitCost}/gal (includes ${Math.round(priced.materials.wastePct*100)}% waste).`,
    priced.adjustments.rushPct ? `Rush premium applied: ${Math.round(priced.adjustments.rushPct*100)}%.` : '',
    priced.adjustments.weekendPct ? `Weekend premium applied: ${Math.round(priced.adjustments.weekendPct*100)}%.` : '',
  ].filter(Boolean);

  return {
    subtotal: priced.subtotal,
    total: priced.total,
    rangeLow: low,
    rangeHigh: high,
    labor: priced.baseLabor,
    materials: priced.materials.subtotal,
    prep: Math.round((priced.overhead.subtotal)*100)/100,
    difficulty: base.difficulty,
    sqft,
    notes,
    crew: priced.crew,
    materialsDetail: { gallons: priced.materials.gallons, unitCost: priced.materials.unitCost, wastePct: priced.materials.wastePct },
    lineItems
  };
}
