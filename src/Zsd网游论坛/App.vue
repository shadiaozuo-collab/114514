<template>
  <div
    class="forum-window relative flex flex-col text-[var(--f-text)] h-full overflow-hidden"
    :class="`theme-${settingsStore.settings.Ztheme}`"
    :style="{ backgroundColor: 'var(--f-bg)', color: 'var(--f-text)', ...customThemeVars }"
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
    <!-- 全局生成中提示 -->
    <div
      v-if="forumStore.isGenerating"
      class="shrink-0 flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-medium"
      :style="{ backgroundColor: 'var(--f-accent-bg)', color: '#fff' }"
    >
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>AI 正在生成内容，请稍候…</span>
    </div>
    <ForumTabs
      :active-section="forumStore.activeSection"
      @switch="forumStore.switchSection($event)"
      @toggle-settings="showSettings = !showSettings"
      @close="requestClose"
    />

    <!-- 论坛板块 -->
    <PostList
      v-if="currentSectionType === 'forum' && !forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
      :posts="forumStore.currentPosts"
      @select="forumStore.selectPost($event)"
      @delete="forumStore.deletePost($event)"
    />
    <PostDetail
      v-else-if="currentSectionType === 'forum' && forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
      :post="forumStore.selectedPost"
      :generating="forumStore.isGenerating"
      @back="forumStore.goBack()"
      @generate-comments="handleGenerateComments"
      @add-comment="forumStore.openCommentEditor()"
      @delete="handleDeletePost"
    />

    <!-- 赛事板块 -->
    <div v-if="currentSectionType === 'tournament' && !forumStore.selectedPostId && !forumStore.showEditor && !showSettings" class="flex-1 overflow-y-auto p-2 space-y-2">
      <div v-if="forumStore.currentPosts.length === 0" class="text-center text-[var(--f-text-muted)] text-xs py-8">
        <span class="font-bold">暂无比赛记录，点击下方按钮生成</span>
      </div>
      <TournamentCard
        v-for="post in forumStore.currentPosts"
        :key="post.id"
        :post="post"
        @click="forumStore.selectPost(post.id)"
        @delete="forumStore.deletePost($event)"
      />
    </div>
    <TournamentDetail
      v-else-if="currentSectionType === 'tournament' && forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
      :post="forumStore.selectedPost"
      :generating="forumStore.isGenerating"
      @back="forumStore.goBack()"
      @generate-comments="handleGenerateComments"
      @add-comment="forumStore.openCommentEditor()"
      @delete="handleDeletePost"
    />

    <!-- 报纸板块 -->
    <div v-if="currentSectionType === 'newspaper' && !forumStore.selectedPostId && !forumStore.showEditor && !showSettings" class="flex-1 overflow-y-auto p-2 space-y-2">
      <div v-if="forumStore.currentPosts.length === 0" class="text-center text-[var(--f-text-muted)] text-xs py-8">
        <span class="font-bold">暂无报纸，点击下方按钮生成</span>
      </div>
      <NewspaperCard
        v-for="post in forumStore.currentPosts"
        :key="post.id"
        :post="post"
        @click="forumStore.selectPost(post.id)"
        @delete="forumStore.deletePost($event)"
      />
    </div>
    <NewspaperDetail
      v-else-if="currentSectionType === 'newspaper' && forumStore.selectedPostId && !forumStore.showEditor && !showSettings"
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
        @click="openGenDialog()"
      >
        <i :class="forumStore.isGenerating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-robot'"></i>
        {{ forumStore.isGenerating ? '生成中...' : genButtonText }}
      </button>
      <button
        class="text-[11px] px-3 py-1.5 rounded bg-[var(--f-bg-input)] hover:bg-[var(--f-bg-hover)] text-[var(--f-text)]"
        :disabled="forumStore.isGenerating"
        @click="forumStore.openPostEditor()"
      >
        <i class="fa-solid fa-pen"></i> {{ postButtonText }}
      </button>
    </div>

    <!-- 生成对话框 -->
    <div v-if="forumStore.showGenDialog && !showSettings" class="absolute inset-0 z-20 flex flex-col p-3" :style="{ backgroundColor: 'var(--f-bg)' }">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-bold text-[var(--f-text)]">
          <i class="fa-solid fa-robot text-[var(--f-accent)]"></i> {{ genDialogTitle }}
        </span>
        <button class="text-[var(--f-text-secondary)] hover:text-[var(--f-text)]" @click="forumStore.closeGenDialog()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="space-y-3 flex-1 overflow-y-auto">
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">生成模式</label>
          <div class="flex gap-2 text-[11px]">
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="genMode" type="radio" value="single" class="accent-[var(--f-accent)]">
              <span>仅当前板块</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="genMode" type="radio" value="merged" class="accent-[var(--f-accent)]">
              <span>合并生成</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="genMode" type="radio" value="sequential" class="accent-[var(--f-accent)]">
              <span>独立生成</span>
            </label>
          </div>
          <p v-if="genMode === 'merged' && settingsStore.settings.Zsections.length > 3" class="text-[10px] text-[var(--f-danger)] mt-1">
            <i class="fa-solid fa-triangle-exclamation"></i> 板块超过3个时，合并生成可能不可靠，建议使用独立生成
          </p>
        </div>
        <div v-if="genMode !== 'single'">
          <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">选择板块</label>
          <div class="flex flex-wrap gap-2 text-[11px]">
            <label v-for="sec in settingsStore.settings.Zsections" :key="sec.id" class="flex items-center gap-1 cursor-pointer">
              <input
                v-model="selectedSections"
                type="checkbox"
                :value="sec.id"
                class="accent-[var(--f-accent)]"
              >
              <span>{{ sec.name }}</span>
            </label>
          </div>
        </div>
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
      </div>
      <button
        class="w-full text-xs text-white py-2 rounded disabled:opacity-50 mt-2 flex items-center justify-center gap-1 transition-colors"
        :class="forumStore.isGenerating ? 'bg-[var(--f-bg-input)] cursor-wait' : 'bg-[var(--f-accent-bg)] hover:bg-[var(--f-accent-bg-hover)]'"
        :disabled="forumStore.isGenerating || (genMode !== 'single' && selectedSections.length === 0)"
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
import { ref, inject, computed, watch } from 'vue';
import type { ForumPost, ForumComment } from './types';
import { useForumSettingsStore, useForumUiStore } from './settings';
import { generatePosts, generatePostsMerged, generatePostsSequential, generateComments, injectForumContext } from './aiGenerator';
import ForumTabs from './ForumTabs.vue';
import PostList from './PostList.vue';
import PostDetail from './PostDetail.vue';
import TournamentCard from './TournamentCard.vue';
import TournamentDetail from './TournamentDetail.vue';
import NewspaperCard from './NewspaperCard.vue';
import NewspaperDetail from './NewspaperDetail.vue';
import PostEditor from './PostEditor.vue';
import SettingsPanel from './SettingsPanel.vue';

