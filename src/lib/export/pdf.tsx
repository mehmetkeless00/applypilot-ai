import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Analysis } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  docBody,
  exportLanguage,
  exportStrings,
  paragraphs,
  type ExportDoc,
  type ExportStrings,
} from "./content";
import { ROBOTO_BOLD, ROBOTO_REGULAR } from "./fonts";

// The built-in Helvetica fonts only cover WinAnsi and silently corrupt
// Turkish characters (ş → _, ı → 1, İ → 0); Roboto covers Latin-Extended.
Font.register({
  family: "Roboto",
  fonts: [
    { src: ROBOTO_REGULAR },
    { src: ROBOTO_BOLD, fontWeight: 700 },
  ],
});
// Turkish words were being broken at arbitrary points by the default
// English hyphenation; disable soft hyphenation entirely.
Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#4f46e5";
const INK = "#1e293b";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const RULE = "#e2e8f0";
const WASH = "#f8fafc";

// Two hard-won react-pdf constraints shape these styles:
// 1. A numeric lineHeight resolves against the font size of the style
//    where it is declared and inherits as the *computed* length — a page-
//    level multiplier gives large text (score, title) a line box shorter
//    than its own glyphs, which was the score/summary collision seen in
//    production. So lineHeight lives on individual text styles only.
// 2. A page-level lineHeight also silently drops `fixed` elements that
//    use a `render` prop (the page-number footer). Never add one here.
const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9.5,
    color: INK,
    paddingTop: 52,
    paddingBottom: 64,
    paddingHorizontal: 56,
  },
  // Document header
  reportTitle: { fontSize: 20, fontWeight: 700, lineHeight: 1.25 },
  jobLine: { fontSize: 11, lineHeight: 1.4, color: MUTED, marginTop: 4 },
  metaLine: { fontSize: 8.5, lineHeight: 1.4, color: FAINT, marginTop: 2 },
  headerRule: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    marginTop: 14,
    marginBottom: 18,
  },
  // Score card
  scoreCard: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 8,
    padding: 14,
  },
  scoreBox: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 14,
  },
  scoreNumber: { fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: ACCENT },
  scoreOutOf: { fontSize: 8.5, lineHeight: 1.3, color: MUTED, marginTop: 2 },
  scoreBody: { flex: 1 },
  scoreHeading: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 4,
  },
  // Sections
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.3,
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  subHeading: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.3,
    marginTop: 8,
    marginBottom: 4,
  },
  bodyText: { lineHeight: 1.5 },
  paragraph: { lineHeight: 1.5, marginBottom: 8 },
  item: { marginBottom: 8 },
  itemTitle: { fontWeight: 700, lineHeight: 1.5 },
  meta: { color: MUTED, fontSize: 8.5, lineHeight: 1.4 },
  // Resume suggestions
  suggestionCard: {
    borderWidth: 1,
    borderColor: RULE,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  suggestionSection: { fontWeight: 700, lineHeight: 1.5, marginBottom: 6 },
  fieldLabel: {
    fontSize: 7.5,
    lineHeight: 1.3,
    fontWeight: 700,
    color: FAINT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  fieldBlock: { marginBottom: 6 },
  fieldText: { lineHeight: 1.5 },
  fieldTextMuted: { lineHeight: 1.5, color: MUTED },
  // Footer
  footer: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 6,
  },
  // Two react-pdf quirks meet in fixed elements (re-laid-out per page):
  // text in the embedded data-URI Roboto is silently dropped, and so is
  // text combining fontSize with a numeric lineHeight. The footer is
  // ASCII-only single-line, so built-in Helvetica with the default line
  // height is safe — do not add a lineHeight here.
  footerText: { fontFamily: "Helvetica", fontSize: 8, color: FAINT },
});

function Header({
  analysis,
  title,
  t,
}: {
  analysis: Analysis;
  title: string;
  t: ExportStrings;
}) {
  const lang = exportLanguage(analysis);
  const context = [analysis.job_title, analysis.company]
    .filter(Boolean)
    .join(" · ");
  const hasDate =
    Boolean(analysis.created_at) && !Number.isNaN(Date.parse(analysis.created_at));
  const meta = [t.languageName, hasDate ? formatDate(analysis.created_at, lang) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <View>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.jobLine}>{context}</Text>
      {meta && <Text style={styles.metaLine}>{meta}</Text>}
      <View style={styles.headerRule} />
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>ApplyPilot AI</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SectionHeading({ children }: { children: string }) {
  // minPresenceAhead keeps a heading from being orphaned at a page bottom.
  return (
    <Text style={styles.sectionHeading} minPresenceAhead={48}>
      {children}
    </Text>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <View>
      {paragraphs(text).map((p, i) => (
        <Text key={i} style={styles.paragraph}>
          {p}
        </Text>
      ))}
    </View>
  );
}

function ScoreCard({ analysis, t }: { analysis: Analysis; t: ExportStrings }) {
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreBox}>
        <Text style={styles.scoreNumber}>{analysis.fit_score}</Text>
        <Text style={styles.scoreOutOf}>/ 100</Text>
      </View>
      <View style={styles.scoreBody}>
        <Text style={styles.scoreHeading}>{t.fitAssessment}</Text>
        <Paragraphs text={analysis.fit_summary} />
      </View>
    </View>
  );
}

