<template>
  <div class="flex-1 overflow-y-auto p-3">
    <div class="flex items-center justify-between mb-3">
      <button class="text-xs text-[var(--f-text-secondary)] hover:text-[var(--f-accent)] flex items-center gap-1" @click="$emit('back')">
        <i class="fa-solid fa-arrow-left"></i> 返回列表
      </button>
      <button class="text-[10px] text-[var(--f-text-muted)] hover:text-[var(--f-danger)] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--f-danger-bg)] transition-colors" @click="$emit('delete')">
        <i class="fa-solid fa-trash-can"></i> 删除报纸
      </button>
    </div>

    <template v-if="post">
      <div class="space-y-3">
        <!-- 报头 -->
        <div class="text-center border-b-2 border-[var(--f-border)] pb-3 mb-3">
          <div class="text-lg font-black tracking-widest" :style="{ color: 'var(--f-accent)' }">{{ newspaperName }}</div>
          <div class="text-[10px] text-[var(--f-text-muted)] mt-1">
            {{ issueNumber }} · {{ post.timestamp }} · 主编: {{ post.authorId }}
          </div>
        </div>

        <!-- 主编寄语 -->
        <div v-if="post.content" class="text-xs text-[var(--f-text-secondary)] italic text-center px-4 mb-2">
          "{{ post.content }}"
        </div>

        <!-- 头条文章 -->
        <div v-if="headlineArticle" class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-danger)] mb-1">头条</div>
          <h2 class="text-sm font-bold text-[var(--f-text)] mb-2">{{ headlineArticle.title }}</h2>
          <div class="text-[10px] text-[var(--f-text-muted)] mb-2">
            <span class="text-[var(--f-author)]">{{ headlineArticle.author }}</span>
            <span class="ml-2">{{ headlineArticle.column }}</span>
          </div>
          <p class="text-xs text-[var(--f-text)] whitespace-pre-wrap font-semibold">{{ headlineArticle.content }}</p>
        </div>

        <!-- 其他文章（分栏布局） -->
        <div v-if="otherArticles.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="article in otherArticles"
            :key="article.title"
            class="rounded-lg p-2.5 border border-[var(--f-border)]"
            :style="{ backgroundColor: 'var(--f-bg-card)' }"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[9px] px-1 py-0.5 rounded font-bold" :style="columnTagStyle">{{ article.column || '专栏' }}</span>
              <span class="text-[10px] text-[var(--f-text-muted)]">{{ article.author }}</span>
            </div>
            <h3 class="text-xs font-bold text-[var(--f-text)] mb-1">{{ article.title }}</h3>
            <p class="text-[11px] text-[var(--f-text-secondary)] whitespace-pre-wrap leading-relaxed">{{ article.content }}</p>
          </div>
        </div>

        <!-- 评论（读者来信） -->
        <div class="flex items-center justify-between pt-2 border-t border-[var(--f-border)]">
          <span class="text-xs text-[var(--f-text-muted)]">读者来信 ({{ post.comments.length }})</span>
          <div class="flex gap-1">
            <button
              class="text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors"
              :class="generating ? 'bg-[var(--f-bg-input)] text-[var(--f-text-muted)] cursor-wait' : 'bg-[var(--f-accent-dim)] hover:bg-[var(--f-accent-bg-hover)] text-[var(--f-accent)]'"
              :disabled="generating"
              @click="$emit('generateComments')"
            >
              <i :class="generating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-robot'"></i>
              {{ generating ? '生成中...' : 'AI来信' }}
            </button>
            <button class="text-[10px] bg-[var(--f-bg-input)] hover:bg-[var(--f-bg-hover)] text-[var(--f-text)] px-2 py-1 rounded" :disabled="generating" @click="$emit('addComment')">
              <i class="fa-solid fa-pen"></i> 写信
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <CommentItem v-for="comment in post.comments" :key="comment.id" :comment="comment" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ForumPost } from './types';
import CommentItem from './CommentItem.vue';

const props = defineProps<{ post: ForumPost | null; generating: boolean }>();
defineEmits<{ back: []; generateComments: []; addComment: []; delete: [] }>();

const m = computed(() => props.post?.metadata || {});
const articles = computed(() => (m.value.articles || []) as Array<{ title: string; content: string; author: string; column: string }>);

const newspaperName = computed(() => {
  const title = props.post?.title || '';
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
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
