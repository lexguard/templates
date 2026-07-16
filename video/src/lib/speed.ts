import type { ScriptSegment } from "./script.timeline";

/** Sensible playback speed multipliers. */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5];

export interface EffectiveSegment extends ScriptSegment {
  /** Index of the line/sentence this segment belongs to. */
  lineIndex: number;
  /** Actual speed applied to this segment (global or line override). */
  speed: number;
  /** Segment duration after applying speed. */
  effectiveSeconds: number;
  /** Accumulated effective elapsed time at the start of this segment. */
  effectiveStart: number;
}

export interface LineInfo {
  /** Line index, 0-based across the whole video. */
  lineIndex: number;
  /** Human-readable label (first non-whitespace text of the line). */
  label: string;
  /** Indices of all base segments that belong to this line. */
  segmentIndices: number[];
  /** Effective elapsed time at the start of this line. */
  effectiveStart: number;
  /** Effective duration of this line. */
  effectiveDuration: number;
}

export function formatSpeed(speed: number): string {
  const decimals = speed % 1 === 0 ? 0 : (speed * 10) % 1 === 0 ? 1 : 2;
  return `${speed.toFixed(decimals)}x`;
}

/** Group base segments into logical "lines" separated by newlines in the original script. */
export function buildLines(
  segments: ScriptSegment[],
  effectiveSegments?: EffectiveSegment[],
): LineInfo[] {
  const partials: Omit<LineInfo, "effectiveStart" | "effectiveDuration">[] = [];
  let currentLineIndex = 0;
  let current: Omit<LineInfo, "effectiveStart" | "effectiveDuration"> | null = null;
  let prevSceneIndex = segments.length ? segments[0].sceneIndex : 0;
  // Lazy break: a sentence end / newline marks that the NEXT spoken word starts a new
  // line, so trailing pauses/directions stay attached to the sentence they follow.
  let pendingBreak = false;

  const closeCurrent = () => {
    if (current) {
      partials.push(current);
      currentLineIndex++;
      current = null;
    }
  };

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isSpokenWord = !segment.isWhitespace && !segment.isDirection;
    const sceneChanged = current !== null && segment.sceneIndex !== prevSceneIndex;

    // Break before this segment on a scene change, or before the next spoken word once a
    // sentence/newline break is pending.
    if (sceneChanged || (pendingBreak && isSpokenWord)) {
      closeCurrent();
      pendingBreak = false;
    }
    prevSceneIndex = segment.sceneIndex;

    if (!current) {
      current = {
        lineIndex: currentLineIndex,
        label: "",
        segmentIndices: [],
      };
    }

    current.segmentIndices.push(i);

    if (!current.label && isSpokenWord) {
      current.label = segment.text.replace(/^\s+|\s+$/g, "");
    }

    const isNewlineBreak = segment.isWhitespace && segment.text.includes("\n");
    const isSentenceEnd = isSpokenWord && /[.!?…]+$/.test(segment.text.trim());
    if (isNewlineBreak || isSentenceEnd) {
      pendingBreak = true;
    }
  }

  closeCurrent();

  // Ensure every segment belongs to at least one line even if there were no newlines.
  if (partials.length === 0 && segments.length > 0) {
    partials.push({
      lineIndex: 0,
      label: segments.find((s) => !s.isWhitespace && !s.isDirection)?.text || "...",
      segmentIndices: segments.map((_, i) => i),
    });
  }

  // Compute effective timing per line when effective segments are supplied.
  const lines = partials.map((line) => {
    const firstSegment = effectiveSegments?.[line.segmentIndices[0]];
    const lastSegment =
      effectiveSegments?.[line.segmentIndices[line.segmentIndices.length - 1]];
    const effectiveStart = firstSegment?.effectiveStart ?? 0;
    const effectiveDuration =
      (lastSegment?.effectiveStart ?? 0) +
      (lastSegment?.effectiveSeconds ?? 0) -
      effectiveStart;
    return { ...line, effectiveStart, effectiveDuration };
  });

  return lines;
}

/** Build a video-global timeline where each segment's duration is divided by its speed. */
export function computeEffectiveSegments(
  segments: ScriptSegment[],
  globalSpeed: number,
  lineSpeedOverrides: Record<number, number>,
): EffectiveSegment[] {
  const lines = buildLines(segments);
  const lineForSegment = new Map<number, number>();
  for (const line of lines) {
    for (const segmentIndex of line.segmentIndices) {
      lineForSegment.set(segmentIndex, line.lineIndex);
    }
  }

  let effectiveStart = 0;
  return segments.map((segment, index) => {
    const lineIndex = lineForSegment.get(index) ?? -1;
    const speed = lineSpeedOverrides[lineIndex] ?? globalSpeed;
    const effectiveSeconds = segment.seconds / speed;
    const effective: EffectiveSegment = {
      ...segment,
      lineIndex,
      speed,
      effectiveSeconds,
      effectiveStart,
    };
    effectiveStart += effectiveSeconds;
    return effective;
  });
}

/** Find the segment index active at a given effective elapsed time. */
export function findActiveIndex(
  elapsedEffective: number,
  effectiveSegments: EffectiveSegment[],
): number {
  if (effectiveSegments.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < effectiveSegments.length; i++) {
    if (elapsedEffective >= effectiveSegments[i].effectiveStart) idx = i;
    else break;
  }
  return idx;
}

/** Total effective duration of the whole video. */
export function totalEffectiveDuration(
  effectiveSegments: EffectiveSegment[],
): number {
  return effectiveSegments.reduce((sum, s) => sum + s.effectiveSeconds, 0);
}

/**
 * When a speed changes mid-playback, convert the current effective elapsed time
 * into a fractional position inside the active segment, then recompute the new
 * effective elapsed time that lands on the same fractional position.
 *
 * This keeps the playhead on the same word (or bracket) while still honoring
 * the new overall timeline length.
 */
export function rescaleElapsedForNewSpeed(
  previousElapsed: number,
  previousSegments: EffectiveSegment[],
  newSegments: EffectiveSegment[],
): number {
  if (previousSegments.length === 0 || newSegments.length === 0) return 0;

  const activeIndex = findActiveIndex(previousElapsed, previousSegments);
  if (activeIndex < 0) return 0;

  const prevSeg = previousSegments[activeIndex];
  const progressInSeg =
    prevSeg.effectiveSeconds > 0
      ? (previousElapsed - prevSeg.effectiveStart) / prevSeg.effectiveSeconds
      : 0;

  const newSeg = newSegments[activeIndex];
  const newElapsed =
    newSeg.effectiveStart + progressInSeg * newSeg.effectiveSeconds;
  return Math.max(0, Math.min(totalEffectiveDuration(newSegments), newElapsed));
}
