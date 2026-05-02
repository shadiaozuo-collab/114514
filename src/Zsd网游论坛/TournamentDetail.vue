<template>
  <div class="flex-1 overflow-y-auto p-3">
    <div class="flex items-center justify-between mb-3">
      <button class="text-xs text-[var(--f-text-secondary)] hover:text-[var(--f-accent)] flex items-center gap-1" @click="$emit('back')">
        <i class="fa-solid fa-arrow-left"></i> 返回列表
      </button>
      <button class="text-[10px] text-[var(--f-text-muted)] hover:text-[var(--f-danger)] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--f-danger-bg)] transition-colors" @click="$emit('delete')">
        <i class="fa-solid fa-trash-can"></i> 删除比赛
      </button>
    </div>

    <template v-if="post">
      <div class="space-y-3">
        <!-- 比赛标题与轮次 -->
        <div class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" :style="roundStyle">{{ round }}</span>
            <span class="text-[10px] text-[var(--f-text-muted)] ml-auto">{{ post.timestamp }}</span>
          </div>

          <!-- 对阵双方 + 比分 -->
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex-1 text-center">
              <div class="text-sm font-bold" :class="teamAClass">{{ teamA }}</div>
            </div>
            <div class="shrink-0 text-center px-3">
              <div class="text-2xl font-black leading-none" :style="{ color: 'var(--f-accent)' }">{{ score }}</div>
              <div class="text-[10px] text-[var(--f-text-muted)] mt-1">VS</div>
            </div>
            <div class="flex-1 text-center">
              <div class="text-sm font-bold" :class="teamBClass">{{ teamB }}</div>
            </div>
          </div>

          <!-- 胜者 & MVP -->
          <div class="flex items-center justify-center gap-4 text-[11px]">
            <span class="font-bold" :style="{ color: 'var(--f-accent)' }">
              <i class="fa-solid fa-trophy text-[10px]"></i> 胜者: {{ winner }}
            </span>
            <span v-if="mvp" class="text-[var(--f-text-muted)]">
              <i class="fa-solid fa-star text-[10px]"></i> MVP: {{ mvp }}
            </span>
          </div>
        </div>

        <!-- 比赛过程 -->
        <div class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <h3 class="text-xs font-bold text-[var(--f-accent)] mb-2">比赛过程</h3>
          <p class="text-xs text-[var(--f-text)] whitespace-pre-wrap font-semibold">{{ post.content }}</p>
        </div>

        <!-- 评论 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--f-text-muted)]">观众评论 ({{ post.comments.length }})</span>
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
import { computed } from 'vue';
import type { ForumPost } from './types';
import CommentItem from './CommentItem.vue';

const props = defineProps<{ post: ForumPost | null; generating: boolean }>();
defineEmits<{ back: []; generateComments: []; addComment: []; delete: [] }>();

const m = computed(() => props.post?.metadata || {});

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
