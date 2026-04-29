import type { ForumSection, ForumPost, ForumComment } from '../types';
import { useSettingsStore, DEFAULT_DECENTRALIZED_PROMPT } from '../stores/settingsStore';
import { generateId } from './forumUtils';

/**
 * 批量生成帖子（含评论）的 JSON Schema
 * 帖子数和评论数通过 description 提示 AI，非硬限制
 */
function buildBatchPostsSchema(postCount: number, commentCount: number) {
  return {
    name: 'forum_posts_batch',
    value: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          description: `生成的帖子列表，${postCount}个左右`,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '帖子标题' },
              content: { type: 'string', description: '帖子正文内容' },
              authorId: { type: 'string', description: '发帖玩家ID' },
              timestamp: { type: 'string', description: '故事内时间，如"第一章·清晨"、"第三天·午后"' },
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
          },
        },
      },
      required: ['posts'],
    },
  };
}

/** 为帖子追加评论的 JSON Schema */
function buildCommentSchema(commentCount: number) {
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
          description: `生成的评论列表，${commentCount}条左右`,
        },
      },
      required: ['comments'],
    },
  };
}

/** 构建完整的系统提示词（含输出格式 + 数量提醒 + 去中心化模式 + ID提示） */
function buildSystemPrompt(
  basePrompt: string,
  outputFormat: string,
  decentralized: boolean,
  authorIdPrompt: string,
  playerForumId: string,
  postCountHint?: number,
  commentCountHint?: number,
): string {
  let prompt = basePrompt;
  if (outputFormat.trim()) {
    prompt += '\n\n' + outputFormat.trim();
  }
  // 自动追加数量提醒（与 json_schema 和 user_input 保持一致）
  if (postCountHint !== undefined && commentCountHint !== undefined) {
    prompt += `\n\n本次生成要求：约${postCountHint}个帖子，每个帖子约${commentCountHint}条评论。`;
  } else if (commentCountHint !== undefined) {
    prompt += `\n\n本次生成要求：约${commentCountHint}条评论。`;
  }
  // 追加 authorId 生成提示
  if (authorIdPrompt.trim()) {
    prompt += `\n\n【用户ID生成规则】${authorIdPrompt.trim()}`;
  }
  // 追加玩家论坛ID提示
  if (playerForumId.trim()) {
    prompt += `\n\n【玩家ID】当前故事的主角在论坛中的ID是"${playerForumId.trim()}"，如果有玩家角色参与的帖子或评论，使用此ID。`;
  }
  if (decentralized) {
    prompt += DEFAULT_DECENTRALIZED_PROMPT;
  }
  return prompt;
}

/**
 * 批量生成帖子（含评论）
 * @param section 板块（'A' 或 'B'）
 * @param topic 用户指定的话题方向，可选
 */
export async function generatePosts(
  section: ForumSection,
  topic?: string,
): Promise<ForumPost[]> {
  const store = useSettingsStore();
  const { settings } = store;

  const promptKey = store.getPromptKey(section);
  const sectionName = store.getSectionName(section);
  const postCount = settings.ZpostCountHint;
  const commentCount = settings.ZcommentCountHint;

  const systemPrompt = buildSystemPrompt(
    settings[promptKey],
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    postCount,
    commentCount,
  );

  const customApi: CustomApiConfig = {};
  if (settings.Zmodel) {
    customApi.model = settings.Zmodel;
  }

  const topicLine = topic?.trim()
    ? `\n本次讨论方向/话题：${topic.trim()}`
    : '';

  const result = await generate({
    user_input: `请为论坛"${sectionName}"板块批量生成${postCount}个左右的帖子，每个帖子附带${commentCount}条左右的评论。${topicLine}\n以JSON格式返回，包含posts数组，每个帖子有title、content、authorId、timestamp（故事内时间）、comments数组。`,
    should_silence: true,
    custom_api: Object.keys(customApi).length > 0 ? customApi : undefined,
    json_schema: buildBatchPostsSchema(postCount, commentCount),
    max_chat_history: settings.ZinjectChatHistoryCount,
    injects: [
      {
        role: 'system',
        content: systemPrompt,
        position: 'in_chat',
        depth: 0,
        should_scan: true,
      },
    ],
  });

  const parsed = JSON.parse(result as string);
  const posts: ForumPost[] = (parsed.posts || []).map(
    (p: {
      title?: string;
      content?: string;
      authorId?: string;
      timestamp?: string;
      comments?: { authorId?: string; content?: string; timestamp?: string }[];
    }) => ({
      id: generateId(),
      section,
      title: p.title || '无标题',
      content: p.content || '',
      authorId: p.authorId || '匿名用户',
      timestamp: p.timestamp || '',
      comments: (p.comments || []).map((c) => ({
        id: generateId(),
        authorId: c.authorId || '匿名用户',
        content: c.content || '',
        timestamp: c.timestamp || '',
        isAiGenerated: true,
      })),
      isAiGenerated: true,
    }),
  );
  return posts;
}

/** 为单个帖子追加评论 */
export async function generateComments(
  section: ForumSection,
  post: ForumPost,
): Promise<ForumComment[]> {
  const store = useSettingsStore();
  const { settings } = store;
  const promptKey = store.getPromptKey(section);
  const commentCount = settings.ZcommentCountHint;

  const systemPrompt = buildSystemPrompt(
    settings[promptKey],
    settings.ZoutputFormat,
    settings.ZdecentralizedMode,
    settings.ZauthorIdPrompt,
    settings.ZplayerForumId,
    undefined,
    commentCount,
  );
  const existingComments = post.comments.map(c => `${c.authorId}: ${c.content}`).join('\n');

  const customApi: CustomApiConfig = {};
  if (settings.Zmodel) {
    customApi.model = settings.Zmodel;
  }

  const result = await generate({
    user_input: `帖子标题：${post.title}\n帖子内容：${post.content}\n作者：${post.authorId}\n帖子时间：${post.timestamp}\n${existingComments ? `已有评论：\n${existingComments}\n` : ''}请为这个帖子生成${commentCount}条左右的评论，以JSON格式返回。包含comments数组，每条有authorId、content和timestamp（故事内时间）。`,
    should_silence: true,
    custom_api: Object.keys(customApi).length > 0 ? customApi : undefined,
    json_schema: buildCommentSchema(commentCount),
    max_chat_history: settings.ZinjectChatHistoryCount,
    injects: [
      {
        role: 'system',
        content: systemPrompt,
        position: 'in_chat',
        depth: 0,
        should_scan: true,
      },
    ],
  });

  const parsed = JSON.parse(result as string);
  const comments: ForumComment[] = (parsed.comments || []).map(
    (c: { authorId?: string; content?: string; timestamp?: string }) => ({
      id: generateId(),
      authorId: c.authorId || '匿名用户',
      content: c.content || '',
      timestamp: c.timestamp || '',
      isAiGenerated: true,
    }),
  );
  return comments;
}
