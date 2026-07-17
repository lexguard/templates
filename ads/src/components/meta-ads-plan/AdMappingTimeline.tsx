import { useMemo, useState } from 'react';
import type { Plan, Ad, AdRun, SpendDay, Campaign } from './types';

interface Props {
  plan: Plan;
}

const campaignColor: Record<string, string> = {
  C1: 'bg-primary/80',
  C2: 'bg-emerald-500/80',
  C3: 'bg-amber-500/80',
};

export function AdMappingTimeline({ plan }: Props) {
  const totalDays = useMemo(() => {
    return Math.max(
      21,
      ...plan.adRuns.map((r) => r.endDay || r.startDay)
    );
  }, [plan.adRuns]);

  const spendByDay = useMemo(() => {
    return plan.spendTimeline.reduce((acc, d) => {
      acc[d.day] = d;
      return acc;
    }, {} as Record<number, SpendDay>);
  }, [plan.spendTimeline]);

  const grouped = useMemo(() => {
    return plan.campaigns.map((campaign) => {
      const runs = plan.adRuns.filter(
        (r) => r.campaignId === campaign.id && r.role !== 'banca'
      );
      const byAdSet = runs.reduce((acc, r) => {
        if (!acc[r.adSet]) acc[r.adSet] = [];
        acc[r.adSet].push(r);
        return acc;
      }, {} as Record<string, AdRun[]>);

      return {
        campaign,
        adSets: Object.entries(byAdSet).map(([adSet, runs]) => ({
          adSet,
          runs,
        })),
      };
    });
  }, [plan.campaigns, plan.adRuns]);

  return (
    <div className="mt-8">
      <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium">Rotación de creativos</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando un ad set gana, entran creativos de refresco para combatir la
          fatiga del anuncio: el mismo público deja de reaccionar al ver el mismo
          creativo por varios días. Se rotan sin cambiar el ángulo ganador,
          manteniendo el presupuesto en el ad set que ya probó funcionar.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="min-w-[800px]">
          {/* Header days */}
          <div className="flex items-center border-b border-border pb-2">
            <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Anuncio / Ad Set
            </div>
            <div className="flex flex-1">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                <div
                  key={day}
                  className="flex-1 text-center text-[10px] text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-6 py-4">
            {grouped.map(({ campaign, adSets }) => (
              <CampaignRows
                key={campaign.id}
                campaign={campaign}
                adSets={adSets}
                ads={plan.ads}
                totalDays={totalDays}
                spendByDay={spendByDay}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {plan.campaigns.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-sm ${campaignColor[c.id] || 'bg-muted-foreground'}`} />
            <span>
              {c.id} {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignRows({
  campaign,
  adSets,
  ads,
  totalDays,
  spendByDay,
}: {
  campaign: Campaign;
  adSets: { adSet: string; runs: AdRun[] }[];
  ads: Ad[];
  totalDays: number;
  spendByDay: Record<number, SpendDay>;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white ${campaignColor[campaign.id] || 'bg-muted-foreground'}`}>
          {campaign.id}
        </span>
        <span className="text-sm font-semibold">{campaign.name}</span>
        <span className="text-xs text-muted-foreground">{campaign.budget}</span>
      </div>

      <div className="space-y-2">
        {adSets.map(({ adSet, runs }) => (
          <div key={adSet}>
            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conjunto de anuncios · {adSet}
            </div>
            <div className="space-y-1">
              {runs.map((run) => (
                <AdRunRow
                  key={run.adId}
                  run={run}
                  ad={ads.find((a) => a.id === run.adId)}
                  totalDays={totalDays}
                  campaignColor={campaignColor[run.campaignId] || 'bg-muted-foreground'}
                  spendByDay={spendByDay}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdRunRow({
  run,
  ad,
  totalDays,
  campaignColor,
  spendByDay,
}: {
  run: AdRun;
  ad?: Ad;
  totalDays: number;
  campaignColor: string;
  spendByDay: Record<number, SpendDay>;
}) {
  const endDay = run.endDay || totalDays;
  const width = ((endDay - run.startDay + 1) / totalDays) * 100;
  const left = ((run.startDay - 1) / totalDays) * 100;

  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const totalSpend = run.dailySpend * (endDay - run.startDay + 1);

  return (
    <div
      className="group relative flex items-center gap-3"
      onMouseLeave={() => setHoveredDay(null)}
    >
      <div className="w-48 shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
            {run.adId}
          </span>
          <span className="truncate text-sm" title={ad?.name}>
            {ad?.name}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="capitalize">{run.role}</span>
          <span>·</span>
          <span>${run.dailySpend}/día</span>
        </div>
      </div>

      <div className="relative flex flex-1 items-center">
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
            <div
              key={day}
              className="flex-1 border-r border-border/50 first:border-l"
            />
          ))}
        </div>

        {/* Bar */}
        <div
          className={`relative h-8 rounded-md ${campaignColor} cursor-pointer transition hover:brightness-110`}
          style={{ left: `${left}%`, width: `${width}%`, position: 'absolute' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const dayIndex = Math.floor((x / rect.width) * (endDay - run.startDay + 1));
            const day = run.startDay + dayIndex;
            setHoveredDay(Math.min(Math.max(day, run.startDay), endDay));
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
            {run.adId}
          </span>
        </div>

        {/* Hover tooltip */}
        {hoveredDay && (
          <div
            className="absolute bottom-full z-20 mb-2 w-56 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
            style={{
              left: `${((hoveredDay - 1) / totalDays) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-semibold">
              {run.adId} · Día {hoveredDay}
            </p>
            <p className="text-muted-foreground">{ad?.name}</p>
            <p className="mt-1 text-muted-foreground">
              {ad?.format}
            </p>
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              <div className="flex justify-between gap-2">
                <span>Gasto diario</span>
                <span className="font-medium">${run.dailySpend}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Total del run</span>
                <span className="font-medium">${totalSpend.toLocaleString()}</span>
              </div>
              {spendByDay[hoveredDay] && (
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Acumulado día {hoveredDay}</span>
                  <span>
                    ${spendByDay[hoveredDay].cumulative.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
