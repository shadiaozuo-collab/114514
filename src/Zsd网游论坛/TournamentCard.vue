<template>
  <div
    class="rounded-lg p-3 cursor-pointer border transition-colors group bg-[var(--f-bg-card)] border-[var(--f-border)] hover:border-[var(--f-border-hover)]"
    @click="$emit('click')"
  >
    <!-- 比赛标题 / 轮次 -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" :style="roundStyle">{{ round }}</span>
      <span class="text-[10px] text-[var(--f-text-muted)] ml-auto">{{ post.timestamp }}</span>
    </div>

    <!-- 对阵双方 + 比分 -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex-1 text-center">
        <div class="text-xs font-bold truncate" :class="teamAClass">{{ teamA }}</div>
      </div>
      <div class="shrink-0 text-center px-2">
        <div class="text-lg font-black leading-none" :style="{ color: 'var(--f-accent)' }">{{ score }}</div>
        <div class="text-[9px] text-[var(--f-text-muted)] mt-0.5">VS</div>
      </div>
      <div class="flex-1 text-center">
        <div class="text-xs font-bold truncate" :class="teamBClass">{{ teamB }}</div>
      </div>
    </div>

    <!-- 胜者 & MVP -->
    <div class="flex items-center justify-between text-[10px]">
      <span class="font-medium" :style="{ color: 'var(--f-accent)' }">
        <i class="fa-solid fa-trophy text-[9px]"></i> 胜者: {{ winner }}
      </span>
      <span v-if="mvp" class="text-[var(--f-text-muted)]">MVP: {{ mvp }}</span>
    </div>

    <!-- 底部操作 -->
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-[var(--f-border)]">
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-[var(--f-text-muted)]">{{ post.authorId }}</span>
        <span v-if="store.settings.ZenableLikes" class="text-[10px] text-[var(--f-danger)]"><i class="fa-solid fa-heart text-[9px]"></i> {{ post.likes }}</span>
      </div>
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
import { useForumSettingsStore } from './settings';
import type { ForumPost } from './types';

const store = useForumSettingsStore();
const props = defineProps<{ post: ForumPost }>();
defineEmits<{ click: []; delete: [postId: string] }>();

const m = computed(() => props.post.metadata || {});

const teamA = computed(() => m.value.teamA || '队伍A');
const teamB = computed(() => m.value.teamB || '队伍B');
const score = computed(() => m.value.score || '?-?');
const winner = computed(() => m.value.winner || '待定');
const round = computed(() => m.value.round || '比赛');
const mvp = computed(() => m.value.mvp || '');

const isTeamAWinner = computed(() => winner.value === teamA.value);
const isTeamBWinner = computed(() => winner.value === teamB.value);

const teamAClass = computed(() => ({
  'text-[var(--f-text)]': isTeamAWinner.value,
  'text-[var(--f-text-muted)]': !isTeamAWinner.value,
}));
const teamBClass = computed(() => ({
  'text-[var(--f-text)]': isTeamBWinner.value,
  'text-[var(--f-text-muted)]': !isTeamBWinner.value,
}));

const roundStyle = computed(() => ({
  backgroundColor: 'var(--f-accent-dim)',
  color: 'var(--f-accent)',
}));
</script>
