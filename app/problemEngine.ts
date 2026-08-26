export type CategoryId =
  | 'mixed'
  | 'dose-volume'
  | 'percentage'
  | 'ratio'
  | 'dilution'
  | 'conversions'
  | 'weight-based';

export type PracticeCategory = Exclude<CategoryId, 'mixed'>;
export type Difficulty = 'Foundation' | 'Applied' | 'Multi-step';

export type SolutionStep = {
  label: string;
  expression: string;
  note?: string;
};

export type Problem = {
  id: string;
  kind: string;
  category: PracticeCategory;
  categoryLabel: string;
  difficulty: Difficulty;
  prompt: string;
  answerKind: 'number' | 'ratio';
  answer: number | [number, number];
  precision: number;
  tolerance: number;
  unit: string;
  placeholder: string;
  formula: string;
  hint: string;
  steps: SolutionStep[];
  finalAnswer: string;
  legacyRatio?: boolean;
};

export const CATEGORY_META: Array<{
  id: CategoryId;
  label: string;
  shortLabel: string;
  count: number;
}> = [
  { id: 'mixed', label: 'All practice', shortLabel: 'Mixed', count: 21 },
  { id: 'dose-volume', label: 'Dose & volume', shortLabel: 'Dose & volume', count: 4 },
  { id: 'percentage', label: 'Percentage', shortLabel: 'Percentage', count: 5 },
  { id: 'ratio', label: 'Ratio strength', shortLabel: 'Ratio', count: 5 },
  { id: 'dilution', label: 'Dilution', shortLabel: 'Dilution', count: 2 },
  { id: 'conversions', label: 'Conversions', shortLabel: 'Conversions', count: 4 },
  { id: 'weight-based', label: 'Weight-based', shortLabel: 'Weight-based', count: 1 },
];

const labels: Record<PracticeCategory, string> = {
  'dose-volume': 'Dose & volume',
  percentage: 'Percentage strength',
  ratio: 'Ratio strength',
  dilution: 'Dilution',
  conversions: 'Unit conversion',
  'weight-based': 'Weight-based dose',
};

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const roundTo = (value: number, precision: number) => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatNumber = (value: number, precision = 4) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  }).format(value);

const toleranceFor = (precision: number) => 0.5 * 10 ** -precision + 1e-10;

const numericProblem = (
  data: Omit<Problem, 'id' | 'answerKind' | 'tolerance' | 'finalAnswer'> & {
    answer: number;
  },
): Problem => {
  const rounded = roundTo(data.answer, data.precision);
  return {
    ...data,
    id: `${data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    answerKind: 'number',
    answer: rounded,
    tolerance: toleranceFor(data.precision),
    finalAnswer: `${formatNumber(rounded, data.precision)}${data.unit ? ` ${data.unit}` : ''}`,
  };
};

const ratioProblem = (
  data: Omit<Problem, 'id' | 'answerKind' | 'tolerance' | 'finalAnswer' | 'unit'> & {
    answer: [number, number];
  },
): Problem => ({
  ...data,
  id: `${data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  answerKind: 'ratio',
  answer: data.answer,
  tolerance: 0.011,
  unit: '',
  finalAnswer: `${formatNumber(data.answer[0], data.precision)} : ${formatNumber(data.answer[1], data.precision)}`,
});

const unitsPerMlVolume = (): Problem => {
  const concentration = pick([1000, 2500, 5000, 10000, 12500, 15000, 25000, 40000, 50000, 100000]);
  const volume = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]);
  const dose = concentration * volume;
  return numericProblem({
    kind: 'units-volume',
    category: 'dose-volume',
    categoryLabel: labels['dose-volume'],
    difficulty: 'Foundation',
    prompt: `A practice medication is supplied at ${formatNumber(concentration)} units/mL. How many mL are needed to give ${formatNumber(dose)} units?`,
    answer: volume,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: 'Volume = desired dose ÷ concentration',
    hint: 'Arrange the units so “units” cancel and mL remain.',
    steps: [
      { label: 'Write the known values', expression: `${formatNumber(dose)} units ÷ ${formatNumber(concentration)} units/mL` },
      { label: 'Cancel units', expression: `(${formatNumber(dose)} ÷ ${formatNumber(concentration)}) mL` },
      { label: 'Calculate', expression: `${formatNumber(volume, 2)} mL` },
    ],
  });
};

