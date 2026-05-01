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
  section: z.enum(['A', 'B', '现实讨论', '游戏中论坛']).transform(v =>
    v === '现实讨论' ? 'A' : v === '游戏中论坛' ? 'B' : v,
  ),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  timestamp: Timestamp,
  comments: z.array(CommentSchema),
  isAiGenerated: z.boolean(),
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
  Ztheme: z.enum(['classic-dark', 'cyberpunk', 'vaporwave', 'terminal', 'light', 'custom']).default('classic-dark'),
  ZcustomBg: z.string().default('#111827'),
  ZcustomAccent: z.string().default('#60a5fa'),
  ZcustomText: z.string().default('#e5e7eb'),
  ZcustomCardBg: z.string().default('#1f2937'),
  ZsectionAName: z.string().default('现实讨论'),
  ZsectionBName: z.string().default('游戏中论坛'),
  ZplayerForumId: z.string().default(''),
  ZauthorIdPrompt: z.string().default(defaultAuthorIdPrompt),
  Zprompt_A: z.string().default(defaultPromptA),
  Zprompt_B: z.string().default(defaultPromptB),
  Zprompt_现实讨论: z.string().optional().transform(v => v),
  Zprompt_游戏中论坛: z.string().optional().transform(v => v),
  ZoutputFormat: z.string().default(defaultOutputFormat),
  ZpostCountHint: z.coerce.number().default(3),
  ZcommentCountHint: z.coerce.number().default(3),
  ZdecentralizedMode: z.boolean().default(false),
  Zposts: z.object({
    现实讨论: z.array(PostSchema).optional(),
    游戏中论坛: z.array(PostSchema).optional(),
    A: z.array(PostSchema).optional(),
    B: z.array(PostSchema).optional(),
  }).transform(v => ({
    A: v.A || v['现实讨论'] || [],
    B: v.B || v['游戏中论坛'] || [],
  })).default({ A: [], B: [] }),
  ZenableInjectToChat: z.boolean().default(true),
  ZinjectPostCount: z.coerce.number().default(5),
  ZinjectChatHistoryCount: z.coerce.number().default(10),
  ZautoGenerateInterval: z.coerce.number().default(0),
  ZautoGenerateSection: z.enum(['A', 'B', '现实讨论', '游戏中论坛']).transform(v =>
    v === '现实讨论' ? 'A' : v === '游戏中论坛' ? 'B' : v,
  ).default('B'),
  ZautoAiReply: z.boolean().default(false),
  ZincludePresetContext: z.boolean().default(true),
  ZbgImage: z.string().default(''),
  ZbgOpacity: z.coerce.number().min(0).max(100).default(30),
  ZbgBlur: z.coerce.number().min(0).max(20).default(0),
});

function migrateLegacySettings(vars: Record<string, any>) {
  const result = { ...vars };
  if (result.Zprompt_现实讨论 && !result.Zprompt_A) result.Zprompt_A = result.Zprompt_现实讨论;
  if (result.Zprompt_游戏中论坛 && !result.Zprompt_B) result.Zprompt_B = result.Zprompt_游戏中论坛;
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
    settings.value.Zposts[post.section].unshift(post);
  }

  function addComment(section: 'A' | 'B', postId: string, comment: ForumComment) {
    const post = settings.value.Zposts[section].find(p => p.id === postId);
    if (post) post.comments.push(comment);
  }

  function deletePost(section: 'A' | 'B', postId: string) {
    const arr = settings.value.Zposts[section];
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

  function getSectionName(section: 'A' | 'B') {
    return section === 'A' ? settings.value.ZsectionAName : settings.value.ZsectionBName;
  }

  function getPromptKey(section: 'A' | 'B') {
    return section === 'A' ? 'Zprompt_A' : 'Zprompt_B';
  }

  return {
    settings,
    addPost,
    addComment,
    deletePost,
    clearAllForumVariables,
    reloadFromVars,
    getSectionName,
    getPromptKey,
  };
});

export const useForumUiStore = defineStore('forum-ui', () => {
  const settingsStore = useForumSettingsStore();
  const activeSection = ref<'A' | 'B'>('A');
  const selectedPostId = ref<string | null>(null);
  const isGenerating = ref(false);
  const showEditor = ref(false);
  const showGenDialog = ref(false);
  const editorMode = ref<'post' | 'comment'>('post');

  const currentPosts = computed(() => settingsStore.settings.Zposts[activeSection.value]);
  const selectedPost = computed(() => {
    if (!selectedPostId.value) return null;
    return currentPosts.value.find(p => p.id === selectedPostId.value) ?? null;
  });
  const activeSectionName = computed(() => settingsStore.getSectionName(activeSection.value));

  function switchSection(section: 'A' | 'B') {
    activeSection.value = section;
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
