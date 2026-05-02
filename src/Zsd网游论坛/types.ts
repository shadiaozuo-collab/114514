export interface ForumComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  isAiGenerated: boolean;
}

export interface ForumPost {
  id: string;
  section: string;
  title: string;
  content: string;
  authorId: string;
  timestamp: string;
  comments: ForumComment[];
  isAiGenerated: boolean;
  /** 模拟点赞数/热度 */
  likes: number;
  /** 记录该帖子是由哪条AI消息生成的（chat数组索引），用于回退同步 */
  sourceMessageIndex?: number;
  /** 扩展字段，赛事/报纸等类型存储结构化数据 */
  metadata?: Record<string, any>;
}

export interface SectionConfig {
  id: string;
  name: string;
  prompt: string;
  type: 'forum' | 'tournament' | 'newspaper';
}
