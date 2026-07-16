import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildVideoTimeline, type ScriptSegment } from "../lib/script.timeline";
import type { Video } from "../data/videos";
import {
  Play,
  Pause,
  RotateCcw,
  Type,
  Settings2,
  X,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Trash2,
} from "lucide-react";
import {
  PLAYBACK_SPEEDS,
  formatSpeed,
  computeEffectiveSegments,
  findActiveIndex,
  totalEffectiveDuration,
  buildLines,
  rescaleElapsedForNewSpeed,
  type EffectiveSegment,
  type LineInfo,
} from "../lib/speed";

type TextSize = "normal" | "large" | "huge";

interface PlayerSettings {
  textSize: TextSize;
  loop: boolean;
  showStage: boolean;
  highlightNext: boolean;
}

const SIZE_CLASSES: Record<TextSize, string> = {
  normal: "text-xl md:text-2xl",
  large: "text-3xl md:text-4xl",
  huge: "text-4xl md:text-6xl",
};

function useVideoTimeline(video: Video) {
  return useMemo(() => {
    return buildVideoTimeline(video.scenes.map((s) => ({ script: s.script })));
  }, [video]);
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// NOTE: keep this at module scope. If it lives inside VideoPlayer it is a NEW
// component identity on every render; the RAF loop re-renders ~60x/second while
// playing, which unmounts/remounts these buttons every frame and makes them
// impossible to click. Hoisting it keeps the DOM nodes stable across renders.
function SpeedControl({
  label,
  value,
  onChange,
  onClear,
  compact = false,
  onDebug,
}: {
  label?: ReactNode;
  value: number;
  onChange: (speed: number) => void;
  onClear?: () => void;
  compact?: boolean;
  onDebug?: (msg: string) => void;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "rounded-xl border bg-card p-3"}`}>
      {label && <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>}
      <div className="flex flex-wrap gap-1">
        {PLAYBACK_SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => {
              onDebug?.(`SpeedControl click speed=${speed}`);
              onChange(speed);
            }}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              Math.abs(value - speed) < 0.001
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-accent"
            }`}
          >
            {formatSpeed(speed)}
          </button>
        ))}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Reset to global speed"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// Build a tiny, genuinely-silent looping WAV as a Blob URL. Playing *real* (silent)
