import type { Locale } from "@/lib/i18n";

// Static preview of an analysis report for the landing page — pure markup,
// no data fetching. Sample skill/company names stay as-is (they play the
// role of user facts); only the illustrative narrative is localized.

const copy = {
  en: {
    aria: "Example analysis report",
    role: "Senior Frontend Engineer · Acme",
    summary:
      "Strong fit. Your React depth matches the core requirement; close the GraphQL gap to stand out.",
    delta: "▲ +23 since your first draft",
    strengthsTitle: "Strengths",
    strengths: [
      { strength: "5 years of production React", evidence: "Led migration to React 18 at Datawheel" },
      { strength: "Design-system experience", evidence: "Built and maintained a 40-component library" },
    ],
    gapsTitle: "Gaps to close",
    gaps: [
      { skill: "GraphQL", importance: "important" },
      { skill: "Terraform", importance: "nice to have" },
    ],
    ats: "ATS keywords",
    matched: "14 matched",
    weak: "3 weak",
    missing: "2 missing",
    extras: "+ tailored summary & cover letter",
  },
  tr: {
    aria: "Örnek analiz raporu",
    role: "Kıdemli Frontend Mühendisi · Acme",
    summary:
      "Güçlü uyum. React deneyiminiz temel gereksinimi karşılıyor; öne çıkmak için GraphQL eksiğini kapatın.",
    delta: "▲ İlk taslağınızdan bu yana +23",
    strengthsTitle: "Güçlü yönler",
    strengths: [
      { strength: "5 yıl üretimde React", evidence: "Datawheel'de React 18 geçişine liderlik etti" },
      { strength: "Tasarım sistemi deneyimi", evidence: "40 bileşenlik bir kitaplık kurdu ve yönetti" },
    ],
    gapsTitle: "Kapatılacak eksikler",
    gaps: [
      { skill: "GraphQL", importance: "önemli" },
      { skill: "Terraform", importance: "artı değer" },
    ],
    ats: "ATS anahtar kelimeleri",
    matched: "14 eşleşti",
    weak: "3 zayıf",
    missing: "2 eksik",
    extras: "+ kişiselleştirilmiş özet ve ön yazı",
  },
} as const;

export function SampleReport({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  return (
    <div
      aria-label={t.aria}
      className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 text-left shadow-2xl shadow-indigo-950/40 ring-1 ring-slate-900/10 sm:p-8"
    >
      <div className="flex items-center gap-5">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full ring-8 ring-green-100">
          <span className="text-2xl font-bold text-green-600">
            84
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t.role}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t.summary}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-green-600">
            {t.delta}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.strengthsTitle}
          </p>
          <ul className="mt-2 space-y-2">
            {t.strengths.map((s) => (
              <li key={s.strength} className="text-sm">
                <span className="font-medium text-slate-900">
                  {s.strength}
                </span>
                <span className="block text-xs text-slate-500">
                  “{s.evidence}”
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.gapsTitle}
          </p>
          <ul className="mt-2 space-y-2">
            {t.gaps.map((g) => (
              <li key={g.skill} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900">
                  {g.skill}
                </span>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {g.importance}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t.ats}
        </span>
        <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {t.matched}
        </span>
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          {t.weak}
        </span>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
          {t.missing}
        </span>
        <span className="ml-auto text-xs text-slate-400">{t.extras}</span>
      </div>
    </div>
  );
}