const settingsStore = useForumSettingsStore();
const forumStore = useForumUiStore();

const showSettings = ref(false);
const genTopic = ref('');
const genMode = ref<'single' | 'merged' | 'sequential'>('single');
const selectedSections = ref<string[]>([forumStore.activeSection]);

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

const customThemeVars = computed(() => {
  if (settingsStore.settings.Ztheme !== 'custom') return {};
  const { ZcustomBg, ZcustomAccent, ZcustomText, ZcustomCardBg } = settingsStore.settings;
  return {
    '--f-bg': ZcustomBg,
    '--f-text': ZcustomText,
    '--f-accent': ZcustomAccent,
    '--f-bg-card': ZcustomCardBg,
    '--f-accent-bg': ZcustomAccent,
    '--f-accent-bg-hover': ZcustomAccent,
    '--f-accent-dim': ZcustomBg,
    '--f-text-secondary': ZcustomText,
    '--f-text-muted': ZcustomText,
    '--f-author': ZcustomAccent,
    '--f-border': ZcustomText,
    '--f-border-hover': ZcustomAccent,
    '--f-bg-input': ZcustomCardBg,
    '--f-bg-hover': ZcustomCardBg,
    '--f-danger': '#f87171',
    '--f-danger-bg': '#7f1d1d',
  } as Record<string, string>;
});

const currentSectionType = computed(() => settingsStore.getSectionType(forumStore.activeSection));

const genButtonText = computed(() => {
  if (currentSectionType.value === 'tournament') return 'AI生成比赛';
  if (currentSectionType.value === 'newspaper') return 'AI生成报纸';
  return 'AI生成帖子';
});

const postButtonText = computed(() => {
  if (currentSectionType.value === 'tournament') return '添加比赛';
  if (currentSectionType.value === 'newspaper') return '发报纸';
  return '发帖';
});

