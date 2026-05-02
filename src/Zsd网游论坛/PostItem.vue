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
    <p class="text-[11px] text-[var(--f-text-secondary)] line-clamp-2 mb-2 font-semibold">{{ post.content }}</p>
    <div class="flex items-center justify-between text-[10px] text-[var(--f-text-muted)]">
      <span class="text-[var(--f-author)] font-medium">{{ post.authorId }}</span>
      <div class="flex items-center gap-2">
        <span v-if="store.settings.ZenableLikes" class="font-medium"><i class="fa-solid fa-heart" :style="{ color: 'var(--f-danger)' }"></i> {{ post.likes }}</span>
        <span class="font-medium"><i class="fa-solid fa-comment" :style="{ color: 'var(--f-text-muted)' }"></i> {{ post.comments.length }}</span>
        <span v-if="post.timestamp" class="font-medium">{{ post.timestamp }}</span>
      </div>
    </div>

    <!-- 列表评论预览 -->
    <div v-if="post.comments.length > 0" class="mt-2 pt-2 border-t border-[var(--f-border)]">
      <!-- 全局开启 或 本卡片临时展开 -->
      <template v-if="store.settings.ZshowCommentsInList || isExpanded">
        <div class="space-y-1">
          <div
            v-for="comment in visibleComments"
            :key="comment.id"
            class="text-[10px] text-[var(--f-text-muted)] flex items-start gap-1"
            @click.stop
          >
            <i class="fa-solid fa-comment text-[8px] mt-0.5 shrink-0" :style="{ color: 'var(--f-text-muted)' }"></i>
            <span class="truncate">
              <span class="text-[var(--f-author)] font-medium">{{ comment.authorId }}</span>:
              <span class="text-[var(--f-text-secondary)]">{{ comment.content }}</span>
            </span>
          </div>
        </div>
        <button
          v-if="post.comments.length > previewLimit"
          class="text-[9px] text-[var(--f-accent)] hover:underline mt-1"
          @click.stop="isExpanded = !isExpanded"
        >
          {{ isExpanded ? '收起评论' : `展开全部 ${post.comments.length} 条评论` }}
        </button>
      </template>
      <!-- 全局关闭时，显示一个小按钮提示可展开 -->
      <button
        v-else
        class="text-[9px] text-[var(--f-text-muted)] hover:text-[var(--f-accent)] flex items-center gap-1"
        @click.stop="isExpanded = true"
      >
        <i class="fa-solid fa-chevron-down text-[8px]"></i>
        展开 {{ post.comments.length }} 条评论
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useForumSettingsStore } from './settings';
import type { ForumPost } from './types';

const store = useForumSettingsStore();
const props = defineProps<{ post: ForumPost }>();
defineEmits<{ click: []; delete: [postId: string] }>();

const isExpanded = ref(false);
const previewLimit = 2;

const visibleComments = computed(() => {
  if (isExpanded.value) return props.post.comments;
  return props.post.comments.slice(0, previewLimit);
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