const stockStrengthVolume = (): Problem => {
  const concentration = pick([0.5, 1, 2, 2.5, 4, 5, 8, 10, 12.5, 20, 25, 50]);
  const stockVolume = pick([1, 2, 3, 5, 10, 20]);
  const available = concentration * stockVolume;
  const volume = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 8, 10]);
  const desired = concentration * volume;
  return numericProblem({
    kind: 'stock-volume',
    category: 'dose-volume',
    categoryLabel: labels['dose-volume'],
    difficulty: 'Applied',
    prompt: `A practice stock contains ${formatNumber(available)} mg in ${formatNumber(stockVolume)} mL. What volume provides ${formatNumber(desired)} mg?`,
    answer: volume,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: 'Volume = (desired ÷ amount on hand) × stock volume',
    hint: 'Use desired over available, then multiply by the volume on hand.',
    steps: [
      { label: 'Set up D ÷ H × Q', expression: `(${formatNumber(desired)} mg ÷ ${formatNumber(available)} mg) × ${formatNumber(stockVolume)} mL` },
      { label: 'Cancel mg', expression: `${formatNumber(desired / available, 4)} × ${formatNumber(stockVolume)} mL` },
      { label: 'Calculate', expression: `${formatNumber(volume, 2)} mL` },
    ],
  });
};

const percentDoseVolume = (): Problem => {
  const percent = pick([0.05, 0.1, 0.2, 0.5, 1, 2, 4, 5, 10, 20]);
  const concentration = percent * 10;
  const volume = pick([0.5, 1, 2, 3, 4, 5, 8, 10, 15, 20]);
  const dose = concentration * volume;
  return numericProblem({
    kind: 'percent-volume',
    category: 'dose-volume',
    categoryLabel: labels['dose-volume'],
    difficulty: 'Applied',
    prompt: `A practice solution has a strength of ${formatNumber(percent, 2)}% w/v. How many mL provide ${formatNumber(dose, 2)} mg?`,
    answer: volume,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: '% w/v × 10 = mg/mL; volume = dose ÷ mg/mL',
    hint: 'First convert percent w/v to mg/mL by multiplying by 10.',
    steps: [
      { label: 'Convert grams to milligrams', expression: `${formatNumber(percent, 2)} g/100 mL × 1,000 mg/g = ${formatNumber(percent * 1000, 3)} mg/100 mL` },
      { label: 'Find mg per mL', expression: `${formatNumber(percent * 1000, 3)} mg ÷ 100 mL = ${formatNumber(concentration, 3)} mg/mL` },
      { label: 'Set up the volume', expression: `${formatNumber(dose, 2)} mg ÷ ${formatNumber(concentration, 3)} mg/mL` },
      { label: 'Calculate', expression: `${formatNumber(volume, 2)} mL` },
    ],
  });
};

const amountFromStock = (): Problem => {
  const concentration = pick([0.5, 1, 2, 2.5, 4, 5, 8, 10, 20, 25, 50]);
  const volume = pick([1, 2, 3, 4, 5, 8, 10, 12, 15, 20]);
  const amount = concentration * volume;
  return numericProblem({
    kind: 'amount-from-stock',
    category: 'dose-volume',
    categoryLabel: labels['dose-volume'],
    difficulty: 'Foundation',
    prompt: `A practice solution contains ${formatNumber(concentration)} mg/mL. How many mg are present in ${formatNumber(volume)} mL?`,
    answer: amount,
    precision: 2,
    unit: 'mg',
    placeholder: '0.00',
    formula: 'Amount = concentration × volume',
    hint: 'Multiply mg/mL by mL so the mL units cancel.',
    steps: [
      { label: 'Set up the units', expression: `${formatNumber(concentration)} mg/mL × ${formatNumber(volume)} mL` },
      { label: 'Cancel mL', expression: `${formatNumber(concentration)} × ${formatNumber(volume)} mg` },
      { label: 'Calculate', expression: `${formatNumber(amount, 2)} mg` },
    ],
  });
};

