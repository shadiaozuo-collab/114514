import { createPinia, setActivePinia } from 'pinia';
import { createApp, reactive, watch } from 'vue';
import { reloadOnChatChange, teleportStyle } from '@util/script';
import App from './App.vue';
import { useForumSettingsStore, useForumUiStore } from './settings';
import { injectForumContext, uninjectForumContext, generatePosts, generatePostsMerged, generatePostsSequential, cleanupOrphanPosts } from './aiGenerator';
import { TAILWIND_JS, FONTAWESOME_CSS, JQUERY_JS, ADJUST_IFRAME_JS } from './vendor';

const themeColors: Record<string, { bg: string; text: string }> = {
  'classic-dark': { bg: '#1f2937', text: '#93c5fd' },
  'cyberpunk': { bg: '#12122e', text: '#00ffff' },
  'vaporwave': { bg: '#2d1b4e', text: '#ff71ce' },
  'terminal': { bg: '#141414', text: '#33ff33' },
  'light': { bg: '#f3f4f6', text: '#2563eb' },
};

// ========== 多层容错诊断层 ==========
// 不依赖 Vue、不依赖 CSS、不依赖 CDN，纯原生 DOM API
// 即使论坛完全空白，这个层也会显示，用户截图即可定位问题

function createDiagnosticLayer(doc: Document): HTMLDivElement | null {
  try {
    const d = doc.createElement('div');
    d.id = 'zsd-diag';
    d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#0f0;font-family:monospace,serif;font-size:12px;padding:8px;white-space:pre-wrap;z-index:2147483647;overflow:auto;line-height:1.5;word-break:break-all;';
    d.textContent = '[Zsd网游论坛] 诊断层已启动\n';
    // 不依赖 body 是否就绪，直接挂到 documentElement
    if (doc.body) doc.body.appendChild(d);
    else doc.documentElement.appendChild(d);
    return d;
  } catch (e) {
    return null;
  }
}

function diagLog(diag: HTMLDivElement | null, msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  // 第一层：诊断 div
  try {
    if (diag) diag.textContent += line;
  } catch (e) {
    // 第二层：alert（浏览器最基础弹窗，几乎不可能失效）
    try {
      alert('Zsd论坛诊断: ' + msg);
    } catch (e2) {
      // 第三层：父窗口 toastr
      try {
        if (window.parent && (window.parent as any).toastr) {
          (window.parent as any).toastr.warning('Zsd论坛: ' + msg);
        }
      } catch (e3) {}
    }
  }
  // 第四层：console（远程调试 / chrome://inspect 可用）
  console.log('[Zsd-diag]', msg);
}

function hideDiagnosticLayer(diag: HTMLDivElement | null) {
  try {
    if (diag) diag.style.display = 'none';
  } catch (e) {}
}

