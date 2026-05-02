<template>
  <div class="absolute inset-0 z-10 overflow-y-auto p-3" :style="{ backgroundColor: 'var(--f-bg)' }">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-bold text-[var(--f-text)]">论坛设置</span>
      <button class="text-[var(--f-text-secondary)] hover:text-[var(--f-text)]" @click="$emit('close')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="space-y-3">
      <!-- 基本设置 -->
      <div class="border-b pb-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">基本</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛名称</label>
        <input v-model="store.settings.ZforumName" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
      </div>
      <!-- 模型名已移到 API 配置区域 -->

      <!-- 板块管理 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">板块管理</span>
      </div>
      <div class="space-y-2">
        <div v-for="(sec, index) in store.settings.Zsections" :key="sec.id" class="border rounded p-2 space-y-1" :style="{ borderColor: 'var(--f-border)' }">
          <div class="flex items-center gap-1">
            <input v-model="sec.name" class="flex-1 text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" :placeholder="`板块${index + 1}名称`" />
            <select v-model="sec.type" class="text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" @change="onSectionTypeChange(sec)">
              <option value="forum">论坛</option>
              <option value="tournament">赛事</option>
              <option value="newspaper">报纸</option>
            </select>
            <button
              v-if="store.settings.Zsections.length > 1"
              class="text-[10px] px-2 py-1 rounded border transition-colors"
              :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }"
              @click="store.removeSection(sec.id)"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <textarea v-model="sec.prompt" rows="3" class="w-full text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)] resize-none" :style="inputStyle" :placeholder="`板块${index + 1}的系统提示词`"></textarea>
        </div>
        <button
          v-if="store.settings.Zsections.length < 5"
          class="w-full text-[11px] py-1.5 rounded border transition-colors"
          :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)', borderColor: 'var(--f-accent)' }"
          @click="addSection"
        >
          <i class="fa-solid fa-plus"></i> 添加板块（{{ store.settings.Zsections.length }}/5）
        </button>
      </div>

      <!-- 主题风格 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">主题风格</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">论坛主题</label>
        <div class="grid grid-cols-6 gap-1">
          <button
            v-for="theme in themes"
            :key="theme.value"
            class="text-[10px] py-1.5 px-1 rounded border transition-all"
            :class="store.settings.Ztheme === theme.value ? 'ring-1 ring-[var(--f-accent)]' : ''"
            :style="{ backgroundColor: theme.previewBg, color: theme.previewText, borderColor: store.settings.Ztheme === theme.value ? 'var(--f-accent)' : 'var(--f-border)' }"
            @click="store.settings.Ztheme = theme.value"
          >
            {{ theme.label }}
          </button>
        </div>
      </div>
      <div v-if="store.settings.Ztheme === 'custom'" class="space-y-2">
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-[var(--f-text-secondary)] w-16">背景色</label>
          <input v-model="store.settings.ZcustomBg" type="color" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input v-model="store.settings.ZcustomBg" class="flex-1 text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-[var(--f-text-secondary)] w-16">卡片色</label>
          <input v-model="store.settings.ZcustomCardBg" type="color" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input v-model="store.settings.ZcustomCardBg" class="flex-1 text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-[var(--f-text-secondary)] w-16">文字色</label>
          <input v-model="store.settings.ZcustomText" type="color" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input v-model="store.settings.ZcustomText" class="flex-1 text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-[var(--f-text-secondary)] w-16">强调色</label>
          <input v-model="store.settings.ZcustomAccent" type="color" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input v-model="store.settings.ZcustomAccent" class="flex-1 text-xs px-2 py-1 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        </div>
      </div>

      <!-- 背景设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">背景设置</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">背景图片 URL（留空使用主题默认背景）</label>
        <input v-model="store.settings.ZbgImage" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="https://example.com/bg.jpg" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">支持网络图片链接，留空则使用当前主题的纯色背景</p>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">或本地上传背景图片</label>
        <div class="flex items-center gap-2">
          <input
            ref="bgFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleBgFileUpload"
          />
          <button
            class="text-[11px] px-2 py-1.5 rounded border transition-colors"
            :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text)', borderColor: 'var(--f-border-hover)' }"
            @click="bgFileInput?.click()"
          >
            <i class="fa-solid fa-upload"></i> 选择图片
          </button>
          <button
            v-if="store.settings.ZbgImage"
            class="text-[11px] px-2 py-1.5 rounded border transition-colors"
            :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }"
            @click="clearBgImage"
          >
            <i class="fa-solid fa-trash-can"></i> 清除
          </button>
        </div>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">图片将转为 Base64 存储在变量中</p>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">背景透明度：{{ store.settings.ZbgOpacity }}%</label>
        <input v-model.number="store.settings.ZbgOpacity" type="range" min="0" max="100" class="w-full accent-blue-500" />
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">毛玻璃模糊：{{ store.settings.ZbgBlur }}px</label>
        <input v-model.number="store.settings.ZbgBlur" type="range" min="0" max="20" class="w-full accent-blue-500" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">数值越大背景越模糊，0 为不模糊</p>
      </div>

      <!-- 玩家身份 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">玩家身份</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">玩家论坛ID</label>
        <input v-model="store.settings.ZplayerForumId" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="你在论坛中的ID，如：暗夜刺客" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">发帖时默认使用此ID，AI生成时也会识别此ID</p>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">AI 生成ID提示词</label>
        <textarea v-model="store.settings.ZauthorIdPrompt" rows="3" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none" :style="inputStyle"></textarea>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">指导 AI 生成什么风格的用户名/ID，会追加到系统提示词中</p>
      </div>

      <!-- AI 生成设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">AI 生成</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">每次建议生成帖子数</label>
        <input v-model.number="store.settings.ZpostCountHint" type="number" min="1" max="10" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">实际数量由 AI 决定，此值仅作提示</p>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">每个帖子建议评论数</label>
        <input v-model.number="store.settings.ZcommentCountHint" type="number" min="0" max="10" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">设为 0 则不要求生成评论</p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZdecentralizedMode" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">去中心化模式</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">开启后提示 AI 不要只围绕主角生成内容</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZautoAiReply" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">自动AI回复</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">用户发帖或评论后自动生成AI评论回复</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZenableLikes" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">显示点赞数（热度）</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">AI生成帖子时附带模拟点赞数，用户可手动点赞</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZincludePresetContext" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">带入酒馆预设上下文</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">关闭后，AI生成时只发送世界书+对话历史+论坛提示词，不携带角色卡、场景、对话示例等预设内容</p>
        </div>
      </div>

      <!-- API 配置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">API 配置</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">模型名（留空使用酒馆当前模型）</label>
        <!-- 下拉选择模式 -->
        <div v-if="!isCustomModel && suggestedModels.length > 0" class="flex items-center gap-1">
          <select
            v-model="store.settings.Zmodel"
            class="flex-1 text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
            :style="inputStyle"
            @change="if (store.settings.Zmodel === '__custom__') { store.settings.Zmodel = ''; isCustomModel = true; }"
          >
            <option value="">留空使用酒馆当前模型</option>
            <option v-for="m in suggestedModels" :key="m" :value="m">{{ m }}</option>
            <option value="__custom__">✎ 手动输入...</option>
          </select>
        </div>
        <!-- 自定义输入模式（或没有建议模型时） -->
        <div v-else class="flex items-center gap-1">
          <input
            v-model="store.settings.Zmodel"
            class="flex-1 text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]"
            :style="inputStyle"
            placeholder="输入模型名"
          />
          <button
            v-if="suggestedModels.length > 0"
            class="text-[10px] px-2 py-1.5 rounded border transition-colors shrink-0"
            :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)', borderColor: 'var(--f-accent)' }"
            @click="isCustomModel = false"
          >
            <i class="fa-solid fa-list"></i> 列表
          </button>
        </div>
        <div class="flex items-center gap-1 mt-1">
          <button
            class="flex-1 text-[10px] px-2 py-1 rounded border transition-colors"
            :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)', borderColor: 'var(--f-accent)' }"
            :disabled="isLoadingModels"
            @click="loadModelList"
          >
            <i :class="isLoadingModels ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-rotate'"></i>
            {{ isLoadingModels ? '加载中…' : '加载模型列表' }}
          </button>
          <button
            v-if="store.settings.ZfetchedModels.length > 0"
            class="text-[10px] px-2 py-1 rounded border transition-colors"
            :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }"
            @click="store.settings.ZfetchedModels = []; toastr.info('已清除加载的模型列表')"
          >
            <i class="fa-solid fa-trash-can"></i> 清除
          </button>
        </div>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">
          {{ store.settings.ZfetchedModels.length > 0 ? `已从 API 加载 ${store.settings.ZfetchedModels.length} 个模型` : '点击按钮从 API 地址获取可用模型列表，支持任意第三方中转站' }}
        </p>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">代理预设名（优先使用）</label>
        <input v-model="store.settings.ZproxyPreset" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="如: MyProxy，填写后将忽略下方自定义API地址" />
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">自定义 API 地址</label>
        <input v-model="store.settings.ZapiUrl" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="https://your-proxy-url.com" />
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">API Key</label>
        <input v-model="store.settings.ZapiKey" type="password" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="sk-..." />
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">API 源</label>
        <input v-model="store.settings.ZapiSource" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="如: openai, claude" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">留空则默认 openai。若配置了额外 API，生成时会带上完整的酒馆预设上下文</p>
      </div>

      <!-- API 预设管理 -->
      <div class="border rounded p-2 space-y-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">API 预设</span>
        <div v-if="store.settings.ZapiPresets.length > 0" class="flex items-center gap-1">
          <select v-model="selectedPresetName" class="flex-1 text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle">
            <option value="">选择预设...</option>
            <option v-for="preset in store.settings.ZapiPresets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
          </select>
          <button class="text-[10px] px-2 py-1.5 rounded border transition-colors" :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)', borderColor: 'var(--f-accent)' }" @click="applyPreset">
            <i class="fa-solid fa-check"></i> 应用
          </button>
          <button class="text-[10px] px-2 py-1.5 rounded border transition-colors" :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }" @click="deletePreset">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="flex items-center gap-1">
          <input v-model="savePresetName" class="flex-1 text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" placeholder="预设名称" />
          <button class="text-[10px] px-2 py-1.5 rounded border transition-colors" :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)', borderColor: 'var(--f-accent)' }" @click="savePreset">
            <i class="fa-solid fa-floppy-disk"></i> 保存
          </button>
        </div>
      </div>

      <!-- 提示词设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">提示词</span>
      </div>
      <div v-for="sec in store.settings.Zsections" :key="sec.id">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">{{ sec.name }} - 系统提示词</label>
        <textarea v-model="sec.prompt" rows="4" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none" :style="inputStyle"></textarea>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">输出格式提示</label>
        <textarea v-model="store.settings.ZoutputFormat" rows="5" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)] resize-none" :style="inputStyle"></textarea>
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">此内容会追加到系统提示词末尾，用于提醒 AI 保持输出格式</p>
      </div>

      <!-- 注入设置 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">上下文注入</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZenableInjectToChat" type="checkbox" class="accent-blue-500" />
        <label class="text-[11px] text-[var(--f-text-secondary)]">将论坛内容注入酒馆对话</label>
      </div>
      <template v-if="store.settings.ZenableInjectToChat">
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">注入帖子数量上限</label>
          <input v-model.number="store.settings.ZinjectPostCount" type="number" min="1" max="20" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        </div>
      </template>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">生成论坛时读取的对话历史条数</label>
        <input v-model.number="store.settings.ZinjectChatHistoryCount" type="number" min="0" max="50" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
      </div>

      <!-- 自动生成 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">自动生成</span>
      </div>
      <div>
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">自动生成帖子间隔（0=不生成，-1=每轮都生成）</label>
        <input v-model.number="store.settings.ZautoGenerateInterval" type="number" min="-1" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
      </div>
      <div v-if="store.settings.ZautoGenerateInterval !== 0">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">AI回复最短字数（0=不检测，低于此值跳过生成）</label>
        <input v-model.number="store.settings.ZminReplyLength" type="number" min="0" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
      </div>
      <div v-if="store.settings.ZautoGenerateInterval !== 0">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">自动生成板块</label>
        <select v-model="store.settings.ZautoGenerateSection" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle">
          <option value="all">全部板块</option>
          <option v-for="sec in store.settings.Zsections" :key="sec.id" :value="sec.id">{{ sec.name }}</option>
        </select>
      </div>
      <div v-if="store.settings.ZautoGenerateInterval !== 0">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">多板块自动生成模式</label>
        <select v-model="store.settings.ZautoGenerateMode" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle">
          <option value="sequential">独立生成（逐个调用，更稳定）</option>
          <option value="merged">合并生成（单次调用，更快）</option>
        </select>
        <p v-if="store.settings.ZautoGenerateMode === 'merged' && store.settings.Zsections.length > 3" class="text-[10px] text-[var(--f-danger)] mt-1">
          <i class="fa-solid fa-triangle-exclamation"></i> 板块超过3个时，合并生成可能不可靠
        </p>
      </div>

      <!-- 自动清理 -->
      <div class="border-b pb-2 mt-2" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)]">自动清理</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="store.settings.ZautoCleanEnabled" type="checkbox" class="accent-blue-500" />
        <div>
          <label class="text-[11px] text-[var(--f-text-secondary)]">启用自动清理旧帖子</label>
          <p class="text-[10px]" :style="{ color: 'var(--f-text-muted)' }">当帖子数量超过阈值时，自动删除最旧的帖子</p>
        </div>
      </div>
      <div v-if="store.settings.ZautoCleanEnabled">
        <label class="text-[11px] text-[var(--f-text-secondary)] block mb-1">帖子数量上限</label>
        <input v-model.number="store.settings.ZautoCleanThreshold" type="number" min="1" max="500" class="w-full text-xs px-2 py-1.5 rounded outline-none border focus:border-[var(--f-accent)]" :style="inputStyle" />
        <p class="text-[10px] mt-0.5" :style="{ color: 'var(--f-text-muted)' }">超过此数量将自动清理最旧的帖子</p>
      </div>

      <!-- 保存 -->
      <div class="pt-2 mt-2">
        <button class="w-full text-xs py-2 rounded border transition-colors font-medium" :style="{ backgroundColor: 'var(--f-accent)', color: '#fff', borderColor: 'var(--f-accent)' }" @click="saveSettings">
          <i class="fa-solid fa-floppy-disk"></i> 保存设置
        </button>
        <p class="text-[10px] mt-1 text-center" :style="{ color: 'var(--f-text-muted)' }">设置修改后会自动保存，点击按钮可立即强制同步并确认。</p>
      </div>

      <!-- 危险区域 -->
      <div class="border-t pt-3 mt-3" :style="{ borderColor: 'var(--f-danger-bg)' }">
        <span class="text-[11px] font-bold block mb-2 text-[var(--f-danger)]">⚠ 危险操作</span>
        <button class="w-full text-[11px] py-1.5 rounded border transition-colors" :style="{ backgroundColor: 'var(--f-danger-bg)', color: 'var(--f-danger)', borderColor: 'var(--f-danger)' }" @click="clearVars">
          <i class="fa-solid fa-trash-can"></i> 一键清除论坛变量
        </button>
        <p class="text-[10px] mt-1" :style="{ color: 'var(--f-text-muted)' }">清除所有以 Z 开头的论坛脚本变量，恢复默认设置。帖子数据将丢失。</p>
      </div>

      <!-- 默认提示词备份 -->
      <div class="border-t pt-3 mt-3" :style="{ borderColor: 'var(--f-border)' }">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--f-accent)] block mb-2">📖 默认提示词备份</span>
        <p class="text-[10px] mb-2" :style="{ color: 'var(--f-text-muted)' }">以下是所有默认提示词的只读备份，如修改出错可复制恢复。</p>
        <div class="space-y-2">
          <div v-for="item in defaultPrompts" :key="item.label" class="relative">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-medium text-[var(--f-text-secondary)]">{{ item.label }}</span>
              <button class="text-[9px] px-1.5 py-0.5 rounded transition-colors" :style="{ backgroundColor: 'var(--f-accent-dim)', color: 'var(--f-accent)' }" @click="copyText(item.content)">
                <i class="fa-solid fa-copy"></i> 复制
              </button>
            </div>
            <pre class="text-[10px] p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-24 overflow-y-auto" :style="{ backgroundColor: 'var(--f-bg-input)', color: 'var(--f-text-muted)', border: '1px solid var(--f-border)' }">{{ item.content }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useForumSettingsStore } from './settings';

