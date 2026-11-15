export type CatalogRow = { page: string; title: string; question?: string };
export type Preview = { source: string; target?: string; status: "matched" | "ambiguous" | "unmatched" | "invalid"; detail: string };
export function normalizePage(input: string): string | null {
  const m = /^p0*(\d+)$/i.exec(input.trim());
  return m ? "P" + m[1].padStart(3, "0") : null;
}
export function safeName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").trim();
}
export function previewRename(filename: string, catalog: CatalogRow[]): Preview {
  const m = /^(p\d+)(?:[-_](\d+))?(\.[^.]+)$/i.exec(filename.trim());
  if (!m) return { source: filename, status: "invalid", detail: "文件名不是 P012 或 P012-01 格式" };
  const page = normalizePage(m[1]);
  if (!page) return { source: filename, status: "invalid", detail: "页码无效" };
  const question = m[2] ? String(Number(m[2])) : undefined;
  const candidates = catalog.filter(r => normalizePage(r.page) === page);
  const matches = question ? candidates.filter(r => r.question && String(Number(r.question)) === question) : candidates;
  if (!matches.length) return { source: filename, status: "unmatched", detail: "目录中没有唯一对应项" };
  if (matches.length > 1) return { source: filename, status: "ambiguous", detail: "同页多题，请补充题号" };
  const row = matches[0];
  const name = safeName(row.title);
  if (!name) return { source: filename, status: "invalid", detail: "目录标题为空或非法" };
  const suffix = row.question ? "_" + String(Number(row.question)).padStart(2, "0") : "";
  return { source: filename, target: page + suffix + "_" + name + m[3], status: "matched", detail: "仅预览，未修改原文件" };
}

/** Detect duplicate targets before any filesystem changes. */
export function previewBatch(filenames: string[], catalog: CatalogRow[]): Preview[] {
  const result = filenames.map(name => previewRename(name, catalog));
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
