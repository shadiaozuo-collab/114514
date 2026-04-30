import { createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { setupContextInjection, injectForumContext } from './utils/contextInjector';
import { generatePosts } from './utils/aiGenerator';
import { useSettingsStore } from './stores/settingsStore';

type ForumState = 'inactive' | 'minimized' | 'expanded';
let forumState: ForumState = 'inactive';
let appInstance: ReturnType<typeof createApp> | null = null;
let piniaInstance: ReturnType<typeof createPinia> | null = null;
let cleanupInjection: (() => void) | null = null;
let autoGenCleanup: (() => void) | null = null;
let chatChangedCleanup: (() => void) | null = null;
let $ball: JQuery<HTMLElement> | null = null;
let $panel: JQuery<HTMLElement> | null = null;
let $app: JQuery<HTMLIFrameElement> | null = null;
let styleDestroy: { destroy: () => void } | null = null;

// 响应式窗口控制状态，通过 app.provide 传给 Vue 应用
const windowControls = reactive({
  showSettings: false,
  requestMinimize: false,
});

// ─── 移动端检测 ──────────────────────────────────────────

function isMobile(): boolean {
  return window.innerWidth < 768;
}

// ─── 悬浮球 ────────────────────────────────────────────

function createFloatingBall() {
  const ball = document.createElement('div');
  ball.id = 'forum-floating-ball';
  ball.title = '点击展开/收起论坛';
  const mobile = isMobile();
  const ballSize = mobile ? '50px' : '44px';
  const iconSize = mobile ? '20px' : '18px';
  Object.assign(ball.style, {
    position: 'fixed',
    bottom: mobile ? '80px' : '100px',
    right: mobile ? '12px' : '20px',
    width: ballSize,
    height: ballSize,
    borderRadius: '50%',
    backgroundColor: 'rgba(30, 64, 175, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: '10001',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    userSelect: 'none',
    touchAction: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
  });

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-globe';
  Object.assign(icon.style, {
    color: '#93c5fd',
    fontSize: iconSize,
    pointerEvents: 'none',
  });
  ball.appendChild(icon);

  // 统一处理鼠标和触摸的点击 vs 拖拽区分
  let downPos: { x: number; y: number } | null = null;
  let downTime = 0;

  function onDown(x: number, y: number) {
    downPos = { x, y };
    downTime = Date.now();
  }
  function onUp(x: number, y: number) {
    if (!downPos) return;
    const dx = Math.abs(x - downPos.x);
    const dy = Math.abs(y - downPos.y);
    const dt = Date.now() - downTime;
    // 移动距离小且时间短视为点击
    if (dx < 10 && dy < 10 && dt < 300) {
      togglePanel();
    }
    downPos = null;
  }

  // 鼠标事件
  ball.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onDown(e.clientX, e.clientY);
  });
  ball.addEventListener('mouseup', (e) => onUp(e.clientX, e.clientY));

  // 触摸事件（移动端）
  ball.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    onDown(t.clientX, t.clientY);
  }, { passive: true });
  ball.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    onUp(t.clientX, t.clientY);
  });

  // 悬停效果（仅桌面）
  ball.addEventListener('mouseenter', () => {
    if (isMobile()) return;
    Object.assign(ball.style, {
      transform: 'scale(1.1)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
      backgroundColor: 'rgba(37, 99, 235, 0.9)',
    });
  });
  ball.addEventListener('mouseleave', () => {
    if (isMobile()) return;
    Object.assign(ball.style, {
      transform: 'scale(1)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      backgroundColor: 'rgba(30, 64, 175, 0.85)',
    });
  });

  // 添加到酒馆页面 body
  $('body').append(ball);

  // jQuery 引用，用于 draggable
  $ball = $(ball);
  if (!mobile) {
    // 桌面端用 jQuery UI draggable
    $ball.draggable({
      iframeFix: true,
      containment: 'window',
    });
  }
}

// ─── 面板 ──────────────────────────────────────────────

function createPanel() {
  // 拖拽条：面板顶部的薄色带，用于拖动整个面板
  const dragStrip = document.createElement('div');
  Object.assign(dragStrip.style, {
    height: '8px',
    minHeight: '8px',
    backgroundColor: '#1e40af',
    cursor: 'move',
    flexShrink: '0',
    borderRadius: '8px 8px 0 0',
    touchAction: 'none',
  });

  // 移动端 vs 桌面端面板尺寸
  const mobile = isMobile();

  // 面板容器（默认隐藏，由 activateForum() 控制显隐）
  $panel = $('<div>').css({
    position: 'fixed',
    top: mobile ? '0' : '80px',
    right: mobile ? '0' : '20px',
    bottom: mobile ? '0' : undefined,
    width: mobile ? '100vw' : '400px',
    height: mobile ? '100vh' : '520px',
    zIndex: '10000',
    border: mobile ? 'none' : '1px solid #374151',
    borderRadius: mobile ? '0' : '8px',
    boxShadow: mobile ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'none', // 默认隐藏！
    flexDirection: 'column',
    backgroundColor: 'transparent',
  });

  // iframe
  $app = createScriptIdIframe();
  $app.css({
    width: '100%',
    flex: '1',
    border: 'none',
  });

  $panel.append($(dragStrip)).append($app).appendTo('body');

  // 面板通过拖拽条拖动（仅桌面端）
  if (!mobile) {
    $panel.draggable({
      handle: $(dragStrip),
      iframeFix: true,
    });
  }

  // 挂载 Vue 应用
  mountVueApp();
}

