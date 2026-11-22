# csv-reader-fast

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Qitain/csv-reader-fast/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Qitain/csv-reader-fast/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0: it returns exactly the same `{columns, rows, errors}` for every input — same broken-row policy, same error codes, same ordering — while using about 2.5x less CPU on the practice set (median ~1.11s vs ~2.81s for the reference on the same machine).

## How it works

`solve.js` exports `run(input)`. It scans each record once: clean records (no quotes, no stray CR) are split natively, and quote-heavy records go through a flat span-based parser that jumps between quotes with `indexOf` instead of building fields character by character. Quoted CR/LF normalization, doubled quotes, quote junk, unterminated quotes, stray CRs, and short/long row padding/truncation all match the reference exactly — verified against the reference on the 6 practice cases plus 12,879 differential tests (boundary cases, mutations, generated CSVs, dense fuzz).

## Run it

```sh
node main.ts
```

`main.ts` reads cases from `$MAKEFUN_INPUT_DIR/cases.json` (default `/input/cases.json`), answers each with `run`, and writes `$MAKEFUN_OUTPUT_DIR/answers.json` (default `/output/answers.json`). Requires Node 22.18+. No dependencies.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
