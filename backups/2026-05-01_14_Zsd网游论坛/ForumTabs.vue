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
      <button class="text-[var(--f-text-muted)] hover:text-[var(--f-text)] px-1.5 py-1" title="设置" @click="$emit('toggleSettings')">
        <i class="fa-solid fa-gear text-[10px]"></i>
      </button>
      <button class="text-[var(--f-text-muted)] hover:text-yellow-400 px-1.5 py-1" title="关闭" @click="$emit('close')">
        <i class="fa-solid fa-xmark text-[10px]"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useForumSettingsStore } from './settings';

defineProps<{ activeSection: 'A' | 'B' }>();
defineEmits<{ switch: [section: 'A' | 'B']; toggleSettings: []; close: [] }>();

const settingsStore = useForumSettingsStore();
const tabs = computed(() => [
  { key: 'A' as const, name: settingsStore.settings.ZsectionAName || '论坛A' },
  { key: 'B' as const, name: settingsStore.settings.ZsectionBName || '论坛B' },
]);
</script>