// audio is what makes the browser expose the OS media session + hardware media keys.
// A MediaStream srcObject does NOT reliably register the session on Chrome, so we
// generate 8-bit PCM silence (constant 128 = DC, inaudible) at normal volume.
function createSilentWavUrl(seconds = 1): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate (blockAlign = 1)
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, numSamples, true);
  for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128); // silence
  const blob = new Blob([view], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function VideoPlayer({
  video,
  onClose,
}: {
  video: Video;
  onClose: () => void;
}) {
  const baseSegments = useVideoTimeline(video);
  const [globalSpeed, setGlobalSpeed] = useState(1);
  const [lineSpeedOverrides, setLineSpeedOverrides] = useState<
    Record<number, number>
  >({});
  const effectiveSegments = useMemo(
    () => computeEffectiveSegments(baseSegments, globalSpeed, lineSpeedOverrides),
    [baseSegments, globalSpeed, lineSpeedOverrides],
  );
  const lineInfo = useMemo(
    () => buildLines(baseSegments, effectiveSegments),
    [baseSegments, effectiveSegments],
  );
  const totalDuration = useMemo(
    () => totalEffectiveDuration(effectiveSegments),
    [effectiveSegments],
  );



  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // effective elapsed seconds
  const [settings, setSettings] = useState<PlayerSettings>({
    textSize: "large",
    loop: false,
    showStage: true,
    highlightNext: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const activeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSessionActionHandlersRef = useRef<Set<string> | null>(null);

  const activeIndex = useMemo(
    () => findActiveIndex(elapsed, effectiveSegments),
    [elapsed, effectiveSegments],
  );
  const activeLineIndex =
    activeIndex >= 0 ? effectiveSegments[activeIndex]?.lineIndex ?? -1 : -1;

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now() - elapsedRef.current * 1000;
    const tick = () => {
      const now = performance.now();
      const next = (now - startRef.current) / 1000;
      if (next >= totalDuration) {
        if (settings.loop) {
          startRef.current = now;
          elapsedRef.current = 0;
          setElapsed(0);
        } else {
          setElapsed(totalDuration);
          setRunning(false);
          return;
        }
      } else {
        elapsedRef.current = next;
        setElapsed(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, totalDuration, settings.loop]);

  // Create a silent, looping audio element. Real (silent) playing audio is what makes the
  // browser expose the OS media session + hardware media keys (play/pause/prev/next).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const url = createSilentWavUrl(1);
    const audio = document.createElement("audio");
    audio.src = url;
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      void audio.pause();
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
  }, []);

  // Keep media session metadata and play-state in sync with our virtual player.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: video.title,
      artist: "Marketing video scripts",
      album: "Scripts",
    });
    ms.playbackState = running ? "playing" : "paused";
  }, [running, video.title]);

  // Wire media session actions (browser/OS media keys) to the player.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const actions: MediaSessionAction[] = ["play", "pause", "previoustrack", "nexttrack"];
    mediaSessionActionHandlersRef.current = new Set();
    const setHandler = (action: MediaSessionAction, handler: () => void) => {
      try {
        ms.setActionHandler(action, handler);
        mediaSessionActionHandlersRef.current?.add(action);
      } catch {
        // some actions unsupported on this browser
      }
    };
    setHandler("play", () => {
      if (!running) togglePlay();
    });
    setHandler("pause", () => {
      if (running) togglePlay();
    });
    setHandler("previoustrack", previousLine);
    setHandler("nexttrack", nextLine);
    return () => {
      mediaSessionActionHandlersRef.current?.forEach((action) => {
        try {
          ms.setActionHandler(action as MediaSessionAction, null);
        } catch {}
      });
    };
  }, [running, activeLineIndex, lineInfo, totalDuration]);

  // Keep the silent track's REAL play/paused state in sync with our virtual player. This
  // matters for the OS media widget: pausing the element makes the widget show the play
  // icon and makes the hardware play/pause key resolve to the "play" action (resume),
  // instead of firing "pause" while we're already paused. Pausing does NOT drop the media
  // session — the page stays "Now Playing", same as pausing any audio element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (running) {
      if (audio.paused) {
        void audio.play().catch(() => {
          // autoplay blocked before a gesture; keyboard/UI still work
        });
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [running]);

  useEffect(() => {
    if (activeRef.current) {
      const el = activeRef.current;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const targetY = window.scrollY + rect.top - viewportHeight / 2 + rect.height / 2;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  }, [activeIndex]);

  const [lastAction, setLastAction] = useState<string>("-");
  const [debug, setDebug] = useState<string>("");

  const applySpeedChange = (
    nextGlobalSpeed: number,
    nextOverrides: Record<number, number>,
  ) => {
    setLastAction(`applySpeedChange g=${nextGlobalSpeed} overrides=${JSON.stringify(nextOverrides)} elapsedRef=${elapsedRef.current.toFixed(2)}`);
    const previousSegments = effectiveSegments;
    const nextSegments = computeEffectiveSegments(
      baseSegments,
      nextGlobalSpeed,
      nextOverrides,
    );
    const nextElapsed = rescaleElapsedForNewSpeed(
      elapsedRef.current,
      previousSegments,
      nextSegments,
    );
    setGlobalSpeed(nextGlobalSpeed);
    setLineSpeedOverrides(nextOverrides);
    setElapsed(nextElapsed);
    elapsedRef.current = nextElapsed;
    startRef.current = performance.now() - nextElapsed * 1000;
  };

  const setSpeedForLine = (lineIndex: number, speed: number | null) => {
    const nextOverrides = { ...lineSpeedOverrides };
    if (speed === null) {
      delete nextOverrides[lineIndex];
    } else {
      nextOverrides[lineIndex] = speed;
    }
    applySpeedChange(globalSpeed, nextOverrides);
  };

  const goToLine = (lineIndex: number) => {
    const line = lineInfo[lineIndex];
    if (!line) return;
    const next = Math.max(0, Math.min(totalDuration, line.effectiveStart));
    setElapsed(next);
    elapsedRef.current = next;
    startRef.current = performance.now() - next * 1000;
  };

  // Move the clock to the start of a specific segment (word), using the CURRENT effective
  // timeline. Keeps play/paused state; if playing, it just continues from that word.
  const seekToSegment = (index: number) => {
    const seg = effectiveSegments[index];
    if (!seg) return;
    const next = Math.max(0, Math.min(totalDuration, seg.effectiveStart));
    setElapsed(next);
    elapsedRef.current = next;
    startRef.current = performance.now() - next * 1000;
  };

  const previousLine = () => {
    const target = Math.max(0, activeLineIndex - 1);
    goToLine(target);
  };

  const nextLine = () => {
    const target = Math.min(lineInfo.length - 1, activeLineIndex + 1);
    goToLine(target);
  };

  const jumpSeconds = (delta: number) => {
    const next = Math.max(0, Math.min(totalDuration, elapsed + delta));
    setElapsed(next);
    elapsedRef.current = next;
    startRef.current = performance.now() - next * 1000;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        jumpSeconds(-5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        jumpSeconds(5);
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        previousLine();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        nextLine();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [elapsed, totalDuration, activeLineIndex, lineInfo]);

  const togglePlay = () => {
    if (elapsed >= totalDuration) {
      setElapsed(0);
      elapsedRef.current = 0;
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    elapsedRef.current = 0;
  };

  const ScriptLines = () => {
    const lines: { lineIndex: number; segments: typeof effectiveSegments }[] = [];
    for (const seg of effectiveSegments) {
      const last = lines[lines.length - 1];
      if (!last || last.lineIndex !== seg.lineIndex) {
        lines.push({ lineIndex: seg.lineIndex, segments: [seg] });
      } else {
        last.segments.push(seg);
      }
    }

    return (
      <div className={`leading-relaxed break-words overflow-wrap-anywhere ${SIZE_CLASSES[settings.textSize]}`}>
        {lines.map(({ lineIndex, segments }) => {
          const hasLineOverride = lineIndex in lineSpeedOverrides;
          return (
            <div key={lineIndex} className="block">
              {segments.map((seg, segIdx) => {
                const globalIdx = effectiveSegments.indexOf(seg);
                const isActive = globalIdx === activeIndex;
                const isNext = settings.highlightNext && globalIdx === activeIndex + 1;
                if (seg.isDirection) {
                  if (!settings.showStage) return null;
                  return (
                    <span
                      key={globalIdx}
                      ref={isActive ? activeRef : undefined}
                      onClick={() => seekToSegment(globalIdx)}
                      title="Ir a este punto"
                      className={`inline align-middle transition-colors duration-150 cursor-pointer rounded px-1 text-sm font-medium ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 opacity-60"
                      }`}
                    >
                      {seg.text}
                      {segIdx === 0 && hasLineOverride && (
                        <sup className="ml-0.5 text-[10px] text-emerald-700 dark:text-emerald-200">
                          {formatSpeed(seg.speed)}
                        </sup>
                      )}
                    </span>
                  );
                }
                return (
                  <span
                    key={globalIdx}
                    ref={isActive ? activeRef : undefined}
                    onClick={() => {
                      if (!seg.isWhitespace) seekToSegment(globalIdx);
                    }}
                    title={seg.isWhitespace ? undefined : "Ir a esta palabra"}
                    className={`inline align-middle ${
                      seg.isWhitespace ? "" : "cursor-pointer hover:bg-primary/20 hover:rounded"
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground rounded"
                        : isNext
                          ? "text-foreground/70"
                          : "text-foreground/30"
                    }`}
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {seg.text}
                    {segIdx === 0 && hasLineOverride && (
                      <sup className="ml-0.5 align-top text-[10px] font-medium text-primary/80">
                        {formatSpeed(seg.speed)}
                      </sup>
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pb-8 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{video.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatClock(elapsed)} / {formatClock(totalDuration)} · {formatSpeed(globalSpeed)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-lg p-2 border hover:bg-accent"
            title="Player settings"
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 border hover:bg-accent"
            title="Close player"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Global speed strip */}
      <div className="mb-3 shrink-0">
        <SpeedControl
          label={<span className="flex items-center gap-1.5"><Gauge size={16} /> Velocidad global</span>}
          value={globalSpeed}
          onDebug={setLastAction}
          onChange={(speed) => {
            applySpeedChange(speed, lineSpeedOverrides);
          }}
        />
      </div>

      {/* Progress */}
      <div className="mb-4 shrink-0">
        <input
          type="range"
          min={0}
          max={totalDuration || 0}
          step={0.05}
          value={Math.min(elapsed, totalDuration || 0)}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            setElapsed(next);
            elapsedRef.current = next;
            startRef.current = performance.now() - next * 1000;
          }}
          className="w-full accent-primary"
        />
      </div>

      {/* Script display */}
      <div className="rounded-xl border bg-card p-6 md:p-8 my-4 md:my-6 space-y-4">
        <ScriptLines />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => jumpSeconds(-10)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
            title="Back 10 seconds (←)"
          >
            <ChevronLeft size={18} /> 10s
          </button>
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? "Pause" : elapsed >= totalDuration ? "Replay" : "Play"}
          </button>
          <button
            onClick={() => jumpSeconds(10)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
            title="Forward 10 seconds (→)"
          >
            10s <ChevronRight size={18} />
          </button>
          <button
            onClick={previousLine}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
            title="Previous line (P)"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <button
            onClick={nextLine}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
            title="Next line (N)"
          >
            Next <ChevronRight size={18} />
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
            title="Reset"
          >
            <RotateCcw size={18} /> Reset
          </button>
          <button
            onClick={() => setSettings((s) => ({ ...s, loop: !s.loop }))}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              settings.loop
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            title="Loop"
          >
            <Repeat size={18} /> Loop
          </button>
        </div>

        {showSettings && (
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Type size={16} className="text-muted-foreground" />
              <select
                value={settings.textSize}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    textSize: e.target.value as TextSize,
                  }))
                }
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="huge">Huge</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showStage}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, showStage: e.target.checked }))
                }
              />
              Show stage cues
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.highlightNext}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    highlightNext: e.target.checked,
                  }))
                }
              />
              Highlight next
            </label>
          </div>
        )}
      </div>

      {/* Active line speed override panel */}
      {activeLineIndex >= 0 && lineInfo[activeLineIndex] && (
        <div className="mt-3 shrink-0 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-medium">
              Línea {activeLineIndex + 1}: <span className="text-muted-foreground">“{lineInfo[activeLineIndex].label || "..."}”</span>
            </span>
            {activeLineIndex in lineSpeedOverrides && (
              <button
                onClick={() => setSpeedForLine(activeLineIndex, null)}
                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} /> Restablecer global
              </button>
            )}
          </div>
          <SpeedControl
            value={effectiveSegments.find((s) => s.lineIndex === activeLineIndex)?.speed ?? globalSpeed}
            onDebug={setLastAction}
            onChange={(speed) => setSpeedForLine(activeLineIndex, speed)}
            onClear={
              activeLineIndex in lineSpeedOverrides
                ? () => setSpeedForLine(activeLineIndex, null)
                : undefined
            }
            compact
          />
        </div>
      )}

      {/* All overrides list */}
      {Object.keys(lineSpeedOverrides).length > 0 && (
        <div className="mt-3 shrink-0 rounded-xl border bg-card p-3">
          <h3 className="text-sm font-medium mb-2">Overrides activas</h3>
          <ul className="space-y-1.5">
            {Object.entries(lineSpeedOverrides).map(([lineIndexStr, speed]) => {
              const lineIndex = parseInt(lineIndexStr, 10);
              const line = lineInfo[lineIndex];
              if (!line) return null;
              return (
                <li key={lineIndex} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground truncate">
                    Línea {lineIndex + 1}: <span className="text-foreground">“{line.label || "..."}”</span> · {formatSpeed(speed)}
                  </span>
                  <button
                    onClick={() => setSpeedForLine(lineIndex, null)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={12} /> Borrar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Debug */}
      <div className="mt-3 shrink-0 rounded-xl border bg-card p-3">
        <h3 className="text-sm font-medium mb-1">Debug</h3>
        <p className="text-xs text-muted-foreground font-mono">{lastAction}</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">active={activeIndex} line={activeLineIndex} elapsed={elapsed.toFixed(2)} total={totalDuration.toFixed(2)}</p>
      </div>
    </div>
  );
}
