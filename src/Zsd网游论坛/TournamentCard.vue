<template>
  <div
    class="rounded-lg p-3 cursor-pointer border transition-colors group bg-[var(--f-bg-card)] border-[var(--f-border)] hover:border-[var(--f-border-hover)]"
    @click="$emit('click')"
  >
    <!-- 顶部：比赛名称标签 + 时间 -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold truncate flex-1 text-[var(--f-accent)]">{{ post.title }}</span>
      <span class="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0" :style="roundStyle">{{ displayRound }}</span>
      <span class="text-[10px] text-[var(--f-text-muted)] shrink-0">{{ post.timestamp }}</span>
    </div>

    <!-- 中间：对阵显示（根据赛制类型自动切换布局） -->
    <div class="mb-3">
      <!-- 个人赛： winner 不在 teamA/teamB 中，显示为冠军个人 -->
      <template v-if="gameType === 'individual'">
        <div class="text-center">
          <div class="text-[10px] text-[var(--f-text-muted)] mb-1">{{ teamA }} {{ teamB ? '· ' + teamB : '' }}</div>
          <div class="text-xl font-black leading-none" :style="{ color: 'var(--f-accent)' }">🏆 {{ winner }}</div>
          <div class="text-[9px] text-[var(--f-accent)] mt-1 font-bold">{{ scoreLabel }}</div>
        </div>
      </template>

      <!-- 无比分 VS 模式 -->
      <template v-else-if="gameType === 'vs'">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 text-center">
            <div class="text-sm font-bold truncate" :class="teamAClass">{{ teamA }}</div>
          </div>
          <div class="shrink-0 text-center px-3">
            <div class="text-xl font-black leading-none text-[var(--f-accent)]">VS</div>
          </div>
          <div class="flex-1 text-center">
            <div class="text-sm font-bold truncate" :class="teamBClass">{{ teamB }}</div>
          </div>
        </div>
      </template>

      <!-- 标准比分 / 竞速 / 生存 / 其他有 score 的情况 -->
      <template v-else>
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 text-center min-w-0">
            <div class="text-sm font-bold truncate" :class="teamAClass">{{ teamA }}</div>
          </div>
          <div class="shrink-0 text-center px-2">
            <div class="text-xl font-black leading-none" :style="scoreStyle">{{ displayScore }}</div>
            <div class="text-[9px] text-[var(--f-text-muted)] mt-0.5">{{ scoreLabel }}</div>
          </div>
          <div class="flex-1 text-center min-w-0">
            <div class="text-sm font-bold truncate" :class="teamBClass">{{ teamB }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 胜者行 + MVP -->
    <div class="flex items-center justify-between text-[10px] mb-2">
      <span v-if="showWinner" class="font-medium" :style="{ color: 'var(--f-accent)' }">
        <i class="fa-solid fa-trophy text-[9px]"></i> {{ winnerLabel }}
      </span>
      <span v-if="mvp" class="text-[var(--f-text-muted)]"><i class="fa-solid fa-star text-[9px]"></i> MVP: {{ mvp }}</span>
    </div>

    <!-- 比赛过程摘要（折叠显示，避免占位过多） -->
    <div v-if="post.content && gameType !== 'individual'" class="text-[10px] text-[var(--f-text-muted)] line-clamp-2 mb-2 italic opacity-80">
      {{ post.content }}
    </div>

    <!-- 底部操作栏 -->
    <div class="flex items-center justify-between pt-2 border-t border-[var(--f-border)]">
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
const rawScore = computed(() => String(m.value.score || '').trim());
const winner = computed(() => m.value.winner || '待定');
const round = computed(() => m.value.round || '');
const mvp = computed(() => m.value.mvp || '');

// ── 赛制类型自动推断 ──
type GameType = 'standard' | 'race' | 'survival' | 'individual' | 'vs';

const gameType = computed((): GameType => {
  const s = rawScore.value;
  const w = winner.value;
  const ta = teamA.value;
  const tb = teamB.value;

  // 个人赛：winner 不等于 teamA 也不等于 teamB，说明是个人冠军
  if (w && w !== '待定' && w !== ta && w !== tb) {
    return 'individual';
  }

  // 无比分
  if (!s || s === '?-?' || s === '?' || s === '待定' || s === 'VS') {
    return 'vs';
  }

  // 竞速时间：包含 "分" "秒" 或纯时间格式 MM:SS
  if (/\d+分\d+秒/.test(s) || /^\d+[:：]\d{2}$/.test(s)) {
    return 'race';
  }

  // 生存/淘汰：包含 "人" "存活" "完赛" "淘汰" 等
  if (/\d+人/.test(s) || /存活|完赛|淘汰|晋级|出局/.test(s)) {
    return 'survival';
  }

  // 标准比分：纯数字+冒号/中文冒号，如 3:2 或 3：2
  if (/^\d+[:：]\d+$/.test(s)) {
    return 'standard';
  }

  // 默认当标准比分处理（兜底）
  return 'standard';
});

// ── 显示格式化 ──
const displayScore = computed(() => {
  const s = rawScore.value;
  switch (gameType.value) {
    case 'race':
      // 统一竞速时间格式为 MM:SS
      const raceMatch = s.match(/(\d+)[:：](\d+)/);
      if (raceMatch) return `${raceMatch[1]}:${raceMatch[2].padStart(2, '0')}`;
      return s;
    case 'survival':
      return s;
    case 'standard':
      // 统一为标准冒号
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
      return { color: 'var(--f-accent)', fontSize: '1.125rem' }; // 竞速时间稍小
    case 'survival':
      return { color: 'var(--f-danger)', fontSize: '1.125rem' }; // 生存用红色
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

// 个人赛也显示 winner
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
