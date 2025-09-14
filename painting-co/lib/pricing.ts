export type Difficulty = 'low'|'medium'|'high';

export function finishMultiplier(finish: 'matte'|'eggshell'|'semi-gloss') {
  switch (finish) {
    case 'matte': return 1.0;
    case 'eggshell': return 1.07;
    case 'semi-gloss': return 1.12;
  }
}

export function baseRates(difficulty: Difficulty) {
  // ballpark $/sqft labor; materials/coat; prep factor
  if (difficulty === 'high') return { laborSqft: 1.95, materialsSqftPerCoat: 0.55, prepFactor: 0.35 };
  if (difficulty === 'medium') return { laborSqft: 1.65, materialsSqftPerCoat: 0.45, prepFactor: 0.25 };
  return { laborSqft: 1.35, materialsSqftPerCoat: 0.38, prepFactor: 0.18 };
}
