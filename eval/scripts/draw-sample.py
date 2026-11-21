"""Draw the fixed 100-pair sample that Gemini is evaluated on.

    python3 eval/scripts/draw-sample.py

Why a sample: the Gemini free tier allows only about 20 requests a day, so
scoring all 528 genuine pairs is not practical (E011).

How it is drawn:
  * Population: the 528 genuine pairs (non_job pairs excluded), production
    and full-text together.
  * Stratified by set x bucket (production/full-text x own/neighbour/random),
    with each stratum's share of the 100 proportional to its size (largest
    remainder rounding), so per-bucket results have enough pairs.
  * Within each stratum: simple random sample with a fixed seed.
  * Independent of Gemini: this script never reads predictions or cached
    responses. Cached responses are reused later only for pairs that
    happen to be in the sample.

Output: eval/data/gemini-sample.csv (set, pair_id, bucket), sorted.
"""

import csv
import random
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
SIZE = 100
SEED = 20261121


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    strata = {}
    for set_name, pairs_file, labels_file in [
        ("production", "pairs.csv", "labels/labels.csv"),
        ("fulltext", "pairs-fulltext.csv", "labels/labels-fulltext.csv"),
    ]:
        flags = {r["pair_id"]: r["flag"] for r in read_csv(DATA / labels_file)}
        for p in read_csv(DATA / pairs_file):
            if flags[p["pair_id"]] != "non_job":
                strata.setdefault((set_name, p["bucket"]), []).append(p["pair_id"])

    total = sum(len(v) for v in strata.values())
    # Proportional allocation with largest-remainder rounding.
    exact = {k: SIZE * len(v) / total for k, v in strata.items()}
    alloc = {k: int(x) for k, x in exact.items()}
    for k in sorted(exact, key=lambda k: exact[k] - alloc[k], reverse=True)[: SIZE - sum(alloc.values())]:
        alloc[k] += 1

    rng = random.Random(SEED)
    rows = []
    for key in sorted(strata):
        chosen = rng.sample(sorted(strata[key]), alloc[key])
        rows += [{"set": key[0], "pair_id": pid, "bucket": key[1]} for pid in chosen]
        print(f"{key[0]:10} {key[1]:9} {alloc[key]:3} of {len(strata[key])}")
    rows.sort(key=lambda r: (r["set"], r["pair_id"]))

    with open(DATA / "gemini-sample.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["set", "pair_id", "bucket"], lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} pairs from {total} genuine -> {DATA / 'gemini-sample.csv'}")


if __name__ == "__main__":
    main()
