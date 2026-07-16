import { Route, Switch, useParams, Link } from "wouter";
import {
  videoProjects,
  findProjectBySlug,
  findVideoBySlug,
  sceneDurationSeconds,
  videoDurationSeconds,
  videoTypeLabels,
  videoTypeEmojis,
  verificationStatusForType,
  type Video,
  type VideoProject,
  type Scene,
  type VideoType,
  type VerificationStatus,
} from "../data/videos";
import { useNotesForVideo, useVotesForVideo, useVotesForProject, useVerificationsForVideo, useVideoStatus, useVerificationHistoryForVideo, type VideoNoteRecord, type VideoVoteSummary, type VerificationState, type VideoVerificationRecord } from "../lib/pb";
import { parseScript, type ScriptDirection } from "../lib/script";
import { useCallback, useMemo, useState } from "react";
import { PlayPage } from "./PlayPage";
import {
  Plus,
  MessageSquare,
  X,
  ChevronRight,
  Save,
  Trash2,
  PanelRight,
  Clock,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Play,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Circle,
} from "lucide-react";

function VoteBadge({ summary, compact }: { summary?: VideoVoteSummary; compact?: boolean }) {
  if (!summary) return null;
  const total = summary.total;
  const color =
    total > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : total < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
        <ThumbsUp size={12} /> {summary.up} · <ThumbsDown size={12} /> {summary.down}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${color}`}>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
        <ThumbsUp size={12} /> {summary.up}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
        <ThumbsDown size={12} /> {summary.down}
      </span>
      <span className="text-muted-foreground">= {total > 0 ? `+${total}` : total}</span>
    </span>
  );
}

function VotePanel({ videoId }: { videoId: string }) {
  const { summary, loading, castVote } = useVotesForVideo(videoId);
  const [busy, setBusy] = useState(false);

  const handleVote = async (vote: "+1" | "-1") => {
    if (busy) return;
    setBusy(true);
    try {
      await castVote(vote);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">¿Listo para producir? Vota</h2>
          <p className="text-sm text-muted-foreground">
            Solo se vota desde la página del video. Así sabemos que leyeron el guion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VoteBadge summary={summary} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote("+1")}
              disabled={busy || loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                summary?.myVote === "+1"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border bg-card hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
            >
              <ThumbsUp size={16} /> +1
            </button>
            <button
              onClick={() => handleVote("-1")}
              disabled={busy || loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                summary?.myVote === "-1"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "border bg-card hover:bg-rose-50 dark:hover:bg-rose-900/20"
              }`}
            >
              <ThumbsDown size={16} /> -1
            </button>
          </div>
        </div>
      </div>
      {loading && <p className="text-xs text-muted-foreground mt-3">Cargando votos…</p>}
    </div>
  );
}

