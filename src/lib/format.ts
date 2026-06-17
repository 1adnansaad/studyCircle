/**
 * Display formatting. Per DESIGN.md, all student-facing numbers render in
 * Bengali numerals (০–৯); the existing Shikho chrome is Bengali. New StudyCircle
 * UI labels stay English (spec §0). This module owns the number/time/tag
 * conversions so seed stays plain integers and the UI converts on render.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Convert any Latin digits in a string/number to Bengali numerals. */
export function bn(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Group thousands with commas, then convert to Bengali numerals. */
export function bnCount(n: number): string {
  return bn(n.toLocaleString("en-US"));
}

/** "ক্লাস ৯" */
export function classTag(klass: number): string {
  return `ক্লাস ${bn(klass)}`;
}

/** Seeded leaderboard tag, e.g. "র‍্যাঙ্ক #৮". null → no tag. */
export function rankTag(pos: number | null): string | null {
  return pos == null ? null : `র‍্যাঙ্ক #${bn(pos)}`;
}

/** Relative time in Bengali from an ISO timestamp. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${bn(days)} দিন আগে`;
  const weeks = Math.floor(days / 7);
  return `${bn(weeks)} সপ্তাহ আগে`;
}

/** Initials for the avatar disc (from the captured Name). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Own @user_tag derived from the captured name (no real handle stored). */
export function ownTag(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return "@" + (slug || "you");
}
