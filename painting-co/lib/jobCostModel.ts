// Central rates & multipliers. Tunable via env or here.
// Keep numbers conservative; your crew can override on the final quote.

const n = (v: string | number | undefined, d: number) =>
  typeof v === 'string' ? Number(v) || d : typeof v === 'number' ? v : d;

export const RATES = {
  // labor/materials
  laborRateHr: n(process.env.LABOR_RATE_HR, 55),             // $/hr per painter
  paintUnitCost: n(process.env.PAINT_UNIT_COST, 42),          // $ per gallon
  overheadPct: n(process.env.OVERHEAD_PCT, 0.12),             // % overhead
  marginPct: n(process.env.MARGIN_PCT, 0.18),                 // % profit/margin

  // logistics
  travelRatePerMile: n(process.env.TRAVEL_RATE_PER_MILE, 0.68),
  mobilizationPerTrip: n(process.env.MOBILIZATION_PER_TRIP, 65),

  // premiums
  rushPct: n(process.env.RUSH_PCT, 0.07),
  weekendPct: n(process.env.WEEKEND_PCT, 0.05),
  seasonalityPct: n(process.env.SEASONALITY_PCT, 0),
  equipRental: n(process.env.EQUIP_RENTAL, 0),

  // productivity baselines (sqft/hr/painter) or (lf/hr/painter)
  prod: {
    wallInterior: 120,   // walls/ceilings repaint, normal height
    exterior: 85,        // siding/exterior (masking, ladder moves)
    fenceLF: 45,         // linear-ft per hr (6ft height assumed baseline)
    deckSqft: 80,        // deck floor + rails baseline
    furnitureSqft: 60,   // cabinets/tables (more detail)
  },

  // material coverage (sqft/gallon per coat)
  coverage: {
    standard: 350,
    exterior: 300,
    fence: 275,
    deck: 275,
    furniture: 250,
  },

  // difficulty multipliers
  difficulty: {
    low: 0.95,
    medium: 1.0,
    high: 1.15,
  },

  // condition/feature tweaks
  features: {
    tallWalls: 1.12,     // >10.5 ft avg
    heavyTrim: 1.15,
    minorDrywall: 0.08,  // add-on as % of labor
  }
};

export type DetectedType = 'interior_wall' | 'exterior_wall' | 'fence' | 'deck' | 'furniture';

export const TYPE_UNITS: Record<DetectedType, 'sqft' | 'lf'> = {
  interior_wall: 'sqft',
  exterior_wall: 'sqft',
  fence: 'lf',
  deck: 'sqft',
  furniture: 'sqft',
};
