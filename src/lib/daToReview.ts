/**
 * Pass 8 — Part F
 * Map Devil's Advocate critiques to Review-form Correction entries so the
 * Scientist Review screen opens with DA findings already pre-filled.
 *
 * One Correction per plan section (the Review form is keyed by section).
 * Critiques targeting the same section are merged: tags are the unique set
 * of issue_types (lower-cased), notes are concatenated bullet lines.
 */
import type {
  Correction,
  DevilsAdvocateReview,
  DevilsAdvocateCritique,
} from "./types";

const SECTION_MAP: Record<DevilsAdvocateCritique["section"], Correction["section"]> = {
  Protocol: "protocol",
  Materials: "materials",
  Budget: "budget",
  Timeline: "timeline",
  Validation: "validation",
};

export function mapDAToReviewCorrections(
  review: DevilsAdvocateReview | undefined,
): Correction[] {
  if (!review || !review.critiques?.length) return [];
  const bySection = new Map<Correction["section"], Correction>();
  for (const c of review.critiques) {
    const key = SECTION_MAP[c.section];
    if (!key) continue;
    const tag = c.issue_type.toLowerCase();
    const line = `🤖 ${c.issue_type}: ${c.critique}\n   → Suggestion: ${c.suggestion}`;
    const existing = bySection.get(key);
    if (existing) {
      const tags = existing.issue_tags.includes(tag)
        ? existing.issue_tags
        : [...existing.issue_tags, tag];
      bySection.set(key, {
        ...existing,
        issue_tags: tags,
        notes: existing.notes ? `${existing.notes}\n\n${line}` : line,
      });
    } else {
      bySection.set(key, {
        section: key,
        rating: 3,
        issue_tags: [tag],
        notes: line,
      });
    }
  }
  return Array.from(bySection.values());
}