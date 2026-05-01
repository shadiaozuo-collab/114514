/** ========== 悬浮球脚本 ==========
 *  保留核心交互（展开/收起、拖拽、位置记忆），
 *  API 配置通过酒馆变量持久化（支持多套 API 连接配置 + 沿用主API）。
 *  新增论坛功能：可输入 Prompt 调用配置好的 API 生成帖子内容。
 * ================================= */

import { createPinia, setActivePinia } from 'pinia';
import { reloadOnChatChange } from '@util/script';
import { useSettingsStore } from './settings';

reloadOnChatChange();

$(async () => {
  try {
  const SCRIPT_ID = 'my-floating-ball';
  const STORAGE_KEY_POS = `${SCRIPT_ID}_pos`;
  const STORAGE_KEY_COLLAPSED = `${SCRIPT_ID}_collapsed`;
  const STORAGE_KEY_CFG = `${SCRIPT_ID}_cfg`;

  // 清理旧版 localStorage 论坛数据
  localStorage.removeItem(`${SCRIPT_ID}_forum`);

  /* ===== 初始化 Pinia + Store ===== */
  setActivePinia(createPinia());
  const store = useSettingsStore();
  store.migrateLegacyApi();

  /* ===== 本地外观配置（localStorage） ===== */
  const defaultConfig = {
    icon: '\u{1F30D}',
    title: '\u60AC\u6D6E\u9762\u677F',
    width: 320,
  };

  function loadLocalConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_CFG) || '{}');
      const { apiEnabled, apiUrl, apiKey, apiModel, ...rest } = saved;
      void apiEnabled; void apiUrl; void apiKey; void apiModel;
      return { ...defaultConfig, ...rest };
    } catch {
      return { ...defaultConfig };
    }
  }

  function saveLocalConfig(cfg: typeof defaultConfig) {
    localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify(cfg));
  }

  /* ===== 论坛数据（酒馆变量，按角色卡+聊天文件隔离） ===== */
  interface ForumPost {
    id: string;
    title: string;
    content: string;
    createdAt: number;
  }

  async function getCurrentCharName(): Promise<string> {
    try {
      const char = await getCharacter('current');
      return char.name || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  function getCurrentChatFileName(): string {
    return SillyTavern.getCurrentChatId() || 'unknown';
  }

  function loadForumPosts(charName: string, chatFileName: string): ForumPost[] {
    return store.settings.forumData[charName]?.[chatFileName] || [];
  }

  function saveForumData(charName: string, chatFileName: string, posts: ForumPost[]) {
    store.settings.forumData = {
      ...store.settings.forumData,
      [charName]: {
        ...(store.settings.forumData[charName] || {}),
        [chatFileName]: posts,
      },
    };
  }

  const currentCharName = await getCurrentCharName();
  const currentChatFileName = getCurrentChatFileName();

  let forumPosts = loadForumPosts(currentCharName, currentChatFileName);
  let forumGenerating = false;

  let localCfg = loadLocalConfig();
  let isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) !== 'false';
  let showingSettings = false;
  let showingForum = false;
  let activeTab: 'appearance' | 'api' = 'appearance';

  /* ===== 工具函数 ===== */
  function getPresetName() {
    if (store.settings.useMainApi) return '\u6CBF\u7528\u9152\u9986\u4E3B API';
    const p = store.activePreset;
    return p ? p.name : '\u672A\u9009\u62E9\u914D\u7F6E';
  }

  function getModelName() {
    if (store.settings.useMainApi) return '\u4E3B\u914D\u7F6E';
    const p = store.activePreset;
    return p?.apiModel || '\u672A\u914D\u7F6E';
  }

  function getApiStatusDot() {
    return store.settings.useMainApi ? 'on' : store.activePreset ? 'on' : 'off';
  }

  function getApiStatusText() {
    if (store.settings.useMainApi) return '\u5DF2\u542F\u7528\uFF08\u4E3B API\uFF09';
    return store.activePreset ? '\u5DF2\u542F\u7528\uFF08\u72EC\u7ACB\uFF09' : '\u672A\u914D\u7F6E';
  }

  /* ===== API 生成 ===== */
  async function generateForumContent(prompt: string): Promise<string> {
    try {
      if (store.settings.useMainApi) {
        return await generate({ user_input: prompt, should_silence: true });
      }
      const preset = store.activePreset;
      if (!preset) throw new Error('\u672A\u9009\u62E9 API \u914D\u7F6E');

      if (preset.apiMode === 'custom') {
        return await generate({
          user_input: prompt,
          should_silence: true,
          custom_api: {
            apiurl: preset.apiUrl,
            key: preset.apiKey,
            model: preset.apiModel || undefined,
            max_tokens: preset.maxTokens,
            temperature: preset.temperature,
          },
        });
      }
      if (preset.apiMode === 'tavern') {
        return await generate({
          user_input: prompt,
          should_silence: true,
          custom_api: {
            proxy_preset: preset.tavernProfile || undefined,
            model: preset.apiModel || undefined,
          },
        });
      }
      return await generate({ user_input: prompt, should_silence: true });
    } catch (e: any) {
      return `\u751F\u6210\u5931\u8D25: ${e?.message || String(e)}`;
    }
  }

  /* ===== 样式 ===== */
  const styles = `
    <style id="${SCRIPT_ID}-css">
      #${SCRIPT_ID} {
        position: fixed; z-index: 99997;
        font-family: "Segoe UI", system-ui, sans-serif;
        user-select: none;
      }
      #${SCRIPT_ID} .fb-btn {
        width: 48px; height: 48px; border-radius: 50%;
        background: linear-gradient(135deg, #1a5f9e 0%, #0d3a5c 50%, #1a5f9e 100%);
        border: 2px solid #0a2a45;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 0 8px rgba(100,200,255,0.3);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem; transition: transform 0.1s, box-shadow 0.1s;
      }
      #${SCRIPT_ID} .fb-btn:hover { transform: scale(1.08);
        box-shadow: 0 6px 16px rgba(0,0,0,0.35), inset 0 0 12px rgba(100,200,255,0.5); }
      #${SCRIPT_ID} .fb-btn:active { transform: scale(0.92); }
      #${SCRIPT_ID} .fb-panel {
        width: ${localCfg.width}px; max-width: 85vw; background: #fefaf0;
        border: 2px solid #8b7355; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        overflow: hidden; display: flex; flex-direction: column;
      }
      #${SCRIPT_ID} .fb-header {
        height: 40px; background: linear-gradient(to right, #e5d7b3, #f5ecd8);
        border-bottom: 1px solid #8b7355; display: flex;
        justify-content: space-between; align-items: center;
        padding: 0 12px; color: #5d3a1a; cursor: grab;
      }
      #${SCRIPT_ID} .fb-header:active { cursor: grabbing; }
      #${SCRIPT_ID} .fb-title { font-size: 0.95rem; font-weight: bold; }
      #${SCRIPT_ID} .fb-header-actions { display: flex; gap: 6px; align-items: center; }
      #${SCRIPT_ID} .fb-fold, #${SCRIPT_ID} .fb-settings-btn, #${SCRIPT_ID} .fb-forum-btn {
        font-size: 0.8rem; color: #fffcf5; background: #8b7355;
        padding: 4px 10px; border-radius: 4px; font-weight: bold;
        border: none; cursor: pointer; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-fold:hover, #${SCRIPT_ID} .fb-settings-btn:hover, #${SCRIPT_ID} .fb-forum-btn:hover { background: #5d3a1a; }
      #${SCRIPT_ID} .fb-body {
        padding: 12px; min-height: 120px; color: #333;
        font-size: 0.9rem; line-height: 1.5; max-height: 70vh; overflow-y: auto;
      }
      #${SCRIPT_ID} .fb-status-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 0; border-bottom: 1px dashed rgba(139,115,85,0.3);
        font-size: 0.85rem;
      }
      #${SCRIPT_ID} .fb-status-row:last-child { border-bottom: none; }
      #${SCRIPT_ID} .fb-status-label { color: #8b7355; font-weight: 600; }
      #${SCRIPT_ID} .fb-status-dot {
        display: inline-block; width: 8px; height: 8px;
        border-radius: 50%; margin-right: 4px;
      }
      #${SCRIPT_ID} .fb-status-dot.on { background: #4caf50; }
      #${SCRIPT_ID} .fb-status-dot.off { background: #9e9e9e; }
      #${SCRIPT_ID} .fb-hint {
        margin-top: 8px; padding: 8px;
        background: rgba(229,215,179,0.25); border-radius: 4px;
        font-size: 0.8rem; color: #8b7355; text-align: center;
      }
      #${SCRIPT_ID} .fb-form-row {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px; gap: 8px;
      }
      #${SCRIPT_ID} .fb-form-row label {
        font-size: 0.8rem; color: #8b7355; font-weight: 600; white-space: nowrap;
      }
      #${SCRIPT_ID} .fb-form-row input[type="text"],
      #${SCRIPT_ID} .fb-form-row input[type="password"],
      #${SCRIPT_ID} .fb-form-row input[type="number"] {
        flex: 1; padding: 4px 6px; border: 1px solid #dacba5;
        border-radius: 4px; font-size: 0.85rem; background: #fffdf8;
        color: #5d3a1a; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-form-row input:focus { outline: none; border-color: #8b7355; }
      #${SCRIPT_ID} .fb-form-row select {
        flex: 1; padding: 4px 6px; border: 1px solid #dacba5;
        border-radius: 4px; font-size: 0.85rem; background: #fffdf8;
        color: #5d3a1a; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-form-row input[type="checkbox"] {
        margin-right: 4px;
      }
      #${SCRIPT_ID} .fb-form-btns {
        display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end;
      }
      #${SCRIPT_ID} .fb-form-btns button {
        padding: 5px 14px; border: none; border-radius: 4px;
        font-size: 0.8rem; font-weight: bold; cursor: pointer; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-btn-save { background: #8b7355; color: #fff; }
      #${SCRIPT_ID} .fb-btn-save:hover { background: #5d3a1a; }
      #${SCRIPT_ID} .fb-btn-cancel { background: #ddd; color: #555; }
      #${SCRIPT_ID} .fb-btn-cancel:hover { background: #ccc; }
      #${SCRIPT_ID} .fb-btn-small {
        padding: 3px 10px; border: none; border-radius: 4px;
        font-size: 0.75rem; font-weight: bold; cursor: pointer; font-family: inherit;
        background: #8b7355; color: #fff;
      }
      #${SCRIPT_ID} .fb-btn-small:hover { background: #5d3a1a; }
      #${SCRIPT_ID} .fb-btn-small:disabled { background: #bbb; cursor: not-allowed; }
      #${SCRIPT_ID} .fb-btn-danger {
        padding: 3px 10px; border: none; border-radius: 4px;
        font-size: 0.75rem; font-weight: bold; cursor: pointer; font-family: inherit;
        background: #c0392b; color: #fff;
      }
      #${SCRIPT_ID} .fb-btn-danger:hover { background: #a93226; }
      #${SCRIPT_ID} .fb-tabs {
        display: flex; border-bottom: 1px solid #dacba5; margin-bottom: 10px;
      }
      #${SCRIPT_ID} .fb-tab {
        flex: 1; padding: 6px; text-align: center; font-size: 0.8rem;
        cursor: pointer; border-bottom: 2px solid transparent;
        color: #8b7355; font-weight: 600;
      }
      #${SCRIPT_ID} .fb-tab.active {
        border-bottom-color: #8b7355; color: #5d3a1a;
      }
      #${SCRIPT_ID} .fb-section-title {
        font-size: 0.8rem; font-weight: bold; color: #5d3a1a;
        margin: 10px 0 6px; padding-bottom: 4px;
        border-bottom: 1px solid rgba(139,115,85,0.2);
      }
      /* 论坛样式 */
      #${SCRIPT_ID} .fb-forum-list {
        max-height: 200px; overflow-y: auto; margin-top: 8px;
      }
      #${SCRIPT_ID} .fb-forum-post {
        padding: 8px; margin-bottom: 6px;
        background: rgba(229,215,179,0.15); border-radius: 4px;
        border-left: 3px solid #8b7355;
      }
      #${SCRIPT_ID} .fb-forum-post-title {
        font-size: 0.85rem; font-weight: bold; color: #5d3a1a;
        margin-bottom: 4px;
      }
      #${SCRIPT_ID} .fb-forum-post-content {
        font-size: 0.8rem; color: #333; line-height: 1.4;
        max-height: 80px; overflow-y: auto;
        word-break: break-word;
      }
      #${SCRIPT_ID} .fb-forum-post-meta {
        font-size: 0.7rem; color: #8b7355; margin-top: 4px;
        display: flex; justify-content: space-between;
      }
      #${SCRIPT_ID} .fb-forum-textarea {
        width: 100%; min-height: 60px; padding: 6px;
        border: 1px solid #dacba5; border-radius: 4px;
        font-size: 0.85rem; background: #fffdf8; color: #5d3a1a;
        font-family: inherit; resize: vertical; box-sizing: border-box;
      }
      #${SCRIPT_ID} .fb-forum-textarea:focus { outline: none; border-color: #8b7355; }
      #${SCRIPT_ID} .fb-forum-generate-btn {
        width: 100%; padding: 6px; margin-top: 6px;
        background: #8b7355; color: #fff; border: none; border-radius: 4px;
        font-size: 0.8rem; font-weight: bold; cursor: pointer; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-forum-generate-btn:hover { background: #5d3a1a; }
      #${SCRIPT_ID} .fb-forum-generate-btn:disabled { background: #bbb; cursor: wait; }
      #${SCRIPT_ID} .fb-forum-entry {
        margin-top: 10px; text-align: center;
      }
      #${SCRIPT_ID} .fb-forum-entry button {
        padding: 6px 16px; background: #8b7355; color: #fff;
        border: none; border-radius: 4px; font-size: 0.85rem;
        font-weight: bold; cursor: pointer; font-family: inherit;
      }
      #${SCRIPT_ID} .fb-forum-entry button:hover { background: #5d3a1a; }
      #${SCRIPT_ID}.collapsed .fb-panel { display: none !important; }
      #${SCRIPT_ID}.expanded  .fb-btn   { display: none !important; }
      #${SCRIPT_ID}-drag-overlay {
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        z-index: 99999;
        cursor: grabbing;
        display: none;
        user-select: none;
        -webkit-user-select: none;
      }
    </style>
  `;

  /* ===== 渲染面板内容 ===== */
  function renderBody() {
    const $body = $(`#${SCRIPT_ID}-body`);
    if (showingForum) {
      renderForum($body);
    } else if (showingSettings) {
      renderSettings($body);
    } else {
      renderStatus($body);
    }
  }

  function renderStatus($body: JQuery) {
    $body.html(`
      <div class="fb-status-row">
        <span class="fb-status-label">API \u72B6\u6001</span>
        <span class="fb-status-value">
          <span class="fb-status-dot ${getApiStatusDot()}"></span>
          ${getApiStatusText()}
        </span>
      </div>
      <div class="fb-status-row">
        <span class="fb-status-label">\u5F53\u524D\u914D\u7F6E</span>
        <span class="fb-status-value">${getPresetName()}</span>
      </div>
      <div class="fb-status-row">
        <span class="fb-status-label">\u6A21\u578B</span>
        <span class="fb-status-value">${getModelName()}</span>
      </div>
      <div class="fb-forum-entry">
        <button id="${SCRIPT_ID}-btn-enter-forum">\u8FDB\u5165\u8BBA\u575B</button>
      </div>
      <div class="fb-hint">\u70B9\u51FB\u53F3\u4E0A\u89D2 \u2699\uFE0F \u4FEE\u6539\u914D\u7F6E</div>
    `);
    $body.find(`#${SCRIPT_ID}-btn-enter-forum`).on('click', () => {
      showingForum = true;
      renderBody();
    });
  }

  function renderForum($body: JQuery) {
    let postsHtml = '';
    if (forumPosts.length === 0) {
      postsHtml = `<div class="fb-hint">\u6682\u65E0\u5E16\u5B50\uFF0C\u8F93\u5165\u6807\u9898\u548C Prompt \u751F\u6210\u7B2C\u4E00\u7BC7\u5E16\u5B50</div>`;
    } else {
      for (const post of forumPosts) {
        const date = new Date(post.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        postsHtml += `
          <div class="fb-forum-post">
            <div class="fb-forum-post-title">${escapeHtml(post.title)}</div>
            <div class="fb-forum-post-content">${escapeHtml(post.content)}</div>
            <div class="fb-forum-post-meta">
              <span>${date}</span>
              <button class="fb-btn-small" data-del="${post.id}" style="padding:2px 6px;font-size:0.7rem;">\u5220\u9664</button>
            </div>
          </div>
        `;
      }
    }

    const btnText = forumGenerating ? '\u751F\u6210\u4E2D...' : 'AI \u751F\u6210\u5185\u5BB9';

    $body.html(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:0.9rem;font-weight:bold;color:#5d3a1a;">\u8BBA\u575B</span>
        <button class="fb-btn-small" id="${SCRIPT_ID}-btn-back">\u8FD4\u56DE</button>
      </div>
      <div class="fb-form-row" style="flex-direction:column;align-items:stretch;">
        <label style="margin-bottom:2px;">\u6807\u9898</label>
        <input id="${SCRIPT_ID}-forum-title" type="text" placeholder="\u5E16\u5B50\u6807\u9898" />
      </div>
      <div class="fb-form-row" style="flex-direction:column;align-items:stretch;margin-bottom:4px;">
        <label style="margin-bottom:2px;">Prompt</label>
        <textarea id="${SCRIPT_ID}-forum-prompt" class="fb-forum-textarea" placeholder="\u8F93\u5165\u63D0\u793A\u8BCD\uFF0CAI \u5C06\u751F\u6210\u5E16\u5B50\u5185\u5BB9..."></textarea>
      </div>
      <button class="fb-forum-generate-btn" id="${SCRIPT_ID}-btn-generate" ${forumGenerating ? 'disabled' : ''}>${btnText}</button>
      <div class="fb-section-title">\u5E16\u5B50\u5217\u8868 (${forumPosts.length})</div>
      <div class="fb-forum-list">${postsHtml}</div>
    `);

    // 返回按钮
    $body.find(`#${SCRIPT_ID}-btn-back`).on('click', () => {
      showingForum = false;
      renderBody();
    });

    // 生成按钮
    $body.find(`#${SCRIPT_ID}-btn-generate`).on('click', async () => {
      const title = ($(`#${SCRIPT_ID}-forum-title`).val() as string || '').trim();
      const prompt = ($(`#${SCRIPT_ID}-forum-prompt`).val() as string || '').trim();
      if (!title) {
        alert('\u8BF7\u8F93\u5165\u5E16\u5B50\u6807\u9898');
        return;
      }
      if (!prompt) {
        alert('\u8BF7\u8F93\u5165 Prompt');
        return;
      }

      forumGenerating = true;
      renderForum($body);

      const content = await generateForumContent(prompt);

      const newPost: ForumPost = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        content,
        createdAt: Date.now(),
      };
      forumPosts = [newPost, ...forumPosts];
      saveForumData(currentCharName, currentChatFileName, forumPosts);

      forumGenerating = false;
      renderForum($body);
    });

    // 删除帖子
    $body.find('.fb-forum-post-meta button').on('click', function () {
      const id = $(this).data('del') as string;
      forumPosts = forumPosts.filter(p => p.id !== id);
      saveForumData(currentCharName, currentChatFileName, forumPosts);
      renderForum($body);
    });
  }

  function renderSettings($body: JQuery) {
    const tabAppearance = activeTab === 'appearance' ? 'active' : '';
    const tabApi = activeTab === 'api' ? 'active' : '';

    let html = `
      <div class="fb-tabs">
        <div class="fb-tab ${tabAppearance}" data-tab="appearance">\u5916\u89C2</div>
        <div class="fb-tab ${tabApi}" data-tab="api">API</div>
      </div>
    `;

    if (activeTab === 'appearance') {
      html += `
        <div class="fb-form-row">
          <label>\u56FE\u6807</label>
          <input id="${SCRIPT_ID}-cfg-icon" type="text" value="${localCfg.icon}" />
        </div>
        <div class="fb-form-row">
          <label>\u6807\u9898</label>
          <input id="${SCRIPT_ID}-cfg-title" type="text" value="${localCfg.title}" />
        </div>
        <div class="fb-form-row">
          <label>\u5BBD\u5EA6</label>
          <input id="${SCRIPT_ID}-cfg-width" type="number" value="${localCfg.width}" />
        </div>
      `;
    } else {
      // API 设置
      const useMain = store.settings.useMainApi ? 'checked' : '';
      const presets = store.settings.apiPresets;
      const activeId = store.settings.activePresetId || '';

      const useMainApi = store.settings.useMainApi;
      const isDisabled = useMainApi ? 'disabled' : '';
      const dimStyle = useMainApi ? 'opacity:0.5;' : '';

      html += `
        <div class="fb-form-row">
          <label style="display:flex;align-items:center;cursor:pointer;">
            <input id="${SCRIPT_ID}-cfg-use-main" type="checkbox" ${useMain} />
            <span style="margin-left:4px;">\u76F4\u63A5\u6CBF\u7528\u9152\u9986\u4E3B API\uFF08\u5173\u95ED\u540E\u4F7F\u7528\u4E0B\u65B9 API \u8FDE\u63A5\u914D\u7F6E\uFF09</span>
          </label>
        </div>
      `;

      if (useMainApi) {
        html += `<div style="font-size:0.75rem;color:#888;margin-bottom:8px;">\u5DF2\u542F\u7528\u4E3B API\uFF0CAPI \u8FDE\u63A5\u914D\u7F6E\u4EC5\u4F5C\u5907\u7528</div>`;
      }

      html += `<div class="fb-section-title" style="${dimStyle}">\u72EC\u7ACB API \u914D\u7F6E</div>`;

      // 配置选择
      html += `<div class="fb-form-row" style="${dimStyle}"><label>\u5F53\u524D\u914D\u7F6E</label><select id="${SCRIPT_ID}-cfg-preset" ${isDisabled}>`;
      html += `<option value="">-- \u8BF7\u9009\u62E9 --</option>`;
      for (const p of presets) {
        const sel = p.id === activeId ? 'selected' : '';
        html += `<option value="${escapeHtml(p.id)}" ${sel}>${escapeHtml(p.name)}</option>`;
      }
      html += `</select></div>`;

      html += `
        <div class="fb-form-row" style="justify-content:flex-end;${dimStyle}">
          <button class="fb-btn-small" id="${SCRIPT_ID}-btn-add-preset">+ \u65B0\u589E</button>
          <button class="fb-btn-danger" id="${SCRIPT_ID}-btn-del-preset" ${!activeId ? 'disabled style="opacity:0.5;"' : ''}>- \u5220\u9664</button>
        </div>
      `;

      // 编辑当前配置
      const editing = store.activePreset;
      if (editing) {
        html += `
          <div class="fb-form-row" style="${dimStyle}">
            <label>\u540D\u79F0</label>
            <input id="${SCRIPT_ID}-cfg-pname" type="text" value="${escapeHtml(editing.name)}" ${isDisabled} />
          </div>
          <div class="fb-form-row" style="${dimStyle}">
            <label>\u6A21\u5F0F</label>
            <select id="${SCRIPT_ID}-cfg-pmode" ${isDisabled}>
              <option value="custom" ${editing.apiMode === 'custom' ? 'selected' : ''}>\u81EA\u5B9A\u4E49 API</option>
              <option value="tavern" ${editing.apiMode === 'tavern' ? 'selected' : ''}>\u9152\u9986\u8FDE\u63A5\u914D\u7F6E</option>
            </select>
          </div>
        `;

        if (editing.apiMode === 'custom') {
          html += `
            <div class="fb-form-row" style="${dimStyle}">
              <label>API \u5730\u5740</label>
              <input id="${SCRIPT_ID}-cfg-purl" type="text" value="${escapeHtml(editing.apiUrl)}" placeholder="https://api.example.com/v1" ${isDisabled} />
            </div>
            <div class="fb-form-row" style="${dimStyle}">
              <label>API Key</label>
              <input id="${SCRIPT_ID}-cfg-pkey" type="password" value="${escapeHtml(editing.apiKey)}" placeholder="sk-..." ${isDisabled} />
            </div>
            <div class="fb-form-row" style="${dimStyle}">
              <label>\u6A21\u578B</label>
              <input id="${SCRIPT_ID}-cfg-pmodel" type="text" value="${escapeHtml(editing.apiModel)}" placeholder="gpt-4o" ${isDisabled} />
            </div>
            <div class="fb-form-row" style="${dimStyle}">
              <label>Max Tokens</label>
              <input id="${SCRIPT_ID}-cfg-ptokens" type="number" value="${editing.maxTokens}" ${isDisabled} />
            </div>
            <div class="fb-form-row" style="${dimStyle}">
              <label>Temperature</label>
              <input id="${SCRIPT_ID}-cfg-ptemp" type="number" step="0.1" min="0" max="2" value="${editing.temperature}" ${isDisabled} />
            </div>
          `;
        } else {
          html += `
            <div class="fb-form-row" style="${dimStyle}">
              <label>\u8FDE\u63A5\u914D\u7F6E</label>
              <input id="${SCRIPT_ID}-cfg-pprofile" type="text" value="${escapeHtml(editing.tavernProfile)}" placeholder="\u9152\u9986\u4E2D\u7684\u914D\u7F6E\u540D\u79F0" ${isDisabled} />
            </div>
            <div class="fb-form-row" style="${dimStyle}">
              <label>\u6A21\u578B\uFF08\u53EF\u9009\uFF09</label>
              <input id="${SCRIPT_ID}-cfg-ptmodel" type="text" value="${escapeHtml(editing.apiModel)}" placeholder="\u8986\u76D6\u914D\u7F6E\u4E2D\u7684\u6A21\u578B" ${isDisabled} />
            </div>
          `;
        }
      } else {
        html += `<div class="fb-hint">\u8BF7\u5148\u9009\u62E9\u6216\u65B0\u589E\u4E00\u4E2A\u914D\u7F6E</div>`;
      }
    }

    html += `
      <div class="fb-form-btns">
        <button class="fb-btn-save" id="${SCRIPT_ID}-btn-save">\u4FDD\u5B58</button>
        <button class="fb-btn-cancel" id="${SCRIPT_ID}-btn-cancel">\u53D6\u6D88</button>
      </div>
    `;

    $body.html(html);

    // Tab 切换
    $body.find('.fb-tab').on('click', function () {
      activeTab = $(this).data('tab') as 'appearance' | 'api';
      renderBody();
    });

    // 保存
    $body.find(`#${SCRIPT_ID}-btn-save`).on('click', () => {
      if (activeTab === 'appearance') {
        localCfg.icon = $(`#${SCRIPT_ID}-cfg-icon`).val() as string || '\u{1F30D}';
        localCfg.title = $(`#${SCRIPT_ID}-cfg-title`).val() as string || '\u60AC\u6D6E\u9762\u677F';
        localCfg.width = parseInt($(`#${SCRIPT_ID}-cfg-width`).val() as string) || 320;
        saveLocalConfig(localCfg);
        $(`#${SCRIPT_ID} .fb-title`).text(localCfg.title);
        $(`#${SCRIPT_ID} .fb-panel`).css('width', localCfg.width + 'px');
        $(`#${SCRIPT_ID} .fb-btn`).text(localCfg.icon);
      } else {
        const useMain = $(`#${SCRIPT_ID}-cfg-use-main`).is(':checked');
        store.settings.useMainApi = useMain;

        const presetId = $(`#${SCRIPT_ID}-cfg-preset`).val() as string;
        if (presetId) {
          store.settings.activePresetId = presetId;
        }

        if (!useMain && !store.settings.activePresetId && store.settings.apiPresets.length > 0) {
          store.settings.activePresetId = store.settings.apiPresets[0].id;
        }

        const editing = store.activePreset;
        if (editing) {
          const patch: Record<string, unknown> = {};
          const name = $(`#${SCRIPT_ID}-cfg-pname`).val() as string;
          if (name !== undefined) patch.name = name;

          const mode = $(`#${SCRIPT_ID}-cfg-pmode`).val() as string;
          if (mode) patch.apiMode = mode;

          if (editing.apiMode === 'custom' || mode === 'custom') {
            patch.apiUrl = $(`#${SCRIPT_ID}-cfg-purl`).val() as string || '';
            patch.apiKey = $(`#${SCRIPT_ID}-cfg-pkey`).val() as string || '';
            patch.apiModel = $(`#${SCRIPT_ID}-cfg-pmodel`).val() as string || '';
            patch.maxTokens = parseInt($(`#${SCRIPT_ID}-cfg-ptokens`).val() as string) || 60000;
            patch.temperature = parseFloat($(`#${SCRIPT_ID}-cfg-ptemp`).val() as string) || 1.0;
          }
          if (editing.apiMode === 'tavern' || mode === 'tavern') {
            patch.tavernProfile = $(`#${SCRIPT_ID}-cfg-pprofile`).val() as string || '';
            patch.apiModel = $(`#${SCRIPT_ID}-cfg-ptmodel`).val() as string || '';
          }

          store.updatePreset(editing.id, patch);
        }
      }
      showingSettings = false;
      activeTab = 'appearance';
      renderBody();
    });

    // 取消
    $body.find(`#${SCRIPT_ID}-btn-cancel`).on('click', () => {
      showingSettings = false;
      activeTab = 'appearance';
      renderBody();
    });

    // 新增配置（自动关闭主API并选中新配置）
    $body.find(`#${SCRIPT_ID}-btn-add-preset`).on('click', () => {
      store.settings.useMainApi = false;
      const newPreset = store.addPreset({
        name: `\u914D\u7F6E ${store.settings.apiPresets.length + 1}`,
        apiMode: 'custom',
        apiUrl: '',
        apiKey: '',
        apiModel: '',
        maxTokens: 60000,
        temperature: 1.0,
        tavernProfile: '',
      });
      store.settings.activePresetId = newPreset.id;
      renderBody();
    });

    // 删除配置
    $body.find(`#${SCRIPT_ID}-btn-del-preset`).on('click', () => {
      const id = store.settings.activePresetId;
      if (id) {
        store.removePreset(id);
        renderBody();
      }
    });

    // 切换配置下拉框
    $body.find(`#${SCRIPT_ID}-cfg-preset`).on('change', function () {
      const val = $(this).val() as string;
      store.settings.activePresetId = val || null;
      renderBody();
    });

    // 切换模式下拉框
    $body.find(`#${SCRIPT_ID}-cfg-pmode`).on('change', function () {
      const val = $(this).val() as string;
      const editing = store.activePreset;
      if (editing) {
        store.updatePreset(editing.id, { apiMode: val as 'custom' | 'tavern' });
        renderBody();
      }
    });
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ===== HTML 模板 ===== */
  const html = `
    <div id="${SCRIPT_ID}" class="${isCollapsed ? 'collapsed' : 'expanded'}">
      <div class="fb-btn" title="\u70B9\u51FB\u5C55\u5F00">${localCfg.icon}</div>
      <div class="fb-panel">
        <div class="fb-header">
          <div class="fb-title">${localCfg.title}</div>
          <div class="fb-header-actions">
            <button class="fb-forum-btn" id="${SCRIPT_ID}-btn-forum" title="\u8BBA\u575B">\u{1F4AC}</button>
            <button class="fb-settings-btn" id="${SCRIPT_ID}-btn-settings" title="\u8BBE\u7F6E">\u2699\uFE0F</button>
            <button class="fb-fold">\u6536\u8D77</button>
          </div>
        </div>
        <div class="fb-body" id="${SCRIPT_ID}-body"></div>
      </div>
    </div>
  `;

  /* ===== 清理旧 DOM（防止重复加载或框架重载时残留） ===== */
  $(`#${SCRIPT_ID}, #${SCRIPT_ID}-css, #${SCRIPT_ID}-drag-overlay`).remove();

  /* ===== 插入 DOM ===== */
  $('head').append(styles);
  $('body').append(html);

  const $root = $(`#${SCRIPT_ID}`);
  const $btn = $root.find('.fb-btn');
  const $fold = $root.find('.fb-fold');
  const $header = $root.find('.fb-header');

  renderBody();

  /* ===== 设置按钮 ===== */
  $root.on('click', `#${SCRIPT_ID}-btn-settings`, (e) => {
    e.stopPropagation();
    showingSettings = !showingSettings;
    showingForum = false;
    if (!showingSettings) activeTab = 'appearance';
    renderBody();
  });

  /* ===== 论坛按钮 ===== */
  $root.on('click', `#${SCRIPT_ID}-btn-forum`, (e) => {
    e.stopPropagation();
    showingForum = !showingForum;
    showingSettings = false;
    renderBody();
  });

  /* ===== 恢复位置 ===== */
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_POS) || '{}');
    if (saved.left !== undefined && saved.top !== undefined) {
      $root.css({ left: saved.left, top: saved.top });
    } else {
      $root.css({ left: '2vw', top: '30vh' });
    }
  } catch {
    $root.css({ left: '2vw', top: '30vh' });
  }

  /* ===== 展开 / 收起 ===== */
  function setCollapsed(v: boolean) {
    isCollapsed = v;
    $root.toggleClass('collapsed', v).toggleClass('expanded', !v);
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(v));
  }

  /* ===== 拖拽移动（⚠️ 核心逻辑，禁止随意改动）===== */
  const $overlay = $(`<div id="${SCRIPT_ID}-drag-overlay"></div>`);
  $('body').append($overlay);

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let dragStartTarget: EventTarget | null = null;

  const startDrag = (e: JQuery.TriggeredEvent) => {
    isDragging = false;
    dragStartTarget = e.target;
    const evt = e.type.startsWith('touch') ? (e.originalEvent as TouchEvent).touches[0] : (e as MouseEvent);
    dragStartX = evt.clientX;
    dragStartY = evt.clientY;
    const rect = $root[0].getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    $overlay.show();
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
  };

  $btn.on('mousedown touchstart', startDrag);
  $header.on('mousedown touchstart', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startDrag(e);
  });

  $overlay.on('mousemove touchmove', (e) => {
    const evt = e.type.startsWith('touch') ? (e.originalEvent as TouchEvent).touches[0] : (e as MouseEvent);
    const deltaX = evt.clientX - dragStartX;
    const deltaY = evt.clientY - dragStartY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      isDragging = true;
      $root.css({
        left: (initialLeft + deltaX) + 'px',
        top: (initialTop + deltaY) + 'px',
        right: 'auto',
        bottom: 'auto',
      });
    }
  });

  $overlay.on('mouseup touchend', () => {
    $overlay.hide();
    if (isDragging) {
      setTimeout(() => { isDragging = false; }, 50);
      localStorage.setItem(
        STORAGE_KEY_POS,
        JSON.stringify({ left: $root.css('left'), top: $root.css('top') }),
      );
    } else {
      isDragging = false;
      if (dragStartTarget && $(dragStartTarget).closest('.fb-btn').length) {
        setCollapsed(!isCollapsed);
      }
    }
    dragStartTarget = null;
  });

  $fold.on('click', () => setCollapsed(true));

  /* ===== 监听聊天删除，同步清理对应论坛数据 ===== */
  eventOn(tavern_events.CHAT_DELETED, (deletedChatFileName: string) => {
    if (!store.settings.forumData[currentCharName]?.[deletedChatFileName]) return;
    const charData = { ...store.settings.forumData[currentCharName] };
    delete charData[deletedChatFileName];
    store.settings.forumData = {
      ...store.settings.forumData,
      [currentCharName]: charData,
    };
  });

  /* ===== 卸载清理 ===== */
  const doCleanup = () => {
    $(`#${SCRIPT_ID}, #${SCRIPT_ID}-css, #${SCRIPT_ID}-drag-overlay`).remove();
  };
  $(window).on('pagehide beforeunload', doCleanup);

  console.info(`[${SCRIPT_ID}] 悬浮球初始化完成`);
  } catch (err) {
    console.error(`[my-floating-ball] 脚本初始化失败:`, err);
    toastr?.error(`悬浮球脚本加载失败: ${err instanceof Error ? err.message : String(err)}`, '错误');
  }
});
