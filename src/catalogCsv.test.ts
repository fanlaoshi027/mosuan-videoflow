import { describe, expect, it } from "vitest";
import { catalogFromCsv, parseCsv } from "./catalogCsv";
describe("CSV 导入", () => {
 it("支持 UTF-8 BOM 和引号内逗号", () => {
  const r = catalogFromCsv('\uFEFF页码,题号,名称\r\nP012,01,"绝对值,数轴"');
  expect(r.rows[0].title).toBe("绝对值,数轴");
 });
 it("支持引号转义和多行", () => {
  expect(parseCsv('a,b\n"c""d","x\ny"')[1]).toEqual(['c"d','x\ny']);
 });
 it("拒绝缺少必要列", () => expect(catalogFromCsv("abc,def\nx,y").errors.length).toBe(1));
});
