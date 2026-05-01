<template>
  <div
    class="forum-window relative flex flex-col text-[var(--f-text)] h-full overflow-hidden"
    :class="`theme-${settingsStore.settings.Ztheme}`"
    :style="{ backgroundColor: 'var(--f-bg)', color: 'var(--f-text)' }"
  >
    <!-- 自定义背景层 -->
    <div
      v-if="settingsStore.settings.ZbgImage"
      class="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
      :style="bgImageStyle"
    />
    <!-- 毛玻璃层（独立，不受 opacity 影响） -->
    <div
      v-if="settingsStore.settings.ZbgImage && settingsStore.settings.ZbgBlur > 0"
      class="absolute inset-0 pointer-events-none z-[1]"
      :style="bgBlurStyle"
    />
    <!-- 颜色遮罩层（负责半透明暗化） -->
    <div
      v-if="settingsStore.settings.ZbgImage"
      class="absolute inset-0 pointer-events-none z-[1]"
      :style="bgOverlayStyle"
    />
    <!-- 内容层 -->
    <div class="relative z-[2] flex flex-col h-full">
    <ForumTabs
      :active-section="forumStore.activeSection"
      @switch="forumStore.switchSection($event)"
      @toggle-settings="showSettings = !showSettings"
      @close="requestClose"
    />

    <PostList
      v-if="!forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
      :posts="forumStore.currentPosts"
      @select="forumStore.selectPost($event)"
      @delete="forumStore.deletePost($event)"
    />

    <PostDetail
      v-else-if="forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
      :post="forumStore.selectedPost"
      :generating="forumStore.isGenerating"
      @back="forumStore.goBack()"
      @generate-comments="handleGenerateComments"
      @add-comment="forumStore.openCommentEditor()"
      @delete="handleDeletePost"
    />

    <PostEditor
      v-if="forumStore.showEditor && !showSettings"
      :mode="forumStore.editorMode"
      :section="forumStore.activeSection"
      :post-id="forumStore.selectedPostId ?? undefined"
      @cancel="forumStore.closeEditor()"
      @submit-post="handleSubmitPost"
      @submit-comment="handleSubmitComment"
    />

    <!-- 底部操作栏 -->
    <div v-if="!forumStore.selectedPostId && !forumStore.showEditor && !showSettings" class="p-2 flex gap-1" :style="{ borderTop: '1px solid var(--f-border)' }">
      <button
        class="flex-1 text-[11px] text-white py-1.5 rounded disabled:opacity-50 transition-colors"
        :class="forumStore.isGenerating ? 'bg-[var(--f-bg-input)] cursor-wait' : 'bg-[var(--f-accent-bg)] hover:bg-[var(--f-accent-bg-hover)]'"
        :disabled="forumStore.isGenerating"
        @click="forumStore.openGenDialog()"
      >
        <i :class="forumStore.isGenerating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-robot'"></i>
        {{ forumStore.isGenerating ? '生成中...' : 'AI生成帖子' }}
      </button>
      <button
        class="text-[11px] px-3 py-1.5 rounded bg-[var(--f-bg-input)] hover:bg-[var(--f-bg-hover)] text-[var(--f-text)]"
        :disabled="forumStore.isGenerating"
        @click="forumStore.openPostEditor()"
      >
        <i class="fa-solid fa-pen"></i> 发帖
      </button>
    </div>

    <!-- 生成对话框 -->
    <div v-if="forumStore.showGenDialog && !showSettings" class="absolute inset-0 z-20 flex flex-col p-3" :style="{ backgroundColor: 'var(--f-bg)' }">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-bold text-[var(--f-text)]">
          <i class="fa-solid fa-robot text-[var(--f-accent)]"></i> AI 批量生成帖子
        </span>
        <button class="text-[var(--f-text-secondary)] hover:text-[var(--f-text)]" @click="forumStore.closeGenDialog()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="space-y-3 flex-1">
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">讨论方向 / 话题关键词（可选，留空则由 AI 自由发挥）</label>
          <textarea
            v-model="genTopic"
            class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none"
            :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
            rows="3"
            placeholder="例如：最近更新的新副本、PK大赛、装备强化黑幕、生活玩家日常…&#10;多个话题可以用逗号或换行分隔"
          ></textarea>
        </div>
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">板块：{{ forumStore.activeSectionName }}</label>
        </div>
      </div>
      <button
        class="w-full text-xs text-white py-2 rounded disabled:opacity-50 mt-2 flex items-center justify-center gap-1 transition-colors"
        :class="forumStore.isGenerating ? 'bg-[var(--f-bg-input)] cursor-wait' : 'bg-[var(--f-accent-bg)] hover:bg-[var(--f-accent-bg-hover)]'"
        :disabled="forumStore.isGenerating"
        @click="handleBatchGenerate"
      >
        <i v-if="forumStore.isGenerating" class="fa-solid fa-spinner fa-spin"></i>
        {{ forumStore.isGenerating ? '生成中，请稍候...' : '开始生成' }}
      </button>
    </div>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import type { ForumPost, ForumComment } from './types';
