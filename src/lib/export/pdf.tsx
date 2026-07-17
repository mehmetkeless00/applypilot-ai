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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "#1e293b",
    paddingVertical: 48,
    paddingHorizontal: 56,
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 18 },
  heading: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: { marginBottom: 8 },
  item: { marginBottom: 6 },
  itemTitle: { fontWeight: 700 },
  meta: { color: "#64748b" },
  score: { fontSize: 26, fontWeight: 700, color: "#4f46e5" },
});

function Header({ analysis, title }: { analysis: Analysis; title: string }) {
  const context = [analysis.job_title, analysis.company]
    .filter(Boolean)
    .join(" · ");
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{context}</Text>
    </View>
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
        <Header analysis={analysis} title={t.docTitles[doc]} />
        <Paragraphs text={docBody(analysis, doc)} />
      </Page>
    </Document>
  );
}

function FullReportPdf({ analysis, t }: { analysis: Analysis; t: ExportStrings }) {
  const atsKeywords = analysis.ats_keywords ?? [];
  const suggestions = analysis.resume_suggestions ?? [];
  const label = (key: string, map: Record<string, string>) =>
    map[key] ?? key.replace(/_/g, " ");
  return (
    <Document title={t.docTitles.full}>
      <Page size="A4" style={styles.page}>
        <Header analysis={analysis} title={t.docTitles.full} />

        <Text style={styles.score}>{analysis.fit_score}/100</Text>
        <Paragraphs text={analysis.fit_summary} />

        <Text style={styles.heading}>{t.strengths}</Text>
        {analysis.strengths.map((s, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>{s.strength}</Text>
            <Text>{s.evidence}</Text>
          </View>
        ))}

        <Text style={styles.heading}>{t.missingSkills}</Text>
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
            <Text style={styles.heading}>{t.atsCoverage}</Text>
            {atsKeywords.map((k, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {k.keyword}{" "}
                  <Text style={styles.meta}>
                    ({label(k.status, t.status)}, {label(k.importance, t.importance)})
                  </Text>
                </Text>
                <Text>{k.suggestion}</Text>
              </View>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <View>
            <Text style={styles.heading}>{t.suggestions}</Text>
            {suggestions.map((s, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {s.section} <Text style={styles.meta}>({t.impact(s.impact)})</Text>
                </Text>
                <Text style={styles.meta}>
                  {t.current}: {s.original_text}
                </Text>
                <Text>
                  {t.improved}: {s.improved_text}
                </Text>
                <Text style={styles.meta}>{s.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.heading}>{t.summary}</Text>
        <Paragraphs text={docBody(analysis, "summary")} />

        <Text style={styles.heading}>{t.coverLetter}</Text>
        <Paragraphs text={docBody(analysis, "cover_letter")} />
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
