import type { ForumSettings, ForumPost, ForumComment, ForumSection } from '../types';
import { DEFAULT_PROMPT_A, DEFAULT_PROMPT_B, DEFAULT_OUTPUT_FORMAT, DEFAULT_DECENTRALIZED_PROMPT, DEFAULT_AUTHOR_ID_PROMPT } from '../types';

// ─── 存储配置 ────────────────────────────────────────────
// 关键：使用 { type: 'chat' } 而非 { type: 'script' }
// - 脚本变量 (script): 绑定在脚本上，所有聊天共享 → 不适合论坛数据
// - 聊天变量 (chat): 绑定在某角色卡的某个聊天文件上 → 每个对话独立
const VAR_OPTION = { type: 'chat' as const };

// timestamp 兼容：允许旧数据为 number，自动转为空字符串
const TimestampCompat = z.union([z.string(), z.number()]).transform(v => String(v));

const ForumCommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  content: z.string(),
  timestamp: TimestampCompat,
  isAiGenerated: z.boolean(),
});

const ForumPostSchema = z.object({
  id: z.string(),
  section: z.enum(['A', 'B', '现实讨论', '游戏中论坛']).transform(v => {
    if (v === '现实讨论') return 'A' as const;
    if (v === '游戏中论坛') return 'B' as const;
    return v as 'A' | 'B';
  }),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  timestamp: TimestampCompat,
  comments: z.array(ForumCommentSchema),
  isAiGenerated: z.boolean(),
});

const ForumSettingsSchema = z.object({
  ZforumName: z.string().default('Z论坛'),
  Zmodel: z.string().default(''),
  Ztheme: z.enum(['classic-dark', 'cyberpunk', 'vaporwave', 'terminal', 'light']).default('classic-dark'),
  ZsectionAName: z.string().default('现实讨论'),
  ZsectionBName: z.string().default('游戏中论坛'),
  ZplayerForumId: z.string().default(''),
  ZauthorIdPrompt: z.string().default(DEFAULT_AUTHOR_ID_PROMPT),
  Zprompt_A: z.string().default(DEFAULT_PROMPT_A),
  Zprompt_B: z.string().default(DEFAULT_PROMPT_B),
  // 兼容旧字段：如果存在旧字段则迁移到新字段
  Zprompt_现实讨论: z.string().optional().transform(v => v),
  Zprompt_游戏中论坛: z.string().optional().transform(v => v),
  ZoutputFormat: z.string().default(DEFAULT_OUTPUT_FORMAT),
  ZpostCountHint: z.coerce.number().default(3),
  ZcommentCountHint: z.coerce.number().default(3),
  ZdecentralizedMode: z.boolean().default(false),
  Zposts: z.object({
    '现实讨论': z.array(ForumPostSchema).optional(),
    '游戏中论坛': z.array(ForumPostSchema).optional(),
    'A': z.array(ForumPostSchema).optional(),
    'B': z.array(ForumPostSchema).optional(),
  }).transform(obj => {
    const aPosts = obj.A || obj['现实讨论'] || [];
    const bPosts = obj.B || obj['游戏中论坛'] || [];
    return { 'A': aPosts, 'B': bPosts } as Record<ForumSection, ForumPost[]>;
  }).default({ 'A': [], 'B': [] }),
  ZenableInjectToChat: z.boolean().default(true),
  ZinjectPostCount: z.coerce.number().default(5),
  ZinjectChatHistoryCount: z.coerce.number().default(10),
  ZautoGenerateInterval: z.coerce.number().default(0),
  ZautoGenerateSection: z.enum(['A', 'B', '现实讨论', '游戏中论坛']).transform(v => {
    if (v === '现实讨论') return 'A' as const;
    if (v === '游戏中论坛') return 'B' as const;
    return v as 'A' | 'B';
  }).default('B'),
  ZautoAiReply: z.boolean().default(false),
});

export { ForumSettingsSchema, DEFAULT_DECENTRALIZED_PROMPT };

/** 迁移旧变量名数据到新字段 */
function migrateLegacyVars(vars: Record<string, any>): Record<string, any> {
  const migrated = { ...vars };
  if (migrated['Zprompt_现实讨论'] && !migrated['Zprompt_A']) {
    migrated['Zprompt_A'] = migrated['Zprompt_现实讨论'];
  }
  if (migrated['Zprompt_游戏中论坛'] && !migrated['Zprompt_B']) {
    migrated['Zprompt_B'] = migrated['Zprompt_游戏中论坛'];
  }
  return migrated;
}