const emit = defineEmits<{ close: [] }>();
const store = useForumSettingsStore();
const bgFileInput = ref<HTMLInputElement | null>(null);

function handleBgFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    store.settings.ZbgImage = reader.result as string;
    toastr.success('背景图片已上传');
  };
  reader.onerror = () => {
    toastr.error('图片读取失败');
  };
  reader.readAsDataURL(file);

  // 重置 input，允许重复选择同一文件
  target.value = '';
}

function clearBgImage() {
  store.settings.ZbgImage = '';
  toastr.success('背景图片已清除');
}

function addSection() {
  const id = String.fromCharCode(65 + store.settings.Zsections.length);
  const name = `论坛${id}`;
  const prompt = `你是一个论坛用户。请根据上下文生成"${name}"板块的帖子和评论。\n要求：\n- 使用自然的网络用语风格\n- 每个用户有独特的用户名和发言风格\n- 评论应该有不同观点的碰撞\n- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"等，不要使用现实时间`;
  store.addSection(name, prompt);
}

const savePresetName = ref('');
const selectedPresetName = ref('');
const isLoadingModels = ref(false);
const isCustomModel = ref(false);

function savePreset() {
  const name = savePresetName.value.trim();
  if (!name) {
    toastr.warning('请输入预设名称');
    return;
  }
  store.saveApiPreset(name);
  toastr.success(`已保存预设: ${name}`);
  savePresetName.value = '';
}

