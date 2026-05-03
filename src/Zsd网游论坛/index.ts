import { createPinia, setActivePinia } from 'pinia';
import { createApp, reactive, watch } from 'vue';
import { reloadOnChatChange, teleportStyle } from '@util/script';
import App from './App.vue';
import { useForumSettingsStore, useForumUiStore } from './settings';
import { injectForumContext, uninjectForumContext, generatePosts, generatePostsMerged, generatePostsSequential, cleanupOrphanPosts } from './aiGenerator';

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

  // 如果论坛已存在只是被隐藏了，直接显示并刷新数据
  if ($iframe && $iframe.parent().length) {
    const $container = $iframe.parent();
    if (!$container.is(':visible')) {
      $container.show();
      $('.zsd-forum-mobile-backdrop').show();
      // 重新加载数据（修复可能的错误数据）
      try {
        const store = useForumSettingsStore();
        store.reloadFromVars();
      } catch {}
      // 重新注入上下文和自动注入
      injectForumContext();
      if (!autoInjectCleanup) setupAutoInject();
      return;
    }
    // 如果已经可见，不做任何事（避免重复打开）
    return;
  }

  // 清理残留（理论上不应该有，但保险起见）
  destroyForum();
  $(`[script_id="${SCRIPT_ID}"]`).remove();
  $('.zsd-forum-drag-overlay').remove();

  const $container = $('<div>').attr('script_id', SCRIPT_ID).css(isMobile ? {
    position: 'fixed',
    top: '10vh',
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
      }).on('click.zsdforum', () => hideForum())
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
      if (el.tagName === 'SCRIPT') (el as HTMLScriptElement).async = false;
      doc.head.appendChild(el);
    }

    const style = doc.createElement('style');
    style.textContent = '*,*::before,*::after{box-sizing:border-box;}html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;height:100%!important;background-color:transparent!important;}';
    doc.head.appendChild(style);

    styleTeleport = teleportStyle(doc.head);

    // 启动容错：如果 Vue 初始化失败，尝试自动修复数据后重试一次
    let initSuccess = false;
    function tryInitForum() {
      try {
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
            hideForum();
          }
        });

        const store = useForumSettingsStore();
        updateHeaderStyle(store.settings.Ztheme, store.settings.ZforumName);
        watch(() => store.settings.Ztheme, (theme) => updateHeaderStyle(theme, store.settings.ZforumName));
        watch(() => store.settings.ZforumName, (name) => updateHeaderStyle(store.settings.Ztheme, name));

        injectForumContext();
        setupAutoInject();
        setupAutoGenerate();
        initSuccess = true;
        return true;
      } catch (e: any) {
        console.error('[Zsd网游论坛] Vue 初始化失败:', e);
        return false;
      }
    }

    if (!tryInitForum()) {
      // 第一次初始化失败，尝试修复数据后重试
      console.warn('[Zsd网游论坛] 首次初始化失败，尝试自动修复数据...');
      try {
        const store = useForumSettingsStore();
        const repaired = store.repairForumData();
        if (repaired) {
          // 清理残留后重试
          if (app) { app.unmount(); app = null; }
          if (styleTeleport) { styleTeleport.destroy(); styleTeleport = null; }
          // 清空 iframe body
          doc.body.innerHTML = '';
          const retryOk = tryInitForum();
          if (retryOk) {
            toastr.success('[论坛] 数据已自动修复，论坛加载成功');
          } else {
            showRepairFallback(doc);
          }
        } else {
          showRepairFallback(doc);
        }
      } catch (e) {
        showRepairFallback(doc);
      }
    }

    function showRepairFallback(doc: Document) {
      doc.body.innerHTML = `
        <div style="padding: 24px; color: #e5e7eb; font-family: sans-serif; text-align: center; background: #111827; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
          <div style="font-size: 16px; font-weight: bold; color: #f87171;">⚠️ 论坛数据损坏</div>
          <div style="font-size: 12px; color: #9ca3af; max-width: 260px;">帖子数据存在损坏，导致论坛无法加载。点击下方按钮可智能修复（保留所有设置和配置）。</div>
          <button id="zsd-repair-btn" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-top: 8px;">🔧 一键修复数据</button>
          <button id="zsd-clear-btn" style="padding: 6px 12px; background: transparent; color: #6b7280; border: 1px solid #374151; border-radius: 6px; font-size: 11px; cursor: pointer;">完全清理（会重置配置）</button>
        </div>
      `;
      const repairBtn = doc.getElementById('zsd-repair-btn');
      const clearBtn = doc.getElementById('zsd-clear-btn');
      if (repairBtn) {
        repairBtn.addEventListener('click', () => {
          try {
            const store = useForumSettingsStore();
            store.repairForumData();
            // 修复后刷新 iframe
            doc.location.reload();
          } catch (e: any) {
            alert('修复失败: ' + (e?.message || e));
          }
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          try {
            const store = useForumSettingsStore();
            store.clearAllForumVariables();
            doc.location.reload();
          } catch (e: any) {
            alert('清理失败: ' + (e?.message || e));
          }
        });
      }
    }
  } else {
    console.error('[Zsd网游论坛] iframe contentDocument 为 null，无法初始化');
  }
}