const percentFromGrams = (): Problem => {
  const grams = pick([0.5, 1, 2, 2.5, 4, 5, 10, 12, 15, 16, 20, 25, 30, 40]);
  const volume = pick([50, 100, 200, 250, 400, 500, 600, 1000]);
  const percent = (grams / volume) * 100;
  const precision = percent < 0.1 ? 3 : 2;
  return numericProblem({
    kind: 'percent-from-grams',
    category: 'percentage',
    categoryLabel: labels.percentage,
    difficulty: 'Foundation',
    prompt: `${formatNumber(grams)} g of active ingredient are present in ${formatNumber(volume)} mL of solution. What is the percentage strength (w/v)?`,
    answer: percent,
    precision,
    unit: '%',
    placeholder: '0.00',
    formula: '% w/v = (grams ÷ mL) × 100',
    hint: 'Percentage w/v means grams in every 100 mL.',
    steps: [
      { label: 'Write the fraction', expression: `${formatNumber(grams)} g ÷ ${formatNumber(volume)} mL` },
      { label: 'Scale to 100 mL', expression: `(${formatNumber(grams)} ÷ ${formatNumber(volume)}) × 100` },
      { label: 'Calculate', expression: `${formatNumber(roundTo(percent, precision), precision)}% w/v` },
    ],
  });
};

const percentFromMilligrams = (): Problem => {
  const milligrams = pick([3, 5, 10, 15, 20, 25, 50, 75, 100, 250, 500]);
  const volume = pick([5, 10, 20, 25, 50, 60, 100, 200, 230]);
  const grams = milligrams / 1000;
  const percent = (grams / volume) * 100;
  const precision = percent < 0.01 ? 4 : percent < 0.1 ? 3 : 2;
  return numericProblem({
    kind: 'percent-from-mg',
    category: 'percentage',
    categoryLabel: labels.percentage,
    difficulty: 'Applied',
    prompt: `${formatNumber(milligrams)} mg of active ingredient are present in ${formatNumber(volume)} mL. What is the percentage strength (w/v)?`,
    answer: percent,
    precision,
    unit: '%',
    placeholder: '0.0000',
    formula: 'Convert mg to g, then % = (g ÷ mL) × 100',
    hint: 'Divide milligrams by 1,000 before calculating percent w/v.',
    steps: [
      { label: 'Convert mg to g', expression: `${formatNumber(milligrams)} mg ÷ 1,000 = ${formatNumber(grams, 5)} g` },
      { label: 'Scale to 100 mL', expression: `(${formatNumber(grams, 5)} g ÷ ${formatNumber(volume)} mL) × 100` },
      { label: 'Calculate', expression: `${formatNumber(roundTo(percent, precision), precision)}% w/v` },
    ],
  });
};

const percentFromMgPerMl = (): Problem => {
  const concentration = pick([0.5, 1, 2, 2.5, 5, 8, 10, 20, 50, 100]);
  const percent = concentration / 10;
  return numericProblem({
    kind: 'percent-from-mgml',
    category: 'percentage',
    categoryLabel: labels.percentage,
    difficulty: 'Foundation',
    prompt: `A practice solution is supplied at ${formatNumber(concentration)} mg/mL. What is its percentage strength (w/v)?`,
    answer: percent,
    precision: 3,
    unit: '%',
    placeholder: '0.000',
    formula: 'mg/mL ÷ 10 = % w/v',
    hint: 'Find the grams in 100 mL; this simplifies to mg/mL divided by 10.',
    steps: [
      { label: 'Scale to 100 mL', expression: `${formatNumber(concentration)} mg/mL × 100 mL = ${formatNumber(concentration * 100)} mg` },
      { label: 'Convert mg to g', expression: `${formatNumber(concentration * 100)} mg ÷ 1,000 = ${formatNumber(percent, 3)} g` },
      { label: 'Read as percent w/v', expression: `${formatNumber(percent, 3)} g/100 mL = ${formatNumber(percent, 3)}%` },
    ],
  });
};