function applyPreset() {
  const name = selectedPresetName.value;
  if (!name) {
    toastr.warning('请先选择一个预设');
    return;
  }
  store.applyApiPreset(name);
  toastr.success(`已应用预设: ${name}`);
}

function deletePreset() {
  const name = selectedPresetName.value;
  if (!name) {
    toastr.warning('请先选择一个预设');
    return;
  }
  if (confirm(`确定要删除预设 "${name}" 吗？`)) {
    store.deleteApiPreset(name);
    selectedPresetName.value = '';
    toastr.success(`已删除预设: ${name}`);
  }
}

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini', 'o1-mini'],
  claude: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku', 'claude-3-5-sonnet-20241022'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro', 'deepseek-v4-flash'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  azure: ['gpt-4o', 'gpt-4o-mini', 'gpt-4'],
};

const suggestedModels = computed(() => {
  // 优先使用从 API 加载的模型列表
  if (store.settings.ZfetchedModels.length > 0) {
    return store.settings.ZfetchedModels;
  }
  const source = (store.settings.ZapiSource || '').toLowerCase().trim();
  const url = (store.settings.ZapiUrl || '').toLowerCase();
  if (source && MODEL_SUGGESTIONS[source]) {
    return MODEL_SUGGESTIONS[source];
  }
  if (url.includes('deepseek')) return MODEL_SUGGESTIONS.deepseek;
  if (url.includes('openai') || url.includes('chatgpt')) return MODEL_SUGGESTIONS.openai;
  if (url.includes('anthropic') || url.includes('claude')) return MODEL_SUGGESTIONS.claude;
  if (url.includes('gemini') || url.includes('google')) return MODEL_SUGGESTIONS.gemini;
  if (url.includes('azure')) return MODEL_SUGGESTIONS.azure;
  return [];
});

