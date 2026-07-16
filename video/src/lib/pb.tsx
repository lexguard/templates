import PocketBase, { type RecordModel } from "pocketbase";
import { useCallback, useMemo, useState, useEffect, createContext, useContext } from "react";
import { PlugZap, RefreshCw } from "lucide-react";
import type { VideoProject, VerificationStatus, VerificationDefinition } from "../data/videos";

export interface VideoStatusRecord {
  id: string;
  video_id: string;
  status: "pending" | "warning" | "ready";
  note: string;
  updated: string;
  created: string;
}

function toVideoStatusRecord(r: RecordModel): VideoStatusRecord {
  return {
    id: r.id,
    video_id: r.video_id as string,
    status: r.status as "pending" | "warning" | "ready",
    note: (r.note as string) || "",
    updated: r.updated,
    created: r.created,
  };
}

export function useVideoStatus(videoId: string) {
  const pb = usePB();
  const [records, setRecords] = useState<VideoStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);

    const filter = `video_id="${videoId}"`;

    pb.collection("video_status")
      .getFullList({ filter, sort: "created" })
      .then((r) => {
        if (live) setRecords(r.map(toVideoStatusRecord));
      })
      .catch(() => {
        if (live) setRecords([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    const unsubscribePromise = pb
      .collection("video_status")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoStatusRecord(e.record);
        if (record.video_id !== videoId) return;
        setRecords((prev) => {
          if (e.action === "delete") {
            return prev.filter((s) => s.id !== record.id);
          }
          const existingIndex = prev.findIndex((s) => s.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = record;
            return next;
          }
          return [...prev, record].sort(
            (a, b) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoId]);

  const latest = useMemo(() => {
    let found: VideoStatusRecord | undefined;
    for (const record of records) {
      if (!found || new Date(record.created).getTime() > new Date(found.created).getTime()) {
        found = record;
      }
    }
    return found;
  }, [records]);

  const setStatus = useCallback(
    async (payload: { status: "pending" | "warning" | "ready"; note?: string }) => {
      const r = await pb.collection("video_status").create({
        video_id: videoId,
        status: payload.status,
        note: payload.note?.trim() || "",
      });
      return toVideoStatusRecord(r);
    },
    [pb, videoId],
  );

  return { latest, loading, setStatus, records };
}

export interface VideoVerificationRecord {
  id: string;
  video_id: string;
  key: string;
  status: VerificationStatus;
  note: string;
  updated: string;
  created: string;
}

function toVideoVerificationRecord(r: RecordModel): VideoVerificationRecord {
  return {
    id: r.id,
    video_id: r.video_id as string,
    key: r.key as string,
    status: r.status as VerificationStatus,
    note: (r.note as string) || "",
    updated: r.updated,
    created: r.created,
  };
}

export interface VerificationState {
  definition: VerificationDefinition;
  latest?: VideoVerificationRecord;
}

export function useVerificationsForVideo(
  videoId: string,
  definitions: VerificationDefinition[],
) {
  const pb = usePB();
  const [records, setRecords] = useState<VideoVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);

    const filter = `video_id="${videoId}"`;

    pb.collection("video_verifications")
      .getFullList({ filter, sort: "created" })
      .then((r) => {
        if (live) setRecords(r.map(toVideoVerificationRecord));
      })
      .catch(() => {
        if (live) setRecords([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    const unsubscribePromise = pb
      .collection("video_verifications")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoVerificationRecord(e.record);
        if (record.video_id !== videoId) return;
        setRecords((prev) => {
          if (e.action === "delete") {
            return prev.filter((n) => n.id !== record.id);
          }
          const existingIndex = prev.findIndex((n) => n.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = record;
            return next;
          }
          return [...prev, record].sort(
            (a, b) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoId]);

  const latestByKey = useMemo(() => {
    const map = new Map<string, VideoVerificationRecord>();
    for (const record of records) {
      const existing = map.get(record.key);
      if (
        !existing ||
        new Date(record.created).getTime() > new Date(existing.created).getTime()
      ) {
        map.set(record.key, record);
      }
    }
    return map;
  }, [records]);

  const states = useMemo<VerificationState[]>(() => {
    return definitions.map((definition) => ({
      definition,
      latest: latestByKey.get(definition.key),
    }));
  }, [definitions, latestByKey]);

  const addVerification = useCallback(
    async (payload: {
      key: string;
      status: VerificationStatus;
      note?: string;
    }) => {
      const r = await pb.collection("video_verifications").create({
        video_id: videoId,
        key: payload.key,
        status: payload.status,
        note: payload.note?.trim() || "",
      });
      return toVideoVerificationRecord(r);
    },
    [pb, videoId],
  );

  return { records, states, loading, addVerification };
}

export function useVerificationHistoryForVideo(videoId: string, key: string) {
  const pb = usePB();
  const [records, setRecords] = useState<VideoVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);

    const filter = `video_id="${videoId}" && key="${key}"`;

    pb.collection("video_verifications")
      .getFullList({ filter, sort: "-created" })
      .then((r) => {
        if (live) setRecords(r.map(toVideoVerificationRecord));
      })
      .catch(() => {
        if (live) setRecords([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    const unsubscribePromise = pb
      .collection("video_verifications")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoVerificationRecord(e.record);
        if (record.video_id !== videoId || record.key !== key) return;
        setRecords((prev) => {
          if (e.action === "delete") {
            return prev.filter((n) => n.id !== record.id);
          }
          const existingIndex = prev.findIndex((n) => n.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = record;
            return next.sort(
              (a, b) =>
                new Date(b.created).getTime() - new Date(a.created).getTime(),
            );
          }
          return [record, ...prev].sort(
            (a, b) =>
              new Date(b.created).getTime() - new Date(a.created).getTime(),
          );
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoId, key]);

  return { records, loading };
}

const PBContext = createContext<PocketBase | null>(null);

type PBConnectionStatus = "connecting" | "connected" | "error";

/**
 * Shown when the PocketBase health check fails. Explains that the backend is
 * required and how to bring it up, instead of rendering a blank page.
 */
function PBUnavailable({ url, onRetry }: { url: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <PlugZap size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">No hay conexión con PocketBase</h1>
            <p className="text-sm text-muted-foreground">El backend no respondió.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Esta app necesita un servidor PocketBase para guardar notas, votos y
          verificaciones. No pudimos alcanzarlo en:
        </p>

        <code className="mt-2 block break-all rounded-lg bg-muted px-3 py-2 text-xs font-mono">
          {url}
        </code>

        <div className="mt-5 rounded-xl border bg-background p-4">
          <p className="mb-2 text-sm font-medium">Cómo solucionarlo</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">1.</span>
              Levanta PocketBase (p. ej. <code className="font-mono text-xs">./pocketbase serve</code>).
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">2.</span>
              Verifica que <code className="font-mono text-xs">PUBLIC_PB_URL</code> apunte
              a la URL correcta (por defecto <code className="font-mono text-xs">/pb</code>).
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">3.</span>
              En el contenedor de LexGuard Studio el endpoint <code className="font-mono text-xs">/pb</code>{" "}
              se resuelve por proxy; si ves esto ahí, revisa que PocketBase esté encendido.
            </li>
          </ul>
        </div>

        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw size={16} />
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps the app in a PocketBase client, but only renders its children once the
 * backend answers a health check. If PocketBase can't be reached we simply
 * don't show the UI — the app degrades to a blank slate instead of a broken
 * shell full of empty notes/votes/verifications.
 */
export function PBProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const url =
      typeof import.meta.env !== "undefined" && import.meta.env.PUBLIC_PB_URL
        ? (import.meta.env.PUBLIC_PB_URL as string)
        : "/pb";
    return new PocketBase(url);
  }, []);

  const [status, setStatus] = useState<PBConnectionStatus>("connecting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setStatus("connecting");
    client.health
      .check()
      .then(() => {
        if (live) setStatus("connected");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, [client, attempt]);

  // PocketBase unreachable → show a helpful error screen instead of the app.
  if (status === "error") {
    return (
      <PBUnavailable url={client.baseURL} onRetry={() => setAttempt((n) => n + 1)} />
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Conectando…</p>
      </div>
    );
  }

  return <PBContext.Provider value={client}>{children}</PBContext.Provider>;
}

export function usePB(): PocketBase {
  const pb = useContext(PBContext);
  if (!pb) throw new Error("usePB must be used inside <PBProvider>");
  return pb;
}

function getVoterId(): string {
  let id = localStorage.getItem("video_voter_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("video_voter_id", id);
  }
  return id;
}

export interface VideoNoteRecord {
  id: string;
  video_id: string;
  scene_id?: string;
  note: string;
  label?: string;
  updated: string;
  created: string;
}

function toVideoNoteRecord(r: RecordModel): VideoNoteRecord {
  return {
    id: r.id,
    video_id: r.video_id as string,
    scene_id: (r.scene_id as string | undefined) || undefined,
    note: r.note as string,
    label: (r.label as string | undefined) || undefined,
    updated: r.updated,
    created: r.created,
  };
}

export function useNotesForVideo(videoId: string) {
  const pb = usePB();
  const [notes, setNotes] = useState<VideoNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);

    const filter = `video_id="${videoId}"`;

    pb.collection("video_notes")
      .getFullList({ filter, sort: "created" })
      .then((r) => {
        if (live) setNotes(r.map(toVideoNoteRecord));
      })
      .catch(() => {
        if (live) setNotes([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    const unsubscribePromise = pb
      .collection("video_notes")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoNoteRecord(e.record);
        if (record.video_id !== videoId) return;
        setNotes((prev) => {
          if (e.action === "delete") {
            return prev.filter((n) => n.id !== record.id);
          }
          const existingIndex = prev.findIndex((n) => n.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = record;
            return next;
          }
          return [...prev, record].sort(
            (a, b) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoId]);

  const addNote = useCallback(
    async (payload: { scene_id?: string; note: string; label?: string }) => {
      const r = await pb.collection("video_notes").create({
        video_id: videoId,
        ...payload,
      });
      return toVideoNoteRecord(r);
    },
    [pb, videoId],
  );

  const updateNote = useCallback(
    async (noteId: string, patch: Partial<VideoNoteRecord>) => {
      const r = await pb.collection("video_notes").update(noteId, patch);
      return toVideoNoteRecord(r);
    },
    [pb],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      await pb.collection("video_notes").delete(noteId);
    },
    [pb],
  );

  return { notes, loading, addNote, updateNote, deleteNote };
}

export interface VideoVoteRecord {
  id: string;
  video_id: string;
  voter_id: string;
  vote: "+1" | "-1";
  updated: string;
  created: string;
}

export interface VideoVoteSummary {
  up: number;
  down: number;
  total: number;
  myVote?: "+1" | "-1";
}

function toVideoVoteRecord(r: RecordModel): VideoVoteRecord {
  return {
    id: r.id,
    video_id: r.video_id as string,
    voter_id: r.voter_id as string,
    vote: r.vote as "+1" | "-1",
    updated: r.updated,
    created: r.created,
  };
}

function summarizeVotes(records: VideoVoteRecord[], voterId: string): VideoVoteSummary {
  let up = 0;
  let down = 0;
  let myVote: "+1" | "-1" | undefined;
  for (const r of records) {
    if (r.vote === "+1") up++;
    else down++;
    if (r.voter_id === voterId) myVote = r.vote;
  }
  return { up, down, total: up - down, myVote };
}

export function useVotesForVideo(videoId: string) {
  const pb = usePB();
  const voterId = useMemo(() => getVoterId(), []);
  const [votes, setVotes] = useState<VideoVoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const summary = useMemo(
    () => summarizeVotes(votes, voterId),
    [votes, voterId],
  );

  useEffect(() => {
    let live = true;
    setLoading(true);

    const filter = `video_id="${videoId}"`;

    pb.collection("video_votes")
      .getFullList({ filter, sort: "created" })
      .then((r) => {
        if (live) setVotes(r.map(toVideoVoteRecord));
      })
      .catch(() => {
        if (live) setVotes([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    const unsubscribePromise = pb
      .collection("video_votes")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoVoteRecord(e.record);
        if (record.video_id !== videoId) return;
        setVotes((prev) => {
          if (e.action === "delete") {
            return prev.filter((v) => v.id !== record.id);
          }
          const existingIndex = prev.findIndex((v) => v.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = record;
            return next;
          }
          return [...prev, record].sort(
            (a, b) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoId, voterId]);

  const castVote = useCallback(
    async (vote: "+1" | "-1") => {
      const existing = votes.find((v) => v.voter_id === voterId);
      if (existing) {
        if (existing.vote === vote) {
          // Toggle off: delete the vote.
          await pb.collection("video_votes").delete(existing.id);
          return undefined;
        }
        // Change vote.
        const r = await pb
          .collection("video_votes")
          .update(existing.id, { vote });
        return toVideoVoteRecord(r);
      }
      const r = await pb.collection("video_votes").create({
        video_id: videoId,
        voter_id: voterId,
        vote,
      });
      return toVideoVoteRecord(r);
    },
    [pb, videoId, voterId, votes],
  );

  return { summary, loading, castVote };
}

export function useVotesForProject(project?: VideoProject): Record<string, VideoVoteSummary> {
  const pb = usePB();
  const voterId = useMemo(() => getVoterId(), []);
  const [summaries, setSummaries] = useState<Record<string, VideoVoteSummary>>({});

  const videoIds = useMemo(
    () => project?.videos.map((v) => v.id) ?? [],
    [project],
  );

  useEffect(() => {
    if (videoIds.length === 0) {
      setSummaries({});
      return;
    }
    let live = true;
    const filter = videoIds.map((id) => `video_id="${id}"`).join(" || ");

    pb.collection("video_votes")
      .getFullList({ filter, sort: "created" })
      .then((r) => {
        if (!live) return;
        const next: Record<string, VideoVoteSummary> = {};
        for (const id of videoIds) next[id] = { up: 0, down: 0, total: 0 };
        for (const record of r.map(toVideoVoteRecord)) {
          const current = next[record.video_id] ?? { up: 0, down: 0, total: 0 };
          if (record.vote === "+1") current.up++;
          else current.down++;
          if (record.voter_id === voterId) current.myVote = record.vote;
          current.total = current.up - current.down;
          next[record.video_id] = current;
        }
        setSummaries(next);
      })
      .catch(() => {
        if (live) setSummaries({});
      });

    const unsubscribePromise = pb
      .collection("video_votes")
      .subscribe("*", (e) => {
        if (!live) return;
        const record = toVideoVoteRecord(e.record);
        if (!videoIds.includes(record.video_id)) return;
        setSummaries((prev) => {
          const current = prev[record.video_id] ?? { up: 0, down: 0, total: 0 };
          const next = { ...prev, [record.video_id]: current };
          if (e.action === "delete") {
            if (record.vote === "+1") current.up = Math.max(0, current.up - 1);
            else current.down = Math.max(0, current.down - 1);
            if (record.voter_id === voterId) current.myVote = undefined;
          } else {
            const existing =
              e.action === "update" ||
              (record.voter_id === voterId && current.myVote);
            if (existing) {
              if (current.myVote === "+1") current.up = Math.max(0, current.up - 1);
              else if (current.myVote === "-1") current.down = Math.max(0, current.down - 1);
            }
            if (record.vote === "+1") current.up++;
            else current.down++;
            if (record.voter_id === voterId) current.myVote = record.vote;
          }
          current.total = current.up - current.down;
          return next;
        });
      });

    return () => {
      live = false;
      unsubscribePromise.then((unsub) => unsub()).catch(() => {});
    };
  }, [pb, videoIds.join(","), voterId]);

  return summaries;
}
