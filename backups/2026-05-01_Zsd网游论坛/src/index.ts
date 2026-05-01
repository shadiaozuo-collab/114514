import { createPinia, setActivePinia } from 'pinia';
import { createApp, reactive, watch } from 'vue';
import { reloadOnChatChange, createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { useForumSettingsStore } from './settings';
import { injectForumContext, uninjectForumContext, generatePosts } from './aiGenerator';

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

  const $header = $('<div>').css({
    height: '28px',
    minHeight: '28px',
    backgroundColor: '#1e40af',
    cursor: 'move',
    flexShrink: '0',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#93c5fd',
    fontSize: '11px',
    fontWeight: 'bold',
    userSelect: 'none',
  }).text('Zsd网游论坛');

  $iframe = createScriptIdIframe().css({
    width: '100%',
    flex: '1',
    border: 'none',
  });

  $container.append($header).append($iframe).appendTo('body');
  $container.draggable({ handle: $header, iframeFix: true });

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

    injectForumContext();
    setupAutoInject();
    setupAutoGenerate();
  });
}

function closeForum() {
  if ($iframe) {
    const $container = $iframe.parent();
    try {
      $container.draggable('destroy');
    } catch {}
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
  const evt = eventOn(tavern_events.MESSAGE_RECEIVED, async () => {
    if (!app) return;
    const store = useForumSettingsStore();
    const interval = store.settings.ZautoGenerateInterval;
    if (interval === 0) return;
    msgCount++;
    if (interval === -1 || msgCount >= interval) {
      msgCount = 0;
      if (isGenerating) return;
      isGenerating = true;
      try {
        const section = store.settings.ZautoGenerateSection;
        const posts = await generatePosts(section);
        for (const post of posts) {
          store.addPost(post);
        }
        injectForumContext();
        toastr.success(`[论坛] 自动生成了${posts.length}个帖子`);
      } catch (e) {
        console.warn('[网游论坛] 自动生成失败:', e);
      } finally {
        isGenerating = false;
      }
    }
  });
  autoGenCleanup = () => {
    evt.stop();
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
