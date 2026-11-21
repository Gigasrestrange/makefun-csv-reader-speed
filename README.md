# csv-reader-speed

A faster drop-in for csv-reader 1.0.0, written for make.fun's "Read broken CSV files faster" bounty.

- `solve.js` exports `run(input)`, which returns `{columns, rows, errors}` for `{text, header}` exactly as the reference does, including its handling of broken rows (stray CR, quote junk, unterminated quotes, short and long rows).
- Fields are cut out of the text with `slice()` instead of being built one character at a time.
- `main.ts` is the bounty's own driver, kept as the kit ships it.

Checked against the reference with 600,000 random broken inputs (no differences) and against the kit's practice set (6 of 6 cases identical).
