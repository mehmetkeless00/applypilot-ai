import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Analysis } from "@/lib/types";
import { docBody, docTitles, paragraphs, type ExportDoc } from "./content";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "#1e293b",
    paddingVertical: 48,
    paddingHorizontal: 56,
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 18 },
  heading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: { marginBottom: 8 },
  item: { marginBottom: 6 },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  meta: { color: "#64748b" },
  score: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#4f46e5" },
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
}: {
  analysis: Analysis;
  doc: "summary" | "cover_letter";
}) {
  return (
    <Document title={docTitles[doc]}>
      <Page size="A4" style={styles.page}>
        <Header analysis={analysis} title={docTitles[doc]} />
        <Paragraphs text={docBody(analysis, doc)} />
      </Page>
    </Document>
  );
}

function FullReportPdf({ analysis }: { analysis: Analysis }) {
  const atsKeywords = analysis.ats_keywords ?? [];
  const suggestions = analysis.resume_suggestions ?? [];
  return (
    <Document title={docTitles.full}>
      <Page size="A4" style={styles.page}>
        <Header analysis={analysis} title={docTitles.full} />

        <Text style={styles.score}>{analysis.fit_score}/100</Text>
        <Paragraphs text={analysis.fit_summary} />

        <Text style={styles.heading}>Strengths</Text>
        {analysis.strengths.map((s, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>{s.strength}</Text>
            <Text>{s.evidence}</Text>
          </View>
        ))}

        <Text style={styles.heading}>Missing skills</Text>
        {analysis.missing_skills.map((s, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>
              {s.skill} <Text style={styles.meta}>({s.importance.replace(/_/g, " ")})</Text>
            </Text>
            <Text>{s.suggestion}</Text>
          </View>
        ))}

        {atsKeywords.length > 0 && (
          <View>
            <Text style={styles.heading}>ATS keyword coverage</Text>
            {atsKeywords.map((k, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {k.keyword}{" "}
                  <Text style={styles.meta}>
                    ({k.status}, {k.importance.replace(/_/g, " ")})
                  </Text>
                </Text>
                <Text>{k.suggestion}</Text>
              </View>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <View>
            <Text style={styles.heading}>Resume improvement suggestions</Text>
            {suggestions.map((s, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {s.section} <Text style={styles.meta}>({s.impact} impact)</Text>
                </Text>
                <Text style={styles.meta}>Current: {s.original_text}</Text>
                <Text>Improved: {s.improved_text}</Text>
                <Text style={styles.meta}>{s.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.heading}>Tailored professional summary</Text>
        <Paragraphs text={docBody(analysis, "summary")} />

        <Text style={styles.heading}>Cover letter</Text>
        <Paragraphs text={docBody(analysis, "cover_letter")} />
      </Page>
    </Document>
  );
}

export async function analysisPdfBuffer(
  analysis: Analysis,
  doc: ExportDoc,
): Promise<Buffer> {
  const element =
    doc === "full" ? (
      <FullReportPdf analysis={analysis} />
    ) : (
      <SingleDocPdf analysis={analysis} doc={doc} />
    );
  return Buffer.from(await renderToBuffer(element));
}
