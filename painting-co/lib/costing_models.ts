import { priceJob } from './costing';
import type { ProjectType } from './detect_type';

export type AutoInputs = {
  filesCount: number;
  inferredSqftFromWalls?: number;
  coats: number;
  finish: 'matte'|'eggshell'|'semi-gloss';
  difficulty: 'low'|'medium'|'high';
  distanceMiles?: number;
  rush?: boolean;
  weekend?: boolean;
  preferredDays?: number;
  complexity?: 'simple'|'medium'|'complex';
  __ctx?: {
    interior: boolean;
    trim: 'low'|'medium'|'high';
    heightFt?: number | null;
    drywall: 'none'|'light'|'moderate'|'heavy';
  };
};

export function priceByType(type: ProjectType, a: AutoInputs) {
  const base = {
    coats: Math.max(1, a.coats),
    finish: a.finish,
    difficulty: a.difficulty,
    distanceMiles: a.distanceMiles,
    rush: a.rush,
    weekend: a.weekend,
    preferredDays: a.preferredDays,
    __ctx: a.__ctx
  } as const;

  switch (type) {
    case 'interior_walls': {
      const sqft = Math.max(60, Math.min(2000, a.inferredSqftFromWalls ?? a.filesCount * 90));
      return priceJob({ sqft, ...base });
    }
    case 'fence': {
      const lf = a.filesCount * 18;         // tune with real data
      const heightFt = 6;
      const sqft = lf * heightFt;
      return priceJob({ sqft, ...base, finish: 'semi-gloss', difficulty: bump(a.difficulty) });
    }
    case 'deck': {
      const sqft = a.filesCount * 40;       // tune with real data
      return priceJob({ sqft, ...base, finish: 'semi-gloss', difficulty: bump(a.difficulty) });
    }
    case 'custom_shoes': {
      const tier = a.complexity || 'medium';
      const baseLabor = tier === 'simple' ? 160 : tier === 'medium' ? 240 : 340;
      const overheadPct = 0.12, marginPct = 0.18;
      const materials = 25, consumables = 20;
      const overhead = +(baseLabor * overheadPct).toFixed(2);
      const subtotal = +(baseLabor + materials + consumables + overhead).toFixed(2);
      const margin = +(subtotal * marginPct).toFixed(2);
      const total = +(subtotal + margin).toFixed(2);
      return {
        crew: { people: 1, days: 1, hoursTotal: 4, productivitySqftHr: 0 },
        materials: { gallons: 0, unitCost: 0, wastePct: 0, subtotal: materials },
        consumables: { subtotal: consumables, notes: ['prep/acetone/tape/film, pens/paints'] },
        mobilization: { trips: 1, perTrip: 0, subtotal: 0 },
        travel: { miles: a.distanceMiles||0, $perMile: 0, subtotal: 0 },
        overhead: { pct: overheadPct, subtotal: overhead },
        baseLabor,
        adjustments: { rushPct: a.rush?0.07:0, weekendPct: a.weekend?0.05:0, seasonalityPct: 0, equipmentRental: 0 },
        margin: { pct: marginPct, subtotal: margin },
        subtotal,
        total
      } as const;
    }
  }
}

function bump(d: 'low'|'medium'|'high'): 'low'|'medium'|'high' {
  if (d === 'low') return 'medium';
  if (d === 'medium') return 'high';
  return 'high';
}
