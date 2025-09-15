export type Difficulty = 'low'|'medium'|'high';

export type CostInputs = {
  sqft: number;
  coats: number;
  finish: 'matte'|'eggshell'|'semi-gloss';
  difficulty: Difficulty;
  distanceMiles?: number;
  preferredDays?: number;
  rush?: boolean;
  weekend?: boolean;
};

export type CostOutputs = {
  crew: { people: number; days: number; hoursTotal: number; productivitySqftHr: number; };
  materials: { gallons: number; unitCost: number; wastePct: number; subtotal: number; };
  consumables: { subtotal: number; notes: string[] };
  mobilization: { trips: number; perTrip: number; subtotal: number; };
  travel: { miles: number; $perMile: number; subtotal: number; };
  overhead: { pct: number; subtotal: number; };
  baseLabor: number;
  adjustments: { rushPct: number; weekendPct: number; seasonalityPct: number; equipmentRental: number; };
  margin: { pct: number; subtotal: number; };
  subtotal: number;
  total: number;
};

const CFG = {
  productivitySqftPerHour: { low: 110, medium: 90, high: 70 },
  finishMul: { 'matte': 1.00, 'eggshell': 0.96, 'semi-gloss': 0.88 },
  coatMult: (coats: number) => (coats === 1 ? 0.65 : coats === 2 ? 1.0 : 1.30),

  minCrew: 2, maxCrew: 5, hoursPerDay: 7.5,
  laborRateHr: Number(process.env.LABOR_RATE_HR || 55),

  coverageSqftPerGallonPerCoat: 375,
  gallonUnitCost: Number(process.env.PAINT_UNIT_COST || 42),
  wastePct: 0.08,
  consumablesPctOfMaterials: 0.45,

  mobilizationsPerJob: 2,
  mobilizationPerTrip: Number(process.env.MOBILIZATION_PER_TRIP || 65),
  mileageRate: Number(process.env.TRAVEL_RATE_PER_MILE || 0.68),

  overheadPct: Number(process.env.OVERHEAD_PCT || 0.12),
  targetMarginPct: Number(process.env.MARGIN_PCT || 0.18),

  rushPct: Number(process.env.RUSH_PCT || 0.07),
  weekendPct: Number(process.env.WEEKEND_PCT || 0.05),
  seasonalityPct: Number(process.env.SEASONALITY_PCT || 0.00),

  equipmentRentalDefault: Number(process.env.EQUIP_RENTAL || 0),
};

function clamp(n:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, n)); }
function round2(n:number){ return Math.round(n*100)/100; }

export function planCrewAndHours(inputs: CostInputs) {
  const { sqft, coats, finish, difficulty, preferredDays } = inputs;
  const baseProd = CFG.productivitySqftPerHour[difficulty];
  const prodAdj = baseProd * CFG.finishMul[finish] / CFG.coatMult(coats);
  const productivity = clamp(prodAdj, 45, 140);
  const hoursNeeded = (sqft / productivity) * 1.07;

  const hoursPerDayPerPerson = CFG.hoursPerDay;
  const targetDays = preferredDays && preferredDays > 0 ? preferredDays : undefined;

  let bestPeople = CFG.minCrew;
  let bestDays = Math.ceil(hoursNeeded / (CFG.minCrew * hoursPerDayPerPerson));

  if (targetDays) {
    for (let p = CFG.minCrew; p <= CFG.maxCrew; p++) {
      const days = Math.ceil(hoursNeeded / (p * hoursPerDayPerPerson));
      if (days <= targetDays) { bestPeople = p; bestDays = days; break; }
      if (days < bestDays) { bestPeople = p; bestDays = days; }
    }
  } else {
    for (let p = CFG.minCrew; p <= CFG.maxCrew; p++) {
      const days = Math.ceil(hoursNeeded / (p * hoursPerDayPerPerson));
      if (sqft > 900 && p < 4 && days > 2) { bestPeople = 4; bestDays = Math.ceil(hoursNeeded / (4 * hoursPerDayPerPerson)); break; }
      if (sqft > 1500 && p < 5) { bestPeople = 5; bestDays = Math.ceil(hoursNeeded / (5 * hoursPerDayPerPerson)); break; }
    }
  }

  const totalHours = bestPeople * bestDays * hoursPerDayPerPerson;

  return {
    people: bestPeople,
    days: bestDays,
    hoursTotal: round2(totalHours),
    productivitySqftHr: round2(productivity)
  };
}

export function computeMaterials(inputs: CostInputs) {
  const { sqft, coats } = inputs;
  const cov = CFG.coverageSqftPerGallonPerCoat;
  const rawGallons = (sqft * coats) / cov;
  const gallons = Math.ceil(rawGallons * (1 + CFG.wastePct));
  const subtotal = gallons * CFG.gallonUnitCost;
  const consumablesSubtotal = round2(subtotal * CFG.consumablesPctOfMaterials);
  return { gallons, unitCost: CFG.gallonUnitCost, wastePct: CFG.wastePct, subtotal: round2(subtotal), consumablesSubtotal };
}

export function priceJob(inputs: CostInputs): CostOutputs {
  const crew = planCrewAndHours(inputs);
  const mat = computeMaterials(inputs);
  const labor = crew.hoursTotal * CFG.laborRateHr;

  const consumables = { subtotal: mat.consumablesSubtotal, notes: ['Tape/plastic/paper, filler/sand, rollers, tips'] };
  const mobilization = { trips: CFG.mobilizationsPerJob, perTrip: CFG.mobilizationPerTrip, subtotal: CFG.mobilizationsPerJob * CFG.mobilizationPerTrip };
  const miles = Math.max(0, inputs.distanceMiles ?? 0);
  const travel = { miles, $perMile: CFG.mileageRate, subtotal: round2(miles * CFG.mileageRate) };

  const baseBeforeOH = labor + mat.subtotal + consumables.subtotal + mobilization.subtotal + travel.subtotal;
  const overhead = { pct: CFG.overheadPct, subtotal: round2(baseBeforeOH * CFG.overheadPct) };

  const adjustments = {
    rushPct: inputs.rush ? CFG.rushPct : 0,
    weekendPct: inputs.weekend ? CFG.weekendPct : 0,
    seasonalityPct: CFG.seasonalityPct,
    equipmentRental: CFG.equipmentRentalDefault
  };
  const premium = round2(baseBeforeOH * (adjustments.rushPct + adjustments.weekendPct + adjustments.seasonalityPct) + adjustments.equipmentRental);

  const subtotal = round2(baseBeforeOH + overhead.subtotal + premium);
  const margin = { pct: CFG.targetMarginPct, subtotal: round2(subtotal * CFG.targetMarginPct) };
  const total = round2(subtotal + margin.subtotal);

  return {
    crew,
    materials: { gallons: mat.gallons, unitCost: mat.unitCost, wastePct: mat.wastePct, subtotal: mat.subtotal },
    consumables,
    mobilization,
    travel,
    overhead,
    baseLabor: round2(labor),
    adjustments,
    margin,
    subtotal,
    total
  };
}
