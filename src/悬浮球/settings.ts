const ForumPost = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.number(),
});

const ApiPreset = z.object({
  id: z.string(),
  name: z.string().default(''),
  apiMode: z.enum(['main', 'custom', 'tavern']).default('custom'),
  apiUrl: z.string().default(''),
  apiKey: z.string().default(''),
  apiModel: z.string().default(''),
  maxTokens: z.number().default(60000),
  temperature: z.number().default(1.0),
  tavernProfile: z.string().default(''),
});

const Settings = z
  .object({
    icon: z.string().default('\u{1F30D}'),
    title: z.string().default('\u60AC\u6D6E\u9762\u677F'),
    width: z.number().default(320),
    defaultX: z.string().default('2vw'),
    defaultY: z.string().default('30vh'),
    // ---- API 连接配置系统 ----
    apiPresets: z.array(ApiPreset).default([]),
    activePresetId: z.string().nullable().default(null),
    useMainApi: z.boolean().default(true),
    // 兼容旧字段（迁移用）
    apiEnabled: z.boolean().default(false),
    apiUrl: z.string().default(''),
    apiKey: z.string().default(''),
    apiModel: z.string().default(''),
    // ---- 论坛数据（按角色卡名 -> 聊天文件名 隔离）----
    forumData: z.record(z.record(z.array(ForumPost))).default({}),
  })
  .prefault({});

export type ApiPreset = z.infer<typeof ApiPreset>;

export const useSettingsStore = defineStore('floating-ball-settings', () => {
  const rawVars = getVariables({ type: 'script', script_id: getScriptId() });
  const safeVars = rawVars && typeof rawVars === 'object' ? rawVars : {};
  const settings = ref(Settings.parse(safeVars));

  watchEffect(() => {
    insertOrAssignVariables(klona(settings.value), { type: 'script', script_id: getScriptId() });
  });

  const activePreset = computed<ApiPreset | undefined>(() => {
    if (!settings.value.activePresetId) return undefined;
    return settings.value.apiPresets.find(p => p.id === settings.value.activePresetId);
  });

  const effectiveApiMode = computed<'main' | 'custom' | 'tavern'>(() => {
    if (settings.value.useMainApi) return 'main';
    return activePreset.value?.apiMode ?? 'main';
  });

  function addPreset(preset: Omit<ApiPreset, 'id'>) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newPreset: ApiPreset = { ...preset, id };
    settings.value.apiPresets = [...settings.value.apiPresets, newPreset];
    return newPreset;
  }

  function updatePreset(id: string, patch: Partial<Omit<ApiPreset, 'id'>>) {
    settings.value.apiPresets = settings.value.apiPresets.map(p =>
      p.id === id ? { ...p, ...patch } : p,
    );
  }

  function removePreset(id: string) {
    settings.value.apiPresets = settings.value.apiPresets.filter(p => p.id !== id);
    if (settings.value.activePresetId === id) {
      settings.value.activePresetId = null;
    }
  }

  function migrateLegacyApi() {
    // 将旧版 apiUrl/apiKey/apiModel 迁移为一套独立 API 连接配置
    const s = settings.value;
    if (s.apiUrl || s.apiKey || s.apiModel) {
      const migrated: ApiPreset = {
        id: `legacy_${Date.now()}`,
        name: '\u65E7\u914D\u7F6E\u8FC1\u79FB',
        apiMode: 'custom',
        apiUrl: s.apiUrl,
        apiKey: s.apiKey,
        apiModel: s.apiModel,
        maxTokens: 60000,
        temperature: 1.0,
        tavernProfile: '',
      };
      s.apiPresets = [...s.apiPresets, migrated];
      s.activePresetId = migrated.id;
      s.useMainApi = !s.apiEnabled;
      // 清空旧字段
      s.apiUrl = '';
      s.apiKey = '';
      s.apiModel = '';
      s.apiEnabled = false;
    }
  }

  return {
    settings,
    activePreset,
    effectiveApiMode,
    addPreset,
    updatePreset,
    removePreset,
    migrateLegacyApi,
  };
});
