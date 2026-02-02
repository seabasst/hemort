import { Municipality, municipalities, getMunicipality, formatCurrency } from "@/data/municipalities";

// ── Input types (mirrors the 4 form steps) ──

export interface WorkInput {
  profession: string;
  partnerProfession?: string; // shown if adults === 2
  workKommun: string; // slug of work municipality, or "remote"
  currentCommuteMinutes: number;
  openToNewJob: "yes" | "no" | "maybe";
}

export interface FamilyInput {
  adults: 1 | 2;
  childrenAges: ("0-1" | "1-3" | "3-6" | "6-12" | "13-18")[];
  planningChildren: "yes" | "no" | "maybe";
}

export interface HousingInput {
  currentKommun: string; // slug
  housingType: "apartment" | "house" | "townhouse";
  monthlyCost: number; // current monthly cost SEK
  size: number; // m²
  hasCar: boolean;
}

export interface PriorityInput {
  space: number;    // 1-5
  costs: number;    // 1-5
  schools: number;  // 1-5
  nature: number;   // 1-5
  commute: number;  // 1-5
  calm: number;     // 1-5
  culture: number;  // 1-5
  familyLocation?: string; // slug of family kommun
}

export interface SimulationInput {
  work: WorkInput;
  family: FamilyInput;
  housing: HousingInput;
  priorities: PriorityInput;
}

// ── Output types ──

export interface HousingDelta {
  pricePerSqm: number;
  estimatedMonthly: number;
  costDelta: number; // positive = more expensive
  sqmForSameBudget: number; // how many sqm you get for your current budget
}

export interface CommuteDelta {
  estimatedMinutes: number;
  changeFromCurrent: number; // positive = longer
}

export interface JobInfo {
  marketScore: number;
  incomeDelta: number;
  unemployment: number;
}

export interface FamilyInfo {
  schoolCount: number;
  familyFriendlyScore: number;
  forskolorNearby: number;
  schoolRatingVsNational: "above" | "below" | "average";
}

export interface LifestyleDelta {
  natureScore: number;
  cultureScore: number;
  safetyScore: number;
  taxDifference: number; // positive = higher tax
  populationDensityRatio: number; // <1 = less dense, >1 = more dense
  nearestNature: string;
  nearestNatureMinutes: number;
}

export interface SimulationResult {
  municipality: Municipality;
  matchScore: number; // 0-100
  housingDelta: HousingDelta;
  commuteDelta: CommuteDelta;
  jobInfo: JobInfo;
  familyInfo: FamilyInfo | null;
  lifestyleDelta: LifestyleDelta;
  summary: string;
  topPositives: string[];
  topNegatives: string[];
}

// ── Distance table (km between major cities) ──

const distanceTable: Record<string, Record<string, number>> = {
  stockholm: { goteborg: 470, malmo: 615, uppsala: 70, linkoping: 200, umea: 630, lund: 600, vasteras: 110, orebro: 200, helsingborg: 555, norrkoping: 165, jonkoping: 330, lulea: 900, visby: 270, sundsvall: 390, karlstad: 305, vaxjo: 380, kalmar: 390, ostersund: 570, falkenberg: 470 },
  goteborg: { stockholm: 470, malmo: 270, uppsala: 530, linkoping: 290, umea: 960, lund: 260, vasteras: 380, orebro: 290, helsingborg: 230, norrkoping: 310, jonkoping: 150, lulea: 1260, visby: 600, sundsvall: 770, karlstad: 250, vaxjo: 250, kalmar: 370, ostersund: 680, falkenberg: 100 },
  malmo: { stockholm: 615, goteborg: 270, uppsala: 680, linkoping: 440, umea: 1200, lund: 18, vasteras: 530, orebro: 440, helsingborg: 65, norrkoping: 460, jonkoping: 300, lulea: 1500, visby: 700, sundsvall: 1000, karlstad: 500, vaxjo: 200, kalmar: 310, ostersund: 930, falkenberg: 180 },
  linkoping: { stockholm: 200, goteborg: 290, malmo: 440, uppsala: 250, vasteras: 200, orebro: 150, norrkoping: 45, jonkoping: 130 },
  vasteras: { stockholm: 110, goteborg: 380, orebro: 110, uppsala: 100, linkoping: 200 },
  orebro: { stockholm: 200, goteborg: 290, vasteras: 110, linkoping: 150, karlstad: 120 },
  uppsala: { stockholm: 70, vasteras: 100, orebro: 230 },
};

