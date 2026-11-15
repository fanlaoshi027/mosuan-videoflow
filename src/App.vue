<script setup lang="ts">
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { previewBatch, type CatalogRow } from "./naming";
import { catalogFromCsv } from "./catalogCsv";

const course = ref("八上《大培优》");
const catalogText = ref("页码,题号,名称\nP117,01,多折线最值\nP118,01,垂线段最短\nP119,01,绝对值模型");
const filenames = ref("P117-01.mp4\nP118-01.mp4\nP119.mp4");
const folder = ref("");
const status = ref("只读预览模式：不会修改任何文件");
const busy = ref(false);
const page = ref(1);
const pageSize = 100;
const parsedCatalog = computed(() => {
 try { return catalogFromCsv(catalogText.value); }
 catch (e) { return { rows: [] as CatalogRow[], errors: [String(e)] }; }
});
const catalog = computed(() => parsedCatalog.value.rows);
const previews = computed(() => previewBatch(filenames.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean), catalog.value));
const totalPages = computed(() => Math.max(1, Math.ceil(previews.value.length / pageSize)));
const visiblePreviews = computed(() => previews.value.slice((Math.min(page.value, totalPages.value) - 1) * pageSize, Math.min(page.value, totalPages.value) * pageSize));
const csvCell = (value: string) => /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;

async function importCsv(event: Event) {
 const input = event.target as HTMLInputElement;
 const file = input.files?.[0];
 if (!file) return;
 if (!file.name.toLowerCase().endsWith(".csv")) { status.value = "目前只支持 UTF-8 CSV，Excel XLSX 将在后续加入"; return; }
 catalogText.value = (await file.text()).replace(/^\uFEFF/, "");
 status.value = "已读取 CSV，请检查目录后点击保存";
 input.value = "";
}
async function saveCatalog() {
 if (parsedCatalog.value.errors.length) { status.value = "目录存在问题：" + parsedCatalog.value.errors.join("；"); return; }
 busy.value = true;
 try {
  const count = await invoke<number>("save_catalog", { course: course.value, entries: catalog.value.map(x => ({
   page: x.page, question: x.question || "", title: x.title
  })) });
  status.value = "已保存 " + count + " 条目录到本地 SQLite";
 } catch (e) { status.value = "保存失败：" + String(e); }
 finally { busy.value = false; }
}
async function loadCatalog() {
 busy.value = true;
 try {
  const rows = await invoke<Array<{page:string;question:string;title:string}>>("load_catalog", { course: course.value });
  catalogText.value = "页码,题号,名称\n" + rows.map(x => [x.page,x.question,x.title].map(csvCell).join(",")).join("\n");
  status.value = "已读取 " + rows.length + " 条目录";
 } catch (e) { status.value = "读取失败：" + String(e); }
 finally { busy.value = false; }
}
async function scanFolder() {
 if (!folder.value.trim()) { status.value = "请先输入文件夹完整路径"; return; }
 busy.value = true;
 try {
  const rows = await invoke<Array<{name:string;path:string;size:number}>>("scan_folder", { folder: folder.value });
  filenames.value = rows.map(x => x.name).join("\n");
  page.value = 1;
  status.value = "扫描完成：" + rows.length + " 个视频，仅读取基本文件属性";
 } catch (e) { status.value = "扫描失败：" + String(e); }
 finally { busy.value = false; }
}
</script>
<template>
<div class="shell">
 <aside><div class="brand">◼ 墨算 VideoFlow</div><div class="hint">录播课程素材管理</div><h4>课程</h4><div class="selected">{{ course }}</div><h4>工作区</h4><div>自动命名</div><div>视频管理（待开发）</div><div>封面管理（待开发）</div><div>NAS / 网站（待开发）</div></aside>
 <main><header><div><h1>自动命名预览</h1><p>高性能模式 · 不打开视频 · 不生成缩略图</p></div><span class="tag">V0.1 开发版</span></header>
 <section class="columns"><div class="panel"><h3>课程与目录</h3><label>当前课程</label><input v-model="course"/><label>导入 UTF-8 CSV 目录</label><input type="file" accept=".csv,text/csv" @change="importCsv"/><label>目录 CSV（页码,题号,名称）</label><textarea v-model="catalogText" rows="7"/><p v-if="parsedCatalog.errors.length" class="hint">目录校验：{{ parsedCatalog.errors.slice(0,3).join("；") }}</p><div class="actions"><button :disabled="busy" @click="saveCatalog">保存目录</button><button :disabled="busy" @click="loadCatalog">读取目录</button></div></div>
 <div class="panel"><h3>待处理视频</h3><label>本地或已挂载 NAS 文件夹路径</label><input v-model="folder" placeholder="Windows: D:\\录播 / macOS: /Volumes/NAS/录播"/><div class="actions"><button :disabled="busy" @click="scanFolder">扫描文件夹</button></div><label>文件名（每行一个）</label><textarea v-model="filenames" rows="7"/><p class="hint">扫描只读取文件名和属性，不生成缩略图。</p></div></section>
 <section class="panel"><h3>重命名预览 <small>{{ previews.length }} 条</small></h3><p class="hint">{{ status }}</p><table><thead><tr><th>原文件名</th><th>建议文件名</th><th>状态</th></tr></thead><tbody><tr v-for="(item,i) in visiblePreviews" :key="i"><td>{{ item.source }}</td><td>{{ item.target || item.detail }}</td><td :class="item.status">{{ item.status === "matched" ? "已匹配" : "待确认" }}</td></tr></tbody></table><div class="actions"><button :disabled="page <= 1" @click="page--">上一页</button><span class="hint">第 {{ Math.min(page, totalPages) }} / {{ totalPages }} 页，每页最多 100 条</span><button :disabled="page >= totalPages" @click="page++">下一页</button></div><p class="hint">当前只读：尚未开放实际批量重命名。</p></section>
 </main>
</div>
</template>
