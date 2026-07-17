import type { Plan } from './types';

interface Props {
  plan: Plan;
}

export function PrinciplesSection({ plan }: Props) {
  return (
    <Section id="principios" title="Principios del plan" subtitle="Lo que decidimos en la reunión del 2026-07-02.">
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.principles.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-lg font-medium">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Section({
  title,
  subtitle,
  id,
  children,
}: {
  title: string;
  subtitle?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  );
}