function getDistance(from: string, to: string): number {
  if (from === to) return 0;
  const row = distanceTable[from];
  if (row && row[to] !== undefined) return row[to];
  const reverseRow = distanceTable[to];
  if (reverseRow && reverseRow[from] !== undefined) return reverseRow[from];
  const mFrom = getMunicipality(from);
  const mTo = getMunicipality(to);
  if (mFrom && mTo) {
    return Math.abs(mFrom.distanceToCity - mTo.distanceToCity) + 100;
  }
  return 300;
}

function estimateCommuteMinutes(distanceKm: number): number {
  if (distanceKm === 0) return 10;
  if (distanceKm < 50) return 30;
  if (distanceKm < 150) return 60;
  if (distanceKm < 300) return 90;
  return 120;
}

// ── Nature type labels ──

const natureLabels: Record<Municipality["nature"], string> = {
  skog: "Skog",
  kust: "Kust & hav",
  fjäll: "Fjäll",
  slättland: "Slättland",
  sjö: "Sjö",
  skärgård: "Skärgård",
};

function estimateNatureMinutes(m: Municipality): number {
  // Smaller / more rural = closer to nature
  const density = m.population / m.area;
  if (density < 30) return 0;
  if (density < 100) return 5;
  if (density < 500) return 10;
  if (density < 2000) return 15;
  return 20;
}

// ── Mortgage calculator ──

export function calculateMortgage(loanAmount: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12;
  const payments = years * 12;
  if (monthlyRate === 0) return loanAmount / payments;
  const factor = Math.pow(1 + monthlyRate, payments);
  return Math.round(loanAmount * (monthlyRate * factor) / (factor - 1));
}

// ── Main scoring ──

