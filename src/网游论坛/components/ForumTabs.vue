<template>
  <div class="flex items-center border-b border-[var(--f-border)]">
    <button
      v-for="sec in sectionList"
      :key="sec.key"
      class="flex-1 py-2 text-xs font-medium transition-colors"
      :class="[
        activeSection === sec.key
          ? 'text-[var(--f-accent)] border-b-2 border-[var(--f-accent)]'
          : 'text-[var(--f-text-secondary)] hover:text-[var(--f-text)]',
      ]"
      :style="activeSection === sec.key ? { backgroundColor: 'var(--f-bg-card)' } : { backgroundColor: 'var(--f-bg)' }"
      @click="$emit('switch', sec.key)"
    >
      {{ sec.name }}
    </button>
    <div class="flex items-center px-1 gap-0.5 border-l border-[var(--f-border)]">
      <button class="text-[var(--f-text-muted)] hover:text-[var(--f-text)] px-1.5 py-1" @click="$emit('toggleSettings')" title="设置">
        <i class="fa-solid fa-gear text-[10px]"></i>
      </button>
      <button class="text-[var(--f-text-muted)] hover:text-yellow-400 px-1.5 py-1" @click="$emit('minimize')" title="最小化">
        <i class="fa-solid fa-window-minimize text-[10px]"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumSection } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

defineProps<{
  activeSection: ForumSection;
}>();

defineEmits<{
  switch: [section: ForumSection];
  toggleSettings: [];
  minimize: [];
}>();

const settingsStore = useSettingsStore();

const sectionList = computed(() => [
  { key: 'A' as ForumSection, name: settingsStore.settings.ZsectionAName || '论坛A' },
  { key: 'B' as ForumSection, name: settingsStore.settings.ZsectionBName || '论坛B' },
]);
</script>
