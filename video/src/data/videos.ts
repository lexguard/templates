import { parseScript } from "../lib/script";

export type VideoType = "camera" | "screen" | "ai";

export const videoTypeLabels: Record<VideoType, string> = {
  camera: "Cámara",
  screen: "Screen recording",
  ai: "AI edition",
};

export const videoTypeEmojis: Record<VideoType, string> = {
  camera: "🎥",
  screen: "🖥️",
  ai: "🤖",
};

export interface Scene {
  id: string;
  title: string;
  /** Marketing script with optional bracketed directions, e.g. [pause 2s] or [whisper]. */
  script: string;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  /** Production type: how this video is captured or produced. */
  type: VideoType;
  /** Default scenes shipped with this video. Read-only in the UI. */
  scenes: readonly Scene[];
  /** Brief / context for the marketer reading it. */
  brief?: string;
}

export interface VideoProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  videos: Video[];
}

export function sceneDurationSeconds(scene: Scene): number {
  return parseScript(scene.script).totalDurationSeconds;
}

export function videoDurationSeconds(video: Video): number {
  return video.scenes.reduce((sum, s) => sum + sceneDurationSeconds(s), 0);
}

// ---------------------------------------------------------------------------
// Template config — replace these with your own brand and the whole example
// project below re-labels itself. See AGENTS.md for the data model + syntax.
// ---------------------------------------------------------------------------

/** Company / brand name shown in project names and scripts. */
const BRAND = "Acme";
/** The product being marketed. */
const PRODUCT = "Acme App";
/** Who appears on camera in `camera`-type videos. */
const PRESENTER = "Alex";
/** Where the call-to-action sends viewers. */
const CTA_URL = "acme.example";

export const videoProjects: VideoProject[] = [
  {
    id: "example-brand",
    name: `${BRAND} (B2C)`,
    slug: "acme",
    description: `Example project for ${BRAND}. Replace this data in src/data/videos.ts with your own campaign — see AGENTS.md.`,
    videos: [
      // A "camera" video: someone talking to the lens. Note the emotion/cadence
      // cues in brackets and the explicit [pause] beats that add to the runtime.
      {
        id: "example-v01-founder",
        slug: "v01-founder",
        title: "V01 — Founder story",
        type: "camera",
        brief: `🎥 ${PRESENTER} to camera, phone, single take, window light.`,
        scenes: [
          { id: "hook", title: "Hook", script: `I built ${PRODUCT} because the tools I tried never fit how I actually work. [pause 0.5s] [serious]` },
          { id: "problem", title: "The problem", script: `Every option was either too rigid or too much. [pause 0.5s] I wanted something simple that just did the one thing I needed. [calm]` },
          { id: "solution", title: "The solution", script: `So I made it. [pause 1s] Pick what you need, skip what you don't, and get going in minutes. [warm]` },
          { id: "cta", title: "CTA", script: `Try it free — no card. [emphasis] ${CTA_URL} [clear]` },
        ] as const,
      },
      // A "screen" video: a screen recording with voiceover. The *[...]* wrappers
      // are stage/visual cues — they are NOT spoken and don't count as words.
      {
        id: "example-v02-demo",
        slug: "v02-demo",
        title: "V02 — Screen demo",
        type: "screen",
        brief: "🖥️ Screen recording + voiceover. 45-60s, 9:16.",
        scenes: [
          { id: "hook", title: "Hook", script: `Here's ${PRODUCT} doing the whole thing in under a minute. [pause 1s] [bold]` },
          { id: "demo", title: "Walkthrough", script: `*[screen: create a new item, fill two fields, hit save]* [pause 0.5s] No setup, no manual — you just start. [warm]` },
          { id: "cta", title: "CTA", script: `That's it. [pause 0.5s] Start free at ${CTA_URL}. [emphasis] [clear]` },
        ] as const,
      },
      // An "ai" video: AI-generated motion / static frames. Longer [pause] beats
      // hold each frame on screen.
      {
        id: "example-v03-explainer",
        slug: "v03-explainer",
        title: "V03 — AI explainer",
        type: "ai",
        brief: "🤖 AI-generated motion over clean backgrounds. 20-30s.",
        scenes: [
          { id: "claim", title: "Claim", script: `The simplest way to get ${PRODUCT} working for you. [pause 1s] [bold]` },
          { id: "visual", title: "Motion beat", script: `*[clean animation: three steps snapping into place]* [pause 2s] [calm]` },
          { id: "cta", title: "CTA", script: `Get started today. [emphasis] ${CTA_URL} [clear]` },
        ] as const,
      },
    ],
  },
];