const amountFromPercent = (): Problem => {
  const percent = pick([0.05, 0.1, 0.2, 0.5, 1, 2, 4, 5, 10, 20]);
  const volume = pick([1, 2, 3, 5, 8, 10, 15, 20, 25, 50]);
  const concentration = percent * 10;
  const amount = concentration * volume;
  return numericProblem({
    kind: 'amount-from-percent',
    category: 'percentage',
    categoryLabel: labels.percentage,
    difficulty: 'Applied',
    prompt: `How many mg of active ingredient are present in ${formatNumber(volume)} mL of a ${formatNumber(percent, 2)}% w/v solution?`,
    answer: amount,
    precision: 2,
    unit: 'mg',
    placeholder: '0.00',
    formula: '% w/v × 10 = mg/mL; amount = mg/mL × mL',
    hint: 'Convert the percent to mg/mL, then multiply by the requested volume.',
    steps: [
      { label: 'Interpret the percent', expression: `${formatNumber(percent, 2)} g/100 mL = ${formatNumber(percent * 1000, 2)} mg/100 mL` },
      { label: 'Find mg per mL', expression: `${formatNumber(percent * 1000, 2)} mg ÷ 100 mL = ${formatNumber(concentration, 3)} mg/mL` },
      { label: 'Multiply by volume', expression: `${formatNumber(concentration, 3)} mg/mL × ${formatNumber(volume)} mL = ${formatNumber(amount, 2)} mg` },
    ],
  });
};

const ratioToPercent = (): Problem => {
  const [grams, volume] = pick<[number, number]>([
    [3, 25], [2, 300], [50, 300], [17, 51], [1, 2], [2, 2000], [120, 800], [15, 260],
  ]);
  const percent = (grams / volume) * 100;
  return numericProblem({
    kind: 'ratio-to-percent',
    category: 'percentage',
    categoryLabel: labels.percentage,
    difficulty: 'Applied',
    prompt: `What percentage strength (w/v) is represented by the legacy ratio ${formatNumber(grams)}:${formatNumber(volume)}?`,
    answer: percent,
    precision: percent < 0.1 ? 3 : 2,
    unit: '%',
    placeholder: '0.00',
    formula: 'Ratio a:b = a g in b mL; % = (a ÷ b) × 100',
    hint: 'Treat the first number as grams and the second as mL, then scale to 100 mL.',
    legacyRatio: true,
    steps: [
      { label: 'Interpret the ratio', expression: `${formatNumber(grams)} g ÷ ${formatNumber(volume)} mL` },
      { label: 'Scale to 100 mL', expression: `(${formatNumber(grams)} ÷ ${formatNumber(volume)}) × 100` },
      { label: 'Calculate', expression: `${formatNumber(roundTo(percent, percent < 0.1 ? 3 : 2), percent < 0.1 ? 3 : 2)}% w/v` },
    ],
  });
};

const ratioConcentration = (): Problem => {
  const [grams, volume] = pick<[number, number]>([
    [1, 200], [1, 1000], [1, 10000], [40, 600], [15, 260], [12, 20], [66, 360],
  ]);
  const concentration = (grams * 1000) / volume;
  return numericProblem({
    kind: 'ratio-mgml',
    category: 'ratio',
    categoryLabel: labels.ratio,
    difficulty: 'Foundation',
    prompt: `Convert the legacy ratio strength ${formatNumber(grams)}:${formatNumber(volume)} to mg/mL.`,
    answer: concentration,
    precision: 2,
    unit: 'mg/mL',
    placeholder: '0.00',
    formula: 'mg/mL = (ratio grams × 1,000) ÷ ratio mL',
    hint: 'Convert the grams in the first ratio term to milligrams.',
    legacyRatio: true,
    steps: [
      { label: 'Interpret the ratio', expression: `${formatNumber(grams)} g in ${formatNumber(volume)} mL` },
      { label: 'Convert g to mg', expression: `${formatNumber(grams)} g × 1,000 = ${formatNumber(grams * 1000)} mg` },
      { label: 'Find concentration', expression: `${formatNumber(grams * 1000)} mg ÷ ${formatNumber(volume)} mL = ${formatNumber(roundTo(concentration, 2), 2)} mg/mL` },
    ],
  });
};

