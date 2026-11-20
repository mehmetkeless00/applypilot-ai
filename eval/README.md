# Evaluation harness

Measures how well ApplyPilot's matching systems agree with human judgement
on CV–job fit. Every model change in the ML plan is judged against this.

## Layout

| Path | What lives there |
|---|---|
| `data/cvs/` | Synthetic CV personas, one Markdown file each. YAML front matter is metadata for us; the runner strips it before any system sees the CV. |
| `data/jobs/` | `snapshot.jsonl` holds the frozen listing text and is **gitignored**. `index.csv` (job ID, provider, URL) is committed. Frozen so every run scores the same text. |
| `data/pairs.csv` | Every CV–job pair to label, with its selection bucket and language tag. Committed. |
| `data/labels/` | Human labels (`labels.csv`), the calibration labels, and the one-week-later re-labels. Ground truth. Committed. |
| `work/` | Rendered labelling sheets that contain listing text. **Gitignored.** |
| `cache/` | Cached model responses keyed by a hash of model + input. Makes Gemini runs reproducible and free to re-run. |
| `scripts/` | TypeScript runner (calls the app's real scoring code) and the Python metrics script. |
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

## Workflow

1. Freeze the job snapshot.
2. Label every pair following `LABELLING_GUIDE.md`.
3. Run the systems; predictions are written next to the cache.
4. Run the metrics script; it writes `results/<date>.json` and a table.
5. Record what happened in `docs/experiment-log.md`, including failures.