/**
 * 隐藏论坛面板（不销毁Vue应用和自动生成）
 * 这是点击关闭按钮时的行为，保持后台自动生成运行
 */
function hideForum() {
  if ($iframe) {
    const $container = $iframe.parent();
    $container.hide();
  }
  $('.zsd-forum-mobile-backdrop').hide();
  // 隐藏时停止向聊天注入上下文（避免隐藏期间干扰主AI）
  uninjectForumContext();
  if (autoInjectCleanup) {
    autoInjectCleanup();
    autoInjectCleanup = null;
  }
  // 清理孤儿帖子
  cleanupOrphanPosts();
}

/**
 * 彻底销毁论坛（释放所有资源）
 * 用于页面卸载等真正需要清理的场景
 */
function destroyForum() {
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

function setupAutoGenerate() {
  let msgCount = 0;

  // 使用队列记录 GENERATION_STARTED 的上下文，解决并发生成（如主AI+扩展quiet生成）时的上下文错乱问题
  // SillyTavern 中 GENERATION_STARTED 和 GENERATION_ENDED 是严格配对触发的，用 FIFO 队列可以正确对应
  type GenCtx = {
    type: string;
    dryRun: boolean;
    quietPrompt: string;
    automaticTrigger: boolean;
  };
  const genCtxQueue: GenCtx[] = [];

  function isQuietLikeGeneration(ctx: GenCtx | null): boolean {
    if (!ctx) return false;
    if (ctx.dryRun) return true;
    if (ctx.type === 'quiet') return true;
    if (ctx.quietPrompt) return true;
    if (ctx.automaticTrigger) return true;
    return false;
  }

  const startEvt = eventOn(tavern_events.GENERATION_STARTED, (type, option, dryRun) => {
    genCtxQueue.push({
      type,
      dryRun,
      quietPrompt: option?.quiet_prompt || '',
      automaticTrigger: !!option?.automatic_trigger,
    });
  });

  // 把异步逻辑从事件回调中抽离，避免阻塞 SillyTavern 事件系统（Firefox 可能对 async 回调行为不同）
  async function runAutoGenerate() {
    if (!app) return;

    const store = useForumSettingsStore();
    const uiStore = useForumUiStore();
    const interval = store.settings.ZautoGenerateInterval;

    // [门控] 如果上一轮自动生成还没结束，跳过
    if (uiStore.isGenerating) {
      console.log('[网游论坛] 跳过 GENERATION_ENDED：论坛自动生成仍在执行中');
      return;
    }

    // [门控] 自动生成已关闭
    if (interval === 0) {
      console.log('[网游论坛] 跳过 GENERATION_ENDED：自动生成间隔为 0（已关闭）');
      return;
    }

    // [字数检测] AI回复过短则跳过
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
    const remaining = interval === -1 ? 0 : Math.max(0, interval - msgCount);
    console.log(`[网游论坛] GENERATION_ENDED 触发 msgCount=${msgCount}/${interval === -1 ? '每轮' : interval}`);

    if (interval !== -1 && msgCount < interval) {
      toastr.info(`[论坛] 自动生成倒计时：还剩 ${remaining} 轮对话`);
      return;
    }

    // 达到触发条件，开始生成
    msgCount = 0;
    uiStore.isGenerating = true;
    uiStore.startGenerationTimer();
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
      uiStore.stopGenerationTimer();
    }
  }

  const endEvt = eventOn(tavern_events.GENERATION_ENDED, () => {
    if (!app) return;

    // 防队列累积：如果 SillyTavern 某次 started 没有对应的 ended（或反之），队列会增长
    if (genCtxQueue.length > 10) {
      console.warn(`[网游论坛] genCtxQueue 累积超过10个，清理旧项。当前长度=${genCtxQueue.length}`);
      while (genCtxQueue.length > 10) genCtxQueue.shift();
    }

    // 从队列中弹出对应的 GENERATION_STARTED 上下文（FIFO 配对）
    const genCtx = genCtxQueue.shift();
    if (!genCtx) {
      console.log('[网游论坛] 跳过 GENERATION_ENDED：没有匹配的 GENERATION_STARTED 上下文');
      return;
    }

    // [门控] 过滤 quiet / dryRun / automatic_trigger 等后台生成
    if (isQuietLikeGeneration(genCtx)) {
      const reason = `type=${genCtx.type}, dryRun=${genCtx.dryRun}, quiet=${!!genCtx.quietPrompt}`;
      console.log(`[网游论坛] 跳过本轮 GENERATION_ENDED (${reason})`);
      return;
    }

    // 启动独立异步任务，不阻塞事件回调
    void runAutoGenerate();
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
        hideForum();
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
      hideForum();
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
    destroyForum();
  });
});