const ratioAmount = (): Problem => {
  const [grams, ratioVolume] = pick<[number, number]>([
    [1, 200], [1, 1000], [15, 260], [12, 20], [40, 600], [66, 360],
  ]);
  const volume = pick([1, 2, 3, 5, 8, 10, 15, 20]);
  const concentration = (grams * 1000) / ratioVolume;
  const amount = concentration * volume;
  return numericProblem({
    kind: 'ratio-amount',
    category: 'ratio',
    categoryLabel: labels.ratio,
    difficulty: 'Applied',
    prompt: `How many mg of active ingredient are present in ${formatNumber(volume)} mL of a legacy ${formatNumber(grams)}:${formatNumber(ratioVolume)} solution?`,
    answer: amount,
    precision: 2,
    unit: 'mg',
    placeholder: '0.00',
    formula: 'Convert the ratio to mg/mL, then multiply by volume',
    hint: 'The first ratio term is grams. Convert it to mg before finding mg/mL.',
    legacyRatio: true,
    steps: [
      { label: 'Convert the ratio mass', expression: `${formatNumber(grams)} g × 1,000 = ${formatNumber(grams * 1000)} mg` },
      { label: 'Find mg per mL', expression: `${formatNumber(grams * 1000)} mg ÷ ${formatNumber(ratioVolume)} mL = ${formatNumber(concentration, 3)} mg/mL` },
      { label: 'Multiply by volume', expression: `${formatNumber(concentration, 3)} mg/mL × ${formatNumber(volume)} mL = ${formatNumber(roundTo(amount, 2), 2)} mg` },
    ],
  });
};

const percentToRatio = (): Problem => {
  const percent = pick([0.05, 0.1, 0.2, 0.5, 1, 2, 4, 5, 10, 20, 25, 50]);
  const denominator = 100 / percent;
  return ratioProblem({
    kind: 'percent-to-ratio',
    category: 'ratio',
    categoryLabel: labels.ratio,
    difficulty: 'Foundation',
    prompt: `Write ${formatNumber(percent, 2)}% w/v as a normalized legacy ratio strength.`,
    answer: [1, denominator],
    precision: 2,
    placeholder: '1 : 50',
    formula: 'Percent means C:100; divide both sides by C',
    hint: 'Start with percent:100, then make the first ratio term equal to 1.',
    legacyRatio: true,
    steps: [
      { label: 'Write percent as a ratio', expression: `${formatNumber(percent, 2)} : 100` },
      { label: `Divide both terms by ${formatNumber(percent, 2)}`, expression: `1 : (100 ÷ ${formatNumber(percent, 2)})` },
      { label: 'Normalize', expression: `1 : ${formatNumber(denominator, 2)}` },
    ],
  });
};

const reduceRatio = (): Problem => {
  const scale = pick([1.2, 2.5, 3.5, 4, 6.8, 12]);
  const denominator = pick([2, 3, 5, 8, 12, 18, 25, 50]);
  const second = roundTo(scale * denominator, 3);
  return ratioProblem({
    kind: 'reduce-ratio',
    category: 'ratio',
    categoryLabel: labels.ratio,
    difficulty: 'Foundation',
    prompt: `Normalize the ratio ${formatNumber(scale, 3)}:${formatNumber(second, 3)} so the first term is 1.`,
    answer: [1, denominator],
    precision: 2,
    placeholder: '1 : 18',
    formula: 'Divide both ratio terms by the first term',
    hint: `Divide both ${formatNumber(scale, 3)} and ${formatNumber(second, 3)} by ${formatNumber(scale, 3)}.`,
    legacyRatio: true,
    steps: [
      { label: 'Choose the divisor', expression: `Divisor = ${formatNumber(scale, 3)}` },
      { label: 'Divide both terms', expression: `${formatNumber(scale, 3)} ÷ ${formatNumber(scale, 3)} : ${formatNumber(second, 3)} ÷ ${formatNumber(scale, 3)}` },
      { label: 'Normalize', expression: `1 : ${formatNumber(denominator, 2)}` },
    ],
  });
};