export function findProjectBySlug(slug: string): VideoProject | undefined {
  return videoProjects.find((p) => p.slug === slug);
}

export function findVideoBySlug(
  project: VideoProject,
  videoSlug: string,
): Video | undefined {
  return project.videos.find((v) => v.slug === videoSlug);
}

export type VerificationStatus = "pending" | "confirmed" | "warning";

export interface VerificationDefinition {
  key: string;
  label: string;
  description: string;
}

export const saasVerificationDefinitions: VerificationDefinition[] = [
  {
    key: "saas_url_ready",
    label: "URL / entry point listo",
    description: "El link, login o punto de entrada del SaaS que se muestra está en vivo y accesible.",
  },
  {
    key: "saas_features_ready",
    label: "Features del video funcionando",
    description: "Las funcionalidades que se demuestran ya existen en la plataforma (no son mock ni “próximamente”).",
  },
  {
    key: "saas_demo_data",
    label: "Datos de demo realistas",
    description: "La cuenta de demo tiene datos creíbles: clientes, órdenes, contenido, nombres reales — no placeholders.",
  },
  {
    key: "saas_no_broken_flows",
    label: "Flujos críticos sin errores",
    description: "Ningún paso del video termina en 404, error, pantalla vacía o estado inconsistente.",
  },
  {
    key: "saas_brand_correct",
    label: "Branding actualizado en producto",
    description: "Logo, colores, nombre, copy y URLs internas reflejan la marca actual (no una versión anterior).",
  },
];

export const verificationDefinitions: Record<VideoType, VerificationDefinition[]> = {
  camera: [
    ...saasVerificationDefinitions,
    {
      key: "saas_talent_briefed",
      label: "Talento briefeado sobre el SaaS",
      description: "La persona en cámara conoce la funcionalidad que menciona y sabe qué pantallas referenciar.",
    },
    {
      key: "talent",
      label: "Talento confirmado",
      description: "La persona que aparece en cámara ya está definida y confirmada.",
    },
    {
      key: "location",
      label: "Locación lista",
      description: "El lugar de grabación está disponible y verificado.",
    },
    {
      key: "equipment",
      label: "Equipo listo",
      description: "Cámara, celular, micrófono o luz de ventana validada.",
    },
    {
      key: "script_final",
      label: "Guión final aprobado",
      description: "El guion ya no cambia antes de grabar.",
    },
  ],
  screen: [
    ...saasVerificationDefinitions,
    {
      key: "saas_screen_permission",
      label: "Permiso / cuenta de screen capture",
      description: "Se tiene acceso a la cuenta o ambiente que se va a grabar (propio, demo o con permisos).",
    },
    {
      key: "app_access",
      label: "App lista para grabar",
      description: "La aplicación o flujo que se va a capturar está accesible y estable.",
    },
    {
      key: "recording_env",
      label: "Entorno de grabación listo",
      description: "Micrófono, pantalla y configuración de screen capture verificados.",
    },
    {
      key: "script_final",
      label: "Guión / voiceover aprobado",
      description: "El voiceover o guión técnico está final.",
    },
  ],
  ai: [
    ...saasVerificationDefinitions,
    {
      key: "saas_assets_match_product",
      label: "Assets reflejan el producto real",
      description: "Capturas, referencias o estilo visual provienen de la versión actual del SaaS.",
    },
    {
      key: "assets_ready",
      label: "Activos / referencias listos",
      description: "Imágenes, capturas, assets o referencias de estilo entregados.",
    },
    {
      key: "prompt_locked",
      label: "Prompt / estilo confirmado",
      description: "El prompt, estilo visual o motion está definido y aprobado.",
    },
    {
      key: "script_final",
      label: "Guión / texto final aprobado",
      description: "El texto, claim o CTA que aparece en la pieza está final.",
    },
  ],
};

export function verificationStatusForType(type: VideoType): VerificationDefinition[] {
  return verificationDefinitions[type];
}
