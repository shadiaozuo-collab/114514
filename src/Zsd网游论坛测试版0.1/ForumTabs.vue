<template>
  <div class="flex items-center border-b border-[var(--f-border)]">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="flex-1 py-2 text-xs font-semibold transition-colors"
      :class="activeSection === tab.key ? 'text-[var(--f-accent)] border-b-2 border-[var(--f-accent)]' : 'text-[var(--f-text-secondary)] hover:text-[var(--f-text)]'"
      :style="{ backgroundColor: activeSection === tab.key ? 'var(--f-bg-card)' : 'var(--f-bg)' }"
      @click="$emit('switch', tab.key)"
    >
      {{ tab.name }}
    </button>
    <div class="flex items-center px-1 gap-0.5 border-l border-[var(--f-border)]">
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

defineProps<{ activeSection: 'A' | 'B' }>();
defineEmits<{ switch: [section: 'A' | 'B']; toggleSettings: []; close: [] }>();

const isMobile = window.innerWidth <= 768;

const settingsStore = useForumSettingsStore();
const tabs = computed(() => [
  { key: 'A' as const, name: settingsStore.settings.ZsectionAName || '论坛A' },
  { key: 'B' as const, name: settingsStore.settings.ZsectionBName || '论坛B' },
]);
</script>
