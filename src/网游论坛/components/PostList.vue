<template>
  <div class="flex-1 overflow-y-auto p-2 space-y-2">
    <div v-if="posts.length === 0" class="text-center text-[var(--f-text-muted)] text-xs py-8">
      暂无帖子，点击下方按钮生成
    </div>
    <PostItem
      v-for="post in posts"
      :key="post.id"
      :post="post"
      @click="$emit('select', post.id)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ForumPost } from '../types';
import PostItem from './PostItem.vue';

defineProps<{
  posts: ForumPost[];
}>();

defineEmits<{
  select: [postId: string];
  delete: [postId: string];
}>();
</script>
