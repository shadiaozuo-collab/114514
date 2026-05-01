import { useForumSettingsStore } from './settings';
import type { ForumPost, ForumComment } from './types';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function buildContext(forumName: string, sectionName: string, posts: ForumPost[], injectCount: number) {
  const recent = posts.slice(0, injectCount);
  if (recent.length === 0) return '';
  let text = `[${forumName} - ${sectionName}]\n`;
  for (const post of recent) {
    text += `\n[${post.timestamp}] 帖子: 【${post.title}】 by ${post.authorId}\n${post.content}\n`;
    if (post.comments.length > 0) {
      text += '评论: ';
      text += post.comments.slice(0, 5).map(c => `[${c.timestamp}] ${c.authorId}: ${c.content}`).join(' | ');
      text += '\n';
    }
  }
  return text;
}

function makePostItemSchema(commentCount: number) {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: '帖子标题' },
      content: { type: 'string', description: '帖子正文内容' },
      authorId: { type: 'string', description: '发帖玩家ID' },
      timestamp: { type: 'string', description: '故事内时间' },
      comments: {
        type: 'array',
        description: `帖子下的评论，${commentCount}条左右`,
        items: {
          type: 'object',
          properties: {
            authorId: { type: 'string', description: '评论玩家ID' },
            content: { type: 'string', description: '评论内容' },
            timestamp: { type: 'string', description: '故事内时间' },
          },
          required: ['authorId', 'content', 'timestamp'],
        },
      },
    },
    required: ['title', 'content', 'authorId', 'timestamp', 'comments'],
  };
}

export function postBatchSchema(postCount: number, commentCount: number) {
  return {
    name: 'forum_posts_batch',
    value: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          description: `生成的帖子列表，${postCount}个左右`,
          items: makePostItemSchema(commentCount),
        },
      },
      required: ['posts'],
    },
  };
}

export function bothSectionsBatchSchema(postCount: number, commentCount: number) {
  const item = makePostItemSchema(commentCount);
  return {
    name: 'forum_posts_both_sections',
    value: {
      type: 'object',
      properties: {
        A: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: `板块A的帖子列表，${postCount}个左右`,
              items: item,
            },
          },
          required: ['posts'],
        },
        B: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: `板块B的帖子列表，${postCount}个左右`,
              items: item,
            },
          },
          required: ['posts'],
        },
      },
      required: ['A', 'B'],
    },
  };
}

export function commentSchema(count: number) {
  return {
    name: 'forum_comment',
    value: {
      type: 'object',
      properties: {
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              authorId: { type: 'string', description: '评论玩家ID' },
              content: { type: 'string', description: '评论内容' },
              timestamp: { type: 'string', description: '故事内时间' },
            },
            required: ['authorId', 'content', 'timestamp'],
          },
          description: `生成的评论列表，${count}条左右`,
        },
      },
      required: ['comments'],
    },
  };
}

function buildSystemPrompt(
  promptBase: string,
  outputFormat: string,
  decentralizedMode: boolean,
  authorIdPrompt: string,
  playerForumId: string,
  postCount?: number,
  commentCount?: number,
) {
  let prompt = promptBase;
  if (outputFormat.trim()) prompt += '\n\n' + outputFormat.trim();
  if (postCount !== undefined && commentCount !== undefined) {
    prompt += `\n\n本次生成要求：约${postCount}个帖子，每个帖子约${commentCount}条评论。`;
  } else if (commentCount !== undefined) {
    prompt += `\n\n本次生成要求：约${commentCount}条评论。`;
  }
  if (authorIdPrompt.trim()) prompt += `\n\n【用户ID生成规则】${authorIdPrompt.trim()}`;
  if (playerForumId.trim()) prompt += `\n\n【玩家ID】当前故事的主角在论坛中的ID是"${playerForumId.trim()}"，如果有玩家角色参与的帖子或评论，使用此ID。`;
  if (decentralizedMode) {
    prompt += '\n\n【去中心化模式】注意：论坛内容不应只围绕主角或主角的社交圈。大部分帖子应该是由与主角无关的普通论坛用户发起的，反映更广泛的世界动态、其他玩家的日常讨论、边缘话题等。只有少数帖子可以与主角相关。';
  }
  return prompt;
}