export function runSimulation(input: SimulationInput): SimulationResult[] {
  const currentM = getMunicipality(input.housing.currentKommun);
  const currentIncome = currentM?.avgIncome ?? 350000;
  const currentTax = currentM?.taxRate ?? 32;
  const currentDensity = currentM ? currentM.population / currentM.area : 500;

  const results: SimulationResult[] = [];

  for (const m of municipalities) {
    if (m.slug === input.housing.currentKommun) continue;

    const housingDelta = calculateHousingDelta(m, input);
    const commuteDelta = calculateCommuteDelta(m, input);

    const jobInfo: JobInfo = {
      marketScore: m.jobMarketScore,
      incomeDelta: m.avgIncome - currentIncome,
      unemployment: m.unemployment,
    };

    const hasKids = input.family.childrenAges.length > 0;
    const planningKids = input.family.planningChildren !== "no";
    const familyInfo: FamilyInfo | null =
      hasKids || planningKids
        ? {
            schoolCount: m.schools,
            familyFriendlyScore: m.familyFriendlyScore,
            forskolorNearby: Math.max(1, Math.round(m.schools * 0.3)),
            schoolRatingVsNational: m.familyFriendlyScore >= 9 ? "above" : m.familyFriendlyScore >= 7 ? "average" : "below",
          }
        : null;

    const targetDensity = m.population / m.area;
    const lifestyleDelta: LifestyleDelta = {
      natureScore: m.outdoorScore,
      cultureScore: m.culturalOfferScore,
      safetyScore: m.safetyIndex,
      taxDifference: Math.round((m.taxRate - currentTax) * 100) / 100,
      populationDensityRatio: Math.round((targetDensity / currentDensity) * 100) / 100,
      nearestNature: natureLabels[m.nature],
      nearestNatureMinutes: estimateNatureMinutes(m),
    };

    const matchScore = calculateMatchScore(m, input, housingDelta, commuteDelta, jobInfo, familyInfo, lifestyleDelta);
    const { topPositives, topNegatives } = generateHighlights(m, housingDelta, commuteDelta, jobInfo, familyInfo, lifestyleDelta);
    const summary = generateSummary(m, housingDelta, commuteDelta, topPositives);

    results.push({
      municipality: m,
      matchScore,
      housingDelta,
      commuteDelta,
      jobInfo,
      familyInfo,
      lifestyleDelta,
      summary,
      topPositives,
      topNegatives,
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

function calculateHousingDelta(m: Municipality, input: SimulationInput): HousingDelta {
  const pricePerSqm = m.avgHousingPrice;
  let estimatedMonthly: number;

  if (input.housing.housingType === "apartment") {
    const sizeRatio = input.housing.size / 55;
    estimatedMonthly = Math.round(m.avgRentApartment * sizeRatio);
  } else {
    // Villa / townhouse: mortgage on 85% of price
    const totalPrice = pricePerSqm * input.housing.size;
    const loan = totalPrice * 0.85;
    estimatedMonthly = calculateMortgage(loan, 0.04, 30);
  }

  // sqm for same budget
  let sqmForSameBudget: number;
  if (input.housing.housingType === "apartment") {
    const baseSqm = 55;
    const baseRent = m.avgRentApartment;
    sqmForSameBudget = baseRent > 0 ? Math.round((input.housing.monthlyCost / baseRent) * baseSqm) : input.housing.size;
  } else {
    // Reverse mortgage: what loan can you afford with current monthly payment?
    const monthlyRate = 0.04 / 12;
    const payments = 30 * 12;
    const factor = Math.pow(1 + monthlyRate, payments);
    const maxLoan = input.housing.monthlyCost * (factor - 1) / (monthlyRate * factor);
    const maxPrice = maxLoan / 0.85;
    sqmForSameBudget = pricePerSqm > 0 ? Math.round(maxPrice / pricePerSqm) : input.housing.size;
  }

  return {
    pricePerSqm,
    estimatedMonthly,
    costDelta: estimatedMonthly - input.housing.monthlyCost,
    sqmForSameBudget,
  };
}

function calculateCommuteDelta(m: Municipality, input: SimulationInput): CommuteDelta {
  if (input.work.workKommun === "remote") {
    return { estimatedMinutes: 0, changeFromCurrent: 0 - input.work.currentCommuteMinutes };
  }

  const distanceNew = getDistance(m.slug, input.work.workKommun);
  const newMinutes = estimateCommuteMinutes(distanceNew);

  return {
    estimatedMinutes: newMinutes,
    changeFromCurrent: newMinutes - input.work.currentCommuteMinutes,
  };
}

function calculateMatchScore(
  m: Municipality,
  input: SimulationInput,
  housing: HousingDelta,
  commute: CommuteDelta,
  job: JobInfo,
  family: FamilyInfo | null,
  lifestyle: LifestyleDelta,
): number {
  const p = input.priorities;
  const totalWeight = p.space + p.costs + p.schools + p.nature + p.commute + p.calm + p.culture;
  if (totalWeight === 0) return 50;

  let score = 0;

  // Space: bigger area / lower housing price = more space per krona
  const spaceScore = Math.min(10, (100000 / m.avgHousingPrice) * 2);
  score += (spaceScore / 10) * p.space;

  // Costs: lower housing cost delta + lower tax = better
  const costScore = housing.costDelta <= -3000 ? 10 : housing.costDelta <= 0 ? 7 : housing.costDelta <= 3000 ? 4 : 2;
  score += (costScore / 10) * p.costs;

  // Schools
  const schoolScore = family ? family.familyFriendlyScore : 5;
  score += (schoolScore / 10) * p.schools;

  // Nature
  score += (m.outdoorScore / 10) * p.nature;

  // Commute
  const commuteScore = commute.estimatedMinutes <= 15 ? 10 : commute.estimatedMinutes <= 30 ? 8 : commute.estimatedMinutes <= 60 ? 5 : 2;
  score += (commuteScore / 10) * p.commute;

  // Calm (safety + low population density)
  score += (m.safetyIndex / 10) * p.calm;

  // Culture
  score += (m.culturalOfferScore / 10) * p.culture;

  // Job market bonus
  if (input.work.openToNewJob !== "no") {
    score += (job.marketScore / 10) * 0.5;
  }

  // Family location bonus
  if (input.priorities.familyLocation) {
    const dist = getDistance(m.slug, input.priorities.familyLocation);
    if (dist < 100) score += 1.5;
    else if (dist < 200) score += 0.5;
  }

  const maxPossible = totalWeight + (input.work.openToNewJob !== "no" ? 0.5 : 0) + (input.priorities.familyLocation ? 1.5 : 0);
  const normalized = Math.round((score / maxPossible) * 100);
  return Math.min(100, Math.max(0, normalized));
}

function generateHighlights(
  m: Municipality,
  housing: HousingDelta,
  commute: CommuteDelta,
  job: JobInfo,
  family: FamilyInfo | null,
  lifestyle: LifestyleDelta,
): { topPositives: string[]; topNegatives: string[] } {
  const positives: string[] = [];
  const negatives: string[] = [];

  if (housing.costDelta <= -2000) {
    positives.push(`Spara ~${formatCurrency(Math.abs(housing.costDelta))}/mån på boendet`);
  } else if (housing.costDelta >= 2000) {
    negatives.push(`Boendet kostar ~${formatCurrency(housing.costDelta)}/mån mer`);
  }

  if (commute.changeFromCurrent < -15) {
    positives.push(`${Math.abs(commute.changeFromCurrent)} min kortare pendling`);
  } else if (commute.changeFromCurrent > 15) {
    negatives.push(`${commute.changeFromCurrent} min längre pendling`);
  }

  if (job.incomeDelta > 20000) {
    positives.push(`Högre snittlön (+${formatCurrency(job.incomeDelta)}/år)`);
  } else if (job.incomeDelta < -20000) {
    negatives.push(`Lägre snittlön (${formatCurrency(job.incomeDelta)}/år)`);
  }

  if (m.outdoorScore >= 9) positives.push("Fantastiska naturupplevelser");
  if (m.safetyIndex >= 9) positives.push("Hög trygghet");
  if (m.culturalOfferScore >= 9) positives.push("Rikt kulturliv");
  if (family && m.familyFriendlyScore >= 9) positives.push("Mycket familjevänligt");
  if (m.jobMarketScore <= 4) negatives.push("Begränsad arbetsmarknad");
  if (lifestyle.taxDifference > 1) negatives.push(`Högre skatt (+${lifestyle.taxDifference.toFixed(1)}%)`);
  else if (lifestyle.taxDifference < -1) positives.push(`Lägre skatt (${lifestyle.taxDifference.toFixed(1)}%)`);

  return {
    topPositives: positives.slice(0, 3),
    topNegatives: negatives.slice(0, 3),
  };
}

function generateSummary(
  m: Municipality,
  housing: HousingDelta,
  commute: CommuteDelta,
  topPositives: string[],
): string {
  const parts: string[] = [];

  if (housing.costDelta <= -2000) {
    parts.push(`kan du spara ~${formatCurrency(Math.abs(housing.costDelta))}/mån på boendet`);
  } else if (housing.costDelta <= 0) {
    parts.push("ligger boendekostnaden på ungefär samma nivå");
  }

  if (housing.sqmForSameBudget > 0 && housing.sqmForSameBudget > 100) {
    parts.push(`bo på ${housing.sqmForSameBudget} kvm för samma peng`);
  }

  if (commute.estimatedMinutes <= 30 && commute.changeFromCurrent <= 0) {
    parts.push("ha nära till jobbet");
  }

  if (topPositives.length > 0 && parts.length < 2) {
    const extra = topPositives.find(
      (p) => !p.includes("Spara") && !p.includes("pendling") && !p.includes("kvm")
    );
    if (extra) parts.push(extra.toLowerCase());
  }

  if (parts.length === 0) {
    return `${m.name} kan vara ett intressant alternativ med ${m.highlights[0]?.toLowerCase() ?? "sin unika karaktär"}.`;
  }

  return `I ${m.name} ${parts[0]}${parts.length > 1 ? ` och ${parts[1]}` : ""}.`;
}

// ── Professions list ──

export const professions = [
  "Administratör",
  "Arkitekt",
  "Barnmorska",
  "Butiksäljare",
  "Byggarbetare",
  "Chef/Ledare",
  "Civilingenjör",
  "Designer",
  "Ekonom",
  "Elektriker",
  "Förskollärare",
  "IT-konsult",
  "Jurist",
  "Kommunikatör",
  "Lagerarbetare",
  "Lärare",
  "Läkare",
  "Marknadsförare",
  "Mjukvaruutvecklare",
  "Projektledare",
  "Psykolog",
  "Redovisningskonsult",
  "Sjuksköterska",
  "Snickare",
  "Socionom",
  "Säljare",
  "Tandläkare",
  "Undersköterska",
  "Veterinär",
  "VVS-montör",
];
