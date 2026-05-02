import { useForumSettingsStore } from './settings';
import type { ForumPost, ForumComment } from './types';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function buildContext(forumName: string, sectionName: string, posts: ForumPost[], injectCount: number, sectionType: 'forum' | 'tournament' | 'newspaper' = 'forum') {
  const recent = posts.slice(0, injectCount);
  if (recent.length === 0) return '';
  let text = '';
  if (sectionType === 'tournament') {
    text = `[${forumName} - ${sectionName}（赛事）]\n`;
    for (const post of recent) {
      const m = post.metadata || {};
      text += `\n[${post.timestamp}] ${post.title}\n`;
      text += `对阵: ${m.teamA || '?'} vs ${m.teamB || '?'} | 比分: ${m.score || '?'} | 胜者: ${m.winner || '?'} | 轮次: ${m.round || '?'}\n`;
      text += `过程: ${post.content}\n`;
      if (post.comments.length > 0) {
        text += '评论: ';
        text += post.comments.slice(0, 5).map(c => `[${c.timestamp}] ${c.authorId}: ${c.content}`).join(' | ');
        text += '\n';
      }
    }
  } else if (sectionType === 'newspaper') {
    text = `[${forumName} - ${sectionName}（报纸）]\n`;
    for (const post of recent) {
      const m = post.metadata || {};
      const articles = m.articles || [];
      text += `\n[${post.timestamp}] ${post.title} ${m.issueNumber || ''}\n`;
      if (articles.length > 0) {
        text += `头条: ${articles[0]?.title || ''}\n`;
        text += articles.slice(1, 4).map((a: any) => `栏目「${a.column || '?'}」: ${a.title || ''}`).join('\n') + '\n';
      }
      text += `主编寄语: ${post.content}\n`;
    }
  } else {
    text = `[${forumName} - ${sectionName}]\n`;
    for (const post of recent) {
      text += `\n[${post.timestamp}] 帖子: 【${post.title}】 by ${post.authorId}\n${post.content}\n`;
      if (post.comments.length > 0) {
        text += '评论: ';
        text += post.comments.slice(0, 5).map(c => `[${c.timestamp}] ${c.authorId}: ${c.content}`).join(' | ');
        text += '\n';
      }
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
      metadata: {
        type: 'object',
        description: '额外的元数据，如赛事比分(teamA,teamB,score,winner,round)、报纸期号(issueNumber)和文章列表(articles)等',
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

export function mergedSectionsBatchSchema(sectionIds: string[], postCount: number, commentCount: number) {
  const item = makePostItemSchema(commentCount);
  const properties: Record<string, any> = {};
  for (const id of sectionIds) {
    properties[id] = {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          description: `板块${id}的帖子列表，${postCount}个左右`,
          items: item,
        },
      },
      required: ['posts'],
    };
  }
  return {
    name: 'forum_posts_merged_sections',
    value: {
      type: 'object',
      properties,
      required: sectionIds,
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
  sectionType: 'forum' | 'tournament' | 'newspaper' = 'forum',
) {
  let prompt = promptBase;
  if (outputFormat.trim()) prompt += '\n\n' + outputFormat.trim();

  if (sectionType === 'tournament') {
    prompt += `\n\n本次生成要求：约${postCount || 3}场比赛战报，每场比赛附带${commentCount || 3}条左右的观众评论。`;
    prompt += `\n\n【赛事输出格式补充】每个帖子除了常规字段外，还必须包含 metadata 字段，其中有：teamA（队伍A名称）、teamB（队伍B名称）、score（比分，如"3:2"）、winner（胜者名称）、round（轮次，如"小组赛""半决赛""决赛"）。`;
  } else if (sectionType === 'newspaper') {
    prompt += `\n\n本次生成要求：生成1期报纸，包含${postCount || 3}个栏目左右的文章，每期附带${commentCount || 3}条左右的读者来信评论。`;
    prompt += `\n\n【报纸输出格式补充】每个帖子除了常规字段外，还必须包含 metadata 字段，其中有：issueNumber（期号，如"第3期"）、articles（文章数组，每个文章包含 title、content、author、column 字段，column 为栏目名如"要闻""攻略""八卦"）。`;
  } else {
    if (postCount !== undefined && commentCount !== undefined) {
      prompt += `\n\n本次生成要求：约${postCount}个帖子，每个帖子约${commentCount}条评论。`;
    } else if (commentCount !== undefined) {
      prompt += `\n\n本次生成要求：约${commentCount}条评论。`;
    }
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

function parseRawPosts(rawPosts: any[], sectionId: string, sourceMessageIndex?: number): ForumPost[] {
  return (rawPosts || []).map((post: any) => ({
    id: generateId(),
    section: sectionId,
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
    metadata: (post.metadata && typeof post.metadata === 'object' && !Array.isArray(post.metadata)) ? post.metadata : undefined,
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

function recordPostIdsToMessage(postsMap: Record<string, ForumPost[]>) {
  try {
    const ctx = SillyTavern.getContext();
    const chat = ctx.chat;
    if (!chat || chat.length === 0) return;
    const lastMsg = chat[chat.length - 1];
    if (lastMsg.is_user) return;
    lastMsg.extra = lastMsg.extra || {};
    const posts: Record<string, string[]> = {};
    for (const [sectionId, sectionPosts] of Object.entries(postsMap)) {
      posts[sectionId] = sectionPosts.map(p => p.id);
    }
    lastMsg.extra.zsdForumGeneration = { at: Date.now(), posts };
  } catch (e) {
    console.warn('[网游论坛] 记录帖子关联失败:', e);
  }
}

export async function generatePosts(sectionId: string, topic?: string) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const sectionName = store.getSectionName(sectionId);
  const promptBase = store.getSectionPrompt(sectionId);
  const sectionType = store.getSectionType(sectionId);
  const postCount = settings.ZpostCountHint;
  const commentCount = settings.ZcommentCountHint;
  const systemPrompt = buildSystemPrompt(
    promptBase,
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    postCount,
    commentCount,
    sectionType,
  );
  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  let userInput: string;
  if (sectionType === 'tournament') {
    userInput = `请为"${sectionName}"赛事板块生成${postCount}场比赛的战报，每场比赛附带${commentCount}条左右的观众评论。${topicHint}\n以JSON格式返回，包含posts数组，每个帖子有title（比赛名称）、content（比赛过程描述）、authorId（解说员ID）、timestamp（故事内时间）、comments数组，以及metadata字段包含teamA、teamB、score、winner、round。`;
  } else if (sectionType === 'newspaper') {
    userInput = `请生成1期"${sectionName}"报纸，包含${postCount}个栏目左右的文章，附带${commentCount}条左右的读者来信评论。${topicHint}\n以JSON格式返回，包含posts数组（仅1个元素，即一期报纸），帖子有title（报纸名称+期号）、content（主编寄语/导读）、authorId（主编ID）、timestamp（故事内时间）、comments数组，以及metadata字段包含issueNumber和articles数组（每个文章有title、content、author、column）。`;
  } else {
    userInput = `请为论坛"${sectionName}"板块批量生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。${topicHint}\n以JSON格式返回，包含posts数组，每个帖子有title、content、authorId、timestamp（故事内时间）、comments数组。`;
  }
  const schema = postBatchSchema(postCount, commentCount);
  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
        json_schema: schema,
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: systemPrompt },
          'user_input',
        ],
        json_schema: schema,
      });

  const parsed = safeJsonParse(result as string);
  const posts = parseRawPosts(parsed.posts || [], sectionId, SillyTavern.getContext().chat.length - 1);
  recordPostIdsToMessage({ [sectionId]: posts });
  return posts;
}

export async function generatePostsMerged(sectionIds: string[], topic?: string) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const postCount = settings.ZpostCountHint;
  const commentCount = settings.ZcommentCountHint;

  const sectionPrompts: string[] = [];
  for (const id of sectionIds) {
    const name = store.getSectionName(id);
    const prompt = store.getSectionPrompt(id);
    const type = store.getSectionType(id);
    const sp = buildSystemPrompt(
      prompt,
      settings.ZoutputFormat,
      settings.ZdecentralizedMode,
      settings.ZauthorIdPrompt,
      settings.ZplayerForumId,
      postCount,
      commentCount,
      type,
    );
    sectionPrompts.push(`【板块${id}（${type === 'tournament' ? '赛事' : type === 'newspaper' ? '报纸' : '论坛'}）：${name}】\n${sp}`);
  }

  const combinedSystemPrompt = `${sectionPrompts.join('\n\n')}\n\n【重要说明】请分别为上述${sectionIds.length}个板块生成帖子。输出JSON中必须包含 ${sectionIds.join('、')} 键，每个键下包含 posts 数组。各板块的帖子风格、主题和语气必须严格对应各自的板块要求，不要混淆。`;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  let userInput = `请分别为以下${sectionIds.length}个板块生成内容：\n\n`;
  for (const id of sectionIds) {
    const name = store.getSectionName(id);
    const type = store.getSectionType(id);
    if (type === 'tournament') {
      userInput += `【赛事】"${name}"：生成${postCount}场比赛战报，每场比赛附带${commentCount}条左右观众评论。每个帖子metadata包含teamA、teamB、score、winner、round。\n\n`;
    } else if (type === 'newspaper') {
      userInput += `【报纸】"${name}"：生成1期报纸，包含${postCount}个栏目左右的文章，附带${commentCount}条左右读者来信。帖子metadata包含issueNumber和articles数组。\n\n`;
    } else {
      userInput += `【论坛】"${name}"：生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。\n\n`;
    }
  }
  userInput += `请确保各板块的内容风格严格区分，各自对应板块的设定要求。${topicHint}\n以JSON格式返回，结构为 { ${sectionIds.map(id => `"${id}": { "posts": [...] }`).join(', ')} }。`;

  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const schema = mergedSectionsBatchSchema(sectionIds, postCount, commentCount);
  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: combinedSystemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
        json_schema: schema,
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: combinedSystemPrompt },
          'user_input',
        ],
        json_schema: schema,
      });

  const parsed = safeJsonParse(result as string);
  const sourceIndex = SillyTavern.getContext().chat.length - 1;
  const resultMap: Record<string, ForumPost[]> = {};
  for (const id of sectionIds) {
    resultMap[id] = parseRawPosts(parsed[id]?.posts || [], id, sourceIndex);
  }
  recordPostIdsToMessage(resultMap);
  return resultMap;
}

