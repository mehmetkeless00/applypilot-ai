// Minimal line-level diff (longest-common-subsequence) for comparing
// resume versions. Output is plain data rendered through React — the
// caller never injects HTML, so content can't execute as markup.

export interface DiffPart {
  type: "same" | "added" | "removed";
  text: string;
}

// Beyond this many line-pairs the O(n·m) LCS table gets expensive; fall
// back to a trimmed-common-prefix/suffix diff that stays readable.
const MAX_LCS_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffPart[] {
  const a = before.split("\n");
  const b = after.split("\n");

  // Trim the common prefix and suffix first — resumes usually change in
  // one small spot, which keeps the LCS table tiny.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], lines: string[]) => {
    for (const text of lines) parts.push({ type, text });
  };

  push("same", a.slice(0, start));
  if (midA.length * midB.length > MAX_LCS_CELLS) {
    // Degenerate but safe: everything changed in the middle.
    push("removed", midA);
    push("added", midB);
  } else {
    push2(parts, midA, midB);
  }
  push("same", a.slice(endA));
  return parts;
}

/** LCS-based diff of the changed middle section. */
function push2(parts: DiffPart[], a: string[], b: string[]): void {
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      parts.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      parts.push({ type: "removed", text: a[i] });
      i++;
    } else {
      parts.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) parts.push({ type: "removed", text: a[i++] });
  while (j < m) parts.push({ type: "added", text: b[j++] });
}