function mountVueApp() {
  if (!$app) return;

  const pinia = createPinia();
  piniaInstance = pinia;

  const app = createApp(App).use(pinia);
  appInstance = app;

  // 通过 Vue DI 传递窗口控制状态
  app.provide('windowControls', windowControls);

  $app!.on('load', () => {
    if (!$app) return;

    const iframeDoc = $app[0].contentDocument;
    if (!iframeDoc) {
      console.warn('[网游论坛] iframe contentDocument is null');
      return;
    }

    // 修复 iframe 内 html/body 高度，确保 height:100% 正确解析
    // 背景色由 Vue 应用的主题 CSS 变量控制，此处设为 transparent
    const fixStyle = iframeDoc.createElement('style');
    fixStyle.textContent = `
      html, body {
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background-color: transparent !important;
      }
    `;
    iframeDoc.head.appendChild(fixStyle);

    // 移动端 viewport 适配
    const mobileViewport = iframeDoc.createElement('meta');
    mobileViewport.name = 'viewport';
    mobileViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    iframeDoc.head.appendChild(mobileViewport);

    styleDestroy = teleportStyle(iframeDoc.head);

    app.mount(iframeDoc.body);

    cleanupInjection = setupContextInjection();
  });

  autoGenCleanup = setupAutoGeneration();
  chatChangedCleanup = setupChatChangedReload();
}

// ─── 状态切换 ──────────────────────────────────────────

function togglePanel() {
  if (forumState === 'expanded') {
    minimizePanel();
  } else if (forumState === 'minimized') {
    expandPanel();
  }
}

function minimizePanel() {
  if ($panel) $panel.hide();
  windowControls.showSettings = false;
  forumState = 'minimized';
}

function expandPanel() {
  if ($panel) $panel.show();
  forumState = 'expanded';
}

/** 激活论坛功能（创建悬浮球 + 最小化面板，只显示球） */
function activateForum() {
  createFloatingBall();
  createPanel();
  // 面板默认隐藏，只显示悬浮球
  forumState = 'minimized';
}

/** 完全关闭论坛功能（移除悬浮球 + 面板） */
function deactivateForum() {
  if (autoGenCleanup) { autoGenCleanup(); autoGenCleanup = null; }
  if (chatChangedCleanup) { chatChangedCleanup(); chatChangedCleanup = null; }
  if (cleanupInjection) { cleanupInjection(); cleanupInjection = null; }
  if (appInstance) { appInstance.unmount(); appInstance = null; }
  if (styleDestroy) { styleDestroy.destroy(); styleDestroy = null; }
  if ($panel) {
    try { $panel.draggable('destroy'); } catch { /* ignore */ }
    $panel.remove();
    $panel = null;
  }
  if ($ball) {
    try { $ball.draggable('destroy'); } catch { /* ignore */ }
    $ball.remove();
    $ball = null;
  }
  $app = null;
  piniaInstance = null;
  forumState = 'inactive';
  windowControls.showSettings = false;
  windowControls.requestMinimize = false;
}

// ─── 自动生成 ──────────────────────────────────────────

function setupAutoGeneration(): () => void {
  let messageCount = 0;
  let isAutoGenerating = false;

  const off = eventOn(tavern_events.MESSAGE_RECEIVED, async () => {
    if (!appInstance || !piniaInstance) return;
    const { settings } = useSettingsStore(piniaInstance);
    const interval = settings.ZautoGenerateInterval;
    if (interval === 0) return;

    messageCount++;
    if (interval === -1 || messageCount >= interval) {
      messageCount = 0;
      if (isAutoGenerating) return;
      isAutoGenerating = true;
      try {
        const section = settings.ZautoGenerateSection;
        const posts = await generatePosts(section);
        for (const post of posts) {
          settings.Zposts[section].unshift(post);
        }
        injectForumContext();
        toastr.success(`[论坛] 自动生成了${posts.length}个帖子`);
      } catch (e) {
        console.warn('[网游论坛] 自动生成失败:', e);
      } finally {
        isAutoGenerating = false;
      }
    }
  });

  return off;
}

// ─── 聊天切换时重新加载脚本变量 ────────────────────────
// 使用聊天变量 (type:'chat') 后，每个聊天文件有独立的变量空间
// CHAT_CHANGED 时需要重新读取新聊天的变量

function setupChatChangedReload(): () => void {
  const off = eventOn(tavern_events.CHAT_CHANGED, () => {
    // 使用 piniaInstance 确保操作 iframe 内 Vue app 的同一个 store 实例
    if (piniaInstance) {
      const settingsStore = useSettingsStore(piniaInstance);
      settingsStore.reloadFromVars();
    }
    injectForumContext();
  });
  return off;
}

// ─── 监听 Vue 应用的最小化请求 ────────────────────────

watch(() => windowControls.requestMinimize, (val) => {
  if (val) {
    minimizePanel();
    windowControls.requestMinimize = false;
  }
});

// ─── 入口 ──────────────────────────────────────────────

$(() => {
  appendInexistentScriptButtons([{ name: '论坛', visible: true }]);

  eventOn(getButtonEvent('论坛'), () => {
    if (forumState === 'inactive') {
      activateForum();
      expandPanel();
    } else {
      togglePanel();
    }
  });

  // 延迟自动激活，确保酒馆助手脚本上下文完全就绪后再创建悬浮球
  // 如果太早调用，getScriptId() 等函数可能尚未可用
  setTimeout(() => {
    if (forumState === 'inactive') {
      try {
        activateForum();
      } catch (e) {
        console.warn('[网游论坛] 自动激活失败，请点击「论坛」按钮手动激活:', e);
      }
    }
  }, 1500);

  $(window).on('pagehide', () => {
    deactivateForum();
  });
});
