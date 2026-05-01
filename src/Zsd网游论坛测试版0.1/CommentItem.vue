<template>
  <div class="rounded p-2 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-[11px] font-medium text-[var(--f-author)]">{{ comment.authorId }}</span>
      <span v-if="comment.timestamp" class="text-[9px] text-[var(--f-text-muted)] ml-auto">{{ comment.timestamp }}</span>
    </div>
    <p class="text-[11px] text-[var(--f-text)] font-semibold">{{ comment.content }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ForumComment } from './types';

defineProps<{ comment: ForumComment }>();
</script>
