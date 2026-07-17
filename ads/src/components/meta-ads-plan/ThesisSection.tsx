import type { Plan } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

export function ThesisSection({ plan }: Props) {
  return (
    <div className="border-y border-border bg-secondary/40">
      <Section id="tesis" title="La tesis a validar" subtitle="Cinco hipótesis falsables y cómo las mide cada pieza.">
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hipótesis</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cómo la miden los ads</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Instrumento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.thesis.map((t) => (
                <tr key={t.h} className="hover:bg-accent/30 transition">
                  <td className="px-4 py-3 font-medium">{t.h}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.m}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.i}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-lg border-l-4 border-primary bg-card p-5 shadow-sm">
          <p className="text-sm font-medium">Criterio de éxito a 30 días</p>
          <p className="mt-1 text-sm text-muted-foreground">{plan.successCriteria}</p>
        </div>
      </Section>
    </div>
  );
}
