import { useMemo } from 'react';
import type { Plan, Campaign, Ad, AdAssignment } from './types';
import { Section } from './PrinciplesSection';

interface Props {
  plan: Plan;
}

export function CampaignsSection({ plan }: Props) {
  return (
    <Section
      id="campaigns"
      title="Estructura de campañas"
      subtitle="Campañas con sus ad sets y los anuncios que corren en cada uno."
    >
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {plan.campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            ads={plan.ads}
            assignments={plan.adAssignments}
          />
        ))}
      </div>
    </Section>
  );
}

function CampaignCard({
  campaign,
  ads,
  assignments,
}: {
  campaign: Campaign;
  ads: Ad[];
  assignments: AdAssignment[];
}) {
  const assigned = useMemo(
    () => assignments.filter((a) => a.campaignId === campaign.id),
    [assignments, campaign.id]
  );

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {campaign.id}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{campaign.budget}</span>
        </div>
        <h3 className="mt-4 text-xl font-semibold">{campaign.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{campaign.goal}</p>
      </div>
      <div className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">{campaign.note}</p>
        <div className="mt-4 space-y-3">
          {campaign.angles.map((a) => {
            const angleAds = assigned.filter((x) => x.adSet === a.code);
            return (
              <div key={a.code} className="rounded-lg bg-secondary p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>{a.code}</span>
                  <span>·</span>
                  <span>{a.pain}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{a.hook}</p>
                {angleAds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {angleAds.map((x) => {
                      const ad = ads.find((d) => d.id === x.adId);
                      return (
                        <span
                          key={x.adId}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            x.role === 'principal'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border border-border text-muted-foreground'
                          }`}
                          title={ad ? `${ad.name} — ${ad.format}` : ''}
                        >
                          {x.adId}
                          {x.role !== 'principal' && (
                            <span className="text-[10px] opacity-70">({x.role})</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary">→</span>
          <span className="font-medium">{campaign.dest}</span>
        </div>
      </div>
    </div>
  );
}
