import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { pages, sectionsByKind, type PageSection } from '../../data/navigation';

/** Alto de la navbar superior (h-14) para compensar el scroll a una sección. */
const SCROLL_OFFSET = 72;
const NO_SECTIONS: PageSection[] = [];

/** Círculo de ícono (Inicio / flechas). */
const circleBase =
  'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const circleIdle = 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
const circleDisabled = 'text-muted-foreground/40 cursor-default';

/** Píldora de sección. */
const pillBase =
  'flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const pillIdle = 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
const pillActive = 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90';

/** Ícono con tooltip 100% CSS (:hover desktop, :focus-within teclado). */
function IconItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative flex select-none [&_svg]:pointer-events-none">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/**
 * Navegación "suave" para la vista de campaña: barra flotante pegada al fondo
 * del viewport (position: sticky; bottom: 0). De izquierda a derecha:
 * Inicio · las secciones de la campaña actual (scroll-spy + salto suave) · las
 * flechas para ir a la campaña anterior / siguiente (orden del registro `pages`).
 */
export default function SoftNav({ sticky = true }: { sticky?: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Al hacer click en una sección suprimimos el scroll-spy hasta llegar al
  // destino, para que la píldora activa no "salte" por las secciones
  // intermedias durante el scroll suave. Solo aplica en ese escenario.
  const pendingIdRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const [location] = useLocation();

  const currentSlug = location.replace(/^\/+/, '').replace(/\/+$/, '');
  const index = useMemo(
    () => pages.findIndex((p) => p.slug === currentSlug),
    [currentSlug],
  );
  const prev = index > 0 ? pages[index - 1] : undefined;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined;
  const sections = index >= 0 ? sectionsByKind[pages[index].kind] : NO_SECTIONS;

  // Scroll-spy: marca la sección cuyo tope ya pasó bajo la navbar.
  useEffect(() => {
    if (sections.length === 0) {
      setActiveId(null);
      return;
    }
    const ids = sections.map((s) => s.id);
    let raf = 0;
    const compute = () => {
      raf = 0;
      const y = window.scrollY + 100;
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) cur = id;
      }
      // Scroll disparado por un click: no seguimos la posición hasta llegar.
      if (pendingIdRef.current) {
        if (cur !== pendingIdRef.current) return;
        pendingIdRef.current = null;
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
      }
      setActiveId(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      pendingIdRef.current = null;
    };
  }, [location, sections]);

  // Mantener la píldora activa a la vista dentro del carril horizontal.
  useEffect(() => {
    const c = scrollRef.current;
    if (!c || !activeId) return;
    const el = c.querySelector<HTMLElement>(`[data-sid="${activeId}"]`);
    if (!el) return;
    const target = el.offsetLeft - c.clientWidth / 2 + el.clientWidth / 2;
    c.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeId]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Marca el destino y suprime el scroll-spy hasta que lleguemos. El timeout
    // es solo un seguro por si el destino no se puede alcanzar (p. ej. la última
    // sección cerca del fondo, donde el offset no llega a calzar exacto).
    pendingIdRef.current = id;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingIdRef.current = null;
      pendingTimerRef.current = null;
    }, 2000);
    setActiveId(id);
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  return (
    <div
      className={cn(
        'z-40 flex items-center justify-center px-3 pb-3 pt-2',
        sticky ? 'sticky bottom-0' : 'relative',
        'pointer-events-none',
        '[@media(max-height:420px)]:hidden print:hidden',
      )}
    >
      <nav
        aria-label="Navegación de campaña"
        className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-border bg-background/90 p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] backdrop-blur-lg"
      >
        {/* Inicio */}
        <IconItem label="Inicio">
          <Link
            href="/"
            aria-label="Inicio"
            draggable={false}
            className={cn(circleBase, circleIdle)}
          >
            <Home className="size-5" />
          </Link>
        </IconItem>

        {/* Secciones de la campaña actual (carril con scroll-spy) */}
        {sections.length > 0 && (
          <div
            ref={scrollRef}
            className="relative flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {sections.map((section) => {
              const active = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  data-sid={section.id}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(pillBase, active ? pillActive : pillIdle)}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Campaña anterior */}
        <IconItem label={prev ? `Anterior · ${prev.shortLabel}` : 'No hay anterior'}>
          {prev ? (
            <Link
              href={`/${prev.slug}`}
              aria-label={`Anterior: ${prev.label}`}
              draggable={false}
              className={cn(circleBase, circleIdle)}
            >
              <ChevronLeft className="size-5" />
            </Link>
          ) : (
            <span aria-disabled className={cn(circleBase, circleDisabled)}>
              <ChevronLeft className="size-5" />
            </span>
          )}
        </IconItem>

        {/* Campaña siguiente */}
        <IconItem label={next ? `Siguiente · ${next.shortLabel}` : 'No hay siguiente'}>
          {next ? (
            <Link
              href={`/${next.slug}`}
              aria-label={`Siguiente: ${next.label}`}
              draggable={false}
              className={cn(circleBase, circleIdle)}
            >
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span aria-disabled className={cn(circleBase, circleDisabled)}>
              <ChevronRight className="size-5" />
            </span>
          )}
        </IconItem>
      </nav>
    </div>
  );
}