function buildCustomApi(settings: any): Record<string, any> {
  const customApi: Record<string, any> = {};
  if (settings.Zmodel) customApi.model = settings.Zmodel;
  if (settings.ZproxyPreset) {
    customApi.proxy_preset = settings.ZproxyPreset;
  } else {
    if (settings.ZapiUrl) customApi.apiurl = settings.ZapiUrl;
    if (settings.ZapiKey) customApi.key = settings.ZapiKey;
  }
  if (settings.ZapiSource) customApi.source = settings.ZapiSource;
  return customApi;
}

function parseRawPosts(rawPosts: any[], section: 'A' | 'B', sourceMessageIndex?: number): ForumPost[] {
  return (rawPosts || []).map((post: any) => ({
    id: generateId(),
    section,
    title: post.title || '无标题',
    content: post.content || '',
    authorId: post.authorId || '匿名用户',
    timestamp: post.timestamp || '',
    comments: (post.comments || []).map((c: any) => ({
      id: generateId(),
      authorId: c.authorId || '匿名用户',
      content: c.content || '',
      timestamp: c.timestamp || '',
      isAiGenerated: true,
    })),
    isAiGenerated: true,
    sourceMessageIndex,
  }));
}

/** 将本轮生成的帖子ID记录到当前AI消息的extra中，用于后续回退同步 */
/** 安全解析AI返回的JSON，处理HTML错误页、Markdown代码块等边缘情况 */
function safeJsonParse(raw: string): any {
  const text = String(raw || '').trim();

  // 1. 如果返回的是HTML错误页，直接抛出友好错误
  if (text.startsWith('<')) {
    const preview = text.substring(0, 200).replace(/\s+/g, ' ');
    throw new Error(`API返回了HTML页面而非JSON，可能是API配置错误或服务器故障。预览: ${preview}`);
  }

  // 2. 尝试从Markdown代码块中提取JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e: any) {
    // 4. 尝试去掉首尾的非JSON字符（如引号、换行等）
    const cleaned = text.replace(/^[^{\[]+/, '').replace(/[^}\]]+$/, '');
    if (cleaned !== text) {
      try {
        return JSON.parse(cleaned);
      } catch {}
    }
    throw new Error(`AI返回的内容无法解析为JSON。原始内容前200字符: ${text.substring(0, 200)}`);
  }
}

function recordPostIdsToMessage(postsA: ForumPost[], postsB: ForumPost[]) {
  try {
    const ctx = SillyTavern.getContext();
    const chat = ctx.chat;
    if (!chat || chat.length === 0) return;
    const lastMsg = chat[chat.length - 1];
    if (lastMsg.is_user) return;
    lastMsg.extra = lastMsg.extra || {};
    lastMsg.extra.zsdForumGeneration = {
      at: Date.now(),
      postsA: postsA.map(p => p.id),
      postsB: postsB.map(p => p.id),
    };
  } catch (e) {
    console.warn('[网游论坛] 记录帖子关联失败:', e);
  }
}

export async function generatePosts(section: 'A' | 'B', topic?: string) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const promptKey = store.getPromptKey(section);
  const sectionName = store.getSectionName(section);
  const postCount = settings.ZpostCountHint;
  const commentCount = settings.ZcommentCountHint;
  const systemPrompt = buildSystemPrompt(
    settings[promptKey as 'Zprompt_A' | 'Zprompt_B'],
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    postCount,
    commentCount,
  );
  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  const userInput = `请为论坛"${sectionName}"板块批量生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。${topicHint}\n以JSON格式返回，包含posts数组，每个帖子有title、content、authorId、timestamp（故事内时间）、comments数组。`;
  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: postBatchSchema(postCount, commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: postBatchSchema(postCount, commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: systemPrompt },
          'user_input',
        ],
      });

  const parsed = safeJsonParse(result as string);
  const posts = parseRawPosts(parsed.posts || [], section, SillyTavern.getContext().chat.length - 1);
  recordPostIdsToMessage(section === 'A' ? posts : [], section === 'B' ? posts : []);
  return posts;
}

