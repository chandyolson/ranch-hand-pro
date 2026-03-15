/**
 * Natural sort comparator for cattle tags.
 * "5" < "115K" < "115M" < "5003" < "50056"
 * Splits strings into numeric and non-numeric chunks, compares each chunk.
 */
export function naturalSort(a: string, b: string): number {
  const chunksA = (a || "").match(/(\d+|\D+)/g) || [""];
  const chunksB = (b || "").match(/(\d+|\D+)/g) || [""];
  const len = Math.max(chunksA.length, chunksB.length);
  for (let i = 0; i < len; i++) {
    const ca = chunksA[i] || "";
    const cb = chunksB[i] || "";
    const na = /^\d+$/.test(ca) ? parseInt(ca, 10) : NaN;
    const nb = /^\d+$/.test(cb) ? parseInt(cb, 10) : NaN;
    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb;
    } else if (!isNaN(na)) {
      return -1; // numbers before text
    } else if (!isNaN(nb)) {
      return 1;
    } else {
      const cmp = ca.localeCompare(cb, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/** Sort an array of objects by a tag field using natural sort */
export function sortByTag<T>(arr: T[], getTag: (item: T) => string): T[] {
  return [...arr].sort((a, b) => naturalSort(getTag(a), getTag(b)));
}
