import type { Plan } from './types';
import { Section } from './PrinciplesSection';
import { AdMappingTimeline } from './AdMappingTimeline';

interface Props {
  plan: Plan;
}

export function ScheduleSection({ plan }: Props) {
  return (
    <Section
      id="schedule"
      title="Cronograma de anuncios"
      subtitle="Cada barra horizontal es un anuncio. El ancho indica cuántos días corre y el desplazamiento indica cuándo inicia."
    >
      <AdMappingTimeline plan={plan} />
    </Section>
  );
}
