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
}
