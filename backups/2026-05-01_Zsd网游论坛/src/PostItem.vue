<template>
  <div
    class="rounded-lg p-3 cursor-pointer border transition-colors group bg-[var(--f-bg-card)] border-[var(--f-border)] hover:border-[var(--f-border-hover)]"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 mb-1">
      <span class="text-xs font-bold truncate flex-1 text-[var(--f-accent)]">{{ post.title }}</span>
      <button
        class="px-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--f-text-muted)] hover:text-[var(--f-danger)]"
        @click.stop="$emit('delete', post.id)"
        title="删除"
      >
        <i class="fa-solid fa-trash-can text-[10px]"></i>
      </button>
    </div>
    <p class="text-[11px] text-[var(--f-text-secondary)] line-clamp-2 mb-2">{{ post.content }}</p>
    <div class="flex items-center justify-between text-[10px] text-[var(--f-text-muted)]">
      <span class="text-[var(--f-author)]">{{ post.authorId }}</span>
      <div class="flex items-center gap-2">
        <span><i class="fa-solid fa-comment" :style="{ color: 'var(--f-text-muted)' }"></i> {{ post.comments.length }}</span>
        <span v-if="post.timestamp">{{ post.timestamp }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumPost } from './types';

defineProps<{ post: ForumPost }>();
defineEmits<{ click: []; delete: [postId: string] }>();
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
