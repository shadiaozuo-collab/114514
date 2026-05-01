<template>
  <div class="flex-1 overflow-y-auto p-3">
    <div class="flex items-center justify-between mb-3">
      <button class="text-xs text-[var(--f-text-secondary)] hover:text-[var(--f-accent)] flex items-center gap-1" @click="$emit('back')">
        <i class="fa-solid fa-arrow-left"></i> 返回列表
      </button>
      <button class="text-[10px] text-[var(--f-text-muted)] hover:text-[var(--f-danger)] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--f-danger-bg)] transition-colors" @click="$emit('delete')">
        <i class="fa-solid fa-trash-can"></i> 删除帖子
      </button>
    </div>

    <template v-if="post">
      <div class="space-y-3">
        <div class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <h2 class="text-sm font-bold text-[var(--f-accent)] mb-1">{{ post.title }}</h2>
          <div class="flex items-center gap-2 text-[10px] text-[var(--f-text-muted)] mb-2">
            <span class="text-[var(--f-author)]">{{ post.authorId }}</span>
            <span v-if="post.timestamp">{{ post.timestamp }}</span>
          </div>
          <p class="text-xs text-[var(--f-text)] whitespace-pre-wrap">{{ post.content }}</p>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--f-text-muted)]">评论 ({{ post.comments.length }})</span>
          <div class="flex gap-1">
            <button
              class="text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors"
              :class="generating ? 'bg-[var(--f-bg-input)] text-[var(--f-text-muted)] cursor-wait' : 'bg-[var(--f-accent-dim)] hover:bg-[var(--f-accent-bg-hover)] text-[var(--f-accent)]'"
              :disabled="generating"
              @click="$emit('generateComments')"
            >
              <i :class="generating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-robot'"></i>
              {{ generating ? '生成中...' : 'AI评论' }}
            </button>
            <button class="text-[10px] bg-[var(--f-bg-input)] hover:bg-[var(--f-bg-hover)] text-[var(--f-text)] px-2 py-1 rounded" :disabled="generating" @click="$emit('addComment')">
              <i class="fa-solid fa-pen"></i> 回复
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
import type { ForumPost } from './types';
import CommentItem from './CommentItem.vue';

defineProps<{ post: ForumPost | null; generating: boolean }>();
defineEmits<{ back: []; generateComments: []; addComment: []; delete: [] }>();
</script>
