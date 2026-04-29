<template>
  <div class="absolute inset-0 z-10 overflow-y-auto p-3" :style="{ backgroundColor: 'var(--f-bg)' }">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-bold text-[var(--f-text)]">论坛设置</span>
      <button class="text-[var(--f-text-secondary)] hover:text-[var(--f-text)]" @click="$emit('close')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="space-y-3">
      <!-- 基本设置 -->
      <div class="border-b pb-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">基本</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛名称</label>
        <input
          v-model="settings.ZforumName"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">API 模型名（留空使用酒馆当前模型）</label>
        <input
          v-model="settings.Zmodel"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          placeholder="如: gpt-4o-mini"
        />
      </div>

      <!-- 板块名称 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">板块</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛A 名称</label>
        <input
          v-model="settings.ZsectionAName"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          placeholder="如：现实讨论、日常闲聊、新闻频道"
        />
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛B 名称</label>
        <input
          v-model="settings.ZsectionBName"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          placeholder="如：游戏中论坛、公会大厅、副本组队"
        />
      </div>

      <!-- 主题风格 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">主题风格</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛主题</label>
        <div class="grid grid-cols-5 gap-1">
          <button
            v-for="theme in themes"
            :key="theme.value"
            class="text-[10px] py-1.5 px-1 rounded border transition-all"
            :class="settings.Ztheme === theme.value ? 'ring-1 ring-[var(--f-accent)]' : ''"
            :style="{
              backgroundColor: theme.previewBg,
              color: theme.previewText,
              borderColor: settings.Ztheme === theme.value ? 'var(--f-accent)' : 'var(--f-border)',
            }"
            @click="settings.Ztheme = theme.value"
          >
            {{ theme.label }}
          </button>
        </div>
      </div>

      <!-- 玩家身份 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">玩家身份</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">玩家论坛ID</label>
        <input
          v-model="settings.ZplayerForumId"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          placeholder="你在论坛中的ID，如：暗夜刺客"
        />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">发帖时默认使用此ID，AI生成时也会识别此ID</p>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">AI 生成ID提示词</label>
        <textarea
          v-model="settings.ZauthorIdPrompt"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          rows="3"
        ></textarea>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">指导 AI 生成什么风格的用户名/ID，会追加到系统提示词中</p>
      </div>

      <!-- AI 生成设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">AI 生成</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">每次建议生成帖子数（提示词级别，非硬限制）</label>
        <input
          v-model.number="settings.ZpostCountHint"
          type="number"
          min="1"
          max="10"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">实际数量由 AI 决定，此值仅作提示</p>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">每个帖子建议评论数（提示词级别，非硬限制）</label>
        <input
          v-model.number="settings.ZcommentCountHint"
          type="number"
          min="0"
          max="10"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">设为 0 则不要求生成评论</p>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="settings.ZdecentralizedMode" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">去中心化模式</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">开启后提示 AI 不要只围绕主角生成内容，大部分帖子来自无关的普通用户</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="settings.ZautoAiReply" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">自动AI回复</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">用户发帖或评论后自动生成AI评论回复，模拟真实论坛的互动氛围</p>
        </div>
      </div>

      <!-- 提示词设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">提示词</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">{{ sectionAName }} - 系统提示词</label>
        <textarea
          v-model="settings.Zprompt_A"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          rows="4"
        ></textarea>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">{{ sectionBName }} - 系统提示词</label>
        <textarea
          v-model="settings.Zprompt_B"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          rows="4"
        ></textarea>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">输出格式提示（追加到系统提示词末尾，防止掉格式）</label>
        <textarea
          v-model="settings.ZoutputFormat"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
          rows="5"
        ></textarea>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">此内容会追加到系统提示词末尾，用于提醒 AI 保持输出格式。可自定义字数要求、风格要求等。</p>
      </div>

      <!-- 注入设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">上下文注入</span>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="settings.ZenableInjectToChat" type="checkbox" class="accent-blue-500" />
        <label class="text-[11px] text-[var(--f-text-secondary)]">将论坛内容注入酒馆对话</label>
      </div>

      <div v-if="settings.ZenableInjectToChat">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">注入帖子数量上限</label>
        <input
          v-model.number="settings.ZinjectPostCount"
          type="number"
          min="1"
          max="20"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">生成论坛时读取的对话历史条数</label>
        <input
          v-model.number="settings.ZinjectChatHistoryCount"
          type="number"
          min="0"
          max="50"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
      </div>

      <!-- 自动生成 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">自动生成</span>
      </div>

      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">自动生成帖子间隔（0=不生成，-1=每轮都生成）</label>
        <input
          v-model.number="settings.ZautoGenerateInterval"
          type="number"
          min="-1"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        />
      </div>

      <div v-if="settings.ZautoGenerateInterval !== 0">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">自动生成板块</label>
        <select
          v-model="settings.ZautoGenerateSection"
          class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
          :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
        >
          <option value="A">{{ sectionAName }}</option>
          <option value="B">{{ sectionBName }}</option>
        </select>
      </div>

      <!-- 危险区域 -->
      <div class="border-t pt-3 mt-3" :style="{ borderColor: 'var(--f-danger-bg)' }">
        <span class="text-[11px] font-bold block mb-2 text-[var(--f-danger)]">⚠ 危险操作</span>
        <button
          class="w-full text-[11px] py-1.5 rounded border transition-colors"
          :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }"
          @click="handleClearVars"
        >
          <i class="fa-solid fa-trash-can"></i> 一键清除论坛变量
        </button>
        <p class="text-[10px] mt-1" :style="{ color: 'var(--f-text-muted)' }">清除所有以 Z 开头的论坛脚本变量，恢复默认设置。帖子数据将丢失。</p>
      </div>

      <!-- 帮助手册 -->
      <div class="border-t pt-3 mt-3" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)] block mb-2">📖 默认提示词备份</span>
        <p class="text-[10px] mb-2" :style="{ color: 'var(--f-text-muted)' }">以下是所有默认提示词的只读备份，如修改出错可复制恢复。</p>

        <div class="space-y-2">
          <div v-for="item in defaultBackups" :key="item.label" class="relative">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-medium text-[var(--f-text-secondary)]">{{ item.label }}</span>
              <button
                class="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)' }"
                @click="copyText(item.content)"
              >
                <i class="fa-solid fa-copy"></i> 复制
              </button>
            </div>
            <pre
              class="text-[10px] p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-24 overflow-y-auto"
              :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text-muted)', border: '1px solid var(--f-border)' }"
            >{{ item.content }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FORUM_THEMES, DEFAULT_PROMPT_A, DEFAULT_PROMPT_B, DEFAULT_OUTPUT_FORMAT, DEFAULT_AUTHOR_ID_PROMPT } from '../types';
