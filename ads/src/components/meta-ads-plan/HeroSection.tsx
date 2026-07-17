import type { Plan } from './types';

interface Props {
  plan: Plan;
}

export function HeroSection({ plan }: Props) {
  return (
    <section id="resumen" className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Plan activo · Actualizado {plan.updated}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {plan.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              {plan.subtitle}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:pb-2">
            <a
              href="#campaigns"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Ver campañas
            </a>
            <a
              href="#ads"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground transition hover:bg-accent"
            >
              Ver anuncios
            </a>
            <a
              href="#schedule"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground transition hover:bg-accent"
            >
              Cronograma
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Cuenta objetivo" value={plan.account} />
          <Stat label="Presupuesto del plan" value={plan.budgetVariant} />
          <Stat
            label={`${plan.offerLabel} · Precio regular ${plan.regularPrice}`}
            value={plan.offerPrice}
          />
          <Stat label="Métrica reina" value="Costo por lead ICP" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}
