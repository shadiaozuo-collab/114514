<template>
  <div class="rounded-lg p-3 border border-[var(--f-border-hover)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-bold text-[var(--f-text)]">{{ mode === 'post' ? '发帖' : '回复' }}</span>
      <button class="text-[var(--f-text-muted)] hover:text-[var(--f-text)]" @click="$emit('cancel')">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
    <div v-if="mode === 'post'" class="space-y-2">
      <input
        v-model="title"
        class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)]"
        placeholder="帖子标题"
      />
      <input
        v-model="authorId"
        class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)]"
        :placeholder="playerIdPlaceholder"
      />
      <input
        v-model="timestamp"
        class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)]"
        placeholder="故事内时间（如：第一章·清晨、第三天·午后）"
      />
    </div>
    <div v-else class="mb-2 space-y-2">
      <input
        v-model="authorId"
        class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)]"
        :placeholder="playerIdPlaceholder"
      />
      <input
        v-model="timestamp"
        class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)]"
        placeholder="故事内时间（如：第一章·清晨、第三天·午后）"
      />
    </div>
    <textarea
      v-model="content"
      class="w-full bg-[var(--f-bg-input)] text-[var(--f-text)] text-xs px-2 py-1.5 rounded outline-none border border-[var(--f-border-hover)] focus:border-[var(--f-accent)] mt-2 resize-none"
      rows="3"
      :placeholder="mode === 'post' ? '帖子内容...' : '回复内容...'"
    ></textarea>
    <div class="flex justify-end mt-2">
      <button
        class="text-xs bg-[var(--f-accent-bg)] hover:bg-[var(--f-accent-bg-hover)] text-white px-3 py-1 rounded disabled:opacity-50"
        :disabled="!canSubmit"
        @click="submit"
      >
        发布
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumSection } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { generateId } from '../utils/forumUtils';

const props = defineProps<{
  mode: 'post' | 'comment';
  section: ForumSection;
  postId?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  submitPost: [post: import('../types').ForumPost];
  submitComment: [postId: string, comment: import('../types').ForumComment];
}>();

const settingsStore = useSettingsStore();
const title = ref('');
const content = ref('');
// 默认使用玩家论坛ID
const authorId = ref(settingsStore.settings.ZplayerForumId || '');
const timestamp = ref('');

const playerIdPlaceholder = computed(() => {
  return settingsStore.settings.ZplayerForumId
    ? `你的ID（默认：${settingsStore.settings.ZplayerForumId}）`
    : '你的ID';
});

const canSubmit = computed(() => {
  if (props.mode === 'post') {
    return title.value.trim() && content.value.trim() && authorId.value.trim();
  }
  return content.value.trim() && authorId.value.trim();
});

function submit() {
  if (!canSubmit.value) return;

  const ts = timestamp.value.trim() || '';

  if (props.mode === 'post') {
    emit('submitPost', {
      id: generateId(),
      section: props.section,
      title: title.value.trim(),
      content: content.value.trim(),
      authorId: authorId.value.trim(),
      timestamp: ts,
      comments: [],
      isAiGenerated: false,
    });
  } else if (props.postId) {
    emit('submitComment', props.postId, {
      id: generateId(),
      authorId: authorId.value.trim(),
      content: content.value.trim(),
      timestamp: ts,
      isAiGenerated: false,
    });
  }
}
</script>
