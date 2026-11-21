"""Agreement metrics for the baseline systems (standard library only).

    python3 eval/scripts/metrics.py

What it measures: how well each system's 0-100 score agrees with the
reference labels (0-3). The reference labels are LLM-generated labels
(Claude Opus 5.5), no human review, so every number here is agreement with
an LLM reference judge, not with human recruiters.

Inclusion rules (the same for every system, see eval/README.md):
  * Pairs flagged non_job in the labels are excluded from job-fit metrics
    and only counted.
  * A pair whose prediction failed (status other than "ok") is excluded for
    that system and counted as a failure.
  * Production and full-text sets are always reported separately. Within
    each set: all genuine pairs, thin vs full listings, same vs cross
    language.

Metrics:
  * Precision / recall / F1 for "is this a match?": the reference says
    match when label >= 2; a system says match when score >= 50. The
    threshold is fixed in advance, not tuned: on Gemini's own rubric 50-74
    means "solid foundation, notable gaps", which corresponds to label 2.
  * Spearman's rho between score and label (rank correlation, threshold-free).
  * NDCG@5 and NDCG@10: for each CV, rank its pairs by score and compare the
    order with the ideal order by label; averaged over CVs.
  * 95% confidence intervals from a bootstrap that resamples CVs (pairs of
    the same CV are not independent), 1,000 resamples, fixed seed.
"""

import csv
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # eval/
DATA = ROOT / "data"
RESULTS = ROOT / "results"
SYSTEMS = ["heuristic", "gemini"]
THRESHOLD = 50
BOOTSTRAP = 1000
SEED = 20261121
RUN_DATE = "2026-11-21"


# ---------- loading ----------

def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_pairs():
    """One dict per pair with its reference label and subgroup tags."""
    pairs = {}
    for set_name, pairs_file, labels_file in [
        ("production", "pairs.csv", "labels/labels.csv"),
        ("fulltext", "pairs-fulltext.csv", "labels/labels-fulltext.csv"),
    ]:
        labels = {r["pair_id"]: r for r in read_csv(DATA / labels_file)}
        for p in read_csv(DATA / pairs_file):
            lab = labels[p["pair_id"]]
            pairs[(set_name, p["pair_id"])] = {
                "set": set_name,
                "pair_id": p["pair_id"],
                "cv_id": p["cv_id"],
                "quality": p["listing_quality"],
                "language": p["language_pair"],
                "label": int(lab["label"]),
                "non_job": lab["flag"] == "non_job",
            }
    return pairs


def load_predictions(system):
    path = RESULTS / "predictions" / f"{system}.csv"
    return {(r["set"], r["pair_id"]): r for r in read_csv(path)}


# ---------- metrics ----------

def binary_scores(rows):
    """Precision, recall and F1 for score >= THRESHOLD vs label >= 2."""
    tp = sum(1 for r in rows if r["score"] >= THRESHOLD and r["label"] >= 2)
    fp = sum(1 for r in rows if r["score"] >= THRESHOLD and r["label"] < 2)
    fn = sum(1 for r in rows if r["score"] < THRESHOLD and r["label"] >= 2)
    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    if precision is None or recall is None or precision + recall == 0:
        f1 = None
    else:
        f1 = 2 * precision * recall / (precision + recall)
    return precision, recall, f1


