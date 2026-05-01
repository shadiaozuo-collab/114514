import { ref, computed, watchEffect, nextTick } from 'vue';
import { defineStore } from 'pinia';
import { klona } from 'klona';
import type { ForumPost, ForumComment } from './types';

const Timestamp = z.union([z.string(), z.number()]).transform(v => String(v));

const CommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  content: z.string(),
  timestamp: Timestamp,
  isAiGenerated: z.boolean(),
});

const PostSchema = z.object({
  id: z.string(),
  section: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  timestamp: Timestamp,
  comments: z.array(CommentSchema),
  isAiGenerated: z.boolean(),
});

const ApiPresetSchema = z.object({
  name: z.string(),
  proxyPreset: z.string().default(''),
  apiUrl: z.string().default(''),
  apiKey: z.string().default(''),
  apiSource: z.string().default(''),
  model: z.string().default(''),
});

const SectionConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
});

const defaultOutputFormat = `你必须严格按照以下JSON结构输出，不要添加、删除或重命名字段：

批量生成帖子时输出：
{
  "posts": [
    {
      "title": "帖子标题",
      "content": "帖子正文，50-150字，有具体细节",
      "authorId": "发帖人ID",
      "timestamp": "故事内时间，如 第三章·深夜",
      "comments": [
        { "authorId": "评论人ID", "content": "评论内容，20-80字", "timestamp": "故事内时间" }
      ]
    }
  ]
}

生成评论时输出：
{
  "comments": [
    { "authorId": "评论人ID", "content": "评论内容", "timestamp": "故事内时间" }
  ]
}

格式注意事项：
- 标题简短有力，像真实论坛标题
- 内容要有具体细节，不要太笼统
- 评论简洁直接，像真实网络评论
- timestamp 必须填故事内时间，不要用现实时间或留空
- 严格按上述JSON结构输出，不要输出其他任何文本`;

const defaultPromptA = `你是一个现实世界的网络论坛用户。请根据上下文生成论坛帖子和评论。
要求：
- 使用自然的网络用语风格
- 帖子主题围绕现实生活、社会话题、日常讨论
- 每个用户有独特的用户名和发言风格
- 评论应该有不同观点的碰撞
- 帖子内容应当与当前剧情有一定关联性
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultPromptB = `你是一个网游世界中的玩家。请根据游戏上下文生成游戏内论坛的帖子和评论。
要求：
- 使用游戏玩家术语和黑话
- 帖子主题围绕游戏攻略、装备讨论、副本组队、PK恩怨等
- 每个用户有独特的游戏ID和发言风格
- 评论应该体现不同等级、职业玩家的视角差异
- 适当提及游戏中的事件、版本更新、活动等
- 帖子内容应当与当前游戏剧情/事件有关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultAuthorIdPrompt = `生成的用户ID应符合论坛语境：网游风格ID（如：剑影无痕、暗夜刺客、小虾米、龙城飞将），或现实网络风格（如：路人甲、加班到天亮、咖啡续命中）。每个ID应有独特个性，避免过于普通。不要生成与主角相关的ID。`;

const SettingsSchema = z.object({
  ZforumName: z.string().default('Z论坛'),
  Zmodel: z.string().default(''),
  Ztheme: z.enum(['classic-dark', 'cyberpunk', 'vaporwave', 'terminal', 'light', 'parchment', 'dark-gold', 'custom']).default('classic-dark'),
  ZcustomBg: z.string().default('#111827'),
  ZcustomAccent: z.string().default('#60a5fa'),
  ZcustomText: z.string().default('#e5e7eb'),
  ZcustomCardBg: z.string().default('#1f2937'),

  // 旧字段保留兼容（迁移后不再使用）
  ZsectionAName: z.string().optional().transform(() => undefined),
  ZsectionBName: z.string().optional().transform(() => undefined),
  Zprompt_A: z.string().optional().transform(() => undefined),
  Zprompt_B: z.string().optional().transform(() => undefined),
  Zprompt_现实讨论: z.string().optional().transform(() => undefined),
  Zprompt_游戏中论坛: z.string().optional().transform(() => undefined),

  Zsections: z.array(SectionConfigSchema).default([
    { id: 'A', name: '现实讨论', prompt: defaultPromptA },
    { id: 'B', name: '游戏中论坛', prompt: defaultPromptB },
  ]),

  ZplayerForumId: z.string().default(''),
  ZauthorIdPrompt: z.string().default(defaultAuthorIdPrompt),
  ZoutputFormat: z.string().default(defaultOutputFormat),
  ZpostCountHint: z.coerce.number().default(3),
  ZcommentCountHint: z.coerce.number().default(3),
  ZdecentralizedMode: z.boolean().default(false),
  ZuseJsonSchema: z.boolean().default(true),
  Zposts: z.record(z.string(), z.array(PostSchema)).default({ A: [], B: [] }),
  ZenableInjectToChat: z.boolean().default(true),
  ZinjectPostCount: z.coerce.number().default(5),
  ZinjectChatHistoryCount: z.coerce.number().default(10),
  ZautoGenerateInterval: z.coerce.number().default(0),
  ZautoGenerateSection: z.string().default('all'),
  ZautoGenerateMode: z.enum(['sequential', 'merged']).default('sequential'),
  ZautoAiReply: z.boolean().default(false),
  ZincludePresetContext: z.boolean().default(true),
  ZbgImage: z.string().default(''),
  ZbgOpacity: z.coerce.number().min(0).max(100).default(30),
  ZbgBlur: z.coerce.number().min(0).max(20).default(0),
  ZproxyPreset: z.string().default(''),
  ZapiUrl: z.string().default(''),
  ZapiKey: z.string().default(''),
  ZapiSource: z.string().default(''),
  ZapiPresets: z.array(ApiPresetSchema).default([]),
  ZautoCleanEnabled: z.boolean().default(false),
  ZautoCleanThreshold: z.coerce.number().min(1).default(50),
  ZminReplyLength: z.coerce.number().min(0).default(30),
});

