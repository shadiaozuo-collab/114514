<template>
  <div class="flex items-center border-b border-[var(--f-border)]">
    <!-- PC/桌面端：标签按钮 -->
    <div v-if="!isMobile" class="flex-1 flex overflow-x-auto scrollbar-hide min-w-0">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-shrink-0 py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap"
        :class="activeSection === tab.key ? 'text-[var(--f-accent)] border-b-2 border-[var(--f-accent)]' : 'text-[var(--f-text-secondary)] hover:text-[var(--f-text)]'"
        :style="{ backgroundColor: activeSection === tab.key ? 'var(--f-bg-card)' : 'var(--f-bg)' }"
        @click="$emit('switch', tab.key)"
      >
        {{ tab.name }}
        <span v-if="tab.type !== 'forum'" class="ml-1 text-[8px] px-1 rounded" :style="typeBadgeStyle(tab.type)">
          {{ tab.type === 'tournament' ? '赛' : '报' }}
        </span>
      </button>
    </div>
    <!-- 手机/触摸端：下拉菜单 -->
    <div v-else class="flex-1 flex items-center min-w-0 px-1">
      <select
        :value="activeSection"
        class="w-full text-xs px-2 py-1.5 rounded outline-none border"
        :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        @change="onSelectChange"
      >
        <option
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
          :selected="tab.key === activeSection"
        >
          {{ tab.name }}{{ tab.type !== 'forum' ? (tab.type === 'tournament' ? ' [赛]' : ' [报]') : '' }}
        </option>
      </select>
    </div>
    <div class="flex items-center px-1 gap-0.5 border-l border-[var(--f-border)] flex-shrink-0">
      <button
        class="flex items-center justify-center w-6 h-6 rounded transition-colors text-[var(--f-text-muted)] hover:text-[var(--f-accent)] hover:bg-[var(--f-bg-hover)] bg-[var(--f-bg-input)]"
        title="刷新数据"
        @click="$emit('refresh')"
      >
        <i class="fa-solid fa-rotate-right text-[10px]"></i>
      </button>
      <button
        class="flex items-center justify-center w-6 h-6 rounded transition-colors text-[var(--f-text-muted)] hover:text-[var(--f-accent)] hover:bg-[var(--f-bg-hover)] bg-[var(--f-bg-input)]"
        title="生成日志"
        @click="$emit('showGenLog')"
      >
        <i class="fa-solid fa-clipboard-list text-[10px]"></i>
      </button>
      <button
        class="flex items-center justify-center w-6 h-6 rounded transition-colors text-[var(--f-text-muted)] hover:text-[var(--f-danger)] hover:bg-[var(--f-danger-bg)] bg-[var(--f-bg-input)]"
        title="测试：模拟添加3个帖子"
        @click="$emit('testAddPosts')"
      >
        <i class="fa-solid fa-vial text-[10px]"></i>
      </button>
      <button
        class="flex items-center justify-center w-6 h-6 rounded transition-colors text-[var(--f-text-muted)] hover:text-[var(--f-text)] hover:bg-[var(--f-bg-hover)] bg-[var(--f-bg-input)]"
        title="设置"
        @click="$emit('toggleSettings')"
      >
        <i class="fa-solid fa-gear text-[10px]"></i>
      </button>
      <button
        class="flex items-center justify-center w-6 h-6 rounded transition-colors text-[var(--f-text-muted)] hover:text-[var(--f-danger)] hover:bg-[var(--f-danger-bg)] bg-[var(--f-bg-input)]"
        :title="isMobile ? '返回' : '关闭'"
        @click="$emit('close')"
      >
        <i class="fa-solid text-[10px]" :class="isMobile ? 'fa-arrow-left' : 'fa-xmark'"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useForumSettingsStore } from './settings';

defineProps<{ activeSection: string }>();
const emit = defineEmits<{ switch: [sectionId: string]; toggleSettings: []; close: []; refresh: []; showGenLog: []; testAddPosts: [] }>();

const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768;

function onSelectChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (target.value) {
    emit('switch', target.value);
  }
}

const settingsStore = useForumSettingsStore();
const tabs = computed(() =>
  settingsStore.settings.Zsections.map(s => ({
    key: s.id,
    name: s.name || '未命名板块',
    type: (s as any).type || 'forum',
  })),
);

function typeBadgeStyle(type: string) {
  if (type === 'tournament') {
    return { backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)' };
  }
  if (type === 'newspaper') {
    return { backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)' };
  }
  return {};
}
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