const massVolumeToRatio = (): Problem => {
  const grams = pick([0.5, 0.625, 1.2, 1.5, 2, 2.5, 5]);
  const volume = pick([100, 250, 500, 1000]);
  const milligrams = grams * 1000;
  const denominator = roundTo(volume / grams, 2);
  return ratioProblem({
    kind: 'mass-volume-ratio',
    category: 'ratio',
    categoryLabel: labels.ratio,
    difficulty: 'Applied',
    prompt: `${formatNumber(milligrams)} mg of active ingredient are present in ${formatNumber(volume)} mL. Express this as a normalized legacy ratio strength.`,
    answer: [1, denominator],
    precision: 2,
    placeholder: '1 : 666.67',
    formula: 'Convert mg to g, then divide both terms by grams',
    hint: 'Ratio strength starts with grams:mL, not mg:mL.',
    legacyRatio: true,
    steps: [
      { label: 'Convert mg to g', expression: `${formatNumber(milligrams)} mg ÷ 1,000 = ${formatNumber(grams, 3)} g` },
      { label: 'Write grams:mL', expression: `${formatNumber(grams, 3)} : ${formatNumber(volume)}` },
      { label: 'Normalize the first term', expression: `1 : (${formatNumber(volume)} ÷ ${formatNumber(grams, 3)}) = 1 : ${formatNumber(denominator, 2)}` },
    ],
  });
};

const dilutionFinal = (): Problem => {
  const initialVolume = pick([1, 3, 4, 5, 10, 11, 20, 25, 50]);
  const initialStrength = pick([1, 2, 4, 5, 6, 10, 20, 25, 33, 50]);
  const added = pick([3, 5, 10, 15, 18, 20, 25, 50, 100, 122]);
  const finalVolume = initialVolume + added;
  const finalStrength = (initialVolume * initialStrength) / finalVolume;
  return numericProblem({
    kind: 'dilution-final',
    category: 'dilution',
    categoryLabel: labels.dilution,
    difficulty: 'Applied',
    prompt: `${formatNumber(initialVolume)} mL of a ${formatNumber(initialStrength)}% solution are diluted with ${formatNumber(added)} mL of diluent. What is the final percentage strength?`,
    answer: finalStrength,
    precision: 2,
    unit: '%',
    placeholder: '0.00',
    formula: 'V₁C₁ = V₂C₂, where V₂ = V₁ + diluent',
    hint: 'Add the original and diluent volumes before applying V₁C₁ = V₂C₂.',
    steps: [
      { label: 'Find final volume', expression: `V₂ = ${formatNumber(initialVolume)} mL + ${formatNumber(added)} mL = ${formatNumber(finalVolume)} mL` },
      { label: 'Set up V₁C₁ = V₂C₂', expression: `(${formatNumber(initialVolume)})(${formatNumber(initialStrength)}%) = (${formatNumber(finalVolume)})(C₂)` },
      { label: 'Solve for C₂', expression: `C₂ = ${formatNumber(initialVolume * initialStrength, 2)} ÷ ${formatNumber(finalVolume)} = ${formatNumber(roundTo(finalStrength, 2), 2)}%` },
    ],
  });
};

const dilutionAdded = (): Problem => {
  const initialVolume = pick([10, 20, 30, 40, 50, 60]);
  const initialStrength = pick([2, 4, 5, 6, 8, 10, 20]);
  const factor = pick([1.25, 2, 2.5, 4]);
  const finalStrength = initialStrength / factor;
  const finalVolume = initialVolume * factor;
  const added = finalVolume - initialVolume;
  return numericProblem({
    kind: 'dilution-added',
    category: 'dilution',
    categoryLabel: labels.dilution,
    difficulty: 'Multi-step',
    prompt: `${formatNumber(initialVolume)} mL of a ${formatNumber(initialStrength)}% solution are diluted to a final concentration of ${formatNumber(finalStrength, 2)}%. How many mL of diluent were added?`,
    answer: added,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: 'V₂ = V₁C₁ ÷ C₂; diluent added = V₂ − V₁',
    hint: 'Solve for the total final volume first, then subtract the starting volume.',
    steps: [
      { label: 'Solve for final volume', expression: `V₂ = (${formatNumber(initialVolume)} × ${formatNumber(initialStrength)}%) ÷ ${formatNumber(finalStrength, 2)}% = ${formatNumber(finalVolume, 2)} mL` },
      { label: 'Subtract the original volume', expression: `${formatNumber(finalVolume, 2)} mL − ${formatNumber(initialVolume)} mL` },
      { label: 'Calculate diluent added', expression: `${formatNumber(added, 2)} mL` },
    ],
  });
};

