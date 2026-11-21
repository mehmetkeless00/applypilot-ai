# Labelling guide

You are answering one question per pair:

> **If I were the recruiter for this job, how likely is it that I would
> shortlist this CV for a first interview, based only on skills,
> experience and seniority?**

Read this guide before every session. Consistency matters more than
being "right": a model can learn a consistent judge, not a moody one.

The evaluation uses **LLM-generated labels (Claude Opus 5.5), no human review**: an LLM applies this guide to
every pair and its label is the reference label. No human reviews the
labels. (Until 2026-11-21 the plan was LLM-drafted labels reviewed by a
human; see experiment log E009. The human calibration round that shaped
this guide is recorded in E003 and E004.)

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
  PostgreSQL for "MySQL", GCP for "AWS" in a general cloud role. This does
  **not** apply to a required core framework; see "Required core
  frameworks" below.
- **Language of the CV** does not matter. A Turkish CV for an English
  listing is judged on content. Only an explicit spoken-language
  requirement can matter (see exception above).

## Past work in the listing's field

Career changers often have earlier work in the field a listing belongs
to. Whether it counts depends on **what they did**, not where they did it.

- **Performing the advertised duties counts.** If an earlier role had the
  candidate doing the day-to-day work this listing describes, treat it as
  relevant experience even though it is not their current role, provided
  they did it for **at least 1 year** and it ended **within the last 3
  years** (counted to the labelling date). It can support a 2 or a 3 under
  the normal rules.
- **Older duty experience is adjacent only.** The same work that ended
  more than 3 years ago can support a 1, never a 2 by itself.
- **Same industry, different role does not count as duty experience.** A
  developer at a marketing agency has not done marketing; a salesperson at
  a SaaS company has not built software. This is domain familiarity. It
  meets a must-have only when the listing explicitly requires knowledge of
  that domain, and it never lifts a score above what duty evidence supports.
- **The candidate's current direction does not matter.** Label the fit,
  not whether the candidate would want the job.

**Applied to cal-03** (cv-03 against a *Digital Marketing Specialist*
listing, Ukrainian text, truncated). The deciding evidence:
- Listing: creative marketing work on ad ideas and their measured results;
  it says candidates can come from SMM, digital, influencer or brand
  marketing, copywriting or small-business marketing; prior marketing
  experience is expected; performance-creative experience is *not*
  required.
- CV: *Digital Marketing Specialist*, April 2020 to March 2025. She ran
  paid search and social campaigns, built and A/B tested landing pages,
  and set up conversion tracking.
- That is the advertised duties, for about 5 years, ending 20 months before
  the labelling date, from a background the listing explicitly accepts.
  It counts as duty experience.
- Not a 3: the listing centres on creative ad concepts, and the CV shows
  campaign management and testing rather than creative production.
- **Revised-rule result: 2.** This matches what the old guide gave; see
  the experiment log (E003) on why that differs from the score the persona
  design expected.

## Required core frameworks

A **core framework** is the main application framework or platform the
role is built around: React, Angular, Vue, Django, Spring, Laravel, .NET,
Rails, SwiftUI/UIKit, Flutter and the like. Databases, cloud providers,
CI tools and libraries are not core frameworks; the equivalence rule above
applies to them.

A core framework is **required** when it appears in the job title or under
requirements, "must" or "essential". It is **preferred** when it appears
under "nice to have", "bonus", "preferred" or "a plus".

When the listing requires a core framework the CV does not show:

| Evidence in the CV | Score |
|---|---|
| Paid work or a substantial shipped product using the **named** framework | Judge normally (can be 2 or 3) |
| The listing **explicitly** accepts an alternative ("React or Vue", "a modern framework such as React"), and the CV shows paid work with an accepted alternative | Judge normally (can be 2 or 3) |
| Same role type and seniority, with paid work in a different framework from the **same ecosystem** (Flask or FastAPI for a Django role) | **2**, unless other gaps lower it |
| Same role type and seniority, with paid work in a framework from a **different ecosystem** (Angular for a React role) | **1** |
| Side projects, courses, "familiar with" or "learning" the named framework | Does not count as evidence; use the row above or below |
| No comparable framework experience | **0 or 1** under the other rules |

**Same ecosystem** means the same programming language **and** the same
framework family, where libraries, patterns and tooling largely carry
over. Use this list rather than judging case by case:

| Ecosystem | Frameworks treated as the same ecosystem |
|---|---|
| Python web backend | Django, Flask, FastAPI |
| JVM web backend | Spring / Spring Boot, Quarkus, Micronaut |
| Node.js backend | Express, NestJS, Fastify, Koa |
| PHP web | Laravel, Symfony |
| Ruby web | Rails, Sinatra |
| .NET web | ASP.NET Core, ASP.NET MVC / Web API |

Everything else is a **different ecosystem**, including:
- Frontend frameworks. React, Angular, Vue and Svelte are each their own
  ecosystem. They share a language, but their component model, state
  management and tooling differ, so sharing TypeScript is not enough.
- Native mobile platforms. iOS (Swift, SwiftUI, UIKit) and Android
  (Kotlin, Jetpack) are separate.
- Cross-platform against native mobile, such as Flutter or React Native
  for an iOS role.
- Any pair in different programming languages, such as Django and Spring.

If a framework isn't listed, it counts as a different ecosystem unless
you add it to this table first and record the change in the experiment
log.

- **The listing can widen equivalence, never the labeller.** An
  alternative the listing explicitly accepts counts like the named
  framework. Beyond the same-ecosystem rule, never treat a framework as
  equivalent because a good engineer could learn it.
