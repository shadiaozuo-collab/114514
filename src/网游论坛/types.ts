/** 板块内部标识：A / B（显示名在设置中自定义） */
export type ForumSection = 'A' | 'B';

export const FORUM_SECTIONS: ForumSection[] = ['A', 'B'];

/** 论坛主题风格 */
export type ForumTheme = 'classic-dark' | 'cyberpunk' | 'vaporwave' | 'terminal' | 'light';

export const FORUM_THEMES: { value: ForumTheme; label: string }[] = [
  { value: 'classic-dark', label: '经典暗黑' },
  { value: 'cyberpunk', label: '赛博朋克' },
  { value: 'vaporwave', label: '蒸汽波' },
  { value: 'terminal', label: '终端绿' },
  { value: 'light', label: '简约白' },
];

export interface ForumComment {
  id: string;
  authorId: string;
  content: string;
  /** 故事内时间，如"第一天·傍晚"、"第三章·深夜"，由 AI 根据上下文生成 */
  timestamp: string;
  isAiGenerated: boolean;
}

export interface ForumPost {
  id: string;
  section: ForumSection;
  title: string;
  content: string;
  authorId: string;
  /** 故事内时间，如"第一天·傍晚"、"第三章·深夜"，由 AI 根据上下文生成 */
  timestamp: string;
  comments: ForumComment[];
  isAiGenerated: boolean;
}

/** 论坛设置 — 所有字段名以 Z 开头，与酒馆其他脚本的变量区分 */
export interface ForumSettings {
  ZforumName: string;
  Zmodel: string;
  /** 论坛主题风格 */
  Ztheme: ForumTheme;
  /** 板块A的显示名称 */
  ZsectionAName: string;
  /** 板块B的显示名称 */
  ZsectionBName: string;
  /** 玩家的论坛ID */
  ZplayerForumId: string;
  /** AI 生成 ID 的提示词，指导 AI 生成什么风格的用户名/ID */
  ZauthorIdPrompt: string;
  /** 板块A的系统提示词 */
  Zprompt_A: string;
  /** 板块B的系统提示词 */
  Zprompt_B: string;
  /** 输出格式提示，追加到系统提示词末尾，提醒 AI 保持格式 */
  ZoutputFormat: string;
  /** 每次批量生成建议的帖子数量（AI 提示词级别，非硬限制） */
  ZpostCountHint: number;
  /** 每个帖子建议的评论数量（AI 提示词级别，非硬限制） */
  ZcommentCountHint: number;
  /** 去中心化模式：开启后提示 AI 不要只围绕主角生成内容 */
  ZdecentralizedMode: boolean;
  Zposts: Record<ForumSection, ForumPost[]>;
  ZenableInjectToChat: boolean;
  ZinjectPostCount: number;
  ZinjectChatHistoryCount: number;
  ZautoGenerateInterval: number;
  ZautoGenerateSection: ForumSection;
  /** 用户发帖/评论后自动生成AI回复 */
  ZautoAiReply: boolean;
}

export const DEFAULT_OUTPUT_FORMAT = `你必须严格按照以下JSON结构输出，不要添加、删除或重命名字段：

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

export const DEFAULT_PROMPT_A = `你是一个现实世界的网络论坛用户。请根据上下文生成论坛帖子和评论。
要求：
- 使用自然的网络用语风格
- 帖子主题围绕现实生活、社会话题、日常讨论
- 每个用户有独特的用户名和发言风格
- 评论应该有不同观点的碰撞
- 帖子内容应当与当前剧情有一定关联性
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

export const DEFAULT_PROMPT_B = `你是一个网游世界中的玩家。请根据游戏上下文生成游戏内论坛的帖子和评论。
要求：
- 使用游戏玩家术语和黑话
- 帖子主题围绕游戏攻略、装备讨论、副本组队、PK恩怨等
- 每个用户有独特的游戏ID和发言风格
- 评论应该体现不同等级、职业玩家的视角差异
- 适当提及游戏中的事件、版本更新、活动等
- 帖子内容应当与当前游戏剧情/事件有关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

/** 兼容旧变量名的映射（旧→新），用于迁移旧数据 */
export const LEGACY_FIELD_MAP: Record<string, string> = {
  Zprompt_现实讨论: 'Zprompt_A',
  Zprompt_游戏中论坛: 'Zprompt_B',
};

export const DEFAULT_DECENTRALIZED_PROMPT = `\n\n【去中心化模式】注意：论坛内容不应只围绕主角或主角的社交圈。大部分帖子应该是由与主角无关的普通论坛用户发起的，反映更广泛的世界动态、其他玩家的日常讨论、边缘话题等。只有少数帖子可以与主角相关。`;

/** AI 生成 authorId（用户名/ID）的默认提示词 */
export const DEFAULT_AUTHOR_ID_PROMPT = `生成的用户ID应符合论坛语境：网游风格ID（如：剑影无痕、暗夜刺客、小虾米、龙城飞将），或现实网络风格（如：路人甲、加班到天亮、咖啡续命中）。每个ID应有独特个性，避免过于普通。不要生成与主角相关的ID。`;
