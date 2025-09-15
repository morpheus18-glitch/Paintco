import sharp from 'sharp';
import { RATES, TYPE_UNITS, DetectedType } from './jobCostModel';

type BaseOpts = {
  heightFt: string | number;
  coats: string | number;
  finish: 'matte' | 'eggshell' | 'satin' | 'semi_gloss' | string;
  distanceMiles?: number;
  preferredDays?: number;
  rush?: boolean;
  weekend?: boolean;
};

export type EstimateResponse = {
  subtotal: number;
  rangeLow: number;
  rangeHigh: number;
  labor: number;
  materials: number;
  prep: number;
  notes: string[];
  difficulty: 'low' | 'medium' | 'high';
  sqft: number;
  lineItems: { label: string; amount: number }[];
  crew: { people: number; days: number; hoursTotal: number; productivitySqftHr: number };
  materialsDetail: { gallons: number; unitCost: number; wastePct: number };
  detected: { type: DetectedType; confidence: number; complexity: 'low'|'medium'|'high' };
};

// ---------------- image analysis (lightweight heuristics) ------------------

async function analyzeImage(buf: Buffer) {
  // downscale → get stats → rough texture/wood-ness + edge orientation proxy
  const s = sharp(buf).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true });
  const { channels } = await s.stats();
  // simple saturation proxy from per-channel stddev
  const sdR = channels[0].stdev;
  const sdG = channels[1].stdev;
  const sdB = channels[2].stdev;
  const saturationish = (Math.max(sdR, sdG, sdB) - Math.min(sdR, sdG, sdB)) / 128;

  // get raw pixels to derive a coarse “grain/lines” metric
  const raw = await s
    .greyscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // measure vertical vs horizontal contrast differences
  const w = raw.info.width, h = raw.info.height;
  let vContrast = 0, hContrast = 0, samples = 0;
  for (let y = 1; y < h - 1; y += 4) {
    for (let x = 1; x < w - 1; x += 4) {
      const i = y * w + x;
      const px = raw.data[i];
      const dV = Math.abs(px - raw.data[(y - 1) * w + x]) + Math.abs(px - raw.data[(y + 1) * w + x]);
      const dH = Math.abs(px - raw.data[i - 1]) + Math.abs(px - raw.data[i + 1]);
      vContrast += dV; hContrast += dH; samples++;
    }
  }
  vContrast /= samples; hContrast /= samples;

  return { saturationish, vContrast, hContrast };
}

// naive classifier: fence, deck, furniture, exterior, interior
function classifyFromSignals(sig: { saturationish: number; vContrast: number; hContrast: number }): { type: DetectedType; conf: number } {
  const { saturationish: sat, vContrast: v, hContrast: h } = sig;

  // fences often show repeated vertical slats → vertical contrast > horizontal
  const fenceScore = v > h * 1.15 ? (v - h) / (v + h + 1e-6) + 0.15 : 0;

  // decks: horizontal boards + medium saturation
  const deckScore = h > v * 1.1 ? (h - v) / (h + v + 1e-6) + 0.10 : 0;

  // furniture: high local contrast (edges) but smaller scale; boost when both contrasts high
  const furnScore = (v + h) / 400 > 1 ? 0.35 : 0.15;

  // exterior vs interior: crude—exterior tends to higher saturation/contrast
  const exteriorScore = sat > 0.65 ? 0.6 : 0.25;
  const interiorScore = 0.5;

  const candidates: [DetectedType, number][] = [
    ['fence', fenceScore],
    ['deck', deckScore],
    ['furniture', furnScore],
    ['exterior_wall', exteriorScore],
    ['interior_wall', interiorScore],
  ];

  candidates.sort((a, b) => b[1] - a[1]);
  const [type, score] = candidates[0];
  const conf = Math.max(0.4, Math.min(0.95, score));
  return { type, conf };
}

