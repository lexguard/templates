import type { MetaAdsPlan } from './interfaces';

import { acmeAppLaunch } from './acmeAppLaunch';
import { globexStoreSale } from './globexStoreSale';
import { initechB2bLeads } from './initechB2bLeads';

/**
 * Single source of truth for the whole app.
 *
 * Every entry here becomes:
 *  - a card on the home hub,
 *  - a link in the navbar,
 *  - a client-side route at `/{slug}`.
 *
 * Add / remove / reorder pages by editing this array. The `kind` selects which
 * React page component renders the `plan` (see `src/app/AdsApp.tsx`).
 */
export interface PageEntry {
  kind: 'meta-ads';
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  plan: MetaAdsPlan;
}

export const pages: PageEntry[] = [
  {
    kind: 'meta-ads',
    slug: 'acme-app-launch',
    label: 'Acme — Lanzamiento de app',
    shortLabel: 'Acme',
    description:
      'Ejemplo B2C · lanzamiento de app, 2 campañas, prueba gratis 14 días.',
    plan: acmeAppLaunch,
  },
  {
    kind: 'meta-ads',
    slug: 'globex-store-sale',
    label: 'Globex — Temporada de ofertas',
    shortLabel: 'Globex',
    description:
      'Ejemplo e-commerce · 3 campañas con catálogo dinámico, meta ROAS ≥ 2.5.',
    plan: globexStoreSale,
  },
  {
    kind: 'meta-ads',
    slug: 'initech-b2b-leads',
    label: 'Initech — Generación de leads',
    shortLabel: 'Initech',
    description:
      'Ejemplo SaaS B2B · demos calificadas, 2 campañas, CPL objetivo ≤ $45.',
    plan: initechB2bLeads,
  },
];

export function findPageBySlug(slug: string | undefined): PageEntry | undefined {
  if (!slug) return undefined;
  return pages.find((p) => p.slug === slug);
}

/**
 * In-page sections per page kind, in scroll order. Each `id` must match the
 * `id` attribute rendered on the corresponding `<section>` in the page
 * components; the floating SoftNav uses these to jump around + scroll-spy the
 * active one. Add a section by giving it an `id` in its component and listing
 * it here.
 */
export interface PageSection {
  id: string;
  label: string;
}

export const sectionsByKind: Record<PageEntry['kind'], PageSection[]> = {
  'meta-ads': [
    { id: 'resumen', label: 'Resumen' },
    { id: 'principios', label: 'Principios' },
    { id: 'tesis', label: 'Tesis' },
    { id: 'campaigns', label: 'Campañas' },
    { id: 'ads', label: 'Anuncios' },
    { id: 'schedule', label: 'Cronograma' },
    { id: 'presupuesto', label: 'Presupuesto' },
    { id: 'runbook', label: 'Lanzamiento' },
    { id: 'pendientes', label: 'Pendientes' },
  ],
};
