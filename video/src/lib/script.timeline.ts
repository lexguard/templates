import { parseScript, type ParsedScript, type ScriptDirection } from "./script";

export interface ScriptSegment {
  /** Index of the scene this segment belongs to (for multi-scene timelines). */
  sceneIndex: number;
  /** Raw text token. For words this is the word; for whitespace it includes spaces/newlines. */
  text: string;
  /** True if this token is a bracketed direction. */
  isDirection: boolean;
  /** For directions, classification details. */
  direction?: ScriptDirection;
  /** Estimated seconds this segment should be active/visible. */
  seconds: number;
  /** Accumulated elapsed seconds at the start of this segment, relative to the WHOLE VIDEO. */
  elapsedStart: number;
  /** True if this segment is only whitespace (should not consume spoken time). */
  isWhitespace: boolean;
}

/** Build a per-word timeline for a single parsed scene. */
function buildSceneTimeline(
  parsed: ParsedScript,
  sceneIndex: number,
  videoOffset: number,
): ScriptSegment[] {
  const timeline: ScriptSegment[] = [];
  const spokenWords = parsed.spokenText.split(/\s+/).filter(Boolean);
  const wordSeconds = spokenWords.length
    ? parsed.baseDurationSeconds / spokenWords.length
    : 0;

  let start = videoOffset;
  let cursor = 0;

  for (const dir of parsed.directions) {
    if (dir.start > cursor) {
      const chunk = parsed.original.slice(cursor, dir.start);
      const tokens = chunk.match(/\S+|\s+/g) || [];
      for (const token of tokens) {
        const isWhitespace = /^\s+$/.test(token);
        timeline.push({
          sceneIndex,
          text: token,
          isDirection: false,
          isWhitespace,
          seconds: isWhitespace ? 0 : wordSeconds,
          elapsedStart: start,
        });
        if (!isWhitespace) start += wordSeconds;
      }
    }

    timeline.push({
      sceneIndex,
      text: dir.stage ? `*[${dir.raw}]*` : `[${dir.raw}]`,
      isDirection: true,
      direction: dir,
      isWhitespace: false,
      seconds: dir.seconds,
      elapsedStart: start,
    });
    start += dir.seconds;
    cursor = dir.end;
  }

  if (cursor < parsed.original.length) {
    const chunk = parsed.original.slice(cursor);
    const tokens = chunk.match(/\S+|\s+/g) || [];
    for (const token of tokens) {
      const isWhitespace = /^\s+$/.test(token);
      timeline.push({
        sceneIndex,
        text: token,
        isDirection: false,
        isWhitespace,
        seconds: isWhitespace ? 0 : wordSeconds,
        elapsedStart: start,
      });
      if (!isWhitespace) start += wordSeconds;
    }
  }

  // Rounding safety.
  const actualTotal = timeline.reduce((sum, s) => sum + s.seconds, 0);
  const delta = parsed.totalDurationSeconds - actualTotal;
  if (delta !== 0) {
    const adjustable = timeline.filter((s) => !s.isDirection && !s.isWhitespace && s.seconds > 0);
    if (adjustable.length) {
      const per = delta / adjustable.length;
      for (const s of adjustable) s.seconds += per;
    } else if (timeline.length) {
      timeline[timeline.length - 1].seconds += delta;
    }
  }

  return timeline;
}

/** Build a full-video timeline from multiple scenes. */
export function buildVideoTimeline(
  scenes: { script: string }[],
): ScriptSegment[] {
  const all: ScriptSegment[] = [];
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const parsed = parseScript(scenes[i].script);
    const sceneTimeline = buildSceneTimeline(parsed, i, offset);
    all.push(...sceneTimeline);
    offset += parsed.totalDurationSeconds;
  }
  return all;
}