const genDialogTitle = computed(() => {
  if (currentSectionType.value === 'tournament') return 'AI 批量生成比赛';
  if (currentSectionType.value === 'newspaper') return 'AI 批量生成报纸';
  return 'AI 批量生成帖子';
});

const windowControls = inject<{ requestClose: boolean }>('windowControls')!;

function requestClose() {
  if (windowControls) windowControls.requestClose = true;
}

function openGenDialog() {
  genMode.value = 'single';
  selectedSections.value = [forumStore.activeSection];
  forumStore.openGenDialog();
}

async function handleBatchGenerate() {
  forumStore.isGenerating = true;
  try {
    const topic = genTopic.value.trim() || undefined;
    let resultMap: Record<string, ForumPost[]>;

    if (genMode.value === 'single') {
      const posts = await generatePosts(forumStore.activeSection, topic);
      resultMap = { [forumStore.activeSection]: posts };
    } else if (genMode.value === 'merged') {
      const sections = selectedSections.value.length > 0 ? selectedSections.value : [forumStore.activeSection];
      resultMap = await generatePostsMerged(sections, topic);
    } else {
      const sections = selectedSections.value.length > 0 ? selectedSections.value : [forumStore.activeSection];
      resultMap = await generatePostsSequential(sections, topic);
    }

    let totalCount = 0;
    for (const [sectionId, posts] of Object.entries(resultMap)) {
      for (const post of posts) {
        settingsStore.addPost(post);
      }
      totalCount += posts.length;
    }
    injectForumContext();
    toastr.success(`AI生成了${totalCount}个帖子`);
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
  } catch (e: any) {
    console.warn('[网游论坛] 自动AI回复失败:', e);
    toastr.error(`自动AI回复失败：${e?.message || e}`);
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
.theme-classic-dark .forum-window {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
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
.theme-cyberpunk .forum-window {
  text-shadow: 0 0 10px rgba(0,255,255,0.06);
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
.theme-vaporwave .forum-window {
  background: linear-gradient(
    180deg,
    rgba(255,113,206,0.05) 0%,
    transparent 25%,
    rgba(185,103,255,0.03) 50%,
    transparent 75%,
    rgba(255,113,206,0.04) 100%
  );
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
.theme-terminal .forum-window {
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(51,255,51,0.015) 2px,
    rgba(51,255,51,0.015) 4px
  );
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
.theme-light .forum-window {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}
.theme-dark-gold {
  --f-bg: #0d0d0d;
  --f-bg-card: #171714;
  --f-bg-input: #252520;
  --f-bg-hover: #33332c;
  --f-text: #e8dcc8;
  --f-text-secondary: #a09078;
  --f-text-muted: #6b5e4e;
  --f-border: #3a3020;
  --f-border-hover: #5a4a30;
  --f-accent: #c9a84c;
  --f-accent-bg: #b08d38;
  --f-accent-bg-hover: #c9a84c;
  --f-accent-dim: #2a2410;
  --f-author: #d4a574;
  --f-danger: #b54a3a;
  --f-danger-bg: #3d1a14;
}
.theme-dark-gold .forum-window {
  box-shadow:
    inset 0 1px 0 rgba(201,168,76,0.08),
    inset 0 -1px 0 rgba(0,0,0,0.4);
}
.theme-dark-gold .fa-solid,
.theme-dark-gold .fa-robot {
  color: var(--f-accent);
  text-shadow: 0 0 6px rgba(201,168,76,0.25);
}
.theme-parchment {
  --f-bg: #ddd5c5;
  --f-bg-card: #d0c8b8;
  --f-bg-input: #c8c0b0;
  --f-bg-hover: #c0b8a8;
  --f-text: #362618;
  --f-text-secondary: #5c4a32;
  --f-text-muted: #887a64;
  --f-border: #c0b8a0;
  --f-border-hover: #b4ac90;
  --f-accent: #7a5a10;
  --f-accent-bg: #7a5a10;
  --f-accent-bg-hover: #8f6e18;
  --f-accent-dim: #e8e0d0;
  --f-author: #4a6830;
  --f-danger: #9c3a2a;
  --f-danger-bg: #ead8d0;
}
.theme-parchment .forum-window {
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at center, transparent 50%, rgba(54,38,24,0.04) 100%);
}
.forum-window {
  width: 100%;
  height: 100%;
}
</style>
