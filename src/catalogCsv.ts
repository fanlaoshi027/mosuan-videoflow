import type { CatalogRow } from "./naming";

export type CsvResult = { rows: CatalogRow[]; errors: string[] };

/** RFC4180-style CSV parser: quoted commas, escaped quotes and quoted newlines. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (quoted) throw new Error("CSV 引号未闭合");
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
export function catalogFromCsv(input: string): CsvResult {
  const data = parseCsv(input);
  if (!data.length) return { rows: [], errors: ["CSV 为空"] };
  const header = data[0].map(x => x.trim().toLowerCase());
  const find = (aliases: string[]) => header.findIndex(x => aliases.includes(x));
  const pageIndex = find(["页码", "page"]);
  const titleIndex = find(["名称", "题目名称", "讲解名称", "标题", "title"]);
  const questionIndex = find(["题号", "question"]);
  if (pageIndex < 0 || titleIndex < 0) return { rows: [], errors: ["必须包含页码和名称列"] };
  const rows: CatalogRow[] = [], errors: string[] = [];
  for (let i = 1; i < data.length; i++) {
    const line = data[i];
    const page = (line[pageIndex] || "").trim();
    const title = (line[titleIndex] || "").trim();
    const question = questionIndex < 0 ? "" : (line[questionIndex] || "").trim();
    if (!page || !title) { errors.push("第 " + (i + 1) + " 行缺少页码或名称"); continue; }
    rows.push({ page, question, title });
  }
  return { rows, errors };
}
