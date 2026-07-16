export type DirectionKind = "pause" | "emotion" | "cadence" | "note" | "stage";

export interface ScriptDirection {
  /** Raw bracket content, e.g. "pause 2s" or "screaming". */
  raw: string;
  /** Classification of the direction. */
  kind: DirectionKind;
  /** Human-friendly label. */
  label: string;
  /** Extra seconds added to the scene when the direction is a pause/break. */
  seconds: number;
  /** Character index where the opening bracket starts in the original script. */
  start: number;
  /** Character index where the closing bracket ends (exclusive). */
  end: number;
  /** True if the bracket was wrapped in *asterisks* as a stage/visual cue. */
  stage: boolean;
}

export interface ParsedScript {
  /** Original script text. */
  original: string;
  /** Text the talent would actually say (brackets and stage wrappers removed). */
  spokenText: string;
  /** Word count of the spoken text. */
  wordCount: number;
  /** Detected bracketed directions. */
  directions: ScriptDirection[];
  /** Estimated seconds from spoken words only. */
  baseDurationSeconds: number;
  /** Extra seconds from explicit pauses/breaks. */
  pauseDurationSeconds: number;
  /** Total estimated scene duration, rounded up. */
  totalDurationSeconds: number;
}

const SECONDS_PER_WORD = 0.46; // ~130 words/minute, comfortable Spanish marketing pace

const PAUSE_REGEX = /^(?:pause|break|silence|wait|stop)\s*(\d+(?:\.\d+)?)?\s*(s|sec|seconds?)?$/i;
const DIRECT_PAUSE_REGEX = /^(\d+(?:\.\d+)?)\s*(s|sec|seconds?)$/i;
const STAGE_PAUSE_REGEX = /(?:pause|break|silence|wait|stop)\s*(\d+(?:\.\d+)?)\s*(s|sec|seconds?)?/i;

const EMOTION_KEYWORDS = [
  "screaming",
  "shout",
  "whisper",
  "calm",
  "normal",
  "excited",
  "happy",
  "sad",
  "angry",
  "serious",
  "serio",
  "playful",
  "warm",
  "energetic",
  "honest",
  "story",
  "curious",
  "soft",
];

const CADENCE_KEYWORDS = [
  "slow",
  "fast",
  "emphasis",
  "dramatic",
  "soft",
  "loud",
  "pause",
  "breathe",
  "clear",
  "bold",
];

function extractPauseSeconds(raw: string): number | null {
  const lower = raw.trim().toLowerCase();
  const pauseMatch = lower.match(PAUSE_REGEX);
  if (pauseMatch) {
    return parseFloat(pauseMatch[1] || "1");
  }
  const directMatch = lower.match(DIRECT_PAUSE_REGEX);
  if (directMatch) {
    return parseFloat(directMatch[1]);
  }
  const stageMatch = lower.match(STAGE_PAUSE_REGEX);
  if (stageMatch) {
    return parseFloat(stageMatch[1] || "1");
  }
  return null;
}

function classifyDirection(raw: string, stage: boolean): Pick<ScriptDirection, "kind" | "label" | "seconds"> {
  const lower = raw.trim().toLowerCase();

  // Stage/visual cues: keep the full text, but still extract a pause amount if one is present.
  if (stage) {
    const seconds = extractPauseSeconds(raw) ?? 0;
    return { kind: "stage", label: raw, seconds };
  }

  // Explicit pause / break, e.g. "pause 2s", "break 1.5", "3s"
  const pauseMatch = lower.match(PAUSE_REGEX);
  if (pauseMatch) {
    const amount = parseFloat(pauseMatch[1] || "1");
    return { kind: "pause", label: `Pause ${amount}s`, seconds: amount };
  }

  const directMatch = lower.match(DIRECT_PAUSE_REGEX);
  if (directMatch) {
    const amount = parseFloat(directMatch[1]);
    return { kind: "pause", label: `Pause ${amount}s`, seconds: amount };
  }

  // Emotion keywords
  const emotion = EMOTION_KEYWORDS.find((k) => lower.includes(k));
  if (emotion) {
    return { kind: "emotion", label: emotion[0].toUpperCase() + emotion.slice(1), seconds: 0 };
  }

  // Cadence keywords
  const cadence = CADENCE_KEYWORDS.find((k) => lower.includes(k));
  if (cadence) {
    return { kind: "cadence", label: cadence[0].toUpperCase() + cadence.slice(1), seconds: 0 };
  }

  // Fallback: treat as a generic direction note
  return { kind: "note", label: "Note", seconds: 0 };
}

/** Find all bracket pairs, including nested brackets, in reading order. */
function findBrackets(script: string): { start: number; end: number; raw: string; stage: boolean }[] {
  const results: { start: number; end: number; raw: string; stage: boolean }[] = [];
  let i = 0;
  while (i < script.length) {
    if (script[i] === "[") {
      let depth = 1;
      let j = i + 1;
      while (j < script.length && depth > 0) {
        if (script[j] === "[") depth++;
        else if (script[j] === "]") depth--;
        j++;
      }
      if (depth === 0) {
        const raw = script.slice(i + 1, j - 1);
        const hasLeadingStar = i > 0 && script[i - 1] === "*";
        const hasTrailingStar = j < script.length && script[j] === "*";
        const stage = hasLeadingStar && hasTrailingStar;
        results.push({ start: i, end: j, raw, stage });
      }
      i = j;
    } else {
      i++;
    }
  }
  return results;
}

export function parseScript(script: string): ParsedScript {
  const brackets = findBrackets(script);
  const directions: ScriptDirection[] = [];
  let totalPauseSeconds = 0;

  for (const { start, end, raw, stage } of brackets) {
    const classification = classifyDirection(raw, stage);
    directions.push({
      raw,
      kind: classification.kind,
      label: classification.label,
      seconds: classification.seconds,
      start,
      end,
      stage,
    });
    totalPauseSeconds += classification.seconds;
  }

  // Build spoken text by removing every bracket and its surrounding stage asterisks.
  let spokenText = "";
  let lastIndex = 0;
  for (const { start, end, stage } of brackets) {
    const removeStart = stage && start > 0 && script[start - 1] === "*" ? start - 1 : start;
    const removeEnd = stage && end < script.length && script[end] === "*" ? end + 1 : end;
    if (removeStart > lastIndex) {
      spokenText += script.slice(lastIndex, removeStart);
    }
    lastIndex = removeEnd;
  }
  if (lastIndex < script.length) {
    spokenText += script.slice(lastIndex);
  }

  spokenText = spokenText.replace(/\s+/g, " ").trim();

  const words = spokenText ? spokenText.split(/\s+/).length : 0;
  const baseDuration = words * SECONDS_PER_WORD;
  const totalDuration = Math.ceil(baseDuration + totalPauseSeconds);

  return {
    original: script,
    spokenText,
    wordCount: words,
    directions,
    baseDurationSeconds: baseDuration,
    pauseDurationSeconds: totalPauseSeconds,
    totalDurationSeconds: totalDuration,
  };
}
