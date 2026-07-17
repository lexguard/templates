import type { Plan } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

export function PendingSection({ plan }: Props) {
  return (
    <Section id="pendientes" title="Pendientes antes de lanzar">
      <ul className="mt-6 space-y-3">
        {plan.pending.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