async function loadModelList() {
  const url = store.settings.ZapiUrl.trim();
  const key = store.settings.ZapiKey.trim();
  if (!url) {
    toastr.warning('请先填写自定义 API 地址');
    return;
  }
  isLoadingModels.value = true;
  try {
    // 确保 models 端点正确拼接
    let modelsUrl = url;
    if (modelsUrl.endsWith('/')) modelsUrl = modelsUrl.slice(0, -1);
    if (!modelsUrl.endsWith('/models')) {
      if (!modelsUrl.includes('/v')) {
        modelsUrl += '/v1/models';
      } else {
        modelsUrl += '/models';
      }
    }
    const headers: Record<string, string> = {};
    if (key) headers['Authorization'] = `Bearer ${key}`;
    const res = await fetch(modelsUrl, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const models = (data.data || []).map((m: any) => m.id || m.model || m.name || '').filter(Boolean);
    if (models.length === 0) {
      toastr.warning('API 返回的模型列表为空');
      return;
    }
    store.settings.ZfetchedModels = models;
    toastr.success(`已加载 ${models.length} 个模型`);
  } catch (e: any) {
    console.error('[论坛] 加载模型列表失败:', e);
    toastr.error(`加载模型列表失败: ${e?.message || String(e)}`);
  } finally {
    isLoadingModels.value = false;
  }
}

const inputStyle = computed(() => ({
  backgroundColor: 'var(--f-bg-input)',
  color: 'var(--f-text)',
  borderColor: 'var(--f-border-hover)',
}));

const themes = [
  { value: 'classic-dark', label: '经典暗黑', previewBg: '#111827', previewText: '#e5e7eb' },
  { value: 'cyberpunk', label: '赛博朋克', previewBg: '#0a0a1a', previewText: '#00ffff' },
  { value: 'vaporwave', label: '蒸汽波', previewBg: '#1a0a2e', previewText: '#ff71ce' },
  { value: 'terminal', label: '终端绿', previewBg: '#0a0a0a', previewText: '#33ff33' },
  { value: 'light', label: '简约白', previewBg: '#f3f4f6', previewText: '#111827' },
  { value: 'parchment', label: '羊皮纸', previewBg: '#f5f0e6', previewText: '#4a3728' },
  { value: 'dark-gold', label: '暗金', previewBg: '#0d0d0d', previewText: '#c9a84c' },
  { value: 'custom', label: '自定义', previewBg: '#374151', previewText: '#fbbf24' },
];

const defaultPromptA = `你是一个现实世界的网络论坛用户。请根据上下文生成论坛帖子和评论。
要求：
- 使用自然的网络用语风格
- 帖子主题围绕现实生活、社会话题、日常讨论
- 每个用户有独特的用户名和发言风格
- 评论应该有不同观点的碰撞
- 帖子内容应当与当前剧情有一定关联性
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultPromptB = `你是一个网游世界中的玩家。请根据游戏上下文生成游戏内论坛的帖子和评论。
要求：
- 使用游戏玩家术语和黑话
- 帖子主题围绕游戏攻略、装备讨论、副本组队、PK恩怨等
- 每个用户有独特的游戏ID和发言风格
- 评论应该体现不同等级、职业玩家的视角差异
- 适当提及游戏中的事件、版本更新、活动等
- 帖子内容应当与当前游戏剧情/事件有关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultOutput = `你必须严格按照以下JSON结构输出，不要添加、删除或重命名字段：

批量生成帖子时输出：
{
  "posts": [
    {
      "title": "帖子标题",
      "content": "帖子正文，50-150字，有具体细节",
      "authorId": "发帖人ID",
      "timestamp": "故事内时间，如 第三章·深夜",
      "comments": [
        { "authorId": "评论人ID", "content": "评论内容，20-80字", "timestamp": "故事内时间" }
      ]
    }
  ]
}

生成评论时输出：
{
  "comments": [
    { "authorId": "评论人ID", "content": "评论内容", "timestamp": "故事内时间" }
  ]
}

格式注意事项：
- 标题简短有力，像真实论坛标题
- 内容要有具体细节，不要太笼统
- 评论简洁直接，像真实网络评论
- timestamp 必须填故事内时间，不要用现实时间或留空
- 严格按上述JSON结构输出，不要输出其他任何文本`;

const defaultPromptTournament = `你是一位专业的电竞赛事解说员和战报作者。请根据游戏上下文生成精彩的比赛战报。
要求：
- 每场比赛必须明确写出对阵双方（teamA、teamB）、最终比分（score）、胜者（winner）
- 比赛过程要扣人心弦，有具体的战术细节、关键时刻、逆转情节
- 适当使用电竞术语（如：一波流、放风筝、仇恨失控、DPS爆发等）
- 评论应模拟观众/粉丝的反应，有支持不同队伍的阵营感
- 比赛内容应与当前游戏剧情/世界观有关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultPromptNewspaper = `你是一家游戏世界报社的主编。请根据游戏上下文生成一期完整的报纸。
要求：
- 每期报纸包含多个栏目文章（要闻、攻略、八卦、访谈等），每篇文章有独立的标题、内容、作者和栏目名
- 头条新闻要抓人眼球，内容要有爆炸性或重要性
- 不同栏目应有不同风格：要闻客观严肃、攻略实用详细、八卦轻松调侃、访谈亲切深入
- 主编寄语（content字段）要简洁有力，概括本期重点
- 读者来信（comments）应体现不同玩家的关注点
- 报纸内容应与当前游戏剧情/事件紧密关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间`;

const defaultOutputTournament = `批量生成比赛战报时输出：
{
  "posts": [
    {
      "title": "比赛名称，如：半决赛：雷霆战队 vs 暗影军团",
      "content": "比赛过程详细描述，100-200字，有战术细节和关键时刻",
      "authorId": "解说员ID",
      "timestamp": "故事内时间",
      "comments": [
        { "authorId": "观众ID", "content": "观众评论，体现阵营感", "timestamp": "故事内时间" }
      ],
      "metadata": {
        "teamA": "队伍A名称",
        "teamB": "队伍B名称",
        "score": "3:2",
        "winner": "胜者队伍名称",
        "round": "轮次，如：小组赛/八强/半决赛/决赛",
        "mvp": "表现最佳选手（可选）"
      }
    }
  ]
}

格式注意事项：
- metadata 字段必须包含，否则无法正确显示比分和对阵信息
- 比分格式建议用 "X:Y"，如 "3:2"
- round 字段用于标识比赛阶段
- 其他注意事项与普通论坛帖子相同`;

const defaultOutputNewspaper = `批量生成报纸时输出：
{
  "posts": [
    {
      "title": "报纸名称·期号，如：艾泽拉斯日报·第3期",
      "content": "主编寄语/本期导读，30-50字概括本期重点",
      "authorId": "主编ID",
      "timestamp": "故事内时间",
      "comments": [
        { "authorId": "读者ID", "content": "读者来信，体现玩家关注点", "timestamp": "故事内时间" }
      ],
      "metadata": {
        "issueNumber": "第3期",
        "articles": [
          { "title": "文章标题", "content": "文章内容，50-150字", "author": "记者ID", "column": "栏目名，如：要闻/攻略/八卦/访谈" }
        ]
      }
    }
  ]
}

格式注意事项：
- 一期报纸只输出一个 post（即 posts 数组只有1个元素）
- metadata.articles 必须包含至少2篇文章，建议3-5篇
- 第一篇文章默认作为头条展示，标题要最醒目
- column 字段用于分类展示，常用值：要闻、攻略、八卦、访谈、社论、广告
- 其他注意事项与普通论坛帖子相同`;

const defaultAuthorId = `生成的用户ID应符合论坛语境：网游风格ID（如：剑影无痕、暗夜刺客、小虾米、龙城飞将），或现实网络风格（如：路人甲、加班到天亮、咖啡续命中）。每个ID应有独特个性，避免过于普通。不要生成与主角相关的ID。`;

const defaultPrompts = computed(() => [
  { label: '板块A默认提示词（现实讨论）', content: defaultPromptA },
  { label: '板块B默认提示词（游戏中论坛）', content: defaultPromptB },
  { label: '赛事板块默认提示词', content: defaultPromptTournament },
  { label: '报纸板块默认提示词', content: defaultPromptNewspaper },
  { label: '论坛默认输出格式', content: defaultOutput },
  { label: '赛事输出格式要求', content: defaultOutputTournament },
  { label: '报纸输出格式要求', content: defaultOutputNewspaper },
  { label: '默认 AI 生成ID提示词', content: defaultAuthorId },
]);

function copyText(text: string) {
  // 尝试主窗口 Clipboard API（iframe 中可能无权限，父窗口可能有）
  const tryClipboard = (target: any) => {
    if (!target?.clipboard?.writeText) return Promise.reject(new Error('no clipboard'));
    return target.clipboard.writeText(text);
  };

  tryClipboard(window.parent)
    .catch(() => tryClipboard(window))
    .then(() => {
      toastr.success('已复制到剪贴板');
    })
    .catch(() => {
      // fallback: execCommand
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;z-index:-1;';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      if (success) {
        toastr.success('已复制到剪贴板');
      } else {
        toastr.error('复制失败，请手动选中下方文本复制');
      }
    });
}

const defaultPromptSet = new Set([
  defaultPromptA.trim(),
  defaultPromptB.trim(),
  defaultPromptTournament.trim(),
  defaultPromptNewspaper.trim(),
  '',
]);

function onSectionTypeChange(sec: any) {
  const current = (sec.prompt || '').trim();
  // 只有当前提示词为空或是某个默认提示词时，才自动切换
  if (!defaultPromptSet.has(current)) {
    toastr.info('提示词已自定义，未自动切换。如需默认提示词请从备份中复制。');
    return;
  }
  if (sec.type === 'tournament') {
    sec.prompt = defaultPromptTournament;
    toastr.success('已自动切换为赛事默认提示词');
  } else if (sec.type === 'newspaper') {
    sec.prompt = defaultPromptNewspaper;
    toastr.success('已自动切换为报纸默认提示词');
  } else {
    // 论坛默认：如果有两个论坛板块，第一个用A第二个用B
    const forumCount = store.settings.Zsections.filter((s: any) => s.id !== sec.id && s.type === 'forum').length;
    sec.prompt = forumCount === 0 ? defaultPromptA : defaultPromptB;
    toastr.success('已自动切换为论坛默认提示词');
  }
}

function saveSettings() {
  store.forceSync();
  toastr.success('设置已保存到酒馆变量');
}

function clearVars() {
  if (confirm('确定要清除所有论坛变量吗？此操作不可恢复，帖子数据将全部丢失。')) {
    store.clearAllForumVariables();
  }
}
</script>
