import { Input } from "@/components/ui/input";
import { ChoiceGroup } from "./ChoiceGroup";
import {
  GRADES,
  SUBJECTS,
  TOPIC_SUGGESTIONS,
  type StudySetup,
} from "@/lib/study-config";

const SUBJECT_SHORT: Record<string, string> = { math: "Maths", science: "Science", cs: "Comp Sci" };

export function SetupPanel({
  setup,
  onChange,
}: {
  setup: StudySetup;
  onChange: (setup: StudySetup) => void;
}) {
  const suggestions = TOPIC_SUGGESTIONS[setup.subject][setup.grade];
  return (
    <section className="sheet p-5 sm:p-6 space-y-5" aria-label="What are you studying?">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">What are you studying?</h2>
        <span className="label-mono">Step 1</span>
      </div>

      <ChoiceGroup
        label="Subject"
        options={SUBJECTS.map((s) => ({ value: s.value, label: SUBJECT_SHORT[s.value] ?? s.label }))}
        value={setup.subject}
        onChange={(subject) => onChange({ ...setup, subject })}
      />

      <ChoiceGroup
        label="Grade"
        options={GRADES.map((g) => ({ value: g, label: `Grade ${g}` }))}
        value={setup.grade}
        onChange={(grade) => onChange({ ...setup, grade })}
      />

      <div className="space-y-2">
        <label htmlFor="topic" className="label-mono block">
          Topic
        </label>
        <Input
          id="topic"
          value={setup.topic}
          maxLength={120}
          placeholder="e.g. Photosynthesis, Pythagoras' theorem, Binary numbers"
          onChange={(e) => onChange({ ...setup, topic: e.target.value })}
          className="h-11 border-[1.5px] bg-card text-base focus-visible:border-ink"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...setup, topic: t })}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-ink hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