const unitConversion = (): Problem => {
  const variant = pick(['mg-g', 'g-mg', 'kg-lb', 'lb-kg'] as const);
  if (variant === 'mg-g') {
    const grams = pick([0.5, 1.5, 2.5, 5, 7.5, 10, 15, 20, 25]);
    const mg = grams * 1000;
    return numericProblem({
      kind: 'mg-to-g', category: 'conversions', categoryLabel: labels.conversions, difficulty: 'Foundation',
      prompt: `Convert ${formatNumber(mg)} mg to grams.`, answer: grams, precision: 3, unit: 'g', placeholder: '0.000',
      formula: 'grams = milligrams ÷ 1,000', hint: 'There are 1,000 mg in 1 g.',
      steps: [
        { label: 'Use the conversion', expression: `1 g = 1,000 mg` },
        { label: 'Divide by 1,000', expression: `${formatNumber(mg)} mg ÷ 1,000` },
        { label: 'Calculate', expression: `${formatNumber(grams, 3)} g` },
      ],
    });
  }
  if (variant === 'g-mg') {
    const grams = pick([0.25, 0.5, 0.75, 1.2, 1.5, 2, 2.5, 5]);
    const mg = grams * 1000;
    return numericProblem({
      kind: 'g-to-mg', category: 'conversions', categoryLabel: labels.conversions, difficulty: 'Foundation',
      prompt: `Convert ${formatNumber(grams, 3)} g to milligrams.`, answer: mg, precision: 2, unit: 'mg', placeholder: '0.00',
      formula: 'milligrams = grams × 1,000', hint: 'Multiply grams by 1,000.',
      steps: [
        { label: 'Use the conversion', expression: `1 g = 1,000 mg` },
        { label: 'Multiply by 1,000', expression: `${formatNumber(grams, 3)} g × 1,000` },
        { label: 'Calculate', expression: `${formatNumber(mg, 2)} mg` },
      ],
    });
  }
  if (variant === 'kg-lb') {
    const kg = pick([5, 7, 10, 25, 45, 50, 60, 65, 70, 75, 80, 90]);
    const lb = kg * 2.2;
    return numericProblem({
      kind: 'kg-to-lb', category: 'conversions', categoryLabel: labels.conversions, difficulty: 'Foundation',
      prompt: `Using the classroom conversion 1 kg = 2.2 lb, convert ${formatNumber(kg)} kg to pounds.`, answer: lb, precision: 1, unit: 'lb', placeholder: '0.0',
      formula: 'pounds = kilograms × 2.2', hint: 'Multiply kilograms by 2.2.',
      steps: [
        { label: 'Use the conversion', expression: `1 kg = 2.2 lb` },
        { label: 'Multiply', expression: `${formatNumber(kg)} kg × 2.2 lb/kg` },
        { label: 'Calculate', expression: `${formatNumber(lb, 1)} lb` },
      ],
    });
  }
  const kg = pick([5, 7, 10, 25, 45, 50, 60, 65, 70, 75, 80, 90]);
  const lb = kg * 2.2;
  return numericProblem({
    kind: 'lb-to-kg', category: 'conversions', categoryLabel: labels.conversions, difficulty: 'Foundation',
    prompt: `Using the classroom conversion 1 kg = 2.2 lb, convert ${formatNumber(lb, 1)} lb to kilograms.`, answer: kg, precision: 2, unit: 'kg', placeholder: '0.00',
    formula: 'kilograms = pounds ÷ 2.2', hint: 'Divide pounds by 2.2.',
    steps: [
      { label: 'Use the conversion', expression: `1 kg = 2.2 lb` },
      { label: 'Divide', expression: `${formatNumber(lb, 1)} lb ÷ 2.2 lb/kg` },
      { label: 'Calculate', expression: `${formatNumber(kg, 2)} kg` },
    ],
  });
};

