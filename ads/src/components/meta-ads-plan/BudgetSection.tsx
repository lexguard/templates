import type { Plan } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

export function BudgetSection({ plan }: Props) {
  return (
    <Section id="presupuesto" title="Presupuesto y reglas">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Presupuesto base del plan.</p>
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-3xl font-semibold">{plan.budgetVariant}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {plan.budgetBreakdown.map((b) => (
                <li
                  key={b.item}
                  className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{b.item}</span>
                  <span className="font-medium">{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Escritas antes de lanzar para no negociar con los datos.</p>
          <div className="mt-6 space-y-4">
            {plan.decisionRules.map((r) => (
              <div key={r.day} className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  {r.day.split(' ')[1]}
                </span>
                <div>
                  <p className="text-sm font-medium">{r.day}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.rule}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