export async function generatePostsForBothSections(topic?: string) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const postCount = settings.ZpostCountHint;
  const commentCount = settings.ZcommentCountHint;
  const sectionAName = store.getSectionName('A');
  const sectionBName = store.getSectionName('B');

  const systemPromptA = buildSystemPrompt(
    settings.Zprompt_A,
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    postCount,
    commentCount,
  );
  const systemPromptB = buildSystemPrompt(
    settings.Zprompt_B,
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    postCount,
    commentCount,
  );

  const combinedSystemPrompt = `【板块A：${sectionAName}】\n${systemPromptA}\n\n【板块B：${sectionBName}】\n${systemPromptB}\n\n【重要说明】请分别为上述两个板块生成帖子。输出JSON中必须包含 A 和 B 两个键，每个键下包含 posts 数组。两个板块的帖子风格、主题和语气必须严格对应各自的板块要求，不要混淆。`;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  const userInput = `请分别为以下两个板块批量生成帖子：

板块"${sectionAName}"：生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。

板块"${sectionBName}"：生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。

请确保两个板块的帖子风格严格区分，各自对应板块的设定要求。${topicHint}
以JSON格式返回，结构为 { "A": { "posts": [...] }, "B": { "posts": [...] } }。每个帖子包含 title、content、authorId、timestamp、comments 字段。`;

  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: bothSectionsBatchSchema(postCount, commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: combinedSystemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: bothSectionsBatchSchema(postCount, commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: combinedSystemPrompt },
          'user_input',
        ],
      });

  const parsed = safeJsonParse(result as string);
  const sourceIndex = SillyTavern.getContext().chat.length - 1;
  const postsA = parseRawPosts(parsed.A?.posts || [], 'A', sourceIndex);
  const postsB = parseRawPosts(parsed.B?.posts || [], 'B', sourceIndex);
  recordPostIdsToMessage(postsA, postsB);
  return { A: postsA, B: postsB };
}

export async function generateComments(section: 'A' | 'B', post: ForumPost) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const promptKey = store.getPromptKey(section);
  const commentCount = settings.ZcommentCountHint;
  const systemPrompt = buildSystemPrompt(
    settings[promptKey as 'Zprompt_A' | 'Zprompt_B'],
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    undefined,
    commentCount,
  );
  const existingComments = post.comments.map(c => `${c.authorId}: ${c.content}`).join('\n');
  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const userInput = `帖子标题：${post.title}\n帖子内容：${post.content}\n作者：${post.authorId}\n帖子时间：${post.timestamp}\n${existingComments ? `已有评论：\n${existingComments}\n` : ''}请为这个帖子生成${commentCount}条左右的评论，以JSON格式返回。包含comments数组，每条有authorId、content和timestamp（故事内时间）。`;
  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: commentSchema(commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        json_schema: commentSchema(commentCount),
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: systemPrompt },
          'user_input',
        ],
      });

  const parsed = safeJsonParse(result as string);
  return (parsed.comments || []).map((c: any) => ({
    id: generateId(),
    authorId: c.authorId || '匿名用户',
    content: c.content || '',
    timestamp: c.timestamp || '',
    isAiGenerated: true,
  })) as ForumComment[];
}

// 注入管理
let uninjectFn: (() => void) | null = null;

export function injectForumContext() {
  uninjectForumContext();
  const store = useForumSettingsStore();
  const { settings } = store;
  if (!settings.ZenableInjectToChat) return;

  const sections: ('A' | 'B')[] = ['A', 'B'];
  const parts: string[] = [];
  for (const sec of sections) {
    const posts = settings.Zposts[sec];
    const name = store.getSectionName(sec);
    const ctx = buildContext(settings.ZforumName, name, posts, settings.ZinjectPostCount);
    if (ctx) parts.push(ctx);
  }
  if (parts.length === 0) return;

  const result = injectPrompts([{
    id: 'forum_context_inject',
    position: 'in_chat',
    depth: 0,
    role: 'system',
    content: parts.join('\n\n'),
    should_scan: true,
  }]);
  uninjectFn = result.uninject;
}

export function uninjectForumContext() {
  if (uninjectFn) {
    uninjectFn();
    uninjectFn = null;
  }
}
