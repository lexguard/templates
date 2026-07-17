// Shared data interfaces for every plan in `src/data`.
//
// These used to be duplicated verbatim at the top of each meta-ads data file
// (metaAdsPlan.ts + the per-brand campaign files). They now live here once and
// are imported (and re-exported for backward compat) by those files. Edit a
// shape once, here.

// ---------------------------------------------------------------------------
// Meta Ads plan
// ---------------------------------------------------------------------------

export interface Principle {
  title: string;
  body: string;
}

export interface Hypothesis {
  h: string;
  m: string;
  i: string;
}

export interface Angle {
  code: string;
  pain: string;
  ads: string;
  hook: string;
}

export interface Campaign {
  id: string;
  name: string;
  dest: string;
  budget: string;
  goal: string;
  note: string;
  angles: Angle[];
}

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term?: string;
}

export interface AudienceConfig {
  location: string[];
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  languages?: string[];
  interests?: string[];
  customAudiences?: string[];
  excludedAudiences?: string[];
  placements?: 'advantage_plus' | 'manual';
  placementList?: string[];
}

export interface AdSetConfig {
  name: string;
  budget: string;
  bidStrategy?: string;
  optimizationGoal?: string;
  conversionLocation?: string;
  performanceGoal?: string;
  audience: AudienceConfig;
}

export interface AdCreativeConfig {
  headline?: string;
  primaryText?: string;
  description?: string;
  cta: string;
  destination: string;
  displayLink?: string;
  format: string;
  aspectRatio: string;
  duration?: string;
  imageOrVideoNotes?: string;
  captions?: boolean;
  music?: string;
}

export interface Ad {
  id: string;
  name: string;
  format: string;
  pillar: string;
  problem: string;
  hook: string;
  creative: AdCreativeConfig;
  utm: UtmParams;
}

export interface AdAssignment {
  adId: string;
  campaignId: string;
  adSet: string;
  role: 'principal' | 'secundario' | 'rotación' | 'banca';
}

export interface AdRun {
  adId: string;
  campaignId: string;
  adSet: string;
  role: 'principal' | 'secundario' | 'rotación' | 'banca';
  startDay: number;
  endDay?: number;
  dailySpend: number;
}

export interface SpendDay {
  day: number;
  c1: number;
  c2: number;
  c3: number;
  total: number;
  cumulative: number;
}

export interface BudgetItem {
  item: string;
  value: string;
}

export interface DecisionRule {
  day: string;
  rule: string;
}

export interface LaunchStep {
  phase: string;
  action: string;
}

export interface MetaAdsPlan {
  title: string;
  subtitle: string;
  updated: string;
  account: string;
  successCriteria: string;
  principles: Principle[];
  thesis: Hypothesis[];
  campaigns: Campaign[];
  ads: Ad[];
  adSetConfigs: Record<string, AdSetConfig>;
  budgetVariant: string;
  regularPrice: string;
  offerPrice: string;
  offerLabel: string;
  budgetBreakdown: BudgetItem[];
  decisionRules: DecisionRule[];
  launchSteps: LaunchStep[];
  adAssignments: AdAssignment[];
  spendTimeline: SpendDay[];
  adRuns: AdRun[];
  pending: string[];
}