import type { ForumTheme } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();
const settings = settingsStore.settings;

const sectionAName = computed(() => settings.ZsectionAName || '论坛A');
const sectionBName = computed(() => settings.ZsectionBName || '论坛B');

// 主题选项带预览色
const themes = FORUM_THEMES.map(t => ({
  ...t,
  previewBg: getThemePreviewBg(t.value),
  previewText: getThemePreviewText(t.value),
}));

function getThemePreviewBg(theme: ForumTheme): string {
  switch (theme) {
    case 'classic-dark': return '#111827';
    case 'cyberpunk': return '#0a0a1a';
    case 'vaporwave': return '#1a0a2e';
    case 'terminal': return '#0a0a0a';
    case 'light': return '#f3f4f6';
    default: return '#111827';
  }
}

function getThemePreviewText(theme: ForumTheme): string {
  switch (theme) {
    case 'classic-dark': return '#e5e7eb';
    case 'cyberpunk': return '#00ffff';
    case 'vaporwave': return '#ff71ce';
    case 'terminal': return '#33ff33';
    case 'light': return '#111827';
    default: return '#e5e7eb';
  }
}

// 默认提示词备份列表（只读，不可编辑）— 用 computed 保持标签响应式
const defaultBackups = computed(() => [
  { label: `${sectionAName.value} 默认提示词`, content: DEFAULT_PROMPT_A },
  { label: `${sectionBName.value} 默认提示词`, content: DEFAULT_PROMPT_B },
  { label: '默认输出格式提示', content: DEFAULT_OUTPUT_FORMAT },
  { label: '默认 AI 生成ID提示词', content: DEFAULT_AUTHOR_ID_PROMPT },
]);

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toastr.success('已复制到剪贴板');
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toastr.success('已复制到剪贴板');
  });
}

function handleClearVars() {
  if (confirm('确定要清除所有论坛变量吗？此操作不可恢复，帖子数据将全部丢失。')) {
    settingsStore.clearAllForumVariables();
  }
}
</script>
