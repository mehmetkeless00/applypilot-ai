# Labelling guide

You are answering one question per pair:

> **If I were the recruiter for this job, how likely is it that I would
> shortlist this CV for a first interview, based only on skills,
> experience and seniority?**

Read this guide before every session. Consistency matters more than
being "right": a model can learn a consistent judge, not a moody one.

## The scale

| Score | Name | Recruiter's reaction | Rule of thumb |
|---|---|---|---|
| **3** | Strong fit | "Call this person." | Meets **every** must-have, seniority matches, and has directly relevant experience in the same kind of role. |
| **2** | Plausible fit | "Worth a look." | Meets **most** must-haves. At most one notable gap, **or** seniority is one step off, **or** the right skills but from an adjacent role. |
| **1** | Weak fit | "Probably not, but I see why they applied." | Related field, but missing **several** core requirements, **or** seniority two or more steps off. |
| **0** | No fit | "Wrong pile." | A different profession, **or** a hard blocker the CV clearly fails (a required licence, degree or language the CV doesn't have). |

For the metrics, **2 and 3 count as a match**, 0 and 1 do not. So the
decision that matters most is the line between 1 and 2. When unsure there,
ask: *would I spend five minutes on a phone screen?* Yes → 2. No → 1.

Seniority steps, for "one step off": intern → junior → mid → senior → lead.

## What to ignore

Search filters already handle logistics, so labels judge the person, not
the paperwork. **Ignore:**

- Location, remote/on-site, relocation, time zones.
- Salary.
- Work authorization and visa sponsorship.
- How well the CV is written, unless it hides the information entirely.
- Company prestige of the CV's past employers.

**Exception:** a hard professional requirement is not logistics. "Must hold
a Turkish bar licence", "registered nurse", "fluent German required for
customer calls" are blockers and can force a 0.

## What counts

- **Must-haves** are what the listing marks required, "must", "essential",
  or lists under requirements. "Nice to have", "bonus", "preferred" are not.
- **Evidence beats keywords.** "Built and ran Kafka pipelines in production"
  counts; "Kafka" alone in a skills list counts weakly. A skill mentioned
  only under "learning" or "familiar with" does not meet a must-have.
- **Years of experience** requirements count, but loosely: 4 years against
  "5+ years" is not a gap; 1 year against "5+ years" is.
- **Equivalent technologies** count when a recruiter would accept them:
  PostgreSQL for "MySQL", GCP for "AWS" in a general cloud role. Not across
  real boundaries: React is not Angular for a senior Angular role.
- **Language of the CV** does not matter. A Turkish CV for an English
  listing is judged on content. Only an explicit spoken-language
  requirement can matter (see exception above).

## Worked examples

**Score 3.** Listing: *Backend Engineer (mid), Python, Django, PostgreSQL,
REST APIs, 3+ years; nice to have: AWS.* CV: 4 years building Django REST
services on PostgreSQL at two companies, no AWS. → Every must-have with
direct evidence; the missing item is only nice-to-have.

**Score 2, one gap.** Same listing. CV: 4 years of Flask and FastAPI REST
services on PostgreSQL, no Django. → Same kind of work, one named framework
missing that a good engineer picks up quickly. Phone screen: yes.

**Score 2, seniority one step off.** Listing: *Senior Data Engineer, 6+
years, Spark, Airflow, cloud data warehouse.* CV: mid-level, 4 years with
Spark, Airflow and BigQuery. → Right skills, a step junior.

**Score 2, adjacent role.** Listing: *Data Analyst, SQL, dashboards,
stakeholder reporting.* CV: junior data scientist with strong SQL and
Tableau dashboards from internships. → Different title, the core work is
all there.

**Score 1, several gaps.** Listing: *Senior iOS Engineer, Swift, SwiftUI,
5+ years, App Store releases.* CV: 2 years of React Native, no Swift. →
Same broad area (mobile), but core platform skills and seniority missing.

**Score 1, seniority two steps off.** Listing: *Engineering Lead, owns
team of 6, architecture decisions.* CV: junior full-stack developer, strong
stack overlap. → Skills overlap but nowhere near the level.

**Score 0, different profession.** Listing: *Business Developer (B2B
SaaS sales), pipeline building, closing deals.* CV: backend developer. →
The word "developer" is a trap; this is a sales job.

**Score 0, hard blocker.** Listing: *Clinical Data Manager, must be a
registered pharmacist.* CV: data analyst with strong SQL, no pharmacy
degree. → Required licence missing.

## Edge cases

- **Description too short to judge** (a two-line snippet): give your best
  label **and** set `flag=thin`. These pairs are analysed separately.
- **Listing is not a real job** (an ad, a course, a duplicate): set
  `flag=invalid`; it is excluded.
- **Genuinely torn between two scores:** pick the lower one and set
  `confidence=low`. Do not invent half points.
- **CV fits a different role at the same company better:** irrelevant.
  Judge only this listing.

## Calibration

Before the main labelling, label the 10 calibration pairs. Compare them
with the guide, note any rule you had to guess, and update the guide.
Calibration pairs never enter the final metrics.

## Process rules

1. **Blind labelling.** Never look at any system's score for a pair before
   labelling it. The labelling order is shuffled for this reason.
2. **One sitting = at most 60 pairs.** Fatigue makes labels drift.
3. **About one minute per pair.** Skim the listing's requirements first,
   then the CV.
4. **Don't revise old labels** after seeing results. If you realise a rule
   was wrong, write it in the experiment log and decide whether to
   re-label everything under the new rule.
5. **One week later**, re-label the 50 pairs listed in
   `data/labels/relabel-sample.txt` without looking at your first labels.

## File format

`data/labels/labels.csv`, one row per pair:

```
cv_id,job_id,label,confidence,flag,notes,labelled_at
cv-01,adzuna:4812231,2,high,,missing Django,2026-11-24
cv-03,remotive:19022,0,high,,sales role,2026-11-24
cv-07,adzuna:4810087,1,low,thin,two-line snippet,2026-11-24
```

- `label`: 0, 1, 2 or 3.
- `confidence`: `high` or `low`.
- `flag`: empty, `thin` or `invalid`.
- `notes`: a few words on the deciding factor. These are what make the
  "what didn't work" analysis possible later.
