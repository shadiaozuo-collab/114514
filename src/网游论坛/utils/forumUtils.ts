import type { ForumSection, ForumPost, ForumSettings } from '../types';
import { DEFAULT_PROMPT_A, DEFAULT_PROMPT_B, DEFAULT_OUTPUT_FORMAT, DEFAULT_AUTHOR_ID_PROMPT } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** 格式化故事内时间戳（直接展示字符串） */
export function formatTimestamp(ts: string): string {
  if (!ts) return '';
  return ts;
}

export function formatPostsAsInjectionText(
  forumName: string,
  sectionDisplayName: string,
  posts: ForumPost[],
  maxCount: number,
): string {
  const selected = posts.slice(0, maxCount);
  if (selected.length === 0) return '';

  let text = `[${forumName} - ${sectionDisplayName}]\n`;
  for (const post of selected) {
    text += `\n[${post.timestamp}] 帖子: 【${post.title}】 by ${post.authorId}\n${post.content}\n`;
    if (post.comments.length > 0) {
      text += '评论: ';
      text += post.comments
        .slice(0, 5)
        .map(c => `[${c.timestamp}] ${c.authorId}: ${c.content}`)
        .join(' | ');
      text += '\n';
    }
  }
  return text;
}

export function formatChatHistoryAsContext(messages: { role: string; message: string }[]): string {
  if (messages.length === 0) return '';
  let text = '以下是当前剧情概要（最近的对话）：\n';
  for (const msg of messages) {
    const label = msg.role === 'user' ? '用户' : 'AI';
    text += `${label}: ${msg.message.substring(0, 200)}\n`;
  }
  return text;
}

export function createEmptyPosts(): Record<ForumSection, ForumPost[]> {
  return { 'A': [], 'B': [] };
}

export function getDefaultSettings(): ForumSettings {
  return {
    ZforumName: 'Z论坛',
    Zmodel: '',
    Ztheme: 'classic-dark',
    ZsectionAName: '现实讨论',
    ZsectionBName: '游戏中论坛',
    ZplayerForumId: '',
    ZauthorIdPrompt: DEFAULT_AUTHOR_ID_PROMPT,
    Zprompt_A: DEFAULT_PROMPT_A,
    Zprompt_B: DEFAULT_PROMPT_B,
    ZoutputFormat: DEFAULT_OUTPUT_FORMAT,
    ZpostCountHint: 3,
    ZcommentCountHint: 3,
    ZdecentralizedMode: false,
    Zposts: createEmptyPosts(),
    ZenableInjectToChat: true,
    ZinjectPostCount: 5,
    ZinjectChatHistoryCount: 10,
    ZautoGenerateInterval: 0,
    ZautoGenerateSection: 'B',
    ZautoAiReply: false,
  };
}
