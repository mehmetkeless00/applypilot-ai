import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Importance, MissingSkill } from "@/lib/types";

const groups: { importance: Importance; label: string; tone: "red" | "amber" | "slate" }[] = [
  { importance: "critical", label: "Critical", tone: "red" },
  { importance: "important", label: "Important", tone: "amber" },
  { importance: "nice_to_have", label: "Nice to have", tone: "slate" },
];

export function MissingSkills({ skills }: { skills: MissingSkill[] }) {
  return (
    <Card>
      <CardTitle>Missing skills</CardTitle>
      {skills.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No significant gaps found — your resume covers this role&apos;s
          requirements well.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(({ importance, label, tone }) => {
            const group = skills.filter((s) => s.importance === importance);
            if (group.length === 0) return null;
            return (
              <div key={importance}>
                <Badge tone={tone}>{label}</Badge>
                <ul className="mt-2 space-y-3">
                  {group.map((s) => (
                    <li key={s.skill} className="text-sm">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {s.skill}
                      </span>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                        {s.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
