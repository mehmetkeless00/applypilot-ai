# Evaluation harness

Measures how well ApplyPilot's matching systems agree with human judgement
on CV–job fit. Every model change in the ML plan is judged against this.

## Layout

| Path | What lives there |
|---|---|
| `data/cvs/` | Synthetic CV personas, one Markdown file each. YAML front matter is metadata for us; the runner strips it before any system sees the CV. |
| `data/jobs/` | `snapshot.jsonl` holds the frozen listing text and is **gitignored**. `index.csv` (job ID, provider, URL) and `pools.json` (each CV's own and neighbour candidates) are committed. Frozen so every run scores the same text. |
| `data/pairs.csv` | The 450-pair **production set**: every CV–job pair to label, with its selection bucket, language tag and listing quality. Committed. |
| `data/pairs-fulltext.csv` | The 100-pair **full-text subset** (see below), same columns plus `non_job_suspect`. Committed. |
| `data/labels/` | Labels (`labels.csv`), the calibration labels, and the one-week-later re-labels. Each row keeps the LLM draft and the reviewed final label separately. Ground truth. Committed. |
| `work/` | Rendered labelling sheets and raw draft files that contain or quote listing text. **Gitignored.** |
| `cache/` | Cached model responses keyed by a hash of model + input. Makes Gemini runs reproducible and free to re-run. |
| `scripts/` | `collect-jobs.ts` builds the snapshot, `build-pairs.ts` picks the pairs (fixed seed), `render-sheet.ts` writes blind labelling sheets. Later: the system runner and the Python metrics script. |
| `results/` | One dated JSON file and Markdown table per run. Never edited by hand. |
| `LABELLING_GUIDE.md` | The 0–3 scale and rules. Read before every labelling session. |

## What the labels measure

Labels judge **the person against the role**: skills, experience and
seniority. They deliberately **ignore logistics**: location, remote or
on-site policy, relocation, time zones, salary, work authorization and
visa sponsorship. The app handles those with search filters, before
matching happens.

Consequences for the results:
- The heuristic is run with neutral logistics filters (any location, any
  employment type), so its location and authorization rules are **not
  evaluated** here. Its seniority and skill logic are.
- Hard professional requirements (a licence, a degree, a required spoken
  language) are not logistics and still count. See the labelling guide.

## Full-text subset

Adzuna snippets are cut at 500 characters, so the production set is almost
entirely thin. A separate **full-text subset** uses complete listings from
Jobicy and Arbeitnow:

- 10 CVs × (5 own-role + 3 neighbour-role + 2 random) = 100 pairs.
- Own-role candidates must contain **every** role word of the CV's
  `search_query` in the title (stricter than the production pools).
- Built by `scripts/collect-fulltext.ts` (listing pool) and
  `scripts/build-fulltext-pairs.ts` (pairs, seed 20261121).
- Disjoint from the production set and always reported separately.
- `non_job_suspect` is a **screening column only**: it marks listings that
  look like programmes, courses, gig work or something the candidate pays
  for. It never removes a listing; the final `non_job` decision is made in
  label review.

## Data sources and attribution

- Job listings from **[Adzuna](https://www.adzuna.com)** and
  **[Remotive](https://remotive.com)** (production set).
- Remote job listings courtesy of **[Jobicy](https://jobicy.com)**, the
  original source of every `jobicy:` listing (full-text subset).
- Job listings via the **[Arbeitnow](https://www.arbeitnow.com) job board
  API** ([arbeitnow.com](https://www.arbeitnow.com),
  [arbeitnow.co.uk](https://www.arbeitnow.co.uk)), the source of every
  `arbeitnow:` listing (full-text subset).

Listing text from all sources stays out of git; only IDs and URLs are
committed. Terms checked and rate limits used are in the experiment log
(E006).

## Labelling method

Going forward, the dataset uses **LLM-drafted, human-reviewed labels**:

1. An LLM drafts a label (0 to 3), a short rationale and a listing flag
   for each pair, following `LABELLING_GUIDE.md`. It sees only the CV text
   and the listing text, never a system score, the selection bucket or
   persona metadata. The drafting model must not be one of the systems
   under evaluation, and each drafting run records its model identifier
   and prompt version in the experiment log.
2. The reviewer reviews every pair and either accepts the draft or assigns
   a different final label.

The draft (`draft_label`) and the final label (`label`) are stored
separately. `reviewed_change` is blank while review is pending, then `yes`
if the final label differs from the draft or `no` if the draft was
accepted. A pair counts as reviewed only once the reviewer has filled it
in. Editing only the rationale is not a label change.

**Change rate** = `yes` ÷ (`yes` + `no`), over reviewed pairs only. It is
reported with every result, because it shows how much the final labels
still depend on the reviewer rather than the draft.

Metrics use the final `label` of reviewed pairs only.

## Reporting subgroups

Every result reports these counts first, then the metrics:

| Subgroup | Definition | In job-fit metrics? |
|---|---|---|
| Non-job | `flag=non_job` in the labels | **No**, counted only |
| Genuine, thin | not non-job, `listing_quality=thin` | Yes, also reported separately |
| Genuine, full | not non-job, `listing_quality=full` | Yes, also reported separately |
| Same / cross language | `language_pair` in the pairs file | Yes, also reported separately |
| Production vs full-text | `pairs.csv` vs `pairs-fulltext.csv` | Yes, always reported as separate sets |
| Pending review | `reviewed_change` blank | **No**, counted only |

`listing_quality` is computed when pairs are built, before any label is
drafted or reviewed: `thin` means the provider truncated the text or it
is under 1,000 characters.

## Language subgroups

Every pair is tagged `same` or `cross` language, comparing the CV's
language with the listing's detected language. Most Turkish CVs meet
English listings, so `cross` pairs are reported as a separate subgroup:
it shows whether a system really matches meaning across languages or only
matches shared words.

## Calibration set

Ten pairs are labelled first and compared against the guide; the guide is
adjusted if needed. They come from `data/labels/calibration-pairs.csv`,
are disjoint from `pairs.csv`, and never enter the final metrics.

Round 1 (2026-11-20) changed the guide in three places: past work in the
listing's field, required core frameworks, and listing quality. All 10
calibration listings were truncated; 2 of the 10 (cal-05, cal-06) were not
real job postings. Details in `docs/experiment-log.md`, E003.

## Data policy

- **No real people.** CVs are synthetic personas. Names, emails and employers
  are fictional; universities and technologies are real so the text reads
  naturally. Never add a real user's CV, even anonymized by hand.
- **Free-tier Gemini** may use inputs to improve Google's products. That is
  acceptable only because everything sent is synthetic or already-public
  listing text.
- **Listing text is never committed.** Adzuna and Remotive terms have not
  been confirmed to allow redistribution, so `data/jobs/snapshot.jsonl`
  and `work/` are gitignored. Only job IDs, URLs and labels are committed.
  `scripts/collect-jobs.ts` documents how the snapshot was built; a
  re-collection will return different listings, so published results are
  reproducible from the cached snapshot, not from the providers.

## Splits

Train / dev / test are split **by CV**, never by pair, so the same person
never appears on both sides. The split is fixed once in `data/splits.json`
and never changed after the first result is recorded.

## Known data limits

- Adzuna cuts descriptions at 500 characters, and most snippets don't
  state requirements. The app scores the same snippets, so results
  reflect production, but labels on thin pairs are less certain. Thin
  pairs are marked in `pairs.csv` and reported as a subgroup.
- Some listings are not real jobs (training programmes, self-employment
  pitches). They are flagged `non_job` and excluded from job-fit metrics.
- Remotive's public API returns only 15 listings, so nearly all listings
  come from Adzuna.

## Workflow

1. Freeze the job snapshot: `npx tsx eval/scripts/collect-jobs.ts`.
2. Build pairs: `npx tsx eval/scripts/build-pairs.ts`.
3. Render a sheet: `npx tsx eval/scripts/render-sheet.ts main 1 60`.
4. Draft labels with the LLM, then review every pair with
   `npm run review` (http://127.0.0.1:4610; `LABELLING_GUIDE.md`,
   "Process rules").
5. Run the systems; predictions are written next to the cache.
6. Run the metrics script; it writes `results/<date>.json` and a table.
7. Record what happened in `docs/experiment-log.md`, including failures.