import { useForumSettingsStore, useForumUiStore } from './settings';
import { generatePosts, generateComments, injectForumContext } from './aiGenerator';
import ForumTabs from './ForumTabs.vue';
import PostList from './PostList.vue';
import PostDetail from './PostDetail.vue';
import PostEditor from './PostEditor.vue';
import SettingsPanel from './SettingsPanel.vue';

const settingsStore = useForumSettingsStore();
const forumStore = useForumUiStore();

const showSettings = ref(false);
const genTopic = ref('');

const bgImageStyle = computed(() => ({
  backgroundImage: `url(${settingsStore.settings.ZbgImage})`,
}));

const bgBlurStyle = computed(() => ({
  backdropFilter: `blur(${settingsStore.settings.ZbgBlur}px)`,
  WebkitBackdropFilter: `blur(${settingsStore.settings.ZbgBlur}px)`,
}));

const bgOverlayStyle = computed(() => ({
  backgroundColor: 'var(--f-bg)',
  opacity: settingsStore.settings.ZbgOpacity / 100,
}));

const windowControls = inject<{ requestClose: boolean }>('windowControls')!;

function requestClose() {
  if (windowControls) windowControls.requestClose = true;
}

async function handleBatchGenerate() {
  forumStore.isGenerating = true;
  try {
    const topic = genTopic.value.trim() || undefined;
    const posts = await generatePosts(forumStore.activeSection, topic);
    for (const post of posts) {
      settingsStore.addPost(post);
    }
    injectForumContext();
    toastr.success(`AI生成了${posts.length}个帖子`);
    forumStore.closeGenDialog();
    genTopic.value = '';
  } catch (e) {
    toastr.error(`生成帖子失败: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    forumStore.isGenerating = false;
  }
}

async function handleGenerateComments() {
  if (!forumStore.selectedPost) return;
  forumStore.isGenerating = true;
  try {
    const comments = await generateComments(forumStore.activeSection, forumStore.selectedPost);
    for (const comment of comments) {
      settingsStore.addComment(forumStore.activeSection, forumStore.selectedPost.id, comment);
    }
    injectForumContext();
    toastr.success(`AI生成了${comments.length}条评论`);
  } catch (e) {
    toastr.error(`生成评论失败: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    forumStore.isGenerating = false;
  }
}

function handleDeletePost() {
  if (!forumStore.selectedPostId) return;
  forumStore.deletePost(forumStore.selectedPostId);
  injectForumContext();
}

function handleSubmitPost(post: ForumPost) {
  settingsStore.addPost(post);
  forumStore.closeEditor();
  injectForumContext();
  if (settingsStore.settings.ZautoAiReply) {
    triggerAutoAiReply(post.id);
  }
}

function handleSubmitComment(postId: string, comment: ForumComment) {
  settingsStore.addComment(forumStore.activeSection, postId, comment);
  forumStore.closeEditor();
  injectForumContext();
  if (settingsStore.settings.ZautoAiReply) {
    triggerAutoAiReply(postId);
  }
}

async function triggerAutoAiReply(postId: string) {
  const post = settingsStore.settings.Zposts[forumStore.activeSection].find(p => p.id === postId);
  if (!post) return;
  forumStore.isGenerating = true;
  try {
    const comments = await generateComments(forumStore.activeSection, post);
    for (const comment of comments) {
      settingsStore.addComment(forumStore.activeSection, postId, comment);
    }
    injectForumContext();
    toastr.success(`AI自动回复了${comments.length}条评论`);
  } catch (e) {
    console.warn('[网游论坛] 自动AI回复失败:', e);
  } finally {
    forumStore.isGenerating = false;
  }
}
</script>

<style>
.theme-classic-dark {
  --f-bg: #111827;
  --f-bg-card: #1f2937;
  --f-bg-input: #374151;
  --f-bg-hover: #4b5563;
  --f-text: #e5e7eb;
  --f-text-secondary: #9ca3af;
  --f-text-muted: #6b7280;
  --f-border: #374151;
  --f-border-hover: #4b5563;
  --f-accent: #60a5fa;
  --f-accent-bg: #2563eb;
  --f-accent-bg-hover: #3b82f6;
  --f-accent-dim: #1e3a5f;
  --f-author: #4ade80;
  --f-danger: #f87171;
  --f-danger-bg: #7f1d1d;
}
.theme-cyberpunk {
  --f-bg: #0a0a1a;
  --f-bg-card: #12122e;
  --f-bg-input: #1a1a42;
  --f-bg-hover: #252560;
  --f-text: #d0d0ff;
  --f-text-secondary: #8888cc;
  --f-text-muted: #555588;
  --f-border: #2a2a5e;
  --f-border-hover: #3a3a7e;
  --f-accent: #00ffff;
  --f-accent-bg: #0099bb;
  --f-accent-bg-hover: #00bbdd;
  --f-accent-dim: #003344;
  --f-author: #ff00ff;
  --f-danger: #ff3366;
  --f-danger-bg: #4d0022;
}
.theme-vaporwave {
  --f-bg: #1a0a2e;
  --f-bg-card: #2d1b4e;
  --f-bg-input: #3d2d6e;
  --f-bg-hover: #4d3d8e;
  --f-text: #f0e0ff;
  --f-text-secondary: #c8a0e0;
  --f-text-muted: #8866aa;
  --f-border: #4d3d7e;
  --f-border-hover: #5d4d9e;
  --f-accent: #ff71ce;
  --f-accent-bg: #b967ff;
  --f-accent-bg-hover: #cc77ff;
  --f-accent-dim: #4a1942;
  --f-author: #01cdfe;
  --f-danger: #ff6b6b;
  --f-danger-bg: #4a1919;
}
.theme-terminal {
  --f-bg: #0a0a0a;
  --f-bg-card: #141414;
  --f-bg-input: #1e1e1e;
  --f-bg-hover: #282828;
  --f-text: #33ff33;
  --f-text-secondary: #22cc22;
  --f-text-muted: #117711;
  --f-border: #224422;
  --f-border-hover: #336633;
  --f-accent: #33ff33;
  --f-accent-bg: #22aa22;
  --f-accent-bg-hover: #33cc33;
  --f-accent-dim: #113311;
  --f-author: #88ff88;
  --f-danger: #ff4444;
  --f-danger-bg: #330000;
}
.theme-terminal .fa-solid,
.theme-terminal .fa-robot {
  color: var(--f-accent);
}
.theme-light {
  --f-bg: #f3f4f6;
  --f-bg-card: #ffffff;
  --f-bg-input: #e5e7eb;
  --f-bg-hover: #d1d5db;
  --f-text: #111827;
  --f-text-secondary: #4b5563;
  --f-text-muted: #9ca3af;
  --f-border: #d1d5db;
  --f-border-hover: #9ca3af;
  --f-accent: #2563eb;
  --f-accent-bg: #2563eb;
  --f-accent-bg-hover: #1d4ed8;
  --f-accent-dim: #dbeafe;
  --f-author: #059669;
  --f-danger: #dc2626;
  --f-danger-bg: #fee2e2;
}
.forum-window {
  width: 100%;
  height: 100%;
}
</style>