function migrateLegacySettings(vars: Record<string, any>) {
  const result = { ...vars };

  // 如果还没有 Zsections，从旧字段构建
  if (!result.Zsections) {
    const nameA = result.ZsectionAName || '现实讨论';
    const nameB = result.ZsectionBName || '游戏中论坛';
    const promptA = result.Zprompt_A || result.Zprompt_现实讨论 || defaultPromptA;
    const promptB = result.Zprompt_B || result.Zprompt_游戏中论坛 || defaultPromptB;
    result.Zsections = [
      { id: 'A', name: nameA, prompt: promptA },
      { id: 'B', name: nameB, prompt: promptB },
    ];
  }

  // Zposts 旧格式迁移（中文键名 → A/B）
  if (result.Zposts && typeof result.Zposts === 'object') {
    const posts = result.Zposts as Record<string, any>;
    const migrated: Record<string, any> = {};
    for (const [key, value] of Object.entries(posts)) {
      const normalizedKey = key === '现实讨论' ? 'A' : key === '游戏中论坛' ? 'B' : key;
      migrated[normalizedKey] = value;
    }
    result.Zposts = migrated;
  }

  // ZautoGenerateSection 旧格式迁移
  if (result.ZautoGenerateSection) {
    const v = result.ZautoGenerateSection;
    if (v === '现实讨论') result.ZautoGenerateSection = 'A';
    else if (v === '游戏中论坛') result.ZautoGenerateSection = 'B';
    else if (v === 'both') result.ZautoGenerateSection = 'all';
  }

  return result;
}

const varOption = { type: 'chat' as const };

try {
  registerVariableSchema(SettingsSchema, varOption);
} catch {}

