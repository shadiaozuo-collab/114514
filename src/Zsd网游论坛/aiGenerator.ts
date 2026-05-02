import { useForumSettingsStore } from './settings';
import type { ForumPost, ForumComment } from './types';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ── XML 解析辅助函数 ──

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : '';
}

function extractBlocks(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function parseMetadataFromXml(metaXml: string): Record<string, any> | undefined {
  if (!metaXml) return undefined;
  const result: Record<string, any> = {};
  const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(metaXml)) !== null) {
    const [, key, val] = m;
    if (/<\w+>/.test(val)) {
      if (key === 'articles') {
        result[key] = [];
        const articleBlocks = extractBlocks(val, 'article');
        for (const ab of articleBlocks) {
          result[key].push({
            title: extractTag(ab, 'title'),
            content: extractTag(ab, 'content'),
            author: extractTag(ab, 'author'),
            column: extractTag(ab, 'column'),
          });
        }
      } else {
        result[key] = parseMetadataFromXml(val) || val.trim();
      }
    } else {
      result[key] = val.trim();
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parsePostBlocks(xmlText: string): any[] {
  const posts: any[] = [];
  const postBlocks = extractBlocks(xmlText, 'post');
  for (const postXml of postBlocks) {
    const comments: any[] = [];
    const commentBlocks = extractBlocks(postXml, 'comment');
    for (const cXml of commentBlocks) {
      comments.push({
        authorId: extractTag(cXml, 'authorId'),
        content: extractTag(cXml, 'content'),
        timestamp: extractTag(cXml, 'timestamp'),
      });
    }
    // 移除 comments 部分，避免 comments 内容干扰其他字段
    const postXmlWithoutComments = postXml.replace(/<comments>[\s\S]*?<\/comments>/, '');
    const metadataXml = extractTag(postXmlWithoutComments, 'metadata');
    posts.push({
      title: extractTag(postXmlWithoutComments, 'title'),
      content: extractTag(postXmlWithoutComments, 'content'),
      authorId: extractTag(postXmlWithoutComments, 'authorId'),
      timestamp: extractTag(postXmlWithoutComments, 'timestamp'),
      likes: parseInt(extractTag(postXmlWithoutComments, 'likes')) || 0,
      comments,
      metadata: metadataXml ? parseMetadataFromXml(metadataXml) : undefined,
    });
  }
  return posts;
}

function parseCommentsFromXml(xmlText: string): any[] {
  const comments: any[] = [];
  const commentBlocks = extractBlocks(xmlText, 'comment');
  for (const cXml of commentBlocks) {
    comments.push({
      authorId: extractTag(cXml, 'authorId'),
      content: extractTag(cXml, 'content'),
      timestamp: extractTag(cXml, 'timestamp'),
    });
  }
  return comments;
}

function safeXmlParse(raw: string, opts?: { sectionIds?: string[] }): any {
  const text = String(raw || '').trim();

  // 如果返回的是HTML错误页（以 < 开头但不是 XML 帖子/评论/section）
  if (text.startsWith('<')) {
    const firstTag = text.match(/^<(\w+)/);
    if (firstTag && !['post', 'comment', 'section'].includes(firstTag[1].toLowerCase())) {
      const preview = text.substring(0, 200).replace(/\s+/g, ' ');
      throw new Error(`API返回了HTML页面而非XML，可能是API配置错误或服务器故障。预览: ${preview}`);
    }
  }

  // 尝试从Markdown代码块中提取
  const codeBlockMatch = text.match(/```(?:xml)?\s*([\s\S]*?)\s*```/);
  const xmlText = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  // Merged 模式：按 <section id="X"> 分组
  const sectionBlocks = extractBlocks(xmlText, 'section');
  if (sectionBlocks.length > 0 && opts?.sectionIds) {
    const result: Record<string, any> = {};
    for (const secXml of sectionBlocks) {
      const idMatch = secXml.match(/^<section[^>]*id=["']?([^"'>\s]+)/);
      const id = idMatch ? idMatch[1] : '';
      result[id] = { posts: parsePostBlocks(secXml) };
    }
    return result;
  }

  // 单板块：直接解析 <post>
  const posts = parsePostBlocks(xmlText);
  if (posts.length > 0) {
    return { posts };
  }

  // 评论模式：解析 <comment>
  const comments = parseCommentsFromXml(xmlText);
  if (comments.length > 0) {
    return { comments };
  }

  throw new Error(`AI返回的内容无法解析为XML。原始内容前200字符: ${text.substring(0, 200)}`);
}

// ── 上下文构建 ──

function buildContext(forumName: string, sectionName: string, posts: ForumPost[], injectCount: number, sectionType: 'forum' | 'tournament' | 'newspaper' = 'forum') {
  const recent = posts.slice(0, injectCount);
  if (recent.length === 0) return '';
  let text = '';

  // 统一添加"参考-only"标注头
  const header = `=== 以下为本板块已有历史内容（仅作氛围参考，严禁重复、续写或改写） ===\n\n[${forumName} - ${sectionName}] 历史帖子参考：\n`;
  const footer = `\n=== 历史参考结束。以上是过去的内容，你现在必须创作全新的、完全不同的帖子和评论 ===\n`;

  if (sectionType === 'tournament') {
    text = header;
    let idx = 1;
    for (const post of recent) {
      const m = post.metadata || {};
      text += `\n[历史${idx}] [${post.timestamp}] ${post.title}\n`;
      text += `  对阵: ${m.teamA || '?'} vs ${m.teamB || '?'} | 比分: ${m.score || '?'} | 胜者: ${m.winner || '?'} | 轮次: ${m.round || '?'}\n`;
      text += `  赛况摘要: ${post.content.substring(0, 120)}${post.content.length > 120 ? '...' : ''}\n`;
      if (post.comments.length > 0) {
        text += '  热门评论: ';
        text += post.comments.slice(0, 3).map(c => `${c.authorId}: ${c.content.substring(0, 60)}${c.content.length > 60 ? '...' : ''}`).join(' | ');
        text += '\n';
      }
      idx++;
    }
    text += footer;
  } else if (sectionType === 'newspaper') {
    text = header;
    let idx = 1;
    for (const post of recent) {
      const m = post.metadata || {};
      const articles = m.articles || [];
      text += `\n[历史${idx}] [${post.timestamp}] ${post.title} ${m.issueNumber || ''}\n`;
      if (articles.length > 0) {
        text += `  头条: ${articles[0]?.title || ''}\n`;
        text += articles.slice(1, 3).map((a: any) => `  栏目「${a.column || '?'}」: ${a.title || ''}`).join('\n') + '\n';
      }
      text += `  主编寄语摘要: ${post.content.substring(0, 120)}${post.content.length > 120 ? '...' : ''}\n`;
      idx++;
    }
    text += footer;
  } else {
    text = header;
    let idx = 1;
    for (const post of recent) {
      text += `\n[历史${idx}] [${post.timestamp}] 《${post.title}》 by ${post.authorId}\n`;
      text += `  内容摘要: ${post.content.substring(0, 120)}${post.content.length > 120 ? '...' : ''}\n`;
      if (post.comments.length > 0) {
        text += '  热门评论: ';
        text += post.comments.slice(0, 3).map(c => `${c.authorId}: ${c.content.substring(0, 60)}${c.content.length > 60 ? '...' : ''}`).join(' | ');
        text += '\n';
      }
      idx++;
    }
    text += footer;
  }
  return text;
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
  useJailbreak?: boolean,
  jailbreakPrompt?: string,
) {
  let prompt = promptBase;
  if (outputFormat.trim()) prompt += '\n\n' + outputFormat.trim();

  if (sectionType === 'tournament') {
    prompt += `\n\n<task>\n本次生成要求：约${postCount || 3}场比赛战报，每场比赛附带${commentCount || 3}条左右的观众评论。`;
    prompt += `\n\n【赛事输出格式补充】每个帖子除了常规字段外，还必须包含 metadata 字段，用 XML 标签表示：\n<metadata>\n  <teamA>队伍A名称</teamA>\n  <teamB>队伍B名称</teamB>\n  <score>比分，如3:2</score>\n  <winner>胜者名称</winner>\n  <round>轮次，如小组赛/半决赛/决赛</round>\n</metadata>\n</task>`;
  } else if (sectionType === 'newspaper') {
    prompt += `\n\n<task>\n本次生成要求：生成1期报纸，包含${postCount || 3}个栏目左右的文章，每期附带${commentCount || 3}条左右的读者来信评论。`;
    prompt += `\n\n【报纸输出格式补充】每个帖子除了常规字段外，还必须包含 metadata 字段，用 XML 标签表示：\n<metadata>\n  <issueNumber>期号，如第3期</issueNumber>\n  <articles>\n    <article>\n      <title>文章标题</title>\n      <content>文章内容</content>\n      <author>作者ID</author>\n      <column>栏目名如要闻/攻略/八卦</column>\n    </article>\n  </articles>\n</metadata>\n</task>`;
  } else {
    if (postCount !== undefined && commentCount !== undefined) {
      prompt += `\n\n<task>\n本次生成要求：约${postCount}个全新帖子，每个帖子约${commentCount}条评论。注意：每个帖子的主题必须完全不同，严禁同质化。\n</task>`;
    } else if (commentCount !== undefined) {
      prompt += `\n\n<task>\n本次生成要求：约${commentCount}条评论。\n</task>`;
    }
  }

  if (authorIdPrompt.trim()) prompt += `\n\n${authorIdPrompt.trim()}`;
  if (playerForumId.trim()) prompt += `\n\n【玩家ID】当前故事的主角在论坛中的ID是"${playerForumId.trim()}"，如果有玩家角色参与的帖子或评论，使用此ID。`;
  if (decentralizedMode) {
    prompt += '\n\n【去中心化模式】注意：论坛内容不应只围绕主角或主角的社交圈。大部分帖子应该是由与主角无关的普通论坛用户发起的，反映更广泛的世界动态、其他玩家的日常讨论、边缘话题等。只有少数帖子可以与主角相关。';
  }

  // 添加生成前自检要求
  prompt += `\n\n<self_check>
生成前自检（必须执行）：
1. 【重复自检】确认本次生成的新帖子主题与"历史帖子参考"中列出的任何帖子都不同
2. 【同质化自检】确认同一批次内各帖子的标题和主题差异明显，没有两个帖子在讨论同一事物
3. 【时间自检】确认timestamp符合故事当前时间节点，不提前讨论未发生事件
4. 【观点自检】确认每个帖子的评论中包含至少两种不同的观点或立场
5. 【ID自检】确认所有用户ID均不重复，且风格多样化
</self_check>`;

  // 附加破甲提示词
  if (useJailbreak && jailbreakPrompt?.trim()) {
    prompt += '\n\n' + jailbreakPrompt.trim();
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
    likes: post.likes || 0,
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

// ── 帖子生成 ──

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
    settings.ZuseJailbreak,
    settings.ZjailbreakPrompt,
  );
  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  let userInput: string;
  if (sectionType === 'tournament') {
    userInput = `请为"${sectionName}"赛事板块生成${postCount}场全新的比赛战报，每场比赛附带${commentCount}条左右的观众评论。${topicHint}\n注意：必须创作全新的赛事内容，不要重复或续写历史帖子中已出现过的比赛。\n以XML格式返回，每个帖子用 <post>...</post> 包裹，包含 <title>、<content>、<authorId>、<timestamp>、<likes>、<comments>（内含 <comment>），以及 <metadata>（内含 <teamA>、<teamB>、<score>、<winner>、<round>）。`;
  } else if (sectionType === 'newspaper') {
    userInput = `请生成1期全新的"${sectionName}"报纸，包含${postCount}个栏目左右的文章，附带${commentCount}条左右的读者来信评论。${topicHint}\n注意：报纸主题和内容必须是全新的，不要重复历史期号已报道过的事件。\n以XML格式返回，仅1个 <post>，包含 <title>（报纸名称+期号）、<content>（主编寄语/导读）、<authorId>（主编ID）、<timestamp>、<likes>、<comments>，以及 <metadata>（内含 <issueNumber> 和 <articles>，每个 article 有 <title>、<content>、<author>、<column>）。`;
  } else {
    userInput = `请为论坛"${sectionName}"板块批量生成${postCount}个全新的帖子，每个帖子附带${commentCount}条左右的评论。${topicHint}\n重要提醒：\n1. 这些帖子必须是全新的独立讨论，不要重复、续写或回应历史帖子中的任何内容。\n2. 同一批次中每个帖子的主题必须完全不同。\n3. 评论中要有不同观点的碰撞，不要清一色附和。\n以XML格式返回，每个帖子用 <post>...</post> 包裹，包含 <title>、<content>、<authorId>、<timestamp>、<likes>、<comments>（内含 <comment>，每个 comment 有 <authorId>、<content>、<timestamp>）。`;
  }
  const startTime = Date.now();
  let rawResponse = '';
  let parsedCount = 0;
  let error: string | undefined;

  try {
    const result = settings.ZincludePresetContext
      ? await generate({
          user_input: userInput,
          should_silence: true,
          custom_api: hasCustomApi ? customApi : undefined,
          max_chat_history: settings.ZinjectChatHistoryCount,
          injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
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
        });
    rawResponse = String(result);
    const parsed = safeXmlParse(rawResponse);
    const posts = parseRawPosts(parsed.posts || [], sectionId, SillyTavern.getContext().chat.length - 1);
    parsedCount = posts.length;
    recordPostIdsToMessage({ [sectionId]: posts });
    return posts;
  } catch (e: any) {
    error = e?.message || String(e);
    throw e;
  } finally {
    store.addGenerationLog({
      timestamp: Date.now(),
      type: 'posts',
      sectionId,
      sectionName,
      topic,
      userInput,
      systemPrompt,
      rawResponse,
      parsedCount,
      error,
      durationMs: Date.now() - startTime,
    });
  }
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
      settings.ZuseJailbreak,
      settings.ZjailbreakPrompt,
    );
    sectionPrompts.push(`【板块${id}（${type === 'tournament' ? '赛事' : type === 'newspaper' ? '报纸' : '论坛'}）：${name}】\n${sp}`);
  }

  const combinedSystemPrompt = `${sectionPrompts.join('\n\n')}\n\n【重要说明】请分别为上述${sectionIds.length}个板块生成帖子。输出XML中必须用 <section id="板块ID">...</section> 包裹每个板块的内容，每个板块内部包含若干个 <post>...</post>。各板块的帖子风格、主题和语气必须严格对应各自的板块要求，不要混淆。`;

  const topicHint = topic?.trim() ? `\n本次讨论方向/话题：${topic.trim()}` : '';

  let userInput = `请分别为以下${sectionIds.length}个板块生成全新的内容：\n\n`;
  for (const id of sectionIds) {
    const name = store.getSectionName(id);
    const type = store.getSectionType(id);
    if (type === 'tournament') {
      userInput += `【赛事】"${name}"：生成${postCount}场全新的比赛战报，每场比赛附带${commentCount}条左右观众评论。每个帖子metadata包含teamA、teamB、score、winner、round。\n\n`;
    } else if (type === 'newspaper') {
      userInput += `【报纸】"${name}"：生成1期全新的报纸，包含${postCount}个栏目左右的文章，附带${commentCount}条左右读者来信。帖子metadata包含issueNumber和articles数组。\n\n`;
    } else {
      userInput += `【论坛】"${name}"：生成${postCount}个全新的帖子，每个帖子附带${commentCount}条左右的评论。\n\n`;
    }
  }
  userInput += `重要提醒：\n1. 各板块的内容风格必须严格区分。\n2. 每个板块内部的新帖子主题必须完全不同，严禁同质化。\n3. 不要重复、续写或回应历史帖子中的任何内容。\n4. 评论中必须有不同观点的碰撞。\n${topicHint}\n以XML格式返回，结构为：<section id="${sectionIds[0]}"><post>...</post></section> <section id="${sectionIds[1] || ''}"><post>...</post></section>...`;

  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const startTime = Date.now();
  let rawResponse = '';
  let parsedCount = 0;
  let error: string | undefined;

  try {
    const result = settings.ZincludePresetContext
      ? await generate({
          user_input: userInput,
          should_silence: true,
          custom_api: hasCustomApi ? customApi : undefined,
          max_chat_history: settings.ZinjectChatHistoryCount,
          injects: [{ role: 'system', content: combinedSystemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
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
        });
    rawResponse = String(result);
    const parsed = safeXmlParse(rawResponse, { sectionIds });
    const sourceIndex = SillyTavern.getContext().chat.length - 1;
    const resultMap: Record<string, ForumPost[]> = {};
    for (const id of sectionIds) {
      const posts = parseRawPosts(parsed[id]?.posts || [], id, sourceIndex);
      resultMap[id] = posts;
      parsedCount += posts.length;
    }
    recordPostIdsToMessage(resultMap);
    return resultMap;
  } catch (e: any) {
    error = e?.message || String(e);
    throw e;
  } finally {
    const sectionNames = sectionIds.map(id => store.getSectionName(id)).join(', ');
    store.addGenerationLog({
      timestamp: Date.now(),
      type: 'merged_posts',
      sectionId: sectionIds.join(','),
      sectionName: sectionNames,
      topic,
      userInput,
      systemPrompt: combinedSystemPrompt,
      rawResponse,
      parsedCount,
      error,
      durationMs: Date.now() - startTime,
    });
  }
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
    undefined,
    settings.ZuseJailbreak,
    settings.ZjailbreakPrompt,
  );
  const existingComments = post.comments.map(c => `${c.authorId}: ${c.content}`).join('\n');
  const customApi = buildCustomApi(settings);
  const hasCustomApi = Object.keys(customApi).length > 0;

  const userInput = `帖子标题：${post.title}\n帖子内容：${post.content}\n作者：${post.authorId}\n帖子时间：${post.timestamp}\n${existingComments ? `已有评论（注意：不要重复以下观点）：\n${existingComments}\n` : ''}\n请为这个帖子生成${commentCount}条左右的全新评论。要求：\n1. 评论观点必须与已有评论不同，严禁重复已有评论的立场或措辞\n2. 必须有支持、反对、质疑、调侃等不同声音，禁止清一色附和\n3. 严禁输出"同上""+1""附议"等无意义内容\n4. 以XML格式返回，每个评论用 <comment>...</comment> 包裹，包含 <authorId>、<content> 和 <timestamp>（故事内时间）。`;
  const startTime = Date.now();
  let rawResponse = '';
  let parsedCount = 0;
  let error: string | undefined;
  const sectionName = store.getSectionName(sectionId);

  try {
    const result = settings.ZincludePresetContext
      ? await generate({
          user_input: userInput,
          should_silence: true,
          custom_api: hasCustomApi ? customApi : undefined,
          max_chat_history: settings.ZinjectChatHistoryCount,
          injects: [{ role: 'system', content: systemPrompt, position: 'in_chat', depth: 0, should_scan: true }],
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
        });
    rawResponse = String(result);
    const parsed = safeXmlParse(rawResponse);
    const comments = (parsed.comments || []).map((c: any) => ({
      id: generateId(),
      authorId: c.authorId || '匿名用户',
      content: c.content || '',
      timestamp: c.timestamp || '',
      isAiGenerated: true,
    })) as ForumComment[];
    parsedCount = comments.length;
    return comments;
  } catch (e: any) {
    error = e?.message || String(e);
    throw e;
  } finally {
    store.addGenerationLog({
      timestamp: Date.now(),
      type: 'comments',
      sectionId,
      sectionName,
      userInput,
      systemPrompt,
      rawResponse,
      parsedCount,
      error,
      durationMs: Date.now() - startTime,
    });
  }
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

/** 扫描所有AI消息的extra，收集被引用的帖子ID，清理孤儿帖子 */
export function cleanupOrphanPosts() {
  try {
    const ctx = SillyTavern.getContext();
    const chat = ctx.chat;
    if (!chat) return;

    const referencedIds = new Set<string>();
    for (const msg of chat) {
      if (msg.is_user) continue;
      const gen = msg.extra?.zsdForumGeneration;
      if (gen) {
        // 兼容旧格式
        gen.postsA?.forEach((id: string) => referencedIds.add(id));
        gen.postsB?.forEach((id: string) => referencedIds.add(id));
        // 新格式
        if (gen.posts) {
          for (const ids of Object.values(gen.posts)) {
            (ids as string[]).forEach((id: string) => referencedIds.add(id));
          }
        }
      }
    }

    const store = useForumSettingsStore();
    let removed = 0;

    for (const sectionId of Object.keys(store.settings.Zposts)) {
      const posts = store.settings.Zposts[sectionId] || [];
      const before = posts.length;
      store.settings.Zposts[sectionId] = posts.filter(p => {
        // 手动添加的帖子（无sourceMessageIndex）永远保留
        if (p.sourceMessageIndex === undefined) return true;
        // AI生成的帖子：只有被某条现存AI消息引用才保留
        return referencedIds.has(p.id);
      });
      removed += before - store.settings.Zposts[sectionId].length;
    }

    if (removed > 0) {
      console.log(`[网游论坛] 回退同步：清理了 ${removed} 个孤儿帖子`);
      injectForumContext();
    }
  } catch (e) {
    console.warn('[网游论坛] 清理孤儿帖子失败:', e);
  }
}
