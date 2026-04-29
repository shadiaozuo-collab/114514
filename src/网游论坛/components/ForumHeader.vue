<template>
  <div class="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 cursor-move" ref="dragHandle">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-globe text-blue-400"></i>
      <span
        v-if="!editing"
        class="text-sm font-bold text-gray-100 cursor-pointer hover:text-blue-300"
        @click="startEdit"
      >{{ forumName }}</span>
      <input
        v-else
        v-model="editValue"
        class="text-sm font-bold bg-gray-700 text-gray-100 px-1 py-0.5 rounded w-32 outline-none border border-blue-500"
        @keyup.enter="confirmEdit"
        @blur="confirmEdit"
        ref="editInput"
      />
    </div>
    <div class="flex items-center gap-1">
      <button class="text-gray-400 hover:text-gray-200 px-1" @click="$emit('toggleSettings')" title="设置">
        <i class="fa-solid fa-gear text-xs"></i>
      </button>
      <button class="text-gray-400 hover:text-yellow-400 px-1" @click="$emit('minimize')" title="最小化">
        <i class="fa-solid fa-minus text-xs"></i>
      </button>
      <button class="text-gray-400 hover:text-red-400 px-1" @click="$emit('close')" title="关闭">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../stores/settingsStore';

const props = defineProps<{
  forumName: string;
}>();

const emit = defineEmits<{
  toggleSettings: [];
  minimize: [];
  close: [];
}>();

const settingsStore = useSettingsStore();
const editing = ref(false);
const editValue = ref('');
const editInput = ref<HTMLInputElement | null>(null);
const dragHandle = ref<HTMLElement | null>(null);

function startEdit() {
  editValue.value = props.forumName;
  editing.value = true;
  nextTick(() => {
    editInput.value?.focus();
  });
}

function confirmEdit() {
  if (editValue.value.trim()) {
    settingsStore.settings.forumName = editValue.value.trim();
  }
  editing.value = false;
}

defineExpose({ dragHandle });
</script>