function SingleDocPdf({
  analysis,
  doc,
  t,
}: {
  analysis: Analysis;
  doc: "summary" | "cover_letter";
  t: ExportStrings;
}) {
  return (
    <Document title={t.docTitles[doc]}>
      <Page size="A4" style={styles.page}>
        <Header analysis={analysis} title={t.docTitles[doc]} t={t} />
        <Paragraphs text={docBody(analysis, doc)} />
        <Footer />
      </Page>
    </Document>
  );
}

const ATS_GROUPS = ["matched", "weak", "missing"] as const;

function FullReportPdf({ analysis, t }: { analysis: Analysis; t: ExportStrings }) {
  const atsKeywords = analysis.ats_keywords ?? [];
  const suggestions = analysis.resume_suggestions ?? [];
  const label = (key: string, map: Record<string, string>) =>
    map[key] ?? key.replace(/_/g, " ");
  return (
    <Document title={t.docTitles.full}>
      <Page size="A4" style={styles.page}>
        <Header analysis={analysis} title={t.docTitles.full} t={t} />

        <ScoreCard analysis={analysis} t={t} />

        <SectionHeading>{t.strengths}</SectionHeading>
        {analysis.strengths.map((s, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>{s.strength}</Text>
            <Text style={styles.fieldTextMuted}>{s.evidence}</Text>
          </View>
        ))}

        <SectionHeading>{t.missingSkills}</SectionHeading>
        {analysis.missing_skills.map((s, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>
              {s.skill}{" "}
              <Text style={styles.meta}>({label(s.importance, t.importance)})</Text>
            </Text>
            <Text>{s.suggestion}</Text>
          </View>
        ))}

        {atsKeywords.length > 0 && (
          <View>
            <SectionHeading>{t.atsCoverage}</SectionHeading>
            {ATS_GROUPS.map((status) => {
              const group = atsKeywords.filter((k) => k.status === status);
              if (group.length === 0) return null;
              return (
                <View key={status}>
                  <Text style={styles.subHeading} minPresenceAhead={32}>
                    {label(status, t.status)} ({group.length})
                  </Text>
                  {group.map((k, i) => (
                    <View key={i} style={styles.item}>
                      <Text style={styles.itemTitle}>
                        {k.keyword}{" "}
                        <Text style={styles.meta}>
                          ({label(k.importance, t.importance)})
                        </Text>
                      </Text>
                      <Text style={styles.bodyText}>{k.suggestion}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {suggestions.length > 0 && (
          <View>
            <SectionHeading>{t.suggestions}</SectionHeading>
            {suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionCard} minPresenceAhead={40}>
                <Text style={styles.suggestionSection}>
                  {s.section}{" "}
                  <Text style={styles.meta}>({t.impact(s.impact)})</Text>
                </Text>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t.current}</Text>
                  <Text style={styles.fieldTextMuted}>{s.original_text}</Text>
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t.improved}</Text>
                  <Text style={styles.fieldText}>{s.improved_text}</Text>
                </View>
                <View>
                  <Text style={styles.fieldLabel}>{t.reason}</Text>
                  <Text style={styles.fieldTextMuted}>{s.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <SectionHeading>{t.summary}</SectionHeading>
        <Paragraphs text={docBody(analysis, "summary")} />

        <SectionHeading>{t.coverLetter}</SectionHeading>
        <Paragraphs text={docBody(analysis, "cover_letter")} />

        <Footer />
      </Page>
    </Document>
  );
}

export async function analysisPdfBuffer(
  analysis: Analysis,
  doc: ExportDoc,
): Promise<Buffer> {
  const t = exportStrings(exportLanguage(analysis));
  const element =
    doc === "full" ? (
      <FullReportPdf analysis={analysis} t={t} />
    ) : (
      <SingleDocPdf analysis={analysis} doc={doc} t={t} />
    );
  return Buffer.from(await renderToBuffer(element));
}
