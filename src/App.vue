<script setup lang="ts">
import { computed, ref } from "vue";
import { previewRename, type CatalogRow } from "./naming";
const course = ref("八上《大培优》");
const catalogText = ref("页码,题号,名称\nP117,01,多折线最值\nP118,01,垂线段最短\nP119,01,绝对值模型");
const filenames = ref("P117-01.mp4\nP118-01.mp4\nP119.mp4");
const catalog = computed<CatalogRow[]>(() => catalogText.value.split(/\r?\n/).slice(1).map(line => {
 const [page, question, ...title] = line.split(",");
 return { page: (page || "").trim(), question: (question || "").trim(), title: title.join(",").trim() };
}).filter(r => r.page && r.title));
const previews = computed(() => filenames.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => previewRename(s, catalog.value)));
</script>
<template>
<div class="shell">
 <aside><div class="brand">◼ 墨算 VideoFlow</div><div class="hint">录播课程素材管理</div><h4>课程</h4><div class="selected">{{ course }}</div><h4>工作区</h4><div>自动命名</div><div>视频管理（待开发）</div><div>封面管理（待开发）</div><div>NAS / 网站（待开发）</div></aside>
 <main><header><div><h1>自动命名预览</h1><p>高性能模式 · 不打开视频 · 不生成缩略图</p></div><span class="tag">V0.1 原型</span></header>
 <section class="columns"><div class="panel"><h3>课程与目录</h3><label>当前课程</label><input v-model="course"/><label>目录 CSV（页码,题号,名称）</label><textarea v-model="catalogText" rows="8"/></div>
 <div class="panel"><h3>待处理文件</h3><label>文件名（每行一个）</label><textarea v-model="filenames" rows="11"/><p class="hint">本阶段仅使用文件名文本；实际文件扫描将在下一阶段接入。</p></div></section>
 <section class="panel"><h3>重命名预览 <small>{{ previews.length }} 条</small></h3><table><thead><tr><th>原文件名</th><th>建议文件名</th><th>状态</th></tr></thead><tbody><tr v-for="(item,i) in previews" :key="i"><td>{{ item.source }}</td><td>{{ item.target || item.detail }}</td><td :class="item.status">{{ item.status === "matched" ? "已匹配" : "待确认" }}</td></tr></tbody></table><p class="hint">安全模式：本版本不写入、不移动、不删除任何文件。</p></section>
 </main>
</div>
</template>
