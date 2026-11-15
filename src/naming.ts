export type CatalogRow = { page: string; title: string; question?: string };
export type Preview = { source: string; target?: string; status: "matched" | "ambiguous" | "unmatched" | "invalid"; detail: string };
export function normalizePage(input: string): string | null {
  const m = /^p0*(\d+)$/i.exec(input.trim());
  return m ? "P" + m[1].padStart(3, "0") : null;
}
export function safeName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").trim();
}
const canonicalQuestion = (value: string | undefined) =>
  value && /^\d+$/.test(value.trim()) ? String(BigInt(value.trim())) : value?.trim() || "";
function catalogKey(page: string, question: string) { return page + "\u0000" + question; }
export function previewRename(filename: string, catalog: CatalogRow[]): Preview {
  return previewBatch([filename], catalog)[0];
}
export function previewBatch(filenames: string[], catalog: CatalogRow[]): Preview[] {
  // Build a single index for the whole batch: O(catalog + files), not O(catalog * files).
  const byPage = new Map<string, CatalogRow[]>();
  const byQuestion = new Map<string, CatalogRow[]>();
  for (const row of catalog) {
    const page = normalizePage(row.page);
    if (!page) continue;
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page)!.push(row);
    const key = catalogKey(page, canonicalQuestion(row.question));
    if (!byQuestion.has(key)) byQuestion.set(key, []);
    byQuestion.get(key)!.push(row);
  }
  const result: Preview[] = filenames.map(source => {
    const m = /^(p\d+)(?:[-_](\d+))?(\.[^.]+)$/i.exec(source.trim());
    if (!m) return { source, status: "invalid", detail: "文件名不是 P012 或 P012-01 格式" };
    const page = normalizePage(m[1]);
    if (!page) return { source, status: "invalid", detail: "页码无效" };
    const question = canonicalQuestion(m[2]);
    const matches = question ? byQuestion.get(catalogKey(page, question)) || [] : byPage.get(page) || [];
    if (!matches.length) return { source, status: "unmatched", detail: "目录中没有对应项" };
    if (matches.length > 1) return { source, status: "ambiguous", detail: "同页多题或目录重复，请确认题号" };
    const row = matches[0];
    const name = safeName(row.title);
    if (!name) return { source, status: "invalid", detail: "目录标题为空或非法" };
    const suffix = row.question ? "_" + canonicalQuestion(row.question).padStart(2, "0") : "";
    return { source, target: page + suffix + "_" + name + m[3], status: "matched", detail: "仅预览，未修改原文件" };
  });
  const counts = new Map<string, number>();
  for (const item of result) {
    if (!item.target) continue;
    const key = item.target.normalize("NFC").toLocaleLowerCase("en-US");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return result.map(item => {
    if (!item.target) return item;
    const key = item.target.normalize("NFC").toLocaleLowerCase("en-US");
    if ((counts.get(key) || 0) > 1)
      return { source: item.source, status: "ambiguous", detail: "目标文件名重复，禁止批量执行" };
    return item;
  });
}
