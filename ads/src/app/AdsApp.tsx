import { useEffect } from 'react';
import { Route, Switch, Link, useParams } from 'wouter';
import { pages, findPageBySlug } from '../data/navigation';
import { MetaAdsPlanPage } from '../components/MetaAdsPlanPage';
import { Navbar } from '../components/ui/Navbar';
import SoftNav from '../components/ui/SoftNav';

function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pb-24">{children}</main>
      <SoftNav />
    </>
  );
}

function Home() {
  useDocumentTitle('Ads Studio — Campañas de ejemplo');

  return (
    <>
      <main className="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Studio live
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ads Studio
        </h1>
        <p className="mt-4 text-muted-foreground">
          Planes de campaña de Meta Ads de ejemplo. Reemplaza los datos en
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">src/data</code>
          con tu propia marca.
        </p>

        <div className="mt-10 w-full space-y-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:bg-accent"
            >
              <div className="text-left">
                <p className="font-medium">{page.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{page.description}</p>
              </div>
              <span className="text-primary">→</span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 w-full border-t border-border bg-muted/30">
        <div className="mx-auto max-w-xl px-6 py-4 text-center text-xs text-muted-foreground">
          Ads Studio · Datos de ejemplo
        </div>
      </footer>
    </>
  );
}

function PlanRoute() {
  const { slug } = useParams<{ slug: string }>();
  const entry = findPageBySlug(slug);

  useDocumentTitle(entry ? entry.plan.title : 'No encontrado — Ads Studio');

  if (!entry) return <NotFound />;

  return (
    <Shell>
      <MetaAdsPlanPage plan={entry.plan} />
    </Shell>
  );
}

function NotFound() {
  useDocumentTitle('No encontrado — Ads Studio');

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="mt-4 text-muted-foreground">Esta página no existe.</p>
      <Link href="/" className="mt-6 inline-block text-primary hover:underline">
        ← Volver al inicio
      </Link>
    </div>
  );
}

export default function AdsApp() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/:slug" component={PlanRoute} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}