async function detectType(buffers: Buffer[]): Promise<{ type: DetectedType; confidence: number }> {
  const votes: Record<DetectedType, number> = {
    interior_wall: 0, exterior_wall: 0, fence: 0, deck: 0, furniture: 0,
  };
  for (const b of buffers) {
    const sig = await analyzeImage(b);
    const { type, conf } = classifyFromSignals(sig);
    votes[type] += conf;
  }
  const winner = (Object.entries(votes) as [DetectedType, number][])
    .sort((a, b) => b[1] - a[1])[0];
  return { type: winner[0], confidence: Math.min(0.98, winner[1] / buffers.length) };
}

// ---------------- sizing heuristics ---------------------------------------

// extremely light sizing: use image height to pick scale; real world rollout should
// replace this with model-based geometry or a phone AR measure.
function estimateUnits(type: DetectedType, opts: BaseOpts, photoCount: number) {
  const heightFt = Number(opts.heightFt) || 9;
  const coats = Math.max(1, Math.min(3, Number(opts.coats) || 2));

  switch (type) {
    case 'fence': {
      const lf = 24 * photoCount; // ~24 linear feet per useful photo (rough prior)
      return { units: lf, coats, heightFt: 6, unitKind: TYPE_UNITS[type] };
    }
    case 'deck': {
      const sqft = 120 * photoCount; // ~120 sqft per photo baseline
      return { units: sqft, coats, heightFt, unitKind: TYPE_UNITS[type] };
    }
    case 'furniture': {
      const sqft = 40 * photoCount; // small pieces add up
      return { units: sqft, coats, heightFt, unitKind: TYPE_UNITS[type] };
    }
    case 'exterior_wall': {
      const sqft = 180 * photoCount;
      return { units: sqft, coats, heightFt, unitKind: TYPE_UNITS[type] };
    }
    default: {
      // interior_wall
      const sqft = 200 * photoCount;
      return { units: sqft, coats, heightFt, unitKind: TYPE_UNITS[type] };
    }
  }
}

// ---------------- costing ---------------------------------------------------

function difficultyFromType(type: DetectedType): 'low'|'medium'|'high' {
  if (type === 'furniture') return 'high';
  if (type === 'exterior_wall') return 'medium';
  if (type === 'deck') return 'medium';
  if (type === 'fence') return 'medium';
  return 'low';
}

function coverageFor(type: DetectedType) {
  switch (type) {
    case 'exterior_wall': return RATES.coverage.exterior;
    case 'deck':          return RATES.coverage.deck;
    case 'fence':         return RATES.coverage.fence;
    case 'furniture':     return RATES.coverage.furniture;
    default:              return RATES.coverage.standard;
  }
}

function productivityFor(type: DetectedType) {
  switch (type) {
    case 'exterior_wall': return RATES.prod.exterior;
    case 'deck':          return RATES.prod.deckSqft;
    case 'fence':         return RATES.prod.fenceLF;   // lf/hr
    case 'furniture':     return RATES.prod.furnitureSqft;
    default:              return RATES.prod.wallInterior;
  }
}

function applyFeatureTweaks(type: DetectedType, heightFt: number, notes: string[]) {
  let mult = 1.0;
  if (heightFt > 10.5 && (type === 'interior_wall' || type === 'exterior_wall')) {
    mult *= RATES.features.tallWalls;
    notes.push('Tall walls detected: productivity adjusted.');
  }
  // trim/drywall are not auto-detected yet; keep space for server rules later
  return mult;
}

function addOpsAndProfit(sub: number) {
  const withOH = sub * (1 + RATES.overheadPct);
  const withMargin = withOH * (1 + RATES.marginPct);
  return withMargin;
}

function band(total: number) {
  const spread = Math.max(150, total * 0.12);
  return { low: Math.max(0, total - spread), high: total + spread };
}

// ---------------- public API ------------------------------------------------

