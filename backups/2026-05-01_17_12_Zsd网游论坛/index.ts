import { createPinia, setActivePinia } from 'pinia';
import { createApp, reactive, watch } from 'vue';
import { reloadOnChatChange, createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { useForumSettingsStore } from './settings';
import { injectForumContext, uninjectForumContext, generatePosts, generatePostsForBothSections } from './aiGenerator';

const themeColors: Record<string, { bg: string; text: string }> = {
  'classic-dark': { bg: '#1f2937', text: '#93c5fd' },
  'cyberpunk': { bg: '#12122e', text: '#00ffff' },
  'vaporwave': { bg: '#2d1b4e', text: '#ff71ce' },
  'terminal': { bg: '#141414', text: '#33ff33' },
  'light': { bg: '#f3f4f6', text: '#2563eb' },
};

reloadOnChatChange();

const SCRIPT_ID = 'zsd-forum';

let $iframe: JQuery<HTMLIFrameElement> | null = null;
let app: ReturnType<typeof createApp> | null = null;
let styleTeleport: { destroy: () => void } | null = null;
let autoInjectCleanup: (() => void) | null = null;
let autoGenCleanup: (() => void) | null = null;

function openForum() {
  if ($iframe) {
    $iframe.parent().show();
    return;
  }

  const $container = $('<div>').attr('script_id', SCRIPT_ID).css({
    position: 'fixed',
    top: '80px',
    right: '20px',
    width: '420px',
    height: '560px',
    zIndex: '10000',
    border: '1px solid #374151',
    borderRadius: '8px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  });

  const $header = $('<div>').addClass('zsd-forum-drag-handle').css({
    height: '28px',
    minHeight: '28px',
    cursor: 'grab',
    flexShrink: '0',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    userSelect: 'none',
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
  });

  function updateHeaderStyle(theme: string, forumName: string) {
    if (theme === 'custom') {
      const store = useForumSettingsStore();
      const { ZcustomBg, ZcustomAccent } = store.settings;
      $header.css({ backgroundColor: ZcustomBg || '#111827', color: ZcustomAccent || '#60a5fa' }).text(forumName || 'Z论坛');
      return;
    }
    const colors = themeColors[theme] || themeColors['classic-dark'];
    $header.css({ backgroundColor: colors.bg, color: colors.text }).text(forumName || 'Z论坛');
  }

  $iframe = createScriptIdIframe().css({
    width: '100%',
    flex: '1',
    border: 'none',
  });

  const $overlay = $('<div>').addClass('zsd-forum-drag-overlay').css({
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '99999',
    cursor: 'grabbing',
    display: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  });

  $container.append($header).append($iframe).appendTo('body');
  $overlay.appendTo('body');

  let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

  $container.on('mousedown.zsdforum touchstart.zsdforum', '.zsd-forum-drag-handle', function(e) {
    $container.data('isDragging', false);
    const evt = e.type.indexOf('touch') !== -1 ? (e as any).originalEvent.touches[0] : e;
    dragStartX = evt.clientX;
    dragStartY = evt.clientY;
    const rect = ($container[0] as HTMLElement).getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    $overlay.show();
    if (e.type === 'mousedown') e.preventDefault();
  });

  $overlay.on('mousemove.zsdforum touchmove.zsdforum', function(e) {
    const moveEvt = e.type.indexOf('touch') !== -1 ? (e as any).originalEvent.touches[0] : e;
    const deltaX = moveEvt.clientX - dragStartX;
    const deltaY = moveEvt.clientY - dragStartY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      $container.data('isDragging', true);
      $container.css({
        left: (initialLeft + deltaX) + 'px',
        top: (initialTop + deltaY) + 'px',
        right: 'auto',
        bottom: 'auto',
      });
    }
    if (e.type === 'touchmove') e.preventDefault();
  });

  $overlay.on('mouseup.zsdforum touchend.zsdforum', function() {
    $overlay.hide();
    if ($container.data('isDragging')) {
      setTimeout(function() { $container.data('isDragging', false); }, 50);
    }
  });

  $iframe.on('load', () => {
    if (!$iframe) return;
    const doc = $iframe[0].contentDocument;
    if (!doc) {
      console.warn('[Zsd网游论坛] iframe contentDocument is null');
      return;
    }

    const style = doc.createElement('style');
    style.textContent = `
      html, body { height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background-color: transparent !important; }
    `;
    doc.head.appendChild(style);

    styleTeleport = teleportStyle(doc.head);

    setActivePinia(createPinia());
    const windowControls = reactive({ requestClose: false });
    app = createApp(App);
    app.provide('windowControls', windowControls);
    app.mount(doc.body);

    watch(() => windowControls.requestClose, v => {
      if (v) {
        windowControls.requestClose = false;
        closeForum();
      }
    });

    const store = useForumSettingsStore();
    updateHeaderStyle(store.settings.Ztheme, store.settings.ZforumName);
    watch(() => store.settings.Ztheme, (theme) => updateHeaderStyle(theme, store.settings.ZforumName));
    watch(() => store.settings.ZforumName, (name) => updateHeaderStyle(store.settings.Ztheme, name));

    injectForumContext();
    setupAutoInject();
    setupAutoGenerate();
  });
}

function closeForum() {
  if ($iframe) {
    const $container = $iframe.parent();
    $container.off('.zsdforum');
    $('.zsd-forum-drag-overlay').off('.zsdforum').remove();
    $container.remove();
    $iframe = null;
  }
  if (app) {
    app.unmount();
    app = null;
  }
  if (styleTeleport) {
    styleTeleport.destroy();
    styleTeleport = null;
  }
  if (autoInjectCleanup) {
    autoInjectCleanup();
    autoInjectCleanup = null;
  }
  if (autoGenCleanup) {
    autoGenCleanup();
    autoGenCleanup = null;
  }
  uninjectForumContext();
}

function setupAutoInject() {
  injectForumContext();
  const evt = eventOn(tavern_events.GENERATION_AFTER_COMMANDS, () => {
    injectForumContext();
  });
  autoInjectCleanup = () => {
    evt.stop();
  };
}

function setupAutoGenerate() {
  let msgCount = 0;
  let isGenerating = false;

  // 记录最近一次 GENERATION_STARTED 的上下文，用于在 GENERATION_ENDED 时做门控判定
  let lastGenContext: {
    type: string;
    dryRun: boolean;
    quietPrompt: string;
    automaticTrigger: boolean;
  } | null = null;

  function isQuietLikeGeneration(ctx: typeof lastGenContext): boolean {
    if (!ctx) return false;
    if (ctx.dryRun) return true;
    if (ctx.type === 'quiet') return true;
    if (ctx.quietPrompt) return true;
    if (ctx.automaticTrigger) return true;
    return false;
  }

  const startEvt = eventOn(tavern_events.GENERATION_STARTED, (type, option, dryRun) => {
    lastGenContext = {
      type,
      dryRun,
      quietPrompt: option?.quiet_prompt || '',
      automaticTrigger: !!option?.automatic_trigger,
    };
  });

  const endEvt = eventOn(tavern_events.GENERATION_ENDED, async () => {
    if (!app) return;

    // [门控] 过滤 quiet / dryRun / automatic_trigger 等后台生成
    if (isQuietLikeGeneration(lastGenContext)) {
      console.log(
        `[网游论坛] 跳过本轮 GENERATION_ENDED (type=${lastGenContext?.type}, dryRun=${lastGenContext?.dryRun}, quiet=${!!lastGenContext?.quietPrompt})`,
      );
      return;
    }

    // [门控] 如果上一轮自动生成还没结束，跳过（防止递归：我们的 generatePosts 也会触发 GENERATION_ENDED）
    if (isGenerating) {
      console.log('[网游论坛] 跳过 GENERATION_ENDED：论坛自动生成仍在执行中');
      return;
    }

    const store = useForumSettingsStore();
    const interval = store.settings.ZautoGenerateInterval;
    if (interval === 0) return;

    msgCount++;
    console.log(`[网游论坛] GENERATION_ENDED 触发 msgCount=${msgCount}/${interval === -1 ? '每轮' : interval}`);

    if (interval === -1 || msgCount >= interval) {
      msgCount = 0;
      isGenerating = true;
      const section = store.settings.ZautoGenerateSection;
      const sectionLabel = section === 'both' ? 'A+B' : store.getSectionName(section);
      console.log(`[网游论坛] 开始自动生成板块: ${sectionLabel}`);
      toastr.info(`[论坛] 正在生成 ${sectionLabel} 板块帖子…`);
      try {
        if (section === 'both') {
          const result = await generatePostsForBothSections();
          for (const post of result.A) store.addPost(post);
          for (const post of result.B) store.addPost(post);
          const total = result.A.length + result.B.length;
          toastr.success(`[论坛] 自动生成完成：共${total}个帖子（A:${result.A.length} B:${result.B.length}）`);
          console.log(`[网游论坛] 自动生成完成 A=${result.A.length} B=${result.B.length}`);
        } else {
          const posts = await generatePosts(section);
          for (const post of posts) {
            store.addPost(post);
          }
          toastr.success(`[论坛] 自动生成完成：${posts.length}个帖子`);
          console.log(`[网游论坛] 自动生成完成 ${posts.length}个帖子`);
        }
        injectForumContext();
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        console.error('[网游论坛] 自动生成失败:', e);
        toastr.error(`[论坛] 自动生成失败: ${errMsg}`);
      } finally {
        isGenerating = false;
        lastGenContext = null; // 清理上下文，避免 stale 数据
      }
    }
  });

  autoGenCleanup = () => {
    startEvt.stop();
    endEvt.stop();
  };
}

$(() => {
  appendInexistentScriptButtons([{ name: '论坛', visible: true }]);
  eventOn(getButtonEvent('论坛'), () => {
    if ($iframe && $iframe.parent().is(':visible')) {
      closeForum();
    } else {
      openForum();
    }
  });

  eventOn(tavern_events.CHAT_CHANGED, () => {
    try {
      const store = useForumSettingsStore();
      store.reloadFromVars();
      injectForumContext();
    } catch {}
  });

  $(window).on('pagehide', () => {
    closeForum();
  });
});
