import type { Plan } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

export function LaunchSection({ plan }: Props) {
  return (
    <div className="border-y border-border bg-secondary/40">
      <Section id="runbook" title="Runbook de lanzamiento">
        <div className="relative mt-8">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border lg:left-1/2" />
          <div className="space-y-8">
            {plan.launchSteps.map((l, idx) => {
              const reverse = idx % 2 !== 0;
              return (
                <div
                  key={l.phase}
                  className={`relative flex items-center gap-6 ${
                    reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
                  }`}
                >
                  <div className="hidden lg:block lg:w-1/2" />
                  <div className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold text-primary lg:left-1/2 lg:-translate-x-1/2">
                    {idx + 1}
                  </div>
                  <div className="ml-14 rounded-xl border border-border bg-card p-5 shadow-sm lg:ml-0 lg:w-1/2">
                    <p className="text-sm font-bold text-primary">{l.phase}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{l.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}