// Tailwind CSS 关键类名 fallback：当 CDN 加载失败时确保论坛基本布局可用
const FALLBACK_CSS = `
.forum-window{display:flex;flex-direction:column;height:100%;overflow:hidden;position:relative;}
.relative{position:relative;}.absolute{position:absolute;top:0;right:0;bottom:0;left:0;}
.inset-0{top:0;right:0;bottom:0;left:0;}
.flex{display:flex;}.flex-col{flex-direction:column;}
.items-center{align-items:center;}.justify-between{justify-content:space-between;}
.justify-center{justify-content:center;}.shrink-0{flex-shrink:0;}.flex-1{flex:1 1 0%;}
.h-full{height:100%;}.w-full{width:100%;}.min-w-0{min-width:0;}
.overflow-hidden{overflow:hidden;}.overflow-y-auto{overflow-y:auto;}.overflow-x-auto{overflow-x:auto;}
.z-0{z-index:0;}.z-\\[1\\]{z-index:1;}.z-\\[2\\]{z-index:2;}.z-20{z-index:20;}
.p-2{padding:0.5rem;}.p-3{padding:0.75rem;}
.px-1{padding-left:0.25rem;padding-right:0.25rem;}
.px-2{padding-left:0.5rem;padding-right:0.5rem;}
.px-3{padding-left:0.75rem;padding-right:0.75rem;}
.py-1{padding-top:0.25rem;padding-bottom:0.25rem;}
.py-1\\.5{padding-top:0.375rem;padding-bottom:0.375rem;}
.py-2{padding-top:0.5rem;padding-bottom:0.5rem;}
.gap-0\\.5{gap:0.125rem;}.gap-1{gap:0.25rem;}
.gap-1\\.5{gap:0.375rem;}.gap-2{gap:0.5rem;}.gap-3{gap:0.75rem;}
.space-y-2>*+*{margin-top:0.5rem;}.space-y-3>*+*{margin-top:0.75rem;}
.mb-0\\.5{margin-bottom:0.125rem;}.mb-1{margin-bottom:0.25rem;}
.mb-2{margin-bottom:0.5rem;}.mb-3{margin-bottom:0.75rem;}
.mt-0\\.5{margin-top:0.125rem;}.mt-1{margin-top:0.25rem;}.mt-2{margin-top:0.5rem;}
.ml-1{margin-left:0.25rem;}.ml-1\\.5{margin-left:0.375rem;}
.mr-1{margin-right:0.25rem;}.mr-1\\.5{margin-right:0.375rem;}
.rounded{border-radius:0.25rem;}.rounded-md{border-radius:0.375rem;}
.border{border-width:1px;border-style:solid;}
.border-b{border-bottom-width:1px;border-bottom-style:solid;}
.border-b-2{border-bottom-width:2px;border-bottom-style:solid;}
.border-l{border-left-width:1px;border-left-style:solid;}
.border-t{border-top-width:1px;border-top-style:solid;}
.text-center{text-align:center;}.text-left{text-align:left;}
.text-xs{font-size:0.75rem;line-height:1rem;}
.text-sm{font-size:0.875rem;line-height:1.25rem;}
.text-lg{font-size:1.125rem;line-height:1.75rem;}
.text-\\[8px\\]{font-size:8px;}.text-\\[10px\\]{font-size:10px;}.text-\\[11px\\]{font-size:11px;}
.font-bold{font-weight:700;}.font-semibold{font-weight:600;}.font-medium{font-weight:500;}
.block{display:block;}.inline-block{display:inline-block;}.hidden{display:none;}
.cursor-pointer{cursor:pointer;}.cursor-grab{cursor:grab;}
.cursor-default{cursor:default;}.cursor-wait{cursor:wait;}
.whitespace-pre-wrap{white-space:pre-wrap;}.break-all{word-break:break-all;}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.outline-none{outline:2px solid transparent;outline-offset:2px;}
.resize-none{resize:none;}
.transition-colors{transition-property:color,background-color,border-color;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms;}
.disabled\\:opacity-50:disabled{opacity:0.5;}
.text-\\[var\\(--f-text\\)\\]{color:#e5e7eb!important;}
.text-\\[var\\(--f-text-secondary\\)\\]{color:#9ca3af!important;}
.text-\\[var\\(--f-text-muted\\)\\]{color:#6b7280!important;}
.text-\\[var\\(--f-accent\\)\\]{color:#60a5fa!important;}
.text-\\[var\\(--f-danger\\)\\]{color:#f87171!important;}
.text-\\[var\\(--f-author\\)\\]{color:#4ade80!important;}
.bg-\\[var\\(--f-bg\\)\\]{background-color:#111827!important;}
.bg-\\[var\\(--f-bg-card\\)\\]{background-color:#1f2937!important;}
.bg-\\[var\\(--f-bg-input\\)\\]{background-color:#374151!important;}
.bg-\\[var\\(--f-bg-hover\\)\\]{background-color:#4b5563!important;}
.bg-\\[var\\(--f-accent-bg\\)\\]{background-color:#2563eb!important;}
.bg-\\[var\\(--f-danger-bg\\)\\]{background-color:#7f1d1d!important;}
.border-\\[var\\(--f-border\\)\\]{border-color:#374151!important;}
.border-\\[var\\(--f-border-hover\\)\\]{border-color:#4b5563!important;}
.hover\\:text-\\[var\\(--f-text\\)\\]:hover{color:#e5e7eb!important;}
.hover\\:text-\\[var\\(--f-accent\\)\\]:hover{color:#60a5fa!important;}
.hover\\:bg-\\[var\\(--f-bg-hover\\)\\]:hover{background-color:#4b5563!important;}
.hover\\:border-\\[var\\(--f-text\\)\\]:hover{border-color:#e5e7eb!important;}
`;

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
  console.log('[Zsd网游论坛] openForum() 被调用');
  const isMobile = isMobileDevice();

  // 如果论坛已存在只是被隐藏了，直接显示并刷新数据
  if ($iframe && $iframe.parent().length) {
    console.log('[Zsd网游论坛] 论坛已存在，检查可见性');
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
    left: '0',
    right: '0',
    margin: '0 auto',
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
  console.log('[Zsd网游论坛] iframe 元素已创建，src=', iframeEl.src);
  const doc = iframeEl.contentDocument;
  console.log('[Zsd网游论坛] contentDocument=', doc ? '可用' : 'NULL');

  // ========== 诊断层：在注入任何资源之前就创建 ==========
  let diag: HTMLDivElement | null = null;
  if (doc) {
    diag = createDiagnosticLayer(doc);
    diagLog(diag, 'openForum() 开始');
    diagLog(diag, `设备类型: ${isMobile ? '手机' : '桌面'}`);
    diagLog(diag, `iframe src: ${iframeEl.src}`);
    diagLog(diag, `contentDocument: ${doc ? '可用' : 'NULL'}`);
  }

  if (doc) {
    // 延迟到下一帧执行 heavy 初始化，避免点击论坛按钮时主线程卡顿
    requestAnimationFrame(() => {
      diagLog(diag, 'requestAnimationFrame 执行');
      // ========== 本地版：内联注入资源，彻底摆脱 CDN 依赖 ==========
      // 1. Tailwind CSS 运行时编译器
      const twScript = doc.createElement('script');
      twScript.textContent = TAILWIND_JS;
      doc.head.appendChild(twScript);
      diagLog(diag, 'Tailwind CSS 运行时已内联注入');

      // 2. FontAwesome CSS
      const faStyle = doc.createElement('style');
      faStyle.textContent = FONTAWESOME_CSS;
      doc.head.appendChild(faStyle);
      diagLog(diag, 'FontAwesome CSS 已内联注入');

      // 3. jQuery（保留兼容性）
      const jqScript = doc.createElement('script');
      jqScript.textContent = JQUERY_JS;
      doc.head.appendChild(jqScript);
      diagLog(diag, 'jQuery 已内联注入');

      // 4. adjust_iframe_height（JS-Slash-Runner 兼容）
      const adjScript = doc.createElement('script');
      adjScript.textContent = ADJUST_IFRAME_JS;
      doc.head.appendChild(adjScript);
      diagLog(diag, 'adjust_iframe_height 已内联注入');

      // 基础样式 + Tailwind fallback（防止 CDN 加载失败导致空白）
      const style = doc.createElement('style');
      style.textContent = '*,*::before,*::after{box-sizing:border-box;}html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;height:100%!important;background-color:transparent!important;}' + FALLBACK_CSS;
      doc.head.appendChild(style);
      diagLog(diag, '基础样式 + FALLBACK_CSS 已注入');

      styleTeleport = teleportStyle(doc.head);
      diagLog(diag, 'styleTeleport 已建立');

      // 启动容错：如果 Vue 初始化失败，尝试自动修复数据后重试一次
      let initSuccess = false;
      function tryInitForum() {
        diagLog(diag, 'tryInitForum() 开始');
        try {
          setActivePinia(createPinia());
          diagLog(diag, '✅ Pinia 已激活');
          const windowControls = reactive({ requestClose: false });
          app = createApp(App);
          diagLog(diag, '✅ Vue app 已创建');
          app.provide('windowControls', windowControls);
          app.config.errorHandler = (err, instance, info) => {
            console.error('[Zsd网游论坛] Vue 渲染错误:', err, info);
            diagLog(diag, `❌ Vue 渲染错误: ${(err as Error)?.message || '未知'} (${info})`);
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
          diagLog(diag, '✅ Vue app 已挂载到 body');

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
          diagLog(diag, '✅ 论坛初始化完全成功');
          return true;
        } catch (e: any) {
          const errMsg = e?.message || String(e);
          diagLog(diag, `❌ Vue 初始化失败: ${errMsg}`);
          console.error('[Zsd网游论坛] Vue 初始化失败:', e);
          return false;
        }
      }

      if (!tryInitForum()) {
        diagLog(diag, '首次初始化失败，尝试自动修复数据...');
        try {
          const store = useForumSettingsStore();
          const repaired = store.repairForumData();
          diagLog(diag, `repairForumData() 返回: ${repaired}`);
          if (repaired) {
            if (app) { app.unmount(); app = null; }
            if (styleTeleport) { styleTeleport.destroy(); styleTeleport = null; }
            doc.body.innerHTML = '';
            // 修复后重新创建诊断层（innerHTML 会清掉它）
            diag = createDiagnosticLayer(doc);
            diagLog(diag, '数据已修复，重新初始化...');
            const retryOk = tryInitForum();
            if (retryOk) {
              toastr.success('[论坛] 数据已自动修复，论坛加载成功');
            } else {
              diagLog(diag, '修复后重试仍失败，显示修复面板');
              showRepairFallback(doc);
            }
          } else {
            diagLog(diag, '数据无需修复，显示修复面板');
            showRepairFallback(doc);
          }
        } catch (e: any) {
          diagLog(diag, `修复过程异常: ${e?.message || e}`);
          showRepairFallback(doc);
        }
      }

      // 初始化成功，隐藏诊断层
      if (initSuccess) {
        hideDiagnosticLayer(diag);
      }

      // 样式系统检测：2 秒后检查 Tailwind 是否生效（内联注入是同步的，不需要等 8 秒）
      setTimeout(() => {
        if (!initSuccess || !doc || !doc.body) return;
        diagLog(diag, '样式检测: 开始检查 Tailwind 是否生效');
        const testEl = doc.createElement('div');
        testEl.className = 'flex';
        testEl.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
        doc.body.appendChild(testEl);
        const computed = doc.defaultView?.getComputedStyle(testEl);
        const isFlex = computed?.display === 'flex';
        doc.body.removeChild(testEl);
        diagLog(diag, `样式检测结果: flex=${isFlex}`);
        if (!isFlex) {
          diagLog(diag, '⚠️ 样式系统未生效，显示错误提示');
          console.error('[Zsd网游论坛] 样式系统未生效');
          const overlay = doc.createElement('div');
          overlay.id = 'zsd-network-error';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(17,24,39,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;font-family:sans-serif;text-align:center;color:#e5e7eb;';
          overlay.innerHTML = `
            <div style="font-size:18px;font-weight:bold;color:#f87171;">⚠️ 样式加载异常</div>
            <div style="font-size:13px;color:#9ca3af;max-width:300px;line-height:1.5;">论坛样式系统未能正常启动。这可能是浏览器兼容性问题或资源加载异常。</div>
            <div style="font-size:12px;color:#6b7280;">请尝试刷新或切换对话后重试。</div>
            <button id="zsd-refresh-btn" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;margin-top:8px;">🔄 刷新重试</button>
          `;
          doc.body.appendChild(overlay);
          const refreshBtn = doc.getElementById('zsd-refresh-btn');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
              // 不要 reload about:blank（会变成纯粹空白），而是销毁重建
              destroyForum();
              setTimeout(() => openForum(), 50);
            });
          }
        }
      }, 8000);

      function showRepairFallback(doc: Document) {
        doc.body.innerHTML = `
          <div style="padding: 24px; color: #e5e7eb; font-family: sans-serif; text-align: center; background: #111827; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
            <div style="font-size: 16px; font-weight: bold; color: #f87171;">⚠️ 论坛数据损坏</div>
            <div style="font-size: 12px; color: #9ca3af; max-width: 260px;">帖子数据存在损坏，导致论坛无法加载。点击下方按钮可智能修复（保留所有设置和配置）。</div>
            <button id="zsd-repair-btn" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-top: 8px;">🔧 一键修复数据</button>
            <button id="zsd-clear-btn" style="padding: 6px 12px; background: transparent; color: #6b7280; border: 1px solid #374151; border-radius: 6px; font-size: 11px; cursor: pointer;">完全清理（会重置配置）</button>
          </div>
        `;
        // innerHTML 会清除诊断层，重新创建一个（保持日志可见）
        diag = createDiagnosticLayer(doc);
        diagLog(diag, '已进入修复模式，请查看上方按钮');
        const repairBtn = doc.getElementById('zsd-repair-btn');
        const clearBtn = doc.getElementById('zsd-clear-btn');
        if (repairBtn) {
          repairBtn.addEventListener('click', () => {
            try {
              const store = useForumSettingsStore();
              store.repairForumData();
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
    });
  } else {
    diagLog(null, '❌ iframe contentDocument 为 NULL，无法初始化');
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
    try {
      if ($iframe && $iframe.parent().is(':visible')) {
        hideForum();
      } else {
        openForum();
      }
    } catch (e: any) {
      console.error('[Zsd网游论坛] 点击论坛按钮时发生异常:', e);
      toastr.error(`[论坛] 打开失败: ${e?.message || e}，请查看浏览器控制台`);
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