export async function estimatePro(files: Buffer[], opts: BaseOpts): Promise<EstimateResponse> {
  const notes: string[] = [];

  // 1) detect job type from photos (votes across files)
  const det = await detectType(files);
  notes.push(`Detected job: ${det.type.replace('_',' ')} (${Math.round(det.confidence*100)}% confidence).`);

  // 2) choose units (sqft or linear-ft) and coats
  const { units, coats, heightFt, unitKind } = estimateUnits(det.type, opts, files.length);
  const isLF = unitKind === 'lf';
  const coverage = coverageFor(det.type);
  const prod = productivityFor(det.type); // sqft/hr or lf/hr per painter

  // 3) materials
  const gallons = Math.max(1, Math.ceil((isLF ? units * 6 /* 6ft height baseline */ : units) * coats / coverage));
  const materials = gallons * RATES.paintUnitCost;
  notes.push(`Materials: ~${gallons} gal @ coverage ${coverage} sqft/gal.`);

  // 4) labor hours & crew sizing
  const baseQty = isLF ? units : units; // same symbol, different unit
  const difficulty = difficultyFromType(det.type);
  const diffMult = RATES.difficulty[difficulty];
  const featureMult = applyFeatureTweaks(det.type, heightFt, notes);
  const hoursPerPainter = (baseQty * coats) / prod * diffMult * featureMult;

  // target crew sizing: try to hit preferred days if provided
  const targetDays = Math.max(1, Math.round((opts.preferredDays || 0) || Math.sqrt(files.length)));
  const hoursTotal = hoursPerPainter; // per painter hours (for 1 painter)
  const estHours = Math.max(3, hoursTotal);       // floor small jobs
  const painters = Math.min(4, Math.max(1, Math.round(estHours / (8 * targetDays))));
  const days = Math.max(1, Math.ceil(estHours / (8 * painters)));

  const labor = painters * estHours * RATES.laborRateHr;

  // 5) ops & logistics
  const travel = (opts.distanceMiles || 0) * RATES.travelRatePerMile;
  const mobilization = RATES.mobilizationPerTrip;
  let subtotal = labor + materials + travel + mobilization + RATES.equipRental;

  // rush/weekend/seasonality
  let premiumPct = RATES.seasonalityPct;
  if (opts.rush) premiumPct += RATES.rushPct;
  if (opts.weekend) premiumPct += RATES.weekendPct;
  if (premiumPct > 0) {
    subtotal *= (1 + premiumPct);
    notes.push(`Premiums applied: ${Math.round(premiumPct * 100)}% (rush/weekend/seasonality).`);
  }

  // 6) margin & band
  const total = addOpsAndProfit(subtotal);
  const { low, high } = band(total);

  // 7) response
  const lineItems = [
    { label: 'Labor', amount: Math.round(labor) },
    { label: 'Materials', amount: Math.round(materials) },
    { label: 'Travel', amount: Math.round(travel) },
    { label: 'Mobilization', amount: Math.round(mobilization) },
    ...(RATES.equipRental ? [{ label: 'Equipment Rental', amount: Math.round(RATES.equipRental) }] : []),
    { label: 'Overhead & Margin', amount: Math.round(total - subtotal) },
  ];

  return {
    subtotal: Math.round(subtotal),
    rangeLow: Math.round(low),
    rangeHigh: Math.round(high),
    labor: Math.round(labor),
    materials: Math.round(materials),
    prep: Math.round(travel + mobilization),
    notes,
    difficulty,
    sqft: isLF ? Math.round(units * (det.type === 'fence' ? 6 : 1)) : Math.round(units),
    lineItems,
    crew: {
      people: painters,
      days,
      hoursTotal: Math.round(estHours),
      productivitySqftHr: prod,
    },
    materialsDetail: { gallons, unitCost: RATES.paintUnitCost, wastePct: 0.08 },
    detected: { type: det.type, confidence: det.confidence, complexity: difficulty },
  };
}
