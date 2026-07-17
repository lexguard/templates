import { useMemo, useState } from 'react';
import type { Plan, Ad, AdAssignment, Campaign } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

type ViewMode = 'cards' | 'columns' | 'config';

export function AdsSection({ plan }: Props) {
  const [mode, setMode] = useState<ViewMode>('cards');

  return (
    <div className="border-y border-border bg-secondary/40">
      <Section
        id="ads"
        title="Los anuncios"
        subtitle="Mapeo por etapa del embudo, formato, pilar Hormozi y problema que ataca."
      >
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-card p-1 shadow-sm w-fit">
          <button
            onClick={() => setMode('cards')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === 'cards'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setMode('columns')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === 'columns'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Columnas por campaña
          </button>
          <button
            onClick={() => setMode('config')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === 'config'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Configuración
          </button>
        </div>

        {mode === 'cards' ? (
          <CardsView ads={plan.ads} assignments={plan.adAssignments} campaigns={plan.campaigns} />
        ) : mode === 'columns' ? (
          <ColumnsView ads={plan.ads} campaigns={plan.campaigns} assignments={plan.adAssignments} />
        ) : (
          <ConfigView ads={plan.ads} adSetConfigs={plan.adSetConfigs} assignments={plan.adAssignments} />
        )}
      </Section>
    </div>
  );
}

function ConfigView({
  ads,
  adSetConfigs,
  assignments,
}: {
  ads: Ad[];
  adSetConfigs: Plan['adSetConfigs'];
  assignments: AdAssignment[];
}) {
  const grouped = useMemo(() => {
    const byAdSet = assignments.reduce((acc, a) => {
      if (a.role === 'banca') return acc;
      if (!acc[a.adSet]) acc[a.adSet] = [];
      acc[a.adSet].push(a);
      return acc;
    }, {} as Record<string, AdAssignment[]>);

    return Object.entries(byAdSet)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([adSet, items]) => ({
        adSet,
        config: adSetConfigs[adSet],
        items: items.map((item) => ({
          ...item,
          ad: ads.find((ad) => ad.id === item.adId)!,
        })),
      }));
  }, [ads, adSetConfigs, assignments]);

  return (
    <div className="space-y-8">
      {grouped.map(({ adSet, config, items }) => (
        <div
          key={adSet}
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <div className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Conjunto de anuncios · {adSet}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{config?.name || adSet}</h3>
              </div>
              {config && (
                <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {config.budget}
                </span>
              )}
            </div>
            {config && (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ConfigField label="Estrategia de puja" value={config.bidStrategy} />
                <ConfigField label="Objetivo de optimización" value={config.optimizationGoal} />
                <ConfigField label="Ubicación de conversión" value={config.conversionLocation} />
                <ConfigField label="Meta de performance" value={config.performanceGoal} />
              </div>
            )}
          </div>

          {config?.audience && (
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-semibold">Audiencia</h4>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ConfigField
                  label="Ubicación"
                  value={config.audience.location.join(' · ')}
                />
                <ConfigField
                  label="Edad / Género"
                  value={`${config.audience.ageMin}-${config.audience.ageMax} / ${config.audience.gender === 'all' ? 'Todos' : config.audience.gender}`}
                />
                <ConfigField
                  label="Idiomas"
                  value={config.audience.languages?.join(', ')}
                />
                <ConfigField
                  label="Placements"
                  value={
                    config.audience.placements === 'advantage_plus'
                      ? 'Advantage+ Placements'
                      : config.audience.placementList?.join(', ')
                  }
                />
              </div>
              {config.audience.interests && config.audience.interests.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Intereses</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {config.audience.interests.map((interest) => (
                      <span key={interest} className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {config.audience.customAudiences && config.audience.customAudiences.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Audiencias personalizadas</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {config.audience.customAudiences.map((aud) => (
                      <span key={aud} className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {config.audience.excludedAudiences && config.audience.excludedAudiences.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Audiencias excluidas</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {config.audience.excludedAudiences.map((aud) => (
                      <span key={aud} className="rounded-full border border-destructive/30 px-2 py-0.5 text-xs text-destructive">
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-4">
            <h4 className="text-sm font-semibold">Anuncios en este conjunto</h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ ad, role }) => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-border bg-secondary/50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {ad.id}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase ${
                        role === 'principal' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {role === 'principal'
                        ? 'Principal'
                        : role === 'secundario'
                        ? 'Secundario'
                        : role}
                    </span>
                  </div>
                  <h5 className="mt-2 text-sm font-semibold">{ad.name}</h5>
                  <p className="mt-1 text-xs text-muted-foreground">{ad.format}</p>

                  <div className="mt-3 space-y-2 text-sm">
                    {ad.creative.headline && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Headline</p>
                        <p className="mt-0.5">{ad.creative.headline}</p>
                      </div>
                    )}
                    {ad.creative.primaryText && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Texto principal</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{ad.creative.primaryText}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                        CTA: {ad.creative.cta}
                      </span>
                      <span className="rounded-md border border-border px-2 py-0.5">
                        {ad.creative.aspectRatio}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">UTM</p>
                    <div className="mt-1 space-y-0.5 text-xs font-mono text-muted-foreground">
                      <p>source={ad.utm.source}</p>
                      <p>medium={ad.utm.medium}</p>
                      <p>campaign={ad.utm.campaign}</p>
                      <p>content={ad.utm.content}</p>
                      {ad.utm.term && <p>term={ad.utm.term}</p>}
                    </div>
                    <a
                      href={ad.creative.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block truncate max-w-full text-xs text-primary hover:underline"
                      title={ad.creative.destination}
                    >
                      {ad.creative.displayLink || ad.creative.destination}
                    </a>
                  </div>

                  {ad.creative.imageOrVideoNotes && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Notas de producción</p>
                      <p className="mt-1 text-xs text-muted-foreground">{ad.creative.imageOrVideoNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfigField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function CardsView({
  ads,
  assignments,
  campaigns,
}: {
  ads: Ad[];
  assignments: AdAssignment[];
  campaigns: Campaign[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} assignments={assignments} campaigns={campaigns} />
      ))}
    </div>
  );
}

function AdCard({
  ad,
  assignments,
  campaigns,
}: {
  ad: Ad;
  assignments: AdAssignment[];
  campaigns: Campaign[];
}) {
  const assigned = useMemo(
    () => assignments.filter((a) => a.adId === ad.id),
    [assignments, ad.id]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
          {ad.id}
        </span>
        <span className="text-right text-xs text-muted-foreground">{ad.format}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold">{ad.name}</h3>
      <p className="mt-2 text-sm font-medium text-primary">“{ad.hook}”</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Tag>{ad.pillar}</Tag>
        <Tag>{ad.problem}</Tag>
      </div>

      {assigned.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pertenece a</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {assigned.map((a) => {
              const campaign = campaigns.find((c) => c.id === a.campaignId);
              return (
                <span
                  key={`${a.campaignId}-${a.adSet}-${a.role}`}
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    a.role === 'principal'
                      ? 'bg-primary/10 text-primary font-medium'
                      : a.role === 'banca'
                      ? 'bg-muted text-muted-foreground line-through'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {campaign?.name} · {a.adSet}
                  {a.role !== 'principal' && ` (${a.role})`}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-2 py-0.5">{children}</span>;
}

function ColumnsView({
  ads,
  campaigns,
  assignments,
}: {
  ads: Ad[];
  campaigns: Campaign[];
  assignments: AdAssignment[];
}) {
  const grouped = useMemo(() => {
    return campaigns.map((campaign) => {
      const campaignAds = assignments.filter(
        (a) => a.campaignId === campaign.id && a.role !== 'banca'
      );
      const byAdSet = campaignAds.reduce((acc, a) => {
        if (!acc[a.adSet]) acc[a.adSet] = [];
        acc[a.adSet].push(a);
        return acc;
      }, {} as Record<string, typeof campaignAds>);

      return {
        campaign,
        adSets: Object.entries(byAdSet).map(([adSet, items]) => ({
          adSet,
          items,
        })),
      };
    });
  }, [campaigns, assignments]);

  const campaignColor: Record<string, string> = {
    C1: 'bg-primary/80',
    C2: 'bg-emerald-500/80',
    C3: 'bg-amber-500/80',
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map(({ campaign, adSets }) => (
        <div key={campaign.id} className="rounded-2xl border border-border bg-card shadow-sm">
          <div className={`rounded-t-2xl px-5 py-4 ${campaignColor[campaign.id] || 'bg-muted'}`}>
            <div className="flex items-center justify-between text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-sm font-bold">
                {campaign.id}
              </span>
              <span className="text-xs font-medium opacity-90">{campaign.budget}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">{campaign.name}</h3>
            <p className="text-xs text-white/80">{campaign.goal}</p>
          </div>

          <div className="p-5">
            {adSets.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin anuncios asignados.</p>
            )}
            <div className="space-y-4">
              {adSets.map(({ adSet, items }) => (
                <div key={adSet} className="rounded-lg border border-border bg-secondary p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Conjunto de anuncios · {adSet}
                  </p>
                  <div className="mt-2 space-y-2">
                    {items.map((item) => {
                      const ad = ads.find((a) => a.id === item.adId);
                      return (
                        <div
                          key={item.adId}
                          className="flex items-center justify-between rounded-md bg-card px-3 py-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary shrink-0">
                              {item.adId}
                            </span>
                            <span className="text-sm truncate" title={ad?.name}>{ad?.name}</span>
                          </div>
                          <span
                          className={`text-[10px] font-medium uppercase shrink-0 ${
                          item.role === 'principal'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                          }`}
                          >
                          {item.role === 'principal' ? 'Principal' : item.role === 'secundario' ? 'Secundario' : item.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
