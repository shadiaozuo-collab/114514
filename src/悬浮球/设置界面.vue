<template>
  <div class="floating-ball-settings">
    <!-- 外观设置 -->
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>\u60AC\u6D6E\u7403\u5916\u89C2</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="example-extension_block flex-container">
          <label for="fb-icon">\u56FE\u6807\uFF1A</label>
          <input id="fb-icon" v-model="settings.icon" type="text" style="width: 60px;" />
        </div>
        <div class="example-extension_block flex-container">
          <label for="fb-title">\u6807\u9898\uFF1A</label>
          <input id="fb-title" v-model="settings.title" type="text" style="width: 150px;" />
        </div>
        <div class="example-extension_block flex-container">
          <label for="fb-width">\u5BBD\u5EA6(px)\uFF1A</label>
          <input id="fb-width" v-model.number="settings.width" type="number" style="width: 80px;" />
        </div>
        <div class="example-extension_block flex-container">
          <label for="fb-x">\u521D\u59CB X\uFF1A</label>
          <input id="fb-x" v-model="settings.defaultX" type="text" style="width: 80px;" />
        </div>
        <div class="example-extension_block flex-container">
          <label for="fb-y">\u521D\u59CB Y\uFF1A</label>
          <input id="fb-y" v-model="settings.defaultY" type="text" style="width: 80px;" />
        </div>
        <hr class="sysHR" />
      </div>
    </div>

    <!-- API 设置 -->
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>API \u8BBE\u7F6E</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <!-- 沿用酒馆主 API -->
        <div class="example-extension_block flex-container">
          <input id="fb-use-main-api" v-model="settings.useMainApi" type="checkbox" />
          <label for="fb-use-main-api">直接沿用酒馆主 API（关闭后使用下方API 连接配置）</label>
        </div>

        <div v-if="settings.useMainApi" class="example-extension_block">
          <small style="color: #888;">已启用主 API，独立 API 配置仅作备用</small>
        </div>

        <hr class="sysHR" />

        <!-- 配置选择（始终可见） -->
        <div class="example-extension_block flex-container">
          <label>API 连接配置：</label>
          <select v-model="settings.activePresetId" :disabled="settings.useMainApi" style="width: 140px;">
            <option :value="null">-- 请选择 --</option>
            <option v-for="p in settings.apiPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button class="menu_button" @click="addPreset" title="新增配置">+</button>
          <button
            v-if="settings.activePresetId"
            class="menu_button"
            @click="removeActivePreset"
            title="删除当前配置"
          >
            -
          </button>
        </div>

        <!-- 配置编辑（仅在选择配置时显示） -->
        <div v-if="editingPreset">
          <div class="example-extension_block flex-container">
            <label for="fb-preset-name">配置名称：</label>
            <input id="fb-preset-name" v-model="editingPreset.name" type="text" style="width: 140px;" />
          </div>
          <div class="example-extension_block flex-container">
            <label for="fb-preset-mode">调用模式：</label>
            <select id="fb-preset-mode" v-model="editingPreset.apiMode" style="width: 140px;">
              <option value="custom">自定义 API</option>
              <option value="tavern">酒馆连接配置</option>
            </select>
          </div>

          <!-- 自定义 API 字段 -->
          <template v-if="editingPreset.apiMode === 'custom'">
            <div class="example-extension_block flex-container">
              <label for="fb-preset-url">API 地址：</label>
              <input
                id="fb-preset-url"
                v-model="editingPreset.apiUrl"
                type="text"
                style="width: 200px;"
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div class="example-extension_block flex-container">
              <label for="fb-preset-key">API Key：</label>
              <input
                id="fb-preset-key"
                v-model="editingPreset.apiKey"
                type="password"
                style="width: 200px;"
                placeholder="sk-..."
              />
            </div>
            <div class="example-extension_block flex-container">
              <label for="fb-preset-model">模型：</label>
              <input
                id="fb-preset-model"
                v-model="editingPreset.apiModel"
                type="text"
                style="width: 150px;"
                placeholder="gpt-4o"
              />
            </div>
            <div class="example-extension_block flex-container">
              <label for="fb-preset-tokens">Max Tokens：</label>
              <input id="fb-preset-tokens" v-model.number="editingPreset.maxTokens" type="number" style="width: 100px;" />
            </div>
            <div class="example-extension_block flex-container">
              <label for="fb-preset-temp">Temperature：</label>
              <input
                id="fb-preset-temp"
                v-model.number="editingPreset.temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                style="width: 80px;"
              />
            </div>
          </template>

          <!-- 酒馆连接配置字段 -->
          <template v-if="editingPreset.apiMode === 'tavern'">
            <div class="example-extension_block flex-container">
              <label for="fb-preset-profile">连接配置名：</label>
              <input
                id="fb-preset-profile"
                v-model="editingPreset.tavernProfile"
                type="text"
                style="width: 200px;"
                placeholder="酒馆中的连接配置名称"
              />
            </div>
            <div class="example-extension_block flex-container">
              <label for="fb-preset-tavern-model">模型（可选）：</label>
              <input
                id="fb-preset-tavern-model"
                v-model="editingPreset.apiModel"
                type="text"
                style="width: 150px;"
                placeholder="覆盖配置中的模型"
              />
            </div>
          </template>
        </div>

        <hr class="sysHR" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useSettingsStore, type ApiPreset } from './settings';

const store = useSettingsStore();
const { settings } = storeToRefs(store);

const editingPreset = computed<ApiPreset | undefined>({
  get() {
    if (!settings.value.activePresetId) return undefined;
    return settings.value.apiPresets.find(p => p.id === settings.value.activePresetId);
  },
  set(val) {
    if (val && val.id) {
      store.updatePreset(val.id, val);
    }
  },
});

function addPreset() {
  const newPreset = store.addPreset({
    name: `\u9884\u8BBE ${settings.value.apiPresets.length + 1}`,
    apiMode: 'custom',
    apiUrl: '',
    apiKey: '',
    apiModel: '',
    maxTokens: 60000,
    temperature: 1.0,
    tavernProfile: '',
  });
  settings.value.activePresetId = newPreset.id;
}

function removeActivePreset() {
  if (!settings.value.activePresetId) return;
  store.removePreset(settings.value.activePresetId);
}
</script>

<style scoped></style>