/**
 * 初始数据加载策略：
 * 1. 优先读取聊天变量（每个聊天独立）
 * 2. 如果聊天变量没有论坛数据，尝试从旧的脚本变量迁移（一次性）
 * 3. 都没有则使用默认值
 */
function loadInitialData(): Record<string, any> {
  // 1. 读取聊天变量
  const chatVars = getVariables(VAR_OPTION);
  if (Object.keys(chatVars).some(k => k.startsWith('Z'))) {
    return chatVars;
  }

  // 2. 尝试从旧的脚本变量迁移
  try {
    const scriptVars = getVariables({ type: 'script', script_id: getScriptId() });
    if (Object.keys(scriptVars).some(k => k.startsWith('Z'))) {
      return scriptVars;
    }
  } catch {
    // getScriptId() 可能在某些上下文中不可用，忽略
  }

  // 3. 使用默认值
  return {};
}

// 注册变量结构到变量管理器，让用户可以在管理器中查看和管理论坛变量
try {
  registerVariableSchema(ForumSettingsSchema, { type: 'chat' });
} catch {
  // 注册失败不影响功能
}

export const useSettingsStore = defineStore('forumSettings', () => {
  /** 是否正在从变量加载数据（阻止 watchEffect 回写） */
  let isLoadingFromVars = false;

  const settings = ref<ForumSettings>(
    ForumSettingsSchema.parse(
      migrateLegacyVars(loadInitialData()),
    ) as ForumSettings,
  );

  // 关键：必须始终访问 settings.value 以维持响应式依赖追踪
  // 使用 insertOrAssignVariables（非 replaceVariables）避免删除其他聊天的变量
  watchEffect(() => {
    const data = klona(settings.value);
    if (isLoadingFromVars) return;
    insertOrAssignVariables(data as Record<string, any>, VAR_OPTION);
  });

  /** 从聊天变量重新加载数据（用于 CHAT_CHANGED 后刷新） */
  function reloadFromVars() {
    isLoadingFromVars = true;
    try {
      const raw = getVariables(VAR_OPTION);
      const parsed = ForumSettingsSchema.parse(migrateLegacyVars(raw)) as ForumSettings;
      Object.assign(settings.value, parsed);
    } finally {
      nextTick(() => {
        isLoadingFromVars = false;
      });
    }
  }

  function addPost(post: ForumPost) {
    settings.value.Zposts[post.section].unshift(post);
  }

  function addComment(section: ForumSection, postId: string, comment: ForumComment) {
    const post = settings.value.Zposts[section].find(p => p.id === postId);
    if (post) {
      post.comments.push(comment);
    }
  }

  function deletePost(section: ForumSection, postId: string) {
    const idx = settings.value.Zposts[section].findIndex(p => p.id === postId);
    if (idx >= 0) {
      settings.value.Zposts[section].splice(idx, 1);
    }
  }

  /** 获取板块的显示名称 */
  function getSectionName(section: ForumSection): string {
    return section === 'A' ? settings.value.ZsectionAName : settings.value.ZsectionBName;
  }

  /** 获取板块的提示词字段 key */
  function getPromptKey(section: ForumSection): 'Zprompt_A' | 'Zprompt_B' {
    return section === 'A' ? 'Zprompt_A' : 'Zprompt_B';
  }

  /** 一键清除论坛相关的所有聊天变量 */
  function clearAllForumVariables() {
    // 使用 updateVariablesWith 原子地删除 Z 前缀变量，不影响其他聊天变量
    updateVariablesWith(vars => {
      for (const key of Object.keys(vars)) {
        if (key.startsWith('Z')) {
          delete vars[key];
        }
      }
      return vars;
    }, VAR_OPTION);
    // 重新加载默认设置
    const defaults = ForumSettingsSchema.parse({});
    Object.assign(settings.value, defaults);
    toastr.success('论坛变量已清除');
  }

  return { settings, addPost, addComment, deletePost, clearAllForumVariables, reloadFromVars, getSectionName, getPromptKey };
});