- **A missing preferred framework never caps the score.** It can separate
  a 3 from a 2 at most, and never moves a 2 down to a 1 by itself.

**Applied to cal-04** (cv-08 against *Senior Frontend Developer (React)*,
Spanish text, truncated):
- React is in the title, so it is a required core framework. The visible
  text names no accepted alternative.
- The CV shows 6 years of paid Angular work at senior level. That is the
  same role type and seniority, but Angular and React are different
  ecosystems.
- Its only React evidence is "Familiar with React (side projects only)",
  which does not count.
- **Result: 1.**

## Listing quality

Two separate properties, recorded separately:

- **Thin** is computed automatically when pairs are built, **before any
  label is drafted or reviewed**: a listing is `thin` when the provider
  truncated it (the text ends with "…") or it is shorter than 1,000
  characters; otherwise it is `full`. It appears in `pairs.csv` as
  `truncated`, `desc_chars` and `listing_quality`. Label thin pairs from
  the visible text as usual; they are reported as a separate subgroup.
- **Non-job** is a judgement, drafted and then reviewed with the label:
  set `flag=non_job` when the listing is not a real opening for a specific
  role. Examples: training or career programmes, courses, self-employment
  or recruitment pitches, generic talent-pool ads. Still record a 0 to 3
  label, but non-job pairs are excluded from every job-fit metric.

All 10 calibration listings were truncated by the provider. Two of them,
cal-05 and cal-06, were also not real job postings.

## Worked examples

**Score 3.** Listing: *Backend Engineer (mid), Python, Django, PostgreSQL,
REST APIs, 3+ years; nice to have: AWS.* CV: 4 years building Django REST
services on PostgreSQL at two companies, no AWS. → Every must-have with
direct evidence; the missing item is only nice-to-have.

**Score 2, one gap.** Same listing. CV: 4 years of Flask and FastAPI REST
services on PostgreSQL, no Django. → Same kind of work, one named framework
missing that a good engineer picks up quickly. Flask and FastAPI are in the
same ecosystem as Django (see "Required core frameworks"). Phone screen: yes.

**Score 1, required framework from a different ecosystem.** Listing:
*Senior Frontend Developer, React required.* CV: senior Angular developer,
React only in side projects. → Same role and level, but a different
ecosystem, and side projects don't count (this is cal-04).

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

- **Description too short to judge:** thin listings are flagged
  automatically (see "Listing quality"). Give your best label from the
  visible text and set `confidence=low` if the deciding information is
  missing.
- **Listing is not a real job:** set `flag=non_job` (see "Listing
  quality").
- **Genuinely torn between two scores:** pick the lower one and set
  `confidence=low`. Do not invent half points.
- **CV fits a different role at the same company better:** irrelevant.
  Judge only this listing.

## Calibration

Before the main labelling, label the 10 calibration pairs. Compare them
with the guide, note any rule you had to guess, and update the guide.
Calibration pairs never enter the final metrics.

Round 1 (2026-11-20) led to three changes, recorded in the experiment log
(E003, refined in E004): the past-duties rule (cal-03), the
required-core-framework rule (cal-04) and the listing-quality definitions.

## Process rules

1. **Labelling.** An LLM writes `draft_label`, `confidence`, `flag` and
   `notes` (a one-line rationale citing the deciding evidence) for each
   pair from this guide, the CV text and the listing text only. It never
   sees any system's score, the selection bucket or the persona metadata.
   The labelling model must not be one of the systems under evaluation.
   Record its model identifier and prompt version in the experiment log.
2. **Reference label.** `label` is set equal to `draft_label`.
   `reviewed_change` and `labelled_at` stay blank, because no human review
   takes place.
3. **Don't revise labels** after seeing results. If a rule turns out to be
   wrong, record it in the experiment log and decide whether to re-label
   everything under the new rule.

### Future human audit (not active)

The review tool (`npm run review`) is kept for a possible audit. If one is
run: read the listing and the CV before the draft; accept the draft or
assign a different `label`; fill in `reviewed_change` and `labelled_at`;
review at most 60 pairs per sitting; never look at a system's score
first.

## File format

`data/labels/labels.csv` (and `calibration-labels.csv`), one row per pair:

```
pair_id,cv_id,job_id,draft_label,label,reviewed_change,confidence,flag,notes,labelled_at
p-example-1,cv-xx,adzuna:0000000001,2,2,,high,,core stack matches; one tool missing,
p-example-2,cv-xx,adzuna:0000000002,1,1,,low,,required core framework missing,
p-example-3,cv-xx,adzuna:0000000003,0,0,,high,non_job,self-employment pitch,
```

| Column | Written by | Meaning |
|---|---|---|
| `draft_label` | drafting LLM | 0 to 3. The original draft; never edited. |
| `label` | copied from `draft_label` | Reference label, 0 to 3. A future human audit could change it. |
| `reviewed_change` | future audit only | Blank: no pair is reviewed. In an audit, `yes` if `label` differs from `draft_label`, `no` if the draft was accepted. |
| `confidence` | LLM | `high` or `low`. |
| `flag` | LLM | Empty, or `non_job`. Thinness is not recorded here; it is in `pairs.csv`. |
| `notes` | LLM | Rationale: the deciding factor in a few words. |
| `labelled_at` | future audit only | Blank: no pair is reviewed. |

The rows are illustrative, not real pairs. `label` equals `draft_label`; the review columns are blank.

**Change rate** (future audit only) = number of `yes` ÷ number of
reviewed pairs (`yes` + `no`). It is not reported while no pair is
reviewed. Only a label difference is a change:
editing `notes` or `flag` while keeping the draft's label is `no`.