function VideoStatusToggle({ videoId, allConfirmed }: { videoId: string; allConfirmed: boolean }) {
  const { latest, loading, setStatus } = useVideoStatus(videoId);
  const [isEditing, setIsEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"pending" | "warning" | "ready">("pending");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);

  const status = latest?.status ?? "pending";

  const statusConfig = {
    ready: {
      label: "Listo para producir",
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      icon: CheckCircle2,
    },
    warning: {
      label: "Con advertencia",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      icon: AlertTriangle,
    },
    pending: {
      label: "Pendiente",
      color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
      icon: Circle,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const startEdit = () => {
    setDraftStatus(status);
    setDraftNote(latest?.note ?? "");
    setIsEditing(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await setStatus({ status: draftStatus, note: draftNote });
      setIsEditing(false);
      setDraftNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${config.color}`}>
            <StatusIcon size={14} />
            {config.label}
          </span>
          {latest?.note && !isEditing && (
            <p className="text-sm text-muted-foreground max-w-md truncate">
              {latest.note}
            </p>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={startEdit}
            className="text-sm font-medium text-primary hover:underline"
          >
            Cambiar estado
          </button>
        )}
      </div>

      {allConfirmed && status !== "ready" && !isEditing && (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
          <CheckCircle2 size={14} />
          Todas las verificaciones están confirmadas. Puedes marcar este video como listo.
        </p>
      )}

      {isEditing && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["pending", "warning", "ready"] as const).map((s) => {
              const sc = statusConfig[s];
              const Icon = sc.icon;
              return (
                <button
                  key={s}
                  onClick={() => setDraftStatus(s)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                    draftStatus === s
                      ? sc.color + " border-transparent"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  <Icon size={12} />
                  {sc.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            className="w-full min-h-[80px] rounded-xl border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Nota opcional sobre el estado general del video…"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Guardando…" : "Guardar estado"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading && <p className="mt-2 text-xs text-muted-foreground">Cargando estado…</p>}
    </div>
  );
}

function VerificationHistory({
  videoId,
  definitionKey,
}: {
  videoId: string;
  definitionKey: string;
}) {
  const { records, loading } = useVerificationHistoryForVideo(videoId, definitionKey);
  const [expanded, setExpanded] = useState(false);

  if (records.length === 0) return null;

  const visible = expanded ? records : records.slice(0, 1);
  const hasMore = records.length > 1;

  const statusConfig: Record<
    VideoVerificationRecord["status"],
    { label: string; color: string; icon: React.ElementType }
  > = {
    confirmed: {
      label: "Confirmado",
      color: "text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
    },
    warning: {
      label: "Advertencia",
      color: "text-amber-700 dark:text-amber-300",
      icon: AlertTriangle,
    },
    pending: {
      label: "Pendiente",
      color: "text-slate-600 dark:text-slate-400",
      icon: HelpCircle,
    },
  };

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Historial ({records.length} actualización{records.length > 1 ? "es" : ""})
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? "Ocultar historial" : `Ver ${records.length - 1} anterior${records.length - 1 > 1 ? "es" : ""}`}
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {visible.map((record, index) => {
          const config = statusConfig[record.status];
          const Icon = config.icon;
          const isLatest = index === 0;
          return (
            <div
              key={record.id}
              className={`rounded-lg p-2.5 text-sm ${
                isLatest
                  ? "bg-muted/60"
                  : "bg-transparent border-l-2 border-muted pl-3"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
                  <Icon size={12} />
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(record.created).toLocaleString()}
                </span>
                {isLatest && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Vigente
                  </span>
                )}
              </div>
              {record.note && (
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {record.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {loading && <p className="text-xs text-muted-foreground mt-2">Cargando historial…</p>}
    </div>
  );
}

function VerificationPanel({ video }: { video: Video }) {
  const definitions = useMemo(() => verificationStatusForType(video.type), [video.type]);
  const { states, loading, addVerification } = useVerificationsForVideo(video.id, definitions);
  const allConfirmed = states.length > 0 && states.every((s) => s.latest?.status === "confirmed");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<VerificationStatus>("pending");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pendingCount = states.filter((s) => !s.latest || s.latest.status === "pending").length;
  const warningCount = states.filter((s) => s.latest?.status === "warning").length;
  const confirmedCount = states.filter((s) => s.latest?.status === "confirmed").length;

  const startEdit = (state: VerificationState) => {
    setEditingKey(state.definition.key);
    setDraftStatus(state.latest?.status ?? "pending");
    setDraftNote(state.latest?.note ?? "");
  };

  const submit = async (key: string) => {
    if (!draftStatus) return;
    setSaving(true);
    try {
      await addVerification({ key, status: draftStatus, note: draftNote });
      setEditingKey(null);
      setDraftNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Verificaciones de producción</h2>
          <p className="text-sm text-muted-foreground">
            Último estado por verificación. El más reciente es el que cuenta.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            <CheckCircle2 size={12} /> {confirmedCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <AlertTriangle size={12} /> {warningCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <HelpCircle size={12} /> {pendingCount}
          </span>
        </div>
      </div>

      <VideoStatusToggle videoId={video.id} allConfirmed={allConfirmed} />

      {loading && <p className="text-xs text-muted-foreground">Cargando verificaciones…</p>}

      <div className="space-y-3">
        {states.map((state) => {
          const status = state.latest?.status ?? "pending";
          const isEditing = editingKey === state.definition.key;

          const statusColors = {
            confirmed:
              "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
            warning:
              "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
            pending:
              "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
          };

          const StatusIcon =
            status === "confirmed"
              ? CheckCircle2
              : status === "warning"
                ? AlertTriangle
                : HelpCircle;

          return (
            <div
              key={state.definition.key}
              className="rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}
                    >
                      <StatusIcon size={12} />
                      {status === "confirmed" && "Confirmado"}
                      {status === "warning" && "Advertencia"}
                      {status === "pending" && "Pendiente"}
                    </span>
                    <h3 className="font-medium text-sm">{state.definition.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {state.definition.description}
                  </p>
                  {state.latest?.note && !isEditing && (
                    <p className="mt-2 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-2">
                      {state.latest.note}
                    </p>
                  )}
                  {state.latest && !isEditing && (
                    <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock size={10} />
                      Actualizado {new Date(state.latest.created).toLocaleString()}
                    </p>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => startEdit(state)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Actualizar
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(["pending", "confirmed", "warning"] as VerificationStatus[]).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setDraftStatus(s)}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                            draftStatus === s
                              ? statusColors[s] + " border-transparent"
                              : "bg-card hover:bg-accent"
                          }`}
                        >
                          {s === "confirmed" && <CheckCircle2 size={12} />}
                          {s === "warning" && <AlertTriangle size={12} />}
                          {s === "pending" && <HelpCircle size={12} />}
                          {s === "confirmed" && "Confirmado"}
                          {s === "warning" && "Advertencia"}
                          {s === "pending" && "Pendiente"}
                        </button>
                      ),
                    )}
                  </div>
                  <textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    className="w-full min-h-[80px] rounded-xl border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    placeholder="Nota sobre esta verificación…"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => submit(state.definition.key)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      disabled={saving}
                      className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <VerificationHistory
                videoId={video.id}
                definitionKey={state.definition.key}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TypeBadge({ type }: { type: VideoType }) {
  const colors = {
    camera:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    screen:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    ai: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[type]}`}
      title={videoTypeLabels[type]}
    >
      <span>{videoTypeEmojis[type]}</span>
      {videoTypeLabels[type]}
    </span>
  );
}

function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Marketing video scripts</h1>
      <p className="text-muted-foreground mb-10">
        Suggested scenes per campaign. Open any project to add private notes to each video.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {videoProjects.map((project) => (
          <Link
            key={project.id}
            href={`/${project.slug}`}
            className="block rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
            )}
            <p className="text-sm font-medium">{project.videos.length} video(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProjectPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const project = findProjectBySlug(projectSlug);
  const voteSummaries = useVotesForProject(project);

  if (!project) {
    return <NotFound />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All projects
        </Link>
        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>
      <div className="space-y-4">
        {project.videos.map((video) => {
        const summary = voteSummaries[video.id];
        return (
          <Link
            key={video.id}
            href={`/${project.slug}/${video.slug}`}
            className="flex items-center justify-between rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors"
          >
            <div>
              <h3 className="font-semibold">{video.title}</h3>
              <p className="text-sm text-muted-foreground">
                {video.scenes.length} escenas · {formatDuration(videoDurationSeconds(video))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <VoteBadge summary={summary} compact />
              <TypeBadge type={video.type} />
              <span className="text-sm font-medium">Open video →</span>
            </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}

function VideoPage() {
  const { projectSlug, videoSlug } = useParams<{
    projectSlug: string;
    videoSlug: string;
  }>();
  const project = findProjectBySlug(projectSlug);
  const video = project ? findVideoBySlug(project, videoSlug) : undefined;

  if (!project || !video) {
    return <NotFound />;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${project.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {project.name}
        </Link>
        <h1 className="text-3xl font-bold mt-2">{video.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <TypeBadge type={video.type} />
          <p className="text-muted-foreground">
            {video.scenes.length} escenas · {formatDuration(videoDurationSeconds(video))}
          </p>
        </div>
      </div>

      {video.brief && (
        <p className="text-sm text-muted-foreground mb-6">{video.brief}</p>
      )}

      <div className="mb-6">
        <Link
          href={`/${project.slug}/${video.slug}/play`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Play size={16} /> Reproducir guion
        </Link>
      </div>

      <VideoWorkspace video={video} />
    </div>
  );
}


function VideoWorkspace({ video }: { video: Video }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const { notes, loading, addNote, updateNote, deleteNote } =
    useNotesForVideo(video.id);

  const notesByScene = useMemo(() => {
    const map = new Map<string, VideoNoteRecord[]>();
    for (const note of notes) {
      const key = note.scene_id || "__video__";
      const list = map.get(key) || [];
      list.push(note);
      map.set(key, list);
    }
    return map;
  }, [notes]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suggested scenes</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
              title={showStats ? "Hide timing stats" : "Show timing stats"}
            >
              <BarChart3 size={16} />
              {showStats ? "Hide stats" : "Show stats"}
            </button>
            <button
              onClick={() => setNotesOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent lg:hidden"
            >
              <MessageSquare size={16} />
              Notes ({notes.length})
            </button>
          </div>
        </div>

        {video.scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={index}
            showStats={showStats}
            notes={notesByScene.get(scene.id) || []}
            onAddNote={addNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
        ))}

        <VerificationPanel video={video} />

        <VotePanel videoId={video.id} />
      </div>

      <div className="hidden lg:block">
        <NotesPanel
          video={video}
          notes={notes}
          loading={loading}
          onAddNote={addNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
        />
      </div>

      {notesOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 p-4 lg:hidden">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notes for {video.title}</h2>
              <button
                onClick={() => setNotesOpen(false)}
                className="rounded-lg p-2 hover:bg-accent"
              >
                <X size={20} />
              </button>
            </div>
            <NotesPanel
              video={video}
              notes={notes}
              loading={loading}
              onAddNote={async (note) => {
                await addNote(note);
              }}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SceneCard({
  scene,
  index,
  showStats,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  scene: Scene;
  index: number;
  showStats: boolean;
  notes: VideoNoteRecord[];
  onAddNote: (payload: {
    scene_id?: string;
    note: string;
    label?: string;
  }) => Promise<VideoNoteRecord>;
  onUpdateNote: (id: string, patch: Partial<VideoNoteRecord>) => Promise<VideoNoteRecord>;
  onDeleteNote: (id: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => parseScript(scene.script), [scene.script]);

  const submit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onAddNote({ scene_id: scene.id, note: draft.trim() });
      setDraft("");
      setIsAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          <h3 className="font-semibold">{scene.title}</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {formatDuration(parsed.totalDurationSeconds)}
          </span>
          {showStats && (
            <span title={`${parsed.wordCount} spoken words + ${parsed.directions.length} direction(s)`}>
              {parsed.wordCount} words
            </span>
          )}
        </div>
      </div>

      <ScriptView script={scene.script} showStats={showStats} />

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setIsAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? "Cancel" : "Add note"}
        </button>

        {notes.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {isAdding && (
        <div className="mt-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[100px] rounded-xl border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Private note for this scene…"
          />
          <button
            onClick={submit}
            disabled={saving || !draft.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-4 space-y-2">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScriptView({ script, showStats }: { script: string; showStats: boolean }) {
  const parsed = useMemo(() => parseScript(script), [script]);

  // Render script with bracketed directions highlighted inline.
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const dir of parsed.directions) {
    const bracketStart = dir.stage ? dir.start - 1 : dir.start;
    const bracketEnd = dir.stage ? dir.end + 1 : dir.end;
    if (bracketStart > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{script.slice(lastIndex, bracketStart)}</span>,
      );
    }
    parts.push(
      <DirectionBadge key={`dir-${dir.start}`} direction={dir} />,
    );
    lastIndex = bracketEnd;
  }
  if (lastIndex < script.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{script.slice(lastIndex)}</span>,
    );
  }

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</p>

      {showStats && parsed.directions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Timing:</span>
          <span className="text-muted-foreground">
            {parsed.baseDurationSeconds.toFixed(1)}s speech
          </span>
          {parsed.pauseDurationSeconds > 0 && (
            <span className="text-muted-foreground">
              + {parsed.pauseDurationSeconds.toFixed(1)}s pauses
            </span>
          )}
          <span className="font-medium">= {parsed.totalDurationSeconds}s total</span>
        </div>
      )}
    </div>
  );
}

function DirectionBadge({ direction }: { direction: ScriptDirection }) {
  const color =
    direction.kind === "pause"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : direction.kind === "emotion"
        ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
        : direction.kind === "cadence"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
          : direction.kind === "stage"
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${color}`}
      title={`${direction.label} (${direction.kind})${direction.seconds > 0 ? ` +${direction.seconds}s` : ""}`}
    >
      {direction.seconds > 0 && <Clock size={10} />}
      {direction.label}
    </span>
  );
}

function NotesPanel({
  video,
  notes,
  loading,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  video: Video;
  notes: VideoNoteRecord[];
  loading: boolean;
  onAddNote: (payload: {
    scene_id?: string;
    note: string;
    label?: string;
  }) => Promise<VideoNoteRecord | void>;
  onUpdateNote: (id: string, patch: Partial<VideoNoteRecord>) => Promise<VideoNoteRecord>;
  onDeleteNote: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onAddNote({ note: draft.trim() });
      setDraft("");
    } finally {
      setSaving(false);
    }
  };

  const sceneNotes = notes.filter((n) => n.scene_id);
  const videoNotes = notes.filter((n) => !n.scene_id);

  return (
    <div className="rounded-2xl border bg-card p-5 h-fit lg:sticky lg:top-6">
      <div className="flex items-center gap-2 mb-4">
        <PanelRight size={18} />
        <h2 className="text-lg font-semibold">Notes</h2>
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <div className="space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[100px] rounded-xl border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          placeholder="Add a general note about this video…"
        />
        <button
          onClick={submit}
          disabled={saving || !draft.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} />
          {saving ? "Saving…" : "Add video note"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {videoNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Video notes
            </h3>
            <div className="space-y-2">
              {videoNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onUpdate={onUpdateNote}
                  onDelete={onDeleteNote}
                />
              ))}
            </div>
          </div>
        )}

        {sceneNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Scene notes
            </h3>
            <div className="space-y-2">
              {sceneNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  scene={video.scenes.find((s) => s.id === note.scene_id)}
                  onUpdate={onUpdateNote}
                  onDelete={onDeleteNote}
                />
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No notes yet. Add a general note above, or tap “Add note” on any scene.
          </p>
        )}
      </div>
    </div>
  );
}

function NoteItem({
  note,
  scene,
  onUpdate,
  onDelete,
  compact,
}: {
  note: VideoNoteRecord;
  scene?: Scene;
  onUpdate: (id: string, patch: Partial<VideoNoteRecord>) => Promise<VideoNoteRecord>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.note);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onUpdate(note.id, { note: draft.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-3">
      {scene && !compact && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <ChevronRight size={12} />
          {scene.title}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[80px] rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={() => {
                setDraft(note.note);
                setEditing(false);
              }}
              disabled={saving}
              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group">
          <p className="whitespace-pre-wrap text-sm">{note.note}</p>
          <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground">
              {new Date(note.updated).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-primary hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Project or video not found.</p>
      <Link href="/" className="text-primary hover:underline">
        Go home
      </Link>
    </div>
  );
}

export default function VideoApp() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/:projectSlug" component={ProjectPage} />
      <Route path="/:projectSlug/:videoSlug" component={VideoPage} />
      <Route path="/:projectSlug/:videoSlug/play" component={PlayPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