def ranks(values):
    """Ranks starting at 1; tied values share the average of their ranks."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    result = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            result[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return result


def spearman(rows):
    """Pearson correlation of the ranks of score and label."""
    if len(rows) < 3:
        return None
    x = ranks([r["score"] for r in rows])
    y = ranks([r["label"] for r in rows])
    mx, my = sum(x) / len(x), sum(y) / len(y)
    cov = sum((a - mx) * (b - my) for a, b in zip(x, y))
    vx = sum((a - mx) ** 2 for a in x)
    vy = sum((b - my) ** 2 for b in y)
    return cov / math.sqrt(vx * vy) if vx and vy else None


def dcg(labels):
    return sum((2 ** rel - 1) / math.log2(i + 2) for i, rel in enumerate(labels))


def ndcg_at_k(rows, k):
    """Mean NDCG@k over CVs. Ties in score are broken by pair_id so the
    result is deterministic. CVs whose pairs are all label 0 have no ideal
    ranking and are skipped."""
    by_cv = {}
    for r in rows:
        by_cv.setdefault(r["cv_id"], []).append(r)
    values = []
    for cv_rows in by_cv.values():
        ranked = sorted(cv_rows, key=lambda r: (-r["score"], r["pair_id"]))
        ideal = sorted((r["label"] for r in cv_rows), reverse=True)
        best = dcg(ideal[:k])
        if best > 0:
            values.append(dcg([r["label"] for r in ranked[:k]]) / best)
    return sum(values) / len(values) if values else None


METRICS = {
    "precision": lambda rows: binary_scores(rows)[0],
    "recall": lambda rows: binary_scores(rows)[1],
    "f1": lambda rows: binary_scores(rows)[2],
    "spearman": spearman,
    "ndcg@5": lambda rows: ndcg_at_k(rows, 5),
    "ndcg@10": lambda rows: ndcg_at_k(rows, 10),
}


def bootstrap_ci(rows, metric, rng):
    """95% interval from resampling whole CVs with replacement."""
    by_cv = {}
    for r in rows:
        by_cv.setdefault(r["cv_id"], []).append(r)
    cv_ids = sorted(by_cv)
    stats = []
    for _ in range(BOOTSTRAP):
        sample = []
        for n, cv in enumerate(rng.choice(cv_ids) for _ in cv_ids):
            # Rename resampled CVs so a CV drawn twice counts as two CVs.
            sample.extend({**r, "cv_id": f"{cv}#{n}"} for r in by_cv[cv])
        value = metric(sample)
        if value is not None:
            stats.append(value)
    if len(stats) < BOOTSTRAP * 0.9:
        return None
    stats.sort()
    return [stats[int(0.025 * len(stats))], stats[int(0.975 * len(stats)) - 1]]


def evaluate(rows, rng):
    out = {"n": len(rows), "cvs": len({r["cv_id"] for r in rows}),
           "positives": sum(1 for r in rows if r["label"] >= 2)}
    for name, fn in METRICS.items():
        value = fn(rows) if rows else None
        out[name] = {"value": value, "ci95": bootstrap_ci(rows, fn, rng) if value is not None else None}
    return out


# ---------- report ----------

GROUPS = [
    ("all genuine", lambda p: True),
    ("thin listings", lambda p: p["quality"] == "thin"),
    ("full listings", lambda p: p["quality"] == "full"),
    ("same language", lambda p: p["language"] == "same"),
    ("cross language", lambda p: p["language"] == "cross"),
]


def fmt(metric):
    v = metric["value"]
    if v is None:
        return "–"
    ci = metric["ci95"]
    return f"{v:.2f} [{ci[0]:.2f}, {ci[1]:.2f}]" if ci else f"{v:.2f}"


def main():
    pairs = load_pairs()
    rng = random.Random(SEED)
    report = {"run_date": RUN_DATE, "reference": "LLM-generated labels (Claude Opus 5.5), no human review",
              "threshold": THRESHOLD, "bootstrap": BOOTSTRAP, "seed": SEED, "systems": {}}

    for system in SYSTEMS:
        preds = load_predictions(system)
        counts = {}
        groups = {}
        for set_name in ["production", "fulltext"]:
            in_set = [p for p in pairs.values() if p["set"] == set_name]
            non_job = [p for p in in_set if p["non_job"]]
            genuine = [p for p in in_set if not p["non_job"]]
            status = {}
            for p in genuine:
                s = preds.get((set_name, p["pair_id"]), {}).get("status", "missing")
                status[s] = status.get(s, 0) + 1
            scored = [
                {**p, "score": int(preds[(set_name, p["pair_id"])]["score"])}
                for p in genuine if preds.get((set_name, p["pair_id"]), {}).get("status") == "ok"
            ]
            counts[set_name] = {"pairs": len(in_set), "non_job_excluded": len(non_job),
                                "genuine": len(genuine), "scored": len(scored),
                                "prediction_status": status}
            groups[set_name] = {}
            for name, keep in GROUPS:
                rows = [r for r in scored if keep(r)]
                if rows:
                    groups[set_name][name] = evaluate(rows, rng)
        report["systems"][system] = {"counts": counts, "groups": groups}

    # Head-to-head on pairs both systems scored, so differences are not
    # caused by one system having more failures.
    h2h = {}
    hp, gp = load_predictions("heuristic"), load_predictions("gemini")
    for set_name in ["production", "fulltext"]:
        both = [p for p in pairs.values() if p["set"] == set_name and not p["non_job"]
                and hp.get((set_name, p["pair_id"]), {}).get("status") == "ok"
                and gp.get((set_name, p["pair_id"]), {}).get("status") == "ok"]
        h2h[set_name] = {"n": len(both)}
        for system, preds in [("heuristic", hp), ("gemini", gp)]:
            rows = [{**p, "score": int(preds[(set_name, p["pair_id"])]["score"])} for p in both]
            h2h[set_name][system] = evaluate(rows, rng) if rows else None
    report["head_to_head"] = h2h

    RESULTS.mkdir(exist_ok=True)
    (RESULTS / f"{RUN_DATE}-baselines.json").write_text(json.dumps(report, indent=2) + "\n")

    lines = [f"# Baseline results ({RUN_DATE})", "",
             "Reference: LLM-generated labels (Claude Opus 5.5), no human review.",
             "Every number is agreement with that LLM reference judge, not with human recruiters.",
             f"Match = label >= 2 vs score >= {THRESHOLD}. 95% CIs: CV-level bootstrap, "
             f"{BOOTSTRAP} resamples, seed {SEED}.", ""]
    lines += ["## Coverage", "",
              "| System | Set | Pairs | Non-job excluded | Genuine | Scored | Prediction status (genuine pairs) |",
              "|---|---|---|---|---|---|---|"]
    for system in SYSTEMS:
        for set_name, c in report["systems"][system]["counts"].items():
            st = ", ".join(f"{k} {v}" for k, v in sorted(c["prediction_status"].items()))
            lines.append(f"| {system} | {set_name} | {c['pairs']} | {c['non_job_excluded']} | "
                         f"{c['genuine']} | {c['scored']} | {st} |")
    for set_name in ["production", "fulltext"]:
        lines += ["", f"## {set_name}", "",
                  "| System | Group | n | CVs | Label ≥2 | Precision | Recall | F1 | Spearman ρ | NDCG@5 | NDCG@10 |",
                  "|---|---|---|---|---|---|---|---|---|---|---|"]
        for system in SYSTEMS:
            for name, g in report["systems"][system]["groups"][set_name].items():
                lines.append(f"| {system} | {name} | {g['n']} | {g['cvs']} | {g['positives']} | "
                             + " | ".join(fmt(g[m]) for m in METRICS) + " |")
    lines += ["", "## Head-to-head (pairs both systems scored)", "",
              "| Set | n | System | F1 | Spearman ρ | NDCG@5 |", "|---|---|---|---|---|---|"]
    for set_name, h in h2h.items():
        for system in SYSTEMS:
            g = h[system]
            if g:
                lines.append(f"| {set_name} | {h['n']} | {system} | {fmt(g['f1'])} | "
                             f"{fmt(g['spearman'])} | {fmt(g['ndcg@5'])} |")
    (RESULTS / f"{RUN_DATE}-baselines.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
