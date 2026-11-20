# Persona spec

The plan for all 30 synthetic CVs. Each row becomes one file
`cv-XX.md`. Only cv-01 to cv-03 are written so far, for review.

## Design goals

1. **Cover what the providers actually return.** Adzuna and Remotive are
   tech-heavy, so most personas are tech, with enough data roles to
   matter for an AI/data portfolio.
2. **Create hard cases on purpose.** Easy pairs make every system look
   good. Personas sit near boundaries (analyst vs scientist, frontend vs
   full-stack), include career changers, and include non-tech people whose
   job titles share words with tech roles ("Business Developer").
3. **Spread seniority** so the seniority logic gets tested both ways.
4. **Include Turkish.** Six CVs are written in Turkish; several English
   CVs belong to people based in Turkey. This tests multilingual matching.
5. **Vary the writing.** Bullets vs prose, one vs two pages, with and
   without a skills list. Real CVs are messy; uniform CVs flatter
   keyword matching.

## How they are written

- Written from this spec by Claude, not by Gemini. Gemini is one of the
  systems under test, and text in its own style could be easier for it.
- Fictional names, employers and contact details (`example.com`). Real
  universities and real technologies, so the text reads naturally.
- Dates are consistent and end no later than November 2026.
- YAML front matter holds metadata for analysis. The runner strips it, so
  no system ever sees the intended role or seniority.
- `search_query` is the query used to pull this persona's listings from
  the providers when the job snapshot is built.

## Job selection per CV (for the snapshot step)

About 15 listings per CV, chosen to spread the labels:
- ~8 from the persona's own `search_query` (likely 2s and 3s, some 1s).
- ~5 from a **neighbouring** role's query (hard negatives and borderline).
- ~2 random listings from the whole snapshot (easy 0s, as a sanity check).

## Matrix

| ID | Role | Seniority | Yrs | CV lang | Twist |
|---|---|---|---|---|---|
| cv-01 | Backend engineer (Go, Python) | senior | 9 | EN | Strong, conventional profile. Anchor for clear 3s. |
| cv-02 | Data analyst | junior | 1.5 | TR | Turkish CV, BI-heavy, borders on data science listings. |
| cv-03 | Frontend developer | junior | 1 + 5 marketing | EN | Career changer from digital marketing; marketing listings are traps. |
| cv-04 | Backend engineer (Java, Spring) | mid | 4 | EN | Based in Turkey, English CV. |
| cv-05 | Backend engineer (Node.js) | junior | 2 | TR | Turkish CV. |
| cv-06 | Backend engineer (C#/.NET) | lead | 12 | EN | Mostly management in last 3 years. |
| cv-07 | Frontend developer (React) | mid | 4 | EN | No skills section; skills only in prose. |
| cv-08 | Frontend developer (Angular) | senior | 7 | EN | Tests React-vs-Angular boundary. |
| cv-09 | Full-stack (TypeScript, Next.js) | mid | 3 | EN | Very close to this project's own stack. |
| cv-10 | Full-stack (PHP, Laravel, Vue) | junior | 2 | TR | Turkish CV, agency background. |
| cv-11 | Full-stack (Python, React) | intern | 0.5 | EN | Final-year student, projects only. |
| cv-12 | Mobile (iOS, Swift) | senior | 6 | EN | Native specialist. |
| cv-13 | Mobile (Flutter, React Native) | junior | 2 | EN | Cross-platform; iOS-native listings are 1s. |
| cv-14 | Data analyst | mid | 4 | EN | Excel/SQL/Tableau, finance domain. |
| cv-15 | Data analyst | intern | 0.3 | EN | Teacher → analyst career changer, bootcamp. |
| cv-16 | Data analyst (marketing analytics) | junior | 2 | TR | Turkish CV; GA4, SQL; borders marketing roles. |
| cv-17 | Data scientist | mid | 3 | EN | Classical ML, scikit-learn, A/B testing. |
| cv-18 | ML engineer | senior | 6 | EN | PyTorch, MLOps, model serving. |
| cv-19 | Data scientist (NLP) | junior | 1.5 | EN | MSc graduate, based in Turkey. |
| cv-20 | Data engineer | mid | 5 | EN | Spark, Airflow, dbt, BigQuery. |
| cv-21 | Data engineer | junior | 1 | TR | Turkish CV, ETL with SQL Server/SSIS. |
| cv-22 | DevOps / cloud engineer | senior | 7 | EN | AWS, Terraform, Kubernetes. |
| cv-23 | DevOps / SRE | mid | 3 | EN | GCP, on-call, observability. |
| cv-24 | QA / test automation | mid | 4 | EN | Selenium, Playwright, API testing. |
| cv-25 | Product manager | senior | 6 | EN | Technical PM; "product" listings vary widely. |
| cv-26 | UX/UI designer | mid | 4 | EN | Figma, research; frontend listings are traps. |
| cv-27 | B2B sales / business developer | mid | 5 | EN | Hard negative for every "developer" search. |
| cv-28 | Digital marketing specialist | junior | 2 | TR | Turkish CV; hard negative for analytics roles. |
| cv-29 | Customer support → IT support | junior | 1 + 3 support | EN | Borders on help-desk and junior sysadmin roles. |
| cv-30 | Engineering manager | lead | 11 | EN | Tests lead vs senior IC distinction. |

**Totals:** 30 personas · 2 intern · 10 junior · 10 mid · 6 senior ·
2 lead · 6 Turkish-language CVs · 3 career changers (cv-03, cv-15,
cv-29) · 2 non-tech hard negatives (cv-27, cv-28) · 2 adjacent
non-engineering roles (cv-25, cv-26).