/** 独立模式：逐个板块单独生成 */
export async function generatePostsSequential(sectionIds: string[], topic?: string): Promise<Record<string, ForumPost[]>> {
  const resultMap: Record<string, ForumPost[]> = {};
  for (const id of sectionIds) {
    resultMap[id] = await generatePosts(id, topic);
  }
  return resultMap;
}

export async function generateComments(sectionId: string, post: ForumPost) {
  const store = useForumSettingsStore();
  const { settings } = store;
  const promptBase = store.getSectionPrompt(sectionId);
  const commentCount = settings.ZcommentCountHint;
  const systemPrompt = buildSystemPrompt(
    promptBase,
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
  const schema = commentSchema(commentCount);
  const result = settings.ZincludePresetContext
    ? await generate({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
        json_schema: schema,
      })
    : await generateRaw({
        user_input: userInput,
        should_silence: true,
        custom_api: hasCustomApi ? customApi : undefined,
        max_chat_history: settings.ZinjectChatHistoryCount,
        ordered_prompts: [
          'world_info_before',
          'world_info_after',
          'chat_history',
          { role: 'system', content: systemPrompt },
          'user_input',
        ],
        json_schema: schema,
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

  const parts: string[] = [];
  for (const sec of settings.Zsections) {
    const posts = settings.Zposts[sec.id] || [];
    const name = sec.name;
    const type = (sec as any).type || 'forum';
    const ctx = buildContext(settings.ZforumName, name, posts, settings.ZinjectPostCount, type);
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
