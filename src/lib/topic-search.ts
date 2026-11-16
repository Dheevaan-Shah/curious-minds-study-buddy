import { GRADES, TOPIC_SUGGESTIONS, type Grade, type Subject, type TopicSuggestion } from "./study-config";

export type TopicMatch = TopicSuggestion & { grade: Grade };

/**
 * Library topics matching what the student typed. The student's own grade comes first,
 * then other grades of the same subject. Name matches rank above blurb matches.
 */
export function searchTopics(subject: Subject, grade: Grade, query: string, limit = 6): TopicMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const grades = [grade, ...GRADES.filter((g) => g !== grade)];
  const seen = new Set<string>();
  const scored: { match: TopicMatch; score: number }[] = [];
  grades.forEach((g, gradeRank) => {
    for (const t of TOPIC_SUGGESTIONS[subject][g]) {
      const name = t.name.toLowerCase();
      if (seen.has(name)) continue;
      let score: number;
      if (name.startsWith(q)) score = 0;
      else if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) score = 1;
      else if (name.includes(q)) score = 2;
      else if (t.blurb.toLowerCase().includes(q)) score = 3;
      else continue;
      seen.add(name);
      scored.push({ match: { ...t, grade: g }, score: score + gradeRank * 10 });
    }
  });
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.match);
}
