import { createPinia, setActivePinia } from 'pinia';
import { createApp, reactive, watch } from 'vue';
import { reloadOnChatChange, teleportStyle } from '@util/script';
import App from './App.vue';
import { useForumSettingsStore, useForumUiStore } from './settings';
import { injectForumContext, uninjectForumContext, generatePosts, generatePostsMerged, generatePostsSequential } from './aiGenerator';

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

function isMobileDevice() {
  // 调试用：localStorage 强制手机/桌面模式
  const force = localStorage.getItem('zsdForumForceMobile');
  if (force === '1') return true;
  if (force === '0') return false;

  // 通过 User Agent 明确检测手机（不包含 iPad/平板）
  const isPhone = /Android(?!.*Tablet)|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // 兜底：粗糙指针 + 不能悬停 + 小屏幕（用于 UA 检测失败的边缘情况）
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isNoHover = window.matchMedia('(hover: none)').matches;
  return isPhone || (isCoarsePointer && isNoHover && window.innerWidth <= 768);
}

function openForum() {
  const isMobile = isMobileDevice();

  // 强制清理：无论之前是否有窗口，都先彻底销毁再重建
  closeForum();
  $(`[script_id="${SCRIPT_ID}"]`).remove();
  $('.zsd-forum-drag-overlay').remove();

  const $container = $('<div>').attr('script_id', SCRIPT_ID).css(isMobile ? {
    position: 'fixed',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '92vw',
    maxWidth: '480px',
    height: '85vh',
    zIndex: '100000',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  } : {
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
    cursor: isMobile ? 'default' : 'grab',
    flexShrink: '0',
    borderRadius: isMobile ? '16px 16px 0 0' : '8px 8px 0 0',
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

  // 使用 about:blank + doc.write()，彻底绕过 srcdoc 的 race condition
  $iframe = $('<iframe>').attr({
    script_id: SCRIPT_ID + '-' + Date.now(),
    frameborder: 0,
    src: 'about:blank',
  }).css({
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

  // 手机端：添加半透明背景遮罩，点击即可关闭
  const $backdrop = isMobile
    ? $('<div>').addClass('zsd-forum-mobile-backdrop').css({
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '99999',
        backgroundColor: 'rgba(0,0,0,0.4)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }).on('click.zsdforum', () => closeForum())
    : null;

  $container.append($header).append($iframe).appendTo('body');
  if ($backdrop) $backdrop.appendTo('body');
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

  // 手动构建 iframe DOM，完全避免 doc.write() 的副作用
  const iframeEl = $iframe[0] as HTMLIFrameElement;
  const doc = iframeEl.contentDocument;
  if (doc) {
    // 添加外部资源
    const resources = [
      { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://testingcf.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/lib/tailwindcss.min.js' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/npm/jquery' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/npm/jquery-ui/dist/jquery-ui.min.js' } },
      { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://testingcf.jsdelivr.net/npm/jquery-ui/themes/base/theme.min.css' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/npm/jquery-ui-touch-punch' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/npm/lodash' } },
      { tag: 'script', attrs: { src: 'https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/src/iframe/adjust_iframe_height.js' } },
    ];
    for (const r of resources) {
      const el = doc.createElement(r.tag);
      for (const [k, v] of Object.entries(r.attrs)) el.setAttribute(k, v);
      doc.head.appendChild(el);
    }

    const style = doc.createElement('style');
    style.textContent = '*,*::before,*::after{box-sizing:border-box;}html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;height:100%!important;background-color:transparent!important;}';
    doc.head.appendChild(style);

    styleTeleport = teleportStyle(doc.head);

    setActivePinia(createPinia());
    const windowControls = reactive({ requestClose: false });
    app = createApp(App);
    app.provide('windowControls', windowControls);
    app.config.errorHandler = (err, instance, info) => {
      console.error('[Zsd网游论坛] Vue 渲染错误:', err, info);
      // 在 iframe body 中显示错误提示，避免透明空框
      if (doc && doc.body && doc.body.children.length === 0) {
        doc.body.innerHTML = `
          <div style="padding: 20px; color: #ef4444; font-family: sans-serif; text-align: center;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">⚠️ 论坛加载失败</div>
            <div style="font-size: 12px; color: #9ca3af;">${(err as Error)?.message || '未知错误'}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 12px;">请尝试刷新页面或切换对话后重试</div>
          </div>
        `;
      }
    };
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
  } else {
    console.error('[Zsd网游论坛] iframe contentDocument 为 null，无法初始化');
  }
}

function closeForum() {
  $('.zsd-forum-mobile-backdrop').off('.zsdforum').remove();
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

function getLastAiMessageLength(): number {
  try {
    const chat = SillyTavern.getContext().chat;
    if (!chat || chat.length === 0) return Infinity;
    for (let i = chat.length - 1; i >= 0; i--) {
      const msg = chat[i];
      if (!msg.is_user) {
        const content = msg.mes || msg.message || '';
        return content.length;
      }
    }
  } catch (e) {}
  return Infinity;
}

/** 扫描所有AI消息的extra，收集被引用的帖子ID，清理孤儿帖子 */
function cleanupOrphanPosts() {
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

function setupAutoGenerate() {
  let msgCount = 0;

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

    const store = useForumSettingsStore();
    const uiStore = useForumUiStore();

    // [门控] 如果上一轮自动生成还没结束，跳过（防止递归：我们的 generatePosts 也会触发 GENERATION_ENDED）
    if (uiStore.isGenerating) {
      console.log('[网游论坛] 跳过 GENERATION_ENDED：论坛自动生成仍在执行中');
      return;
    }
    const interval = store.settings.ZautoGenerateInterval;
    if (interval === 0) return;

    // [字数检测] AI回复过短则跳过，避免用截断/空回内容生成无效帖子
    const minLen = store.settings.ZminReplyLength;
    if (minLen > 0) {
      const lastAiLen = getLastAiMessageLength();
      if (lastAiLen < minLen) {
        console.log(`[网游论坛] AI回复过短(${lastAiLen}字符<${minLen})，跳过自动生成`);
        toastr.info(`[论坛] AI回复过短(${lastAiLen}字符)，跳过自动生成`);
        return;
      }
    }

    msgCount++;
    console.log(`[网游论坛] GENERATION_ENDED 触发 msgCount=${msgCount}/${interval === -1 ? '每轮' : interval}`);

    if (interval === -1 || msgCount >= interval) {
      msgCount = 0;
      uiStore.isGenerating = true;
      const section = store.settings.ZautoGenerateSection;
      const allSectionIds = store.settings.Zsections.map(s => s.id);
      const isAll = section === 'all';
      const targetSections = isAll ? allSectionIds : [section];
      const sectionLabel = isAll ? '全部板块' : store.getSectionName(section);
      console.log(`[网游论坛] 开始自动生成板块: ${sectionLabel}`);
      toastr.info(`[论坛] 正在生成 ${sectionLabel} 帖子…`);
      try {
        if (targetSections.length === 1) {
          const posts = await generatePosts(targetSections[0]);
          for (const post of posts) {
            store.addPost(post);
          }
          toastr.success(`[论坛] 自动生成完成：${posts.length}个帖子`);
          console.log(`[网游论坛] 自动生成完成 ${posts.length}个帖子`);
        } else if (store.settings.ZautoGenerateMode === 'merged') {
          const result = await generatePostsMerged(targetSections);
          let total = 0;
          for (const [secId, posts] of Object.entries(result)) {
            for (const post of posts) store.addPost(post);
            total += posts.length;
          }
          const details = Object.entries(result).map(([k, v]) => `${store.getSectionName(k)}:${v.length}`).join(' ');
          toastr.success(`[论坛] 自动生成完成：共${total}个帖子（${details}）`);
          console.log(`[网游论坛] 自动生成完成 ${details}`);
        } else {
          const result = await generatePostsSequential(targetSections);
          let total = 0;
          for (const [secId, posts] of Object.entries(result)) {
            for (const post of posts) store.addPost(post);
            total += posts.length;
          }
          const details = Object.entries(result).map(([k, v]) => `${store.getSectionName(k)}:${v.length}`).join(' ');
          toastr.success(`[论坛] 自动生成完成：共${total}个帖子（${details}）`);
          console.log(`[网游论坛] 自动生成完成 ${details}`);
        }
        injectForumContext();
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        console.error('[网游论坛] 自动生成失败:', e);
        toastr.error(`[论坛] 自动生成失败: ${errMsg}`);
      } finally {
        uiStore.isGenerating = false;
        lastGenContext = null; // 清理上下文，避免 stale 数据
      }
    }
  });

  autoGenCleanup = () => {
    startEvt.stop();
    endEvt.stop();
  };
}

function registerExtensionMenuItem() {
  try {
    const parentDoc = (window.parent || window).document;
    const $extMenu = $('#extensionsMenu', parentDoc);
    if (!$extMenu.length) {
      setTimeout(registerExtensionMenuItem, 2000);
      return;
    }
    if ($extMenu.find('#zsd-forum-menu-item').length > 0) return;

    const $item = $(`
      <div class="list-group-item flex-container flexGap5 interactable" id="zsd-forum-menu-item" title="打开/关闭网游论坛">
        <div class="fa-fw fa-solid fa-comments extensionsMenuExtensionButton"></div>
        <span>网游论坛</span>
      </div>
    `);
    $item.on('click', () => {
      const $btn = $('#extensionsMenuButton', parentDoc);
      if ($btn.length && $extMenu.is(':visible')) {
        $btn.trigger('click');
      }
      if ($iframe && $iframe.parent().is(':visible')) {
        closeForum();
      } else {
        openForum();
      }
    });
    $extMenu.append($item);
    console.log('[网游论坛] 已注册到扩展菜单');
  } catch (e) {
    console.warn('[网游论坛] 注册扩展菜单失败:', e);
  }
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
  registerExtensionMenuItem();

  eventOn(tavern_events.CHAT_CHANGED, () => {
    try {
      const store = useForumSettingsStore();
      store.reloadFromVars();
      injectForumContext();
    } catch {}
  });

  // [回退同步] 监听消息删除 / Swipe，清理对应帖子
  eventOn(tavern_events.MESSAGE_DELETED, () => {
    console.log('[网游论坛] MESSAGE_DELETED 触发，执行回退同步');
    cleanupOrphanPosts();
  });

  eventOn(tavern_events.MESSAGE_SWIPED, (messageId) => {
    console.log(`[网游论坛] MESSAGE_SWIPED 触发(messageId=${messageId})，执行回退同步`);
    try {
      const ctx = SillyTavern.getContext();
      const chat = ctx.chat;
      const msg = chat?.[messageId];
      if (msg && msg.extra?.zsdForumGeneration) {
        delete msg.extra.zsdForumGeneration;
      }
    } catch (e) {}
    cleanupOrphanPosts();
  });

  $(window).on('pagehide', () => {
    closeForum();
  });
});
