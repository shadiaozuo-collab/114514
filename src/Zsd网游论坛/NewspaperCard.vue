<template>
  <div
    class="rounded-lg p-3 cursor-pointer border transition-colors group bg-[var(--f-bg-card)] border-[var(--f-border)] hover:border-[var(--f-border-hover)]"
    @click="$emit('click')"
  >
    <!-- 报头 -->
    <div class="text-center border-b-2 border-[var(--f-border)] pb-2 mb-2">
      <div class="text-xs font-black tracking-wider" :style="{ color: 'var(--f-accent)' }">{{ newspaperName }}</div>
      <div class="text-[10px] text-[var(--f-text-muted)]">{{ issueNumber }} · {{ post.timestamp }}</div>
    </div>

    <!-- 头条 -->
    <div v-if="headlineArticle" class="mb-2">
      <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-danger)] mb-0.5">头条</div>
      <div class="text-xs font-bold text-[var(--f-text)] line-clamp-2">{{ headlineArticle.title }}</div>
    </div>

    <!-- 栏目预览 -->
    <div v-if="otherArticles.length > 0" class="space-y-1">
      <div
        v-for="article in otherArticles.slice(0, 3)"
        :key="article.title"
        class="flex items-center gap-1 text-[10px]"
      >
        <span class="shrink-0 px-1 py-0.5 rounded text-[9px] font-bold" :style="columnTagStyle">{{ article.column || '专栏' }}</span>
        <span class="truncate text-[var(--f-text-secondary)]">{{ article.title }}</span>
      </div>
    </div>

    <!-- 底部 -->
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-[var(--f-border)]">
      <span class="text-[10px] text-[var(--f-text-muted)]">主编: {{ post.authorId }}</span>
      <button
        class="px-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--f-text-muted)] hover:text-[var(--f-danger)]"
        @click.stop="$emit('delete', post.id)"
        title="删除"
      >
        <i class="fa-solid fa-trash-can text-[10px]"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ForumPost } from './types';

const props = defineProps<{ post: ForumPost }>();
defineEmits<{ click: []; delete: [postId: string] }>();

const m = computed(() => props.post.metadata || {});
const articles = computed(() => (m.value.articles || []) as Array<{ title: string; content: string; author: string; column: string }>);

const newspaperName = computed(() => {
  const title = props.post.title || '';
  return title.split('·')[0] || title;
});
const issueNumber = computed(() => m.value.issueNumber || '');

const headlineArticle = computed(() => articles.value[0] || null);
const otherArticles = computed(() => articles.value.slice(1));

const columnTagStyle = computed(() => ({
  backgroundColor: 'var(--f-accent-dim)',
  color: 'var(--f-accent)',
}));
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