export const useForumSettingsStore = defineStore('forum-settings', () => {
  let suppressSync = false;

  function loadVars() {
    try {
      const vars = getVariables(varOption);
      if (Object.keys(vars).some(k => k.startsWith('Z'))) return vars;
      const scriptVars = getVariables({ type: 'script', script_id: getScriptId() });
      if (Object.keys(scriptVars).some(k => k.startsWith('Z'))) return scriptVars;
    } catch {}
    return {};
  }

  const settings = ref(SettingsSchema.parse(migrateLegacySettings(loadVars())));

  watchEffect(() => {
    if (suppressSync) return;
    insertOrAssignVariables(klona(settings.value), varOption);
  });

  function addPost(post: ForumPost) {
    if (!settings.value.Zposts[post.section]) {
      settings.value.Zposts[post.section] = [];
    }
    settings.value.Zposts[post.section].unshift(post);
    if (settings.value.ZautoCleanEnabled) {
      const arr = settings.value.Zposts[post.section];
      const threshold = settings.value.ZautoCleanThreshold;
      while (arr.length > threshold) {
        arr.pop();
      }
    }
  }

  function addComment(sectionId: string, postId: string, comment: ForumComment) {
    const post = settings.value.Zposts[sectionId]?.find(p => p.id === postId);
    if (post) post.comments.push(comment);
  }

  function deletePost(sectionId: string, postId: string) {
    const arr = settings.value.Zposts[sectionId];
    if (!arr) return;
    const idx = arr.findIndex(p => p.id === postId);
    if (idx >= 0) arr.splice(idx, 1);
  }

  function clearAllForumVariables() {
    updateVariablesWith(vars => {
      for (const key of Object.keys(vars)) {
        if (key.startsWith('Z')) delete vars[key];
      }
      return vars;
    }, varOption);
    Object.assign(settings.value, SettingsSchema.parse({}));
    toastr.success('论坛变量已清除');
  }

  function reloadFromVars() {
    suppressSync = true;
    try {
      const vars = getVariables(varOption);
      const parsed = SettingsSchema.parse(migrateLegacySettings(vars));
      Object.assign(settings.value, parsed);
    } finally {
      nextTick(() => {
        suppressSync = false;
      });
    }
  }

  function getSectionName(sectionId: string) {
    return settings.value.Zsections.find(s => s.id === sectionId)?.name || sectionId;
  }

  function getSectionPrompt(sectionId: string) {
    return settings.value.Zsections.find(s => s.id === sectionId)?.prompt || '';
  }

  function addSection(name: string, prompt: string) {
    if (settings.value.Zsections.length >= 5) {
      toastr.warning('板块数量已达上限（5个）');
      return;
    }
    const id = 'sec' + Date.now().toString(36);
    settings.value.Zsections.push({ id, name, prompt });
    settings.value.Zposts[id] = settings.value.Zposts[id] || [];
  }

  function removeSection(sectionId: string) {
    if (settings.value.Zsections.length <= 1) {
      toastr.warning('至少保留一个板块');
      return;
    }
    const idx = settings.value.Zsections.findIndex(s => s.id === sectionId);
    if (idx >= 0) {
      settings.value.Zsections.splice(idx, 1);
      delete settings.value.Zposts[sectionId];
    }
  }

  function applyApiPreset(name: string) {
    const preset = settings.value.ZapiPresets.find(p => p.name === name);
    if (!preset) return;
    settings.value.ZproxyPreset = preset.proxyPreset;
    settings.value.ZapiUrl = preset.apiUrl;
    settings.value.ZapiKey = preset.apiKey;
    settings.value.ZapiSource = preset.apiSource;
    settings.value.Zmodel = preset.model;
  }

  function saveApiPreset(name: string) {
    const idx = settings.value.ZapiPresets.findIndex(p => p.name === name);
    const preset = {
      name,
      proxyPreset: settings.value.ZproxyPreset,
      apiUrl: settings.value.ZapiUrl,
      apiKey: settings.value.ZapiKey,
      apiSource: settings.value.ZapiSource,
      model: settings.value.Zmodel,
    };
    if (idx >= 0) {
      settings.value.ZapiPresets[idx] = preset;
    } else {
      settings.value.ZapiPresets.push(preset);
    }
  }

  function deleteApiPreset(name: string) {
    const idx = settings.value.ZapiPresets.findIndex(p => p.name === name);
    if (idx >= 0) settings.value.ZapiPresets.splice(idx, 1);
  }

  function forceSync() {
    insertOrAssignVariables(klona(settings.value), varOption);
  }

  return {
    settings,
    addPost,
    addComment,
    deletePost,
    clearAllForumVariables,
    reloadFromVars,
    getSectionName,
    getSectionPrompt,
    addSection,
    removeSection,
    applyApiPreset,
    saveApiPreset,
    deleteApiPreset,
    forceSync,
  };
});

export const useForumUiStore = defineStore('forum-ui', () => {
  const settingsStore = useForumSettingsStore();
  const activeSection = ref<string>('A');
  const selectedPostId = ref<string | null>(null);
  const isGenerating = ref(false);
  const showEditor = ref(false);
  const showGenDialog = ref(false);
  const editorMode = ref<'post' | 'comment'>('post');

  const currentPosts = computed(() => settingsStore.settings.Zposts[activeSection.value] || []);
  const selectedPost = computed(() => {
    if (!selectedPostId.value) return null;
    return currentPosts.value.find(p => p.id === selectedPostId.value) ?? null;
  });
  const activeSectionName = computed(() => settingsStore.getSectionName(activeSection.value));

  function switchSection(sectionId: string) {
    activeSection.value = sectionId;
    selectedPostId.value = null;
  }

  function selectPost(id: string) {
    selectedPostId.value = id;
  }

  function goBack() {
    selectedPostId.value = null;
  }

  function deletePost(postId: string) {
    settingsStore.deletePost(activeSection.value, postId);
    if (selectedPostId.value === postId) selectedPostId.value = null;
  }

  function openPostEditor() {
    editorMode.value = 'post';
    showEditor.value = true;
  }

  function openCommentEditor() {
    editorMode.value = 'comment';
    showEditor.value = true;
  }

  function closeEditor() {
    showEditor.value = false;
  }

  function openGenDialog() {
    showGenDialog.value = true;
  }

  function closeGenDialog() {
    showGenDialog.value = false;
  }

  return {
    activeSection,
    selectedPostId,
    isGenerating,
    showEditor,
    showGenDialog,
    editorMode,
    currentPosts,
    selectedPost,
    activeSectionName,
    switchSection,
    selectPost,
    goBack,
    deletePost,
    openPostEditor,
    openCommentEditor,
    closeEditor,
    openGenDialog,
    closeGenDialog,
  };
});
