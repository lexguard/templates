import {
  HeroSection,
  PrinciplesSection,
  ThesisSection,
  CampaignsSection,
  AdsSection,
  ScheduleSection,
  BudgetSection,
  LaunchSection,
  PendingSection,
  Footer,
} from './meta-ads-plan';
import type { MetaAdsPlan } from '../data/interfaces';

interface Props {
  plan: MetaAdsPlan;
}

export function MetaAdsPlanPage({ plan }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection plan={plan} />
      <PrinciplesSection plan={plan} />
      <ThesisSection plan={plan} />
      <CampaignsSection plan={plan} />
      <AdsSection plan={plan} />
      <ScheduleSection plan={plan} />
      <BudgetSection plan={plan} />
      <LaunchSection plan={plan} />
      <PendingSection plan={plan} />
      <Footer />
    </div>
  );
}