const weightBasedDose = (): Problem => {
  const kg = pick([45, 50, 55, 60, 65, 70, 75, 80, 90, 100]);
  const pounds = kg * 2.2;
  const doseRate = pick([10, 20, 25, 30, 40, 50, 100]);
  const concentration = pick([1000, 2500, 5000, 10000, 20000]);
  const totalDose = kg * doseRate;
  const volume = totalDose / concentration;
  return numericProblem({
    kind: 'weight-based-volume',
    category: 'weight-based',
    categoryLabel: labels['weight-based'],
    difficulty: 'Multi-step',
    prompt: `A practice patient weighs ${formatNumber(pounds, 1)} lb. The ordered exercise dose is ${formatNumber(doseRate)} units/kg, and the stock is ${formatNumber(concentration)} units/mL. How many mL are needed?`,
    answer: volume,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: 'lb ÷ 2.2 = kg; kg × units/kg = units; units ÷ units/mL = mL',
    hint: 'Convert pounds to kilograms before applying the dose rate.',
    steps: [
      { label: 'Convert weight', expression: `${formatNumber(pounds, 1)} lb ÷ 2.2 = ${formatNumber(kg, 2)} kg` },
      { label: 'Find total ordered units', expression: `${formatNumber(kg, 2)} kg × ${formatNumber(doseRate)} units/kg = ${formatNumber(totalDose)} units` },
      { label: 'Find volume', expression: `${formatNumber(totalDose)} units ÷ ${formatNumber(concentration)} units/mL = ${formatNumber(roundTo(volume, 2), 2)} mL` },
    ],
  });
};

const generators: Record<PracticeCategory, Array<() => Problem>> = {
  'dose-volume': [unitsPerMlVolume, stockStrengthVolume, percentDoseVolume, amountFromStock],
  percentage: [percentFromGrams, percentFromMilligrams, percentFromMgPerMl, amountFromPercent, ratioToPercent],
  ratio: [ratioConcentration, ratioAmount, percentToRatio, reduceRatio, massVolumeToRatio],
  dilution: [dilutionFinal, dilutionAdded],
  conversions: [unitConversion],
  'weight-based': [weightBasedDose],
};

export const generateProblem = (category: CategoryId, previousKind?: string): Problem => {
  const categoryPool: PracticeCategory[] = category === 'mixed'
    ? ['dose-volume', 'percentage', 'ratio', 'dilution', 'conversions', 'weight-based']
    : [category];
  let result = pick(generators[pick(categoryPool)])();
  let guard = 0;
  while (result.kind === previousKind && guard < 6) {
    result = pick(generators[pick(categoryPool)])();
    guard += 1;
  }
  return result;
};

export const createStarterProblem = (): Problem => ({
  ...numericProblem({
    kind: 'starter-units-volume',
    category: 'dose-volume',
    categoryLabel: labels['dose-volume'],
    difficulty: 'Foundation',
    prompt: 'A practice medication is supplied at 12,500 units/mL. How many mL are needed to give 75,000 units?',
    answer: 6,
    precision: 2,
    unit: 'mL',
    placeholder: '0.00',
    formula: 'Volume = desired dose ÷ concentration',
    hint: 'Arrange the units so “units” cancel and mL remain.',
    steps: [
      { label: 'Write the known values', expression: '75,000 units ÷ 12,500 units/mL' },
      { label: 'Cancel units', expression: '(75,000 ÷ 12,500) mL' },
      { label: 'Calculate', expression: '6 mL' },
    ],
  }),
  id: 'starter-problem',
});

export const isCorrectAnswer = (problem: Problem, rawValue: string): boolean => {
  if (problem.answerKind === 'ratio') {
    const cleaned = rawValue.trim().replace(/\s+/g, '');
    const match = cleaned.match(/^(-?\d*\.?\d+):(-?\d*\.?\d+)$/);
    if (!match || !Array.isArray(problem.answer)) return false;
    const left = Number(match[1]);
    const right = Number(match[2]);
    return Number.isFinite(left)
      && Number.isFinite(right)
      && Math.abs(left - problem.answer[0]) <= problem.tolerance
      && Math.abs(right - problem.answer[1]) <= problem.tolerance;
  }
  const parsed = Number(rawValue.trim().replace(/,/g, ''));
  return typeof problem.answer === 'number'
    && Number.isFinite(parsed)
    && Math.abs(parsed - problem.answer) <= problem.tolerance;
};

export const hasParseableAnswer = (problem: Problem, rawValue: string): boolean => {
  if (problem.answerKind === 'ratio') {
    return /^\s*-?\d*\.?\d+\s*:\s*-?\d*\.?\d+\s*$/.test(rawValue);
  }
  return rawValue.trim() !== '' && Number.isFinite(Number(rawValue.trim().replace(/,/g, '')));
};
