# Baseline results (2026-11-21)

Reference: LLM-generated labels (Claude Opus 5.5), no human review.
Every number is agreement with that LLM reference judge, not with human recruiters.
Match = label >= 2 vs score >= 50. 95% CIs: CV-level bootstrap, 1000 resamples, seed 20261121.

## Coverage

| System | Set | Pairs | Non-job excluded | Genuine | Scored | Prediction status (genuine pairs) |
|---|---|---|---|---|---|---|
| heuristic | production | 450 | 21 | 429 | 429 | ok 429 |
| heuristic | fulltext | 100 | 1 | 99 | 99 | ok 99 |
| gemini | production | 450 | 21 | 429 | 22 | error 4, not_run 403, ok 22 |
| gemini | fulltext | 100 | 1 | 99 | 0 | not_run 99 |

## production

| System | Group | n | CVs | Label ≥2 | Precision | Recall | F1 | Spearman ρ | NDCG@5 | NDCG@10 |
|---|---|---|---|---|---|---|---|---|---|---|
| heuristic | all genuine | 429 | 30 | 172 | 0.68 [0.57, 0.78] | 0.87 [0.81, 0.93] | 0.76 [0.69, 0.83] | 0.65 [0.54, 0.75] | 0.80 [0.70, 0.88] | 0.87 [0.81, 0.92] |
| heuristic | thin listings | 418 | 30 | 172 | 0.68 [0.58, 0.79] | 0.87 [0.81, 0.93] | 0.77 [0.69, 0.84] | 0.66 [0.54, 0.75] | 0.80 [0.71, 0.88] | 0.87 [0.81, 0.92] |
| heuristic | full listings | 11 | 9 | 0 | 0.00 | – | – | 0.18 [-0.48, 0.84] | 0.91 [0.72, 1.00] | 0.91 [0.63, 1.00] |
| heuristic | same language | 218 | 24 | 93 | 0.68 [0.52, 0.83] | 0.89 [0.82, 0.96] | 0.77 [0.65, 0.87] | 0.60 [0.45, 0.73] | 0.84 [0.74, 0.92] | 0.89 [0.81, 0.95] |
| heuristic | cross language | 203 | 27 | 76 | 0.67 [0.56, 0.78] | 0.86 [0.76, 0.93] | 0.75 [0.66, 0.84] | 0.71 [0.55, 0.82] | 0.89 [0.80, 0.95] | 0.93 [0.87, 0.97] |
| gemini | all genuine | 22 | 16 | 10 | 0.71 [0.45, 0.92] | 1.00 [1.00, 1.00] | 0.83 [0.62, 0.96] | 0.86 [0.62, 0.96] | 1.00 [1.00, 1.00] | 1.00 [1.00, 1.00] |
| gemini | thin listings | 21 | 16 | 10 | 0.71 [0.46, 0.93] | 1.00 [1.00, 1.00] | 0.83 [0.62, 0.96] | 0.87 [0.66, 0.96] | 1.00 [1.00, 1.00] | 1.00 [1.00, 1.00] |
| gemini | full listings | 1 | 1 | 0 | – | – | – | – | 1.00 [1.00, 1.00] | 1.00 [1.00, 1.00] |
| gemini | same language | 12 | 9 | 5 | 0.71 [0.40, 1.00] | 1.00 [1.00, 1.00] | 0.83 [0.60, 1.00] | 0.92 [0.64, 0.99] | 1.00 [1.00, 1.00] | 1.00 [1.00, 1.00] |
| gemini | cross language | 10 | 8 | 5 | 0.71 [0.25, 1.00] | 1.00 [1.00, 1.00] | 0.83 [0.40, 1.00] | 0.76 [0.30, 0.97] | 1.00 [1.00, 1.00] | 1.00 [1.00, 1.00] |

## fulltext

| System | Group | n | CVs | Label ≥2 | Precision | Recall | F1 | Spearman ρ | NDCG@5 | NDCG@10 |
|---|---|---|---|---|---|---|---|---|---|---|
| heuristic | all genuine | 99 | 10 | 26 | 0.60 [0.37, 0.82] | 0.81 [0.69, 0.93] | 0.69 [0.49, 0.84] | 0.65 [0.51, 0.75] | 0.72 [0.62, 0.82] | 0.83 [0.75, 0.90] |
| heuristic | full listings | 99 | 10 | 26 | 0.60 [0.37, 0.82] | 0.81 [0.69, 0.93] | 0.69 [0.49, 0.85] | 0.65 [0.50, 0.75] | 0.72 [0.63, 0.83] | 0.83 [0.75, 0.90] |
| heuristic | same language | 70 | 9 | 21 | 0.62 [0.33, 0.85] | 0.86 [0.71, 1.00] | 0.72 [0.48, 0.88] | 0.69 [0.54, 0.79] | 0.82 [0.74, 0.90] | 0.87 [0.78, 0.94] |
| heuristic | cross language | 28 | 10 | 5 | 0.50 [0.25, 0.80] | 0.60 [0.17, 1.00] | 0.55 [0.29, 0.67] | 0.46 [0.26, 0.67] | 0.96 [0.86, 1.00] | 0.99 [0.97, 1.00] |

## Head-to-head (pairs both systems scored)

| Set | n | System | F1 | Spearman ρ | NDCG@5 |
|---|---|---|---|---|---|
| production | 22 | heuristic | 0.83 [0.62, 0.97] | 0.71 [0.43, 0.86] | 1.00 [1.00, 1.00] |
| production | 22 | gemini | 0.83 [0.59, 0.96] | 0.86 [0.61, 0.96] | 1.00 [1.00, 1.00] |
