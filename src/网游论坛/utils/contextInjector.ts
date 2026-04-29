import type { ForumSection } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { formatPostsAsInjectionText } from './forumUtils';

let uninjectFn: (() => void) | null = null;
const INJECT_ID = 'forum_context_inject';

function buildInjectionContent(): string {
  const settingsStore = useSettingsStore();
  const { settings } = settingsStore;
  if (!settings.ZenableInjectToChat) return '';

  const sections: ForumSection[] = ['A', 'B'];
  const parts: string[] = [];
  for (const section of sections) {
    const posts = settings.Zposts[section];
    const displayName = settingsStore.getSectionName(section);
    const text = formatPostsAsInjectionText(settings.ZforumName, displayName, posts, settings.ZinjectPostCount);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

export function injectForumContext(): void {
  uninjectForumContext();
  const content = buildInjectionContent();
  if (!content) return;

  const result = injectPrompts([
    {
      id: INJECT_ID,
      position: 'in_chat',
      depth: 0,
      role: 'system',
      content,
      should_scan: true,
    },
  ]);
  uninjectFn = result.uninject;
}

export function uninjectForumContext(): void {
  if (uninjectFn) {
    uninjectFn();
    uninjectFn = null;
  }
}

export function setupContextInjection(): () => void {
  injectForumContext();

  // 生成后刷新注入
  const off1 = eventOn(tavern_events.GENERATION_AFTER_COMMANDS, () => {
    injectForumContext();
  });

  // 注意：CHAT_CHANGED 在 index.ts 的 setupChatChangedReload() 中处理
  // 那里可以传入 piniaInstance，确保操作正确的 store 实例

  return () => {
    uninjectForumContext();
    off1.stop();
  };
}
