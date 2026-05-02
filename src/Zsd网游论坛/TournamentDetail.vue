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
        <!-- 对阵卡片 -->
        <div class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <!-- 标题行 -->
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-bold flex-1 text-[var(--f-accent)]">{{ post.title }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0" :style="roundStyle">{{ displayRound }}</span>
            <span class="text-[10px] text-[var(--f-text-muted)] shrink-0">{{ post.timestamp }}</span>
          </div>

          <!-- 对阵主体 -->
          <div class="mb-3">
            <!-- 个人赛 -->
            <template v-if="gameType === 'individual'">
              <div class="text-center py-2">
                <div class="text-[10px] text-[var(--f-text-muted)] mb-2">{{ teamA }} {{ teamB ? '· ' + teamB : '' }}</div>
                <div class="text-3xl font-black leading-none" :style="{ color: 'var(--f-accent)' }">🏆 {{ winner }}</div>
                <div class="text-xs text-[var(--f-accent)] mt-2 font-bold">{{ scoreLabel }}</div>
              </div>
            </template>

            <!-- 无比分 VS -->
            <template v-else-if="gameType === 'vs'">
              <div class="flex items-center justify-between gap-3 py-2">
                <div class="flex-1 text-center">
                  <div class="text-base font-bold" :class="teamAClass">{{ teamA }}</div>
                </div>
                <div class="shrink-0 text-center px-4">
                  <div class="text-3xl font-black leading-none text-[var(--f-accent)]">VS</div>
                </div>
                <div class="flex-1 text-center">
                  <div class="text-base font-bold" :class="teamBClass">{{ teamB }}</div>
                </div>
              </div>
            </template>

            <!-- 标准 / 竞速 / 生存 -->
            <template v-else>
              <div class="flex items-center justify-between gap-3 py-2">
                <div class="flex-1 text-center min-w-0">
                  <div class="text-base font-bold" :class="teamAClass">{{ teamA }}</div>
                </div>
                <div class="shrink-0 text-center px-4">
                  <div class="text-3xl font-black leading-none" :style="scoreStyle">{{ displayScore }}</div>
                  <div class="text-[10px] text-[var(--f-text-muted)] mt-1">{{ scoreLabel }}</div>
                </div>
                <div class="flex-1 text-center min-w-0">
                  <div class="text-base font-bold" :class="teamBClass">{{ teamB }}</div>
                </div>
              </div>
            </template>
          </div>

          <!-- 胜者 & MVP -->
          <div class="flex items-center justify-center gap-4 text-xs pt-3 border-t border-[var(--f-border)]">
            <span v-if="showWinner" class="font-bold" :style="{ color: 'var(--f-accent)' }">
              <i class="fa-solid fa-trophy text-[10px]"></i> {{ winnerLabel }}
            </span>
            <span v-if="mvp" class="text-[var(--f-text-muted)]">
              <i class="fa-solid fa-star text-[10px]"></i> MVP: {{ mvp }}
            </span>
          </div>
        </div>

        <!-- 比赛过程 -->
        <div class="rounded-lg p-3 border border-[var(--f-border)]" :style="{ backgroundColor: 'var(--f-bg-card)' }">
          <h3 class="text-xs font-bold text-[var(--f-accent)] mb-2 flex items-center gap-1">
            <i class="fa-solid fa-scroll text-[10px]"></i> 比赛过程
          </h3>
          <p class="text-xs text-[var(--f-text)] whitespace-pre-wrap leading-relaxed">{{ post.content }}</p>
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
const rawScore = computed(() => String(m.value.score || '').trim());
const winner = computed(() => m.value.winner || '待定');
const round = computed(() => m.value.round || '');
const mvp = computed(() => m.value.mvp || '');

// ── 赛制类型自动推断（与 TournamentCard.vue 保持一致） ──
type GameType = 'standard' | 'race' | 'survival' | 'individual' | 'vs';

const gameType = computed((): GameType => {
  const s = rawScore.value;
  const w = winner.value;
  const ta = teamA.value;
  const tb = teamB.value;

  if (w && w !== '待定' && w !== ta && w !== tb) {
    return 'individual';
  }

  if (!s || s === '?-?' || s === '?' || s === '待定' || s === 'VS') {
    return 'vs';
  }

  if (/\d+分\d+秒/.test(s) || /^\d+[:：]\d{2}$/.test(s)) {
    return 'race';
  }

  if (/\d+人/.test(s) || /存活|完赛|淘汰|晋级|出局/.test(s)) {
    return 'survival';
  }

  if (/^\d+[:：]\d+$/.test(s)) {
    return 'standard';
  }

  return 'standard';
});

// ── 显示格式化 ──
const displayScore = computed(() => {
  const s = rawScore.value;
  switch (gameType.value) {
    case 'race': {
      const raceMatch = s.match(/(\d+)[:：](\d+)/);
      if (raceMatch) return `${raceMatch[1]}:${raceMatch[2].padStart(2, '0')}`;
      return s;
    }
    case 'survival':
      return s;
    case 'standard':
      return s.replace(/：/g, ':');
    default:
      return s;
  }
});

const scoreLabel = computed(() => {
  switch (gameType.value) {
    case 'standard': return '比分';
    case 'race': return '竞速';
    case 'survival': return '淘汰';
    case 'individual': return '冠军';
    case 'vs': return '';
    default: return '';
  }
});

const scoreStyle = computed(() => {
  switch (gameType.value) {
    case 'race':
      return { color: 'var(--f-accent)', fontSize: '1.875rem' };
    case 'survival':
      return { color: 'var(--f-danger)', fontSize: '1.875rem' };
    default:
      return { color: 'var(--f-accent)' };
  }
});

const displayRound = computed(() => {
  if (round.value) return round.value;
  switch (gameType.value) {
    case 'standard': return '常规';
    case 'race': return '竞速';
    case 'survival': return '生存';
    case 'individual': return '个人';
    case 'vs': return '友谊';
    default: return '比赛';
  }
});

// ── 胜者高亮 ──
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

const showWinner = computed(() => {
  return winner.value && winner.value !== '待定';
});

const winnerLabel = computed(() => {
  if (gameType.value === 'individual') {
    return `冠军: ${winner.value}`;
  }
  return `胜者: ${winner.value}`;
});

const roundStyle = computed(() => ({
  backgroundColor: 'var(--f-accent-dim)',
  color: 'var(--f-accent)',
}));
</script>
