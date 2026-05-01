export interface ForumComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  isAiGenerated: boolean;
}

export interface ForumPost {
  id: string;
  section: 'A' | 'B';
  title: string;
  content: string;
  authorId: string;
  timestamp: string;
  comments: ForumComment[];
  isAiGenerated: boolean;
  /** 记录该帖子是由哪条AI消息生成的（chat数组索引），用于回退同步 */
  sourceMessageIndex?: number;
}
