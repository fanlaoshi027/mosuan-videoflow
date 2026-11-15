import { describe, it, expect } from "vitest";
import { normalizePage, previewRename, previewBatch } from "./naming";
describe("命名引擎", () => {
 it("标准化页码", () => expect(normalizePage("p0012")).toBe("P012"));
 it("匹配题号", () => expect(previewRename("P117-01.mp4", [{page:"P117",question:"1",title:"多折线最值"}]).target).toBe("P117_01_多折线最值.mp4"));
 it("同页多题拒绝猜测", () => expect(previewRename("P117.mp4", [{page:"P117",question:"1",title:"甲"},{page:"P117",question:"2",title:"乙"}]).status).toBe("ambiguous"));
 it("不匹配页码", () => expect(previewRename("P999.mp4", []).status).toBe("unmatched"));
 it("阻止重复目标文件名", () => { const r = previewBatch(["P117-01.mp4","p117_1.mp4"], [{page:"P117",question:"1",title:"多折线最值"}]); expect(r.every(x => x.status === "ambiguous")).toBe(true); });
});
