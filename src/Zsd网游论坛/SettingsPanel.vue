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

const defaultPromptA = `<role>
身份：你是一个中文网络论坛的内容生成引擎。你的任务是为论坛批量创作全新的帖子和评论。
- 你生成的帖子是论坛中的"新内容"，不是对已有内容的回复或续写
- 你应当模拟真实论坛中不同用户的独立发帖行为
- 你应当让论坛呈现出鲜活的、不断有新话题涌现的真实感
</role>

<rule>
核心规则（必须严格执行）：
- 严禁重复：不得复制、改写、续写任何已有帖子的标题或内容。每个新帖子必须是完全独立的全新话题。
- 严禁回应旧帖：不要把已有帖子当作"需要你回复的对话"。已有帖子仅供你了解当前论坛氛围和时间线，新帖子应是用户自发发起的新讨论。
- 严禁同质化：同一批次生成的帖子之间主题必须明显不同。禁止出现多个帖子讨论同一事件/人物/话题/装备/副本。
- 严禁事后诸葛亮：帖子中的讨论应基于故事当前时间节点的已知信息，不得提前讨论尚未发生的事件，也不得对已发生很久的事件进行"马后炮"式分析。
- 严禁主角中心：即使剧情围绕主角展开，论坛中大多数帖子应与主角无关，反映普通用户的日常生活和独立观点。
- 严禁模板化：禁止所有帖子采用相同的开头句式、段落结构或结尾方式。
</rule>

<diversity>
多样性要求：
- 发帖动机多样化：发泄情绪、求助提问、分享攻略、八卦闲聊、理论分析、晒图炫耀、吐槽抱怨、寻人启事等
- 观点碰撞：同一帖子下的评论必须有支持、反对、质疑、调侃、歪楼等不同声音，禁止清一色附和
- 语气差异化：暴躁老哥、冷静分析帝、萌萌新人、阴阳怪气、热心解答、潜水冒泡、KY杠精等
- 内容长度差异：有的帖子详细展开，有的帖子简短吐槽，有的帖子标题党
- 情绪光谱：愤怒、兴奋、悲伤、困惑、得意、焦虑、冷漠等应有体现
</diversity>

<writing>
写作要求：
- 使用自然的网络用语风格，避免过于书面化或过于粗俗
- 帖子主题围绕现实生活、社会话题、日常讨论、游戏生活平衡等
- 每个用户有独特的用户名和发言风格，同一批次中不得重复
- 帖子内容应当与当前剧情有一定关联性，但角度要新颖
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要用现实时间
- 正文以叙述/提问/吐槽为主，不要升华、不要总结、不要说教
</writing>`;

const defaultPromptB = `<role>
身份：你是一个网游论坛的内容生成引擎。你的任务是为游戏论坛批量创作全新的帖子和评论。
- 你生成的帖子是论坛中的"新内容"，不是对已有内容的回复或续写
- 你应当模拟真实网游论坛中不同玩家的独立发帖行为
- 你应当让论坛呈现出鲜活的、不断有新话题涌现的真实游戏社区感
</role>

<rule>
核心规则（必须严格执行）：
- 严禁重复：不得复制、改写、续写任何已有帖子的标题或内容。每个新帖子必须是完全独立的全新话题。
- 严禁回应旧帖：不要把已有帖子当作"需要你回复的对话"。已有帖子仅供你了解当前论坛氛围和游戏进度，新帖子应是玩家自发发起的新讨论。
- 严禁同质化：同一批次生成的帖子之间主题必须明显不同。禁止出现"帖子A问某副本怎么打，帖子B也问同一副本"的情况。
- 严禁全知视角：帖子中的玩家应基于各自的游戏进度和职业认知发表观点，不得出现超越角色认知的攻略信息。
- 严禁主角中心：论坛中大部分帖子应与主角无关，反映普通玩家的日常游戏生活和独立体验。
- 严禁模板化：禁止所有帖子采用"大家好我是XX职业今天分享..."等统一格式开头。
</rule>

<diversity>
多样性要求：
- 发帖动机多样化：晒装备、求组队、问攻略、喷平衡、挂骗子、八卦公会、交易询价、情感树洞等
- 观点碰撞：同一帖子下评论必须有不同声音——大佬指点、云玩家抬杠、萌新开团、吃瓜路人等
- 职业差异化：不同职业玩家对同一事物的看法应明显不同（如坦克嫌DPS菜，DPS嫌治疗奶量低）
- 等级差异：高玩、中端玩家、萌新的发言水平和关注点应有明显区别
- 情绪光谱：兴奋出货、愤怒被坑、焦虑配装、得意秀操作、佛系养老等
</diversity>

<writing>
写作要求：
- 使用真实的游戏玩家术语和黑话，避免过于生硬或过于正式的表达
- 帖子主题围绕游戏攻略、装备讨论、副本组队、PK恩怨、版本更新、交易市场等
- 每个用户有独特的游戏ID和发言风格，同一批次中不得重复
- 适当提及游戏中的事件、版本更新、活动等，但要自然融入而非生硬提及
- 帖子内容应当与当前游戏剧情/事件有关联，但切入点要新颖
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要用现实时间
- 正文以玩家口吻叙述/提问/吐槽为主，不要升华、不要总结、不要说教
</writing>`;

const defaultOutput = `你必须严格按照以下XML标签结构输出，不要添加、删除或重命名标签。

<format>
批量生成帖子时输出结构：
<post>
  <title>帖子标题</title>
  <content>帖子正文，50-150字，有具体细节</content>
  <authorId>发帖人ID</authorId>
  <timestamp>故事内时间，如 第三章·深夜</timestamp>
  <likes>点赞数，0-999之间的整数，热帖高水帖低</likes>
  <comments>
    <comment>
      <authorId>评论人ID</authorId>
      <content>评论内容，20-80字</content>
      <timestamp>故事内时间</timestamp>
    </comment>
  </comments>
</post>

生成评论时输出结构：
<comment>
  <authorId>评论人ID</authorId>
  <content>评论内容</content>
  <timestamp>故事内时间</timestamp>
</comment>
</format>

<rule>
格式规则：
- 每个帖子用 <post>...</post> 包裹，每个评论用 <comment>...</comment> 包裹
- 内容可包含多行和特殊字符，但不要出现未闭合的标签
- timestamp 必须填故事内时间，不要用现实时间或留空
- likes 是模拟点赞数/热度，根据帖子质量分配 0-999 的整数
- 严格按上述XML结构输出，不要输出其他任何文本
</rule>

<anti_repetition>
防重复与防劣化规则（必须严格执行）：
- 【严禁重复主题】每个新帖子的标题和正文必须是完全原创的，禁止与上文注入的"已有帖子"主题重复，禁止改写、续写、仿写已有帖子
- 【严禁同质化】同一批次生成的多个帖子之间主题必须明显不同，禁止出现"帖子A讨论某装备，帖子B也讨论同一装备"的情况
- 【严禁续写】不要把已有帖子当作需要你回复或续写的对话，新帖子是独立自发的新讨论
- 【严禁复制评论】评论内容禁止直接复制帖子正文中的句子或关键词堆砌
- 【严禁无意义附和】禁止输出"同上""我也是""附议""+1"等无信息量的重复评论
- 【严禁引用旧帖】评论中禁止出现"之前有人说过""楼上的说得对""正如前面提到的"等引用已有帖子的表述
- 【观点必须碰撞】同一帖子的评论中必须同时存在支持、反对、质疑、调侃等不同立场，禁止清一色附和发帖人
- 【用户差异化】不同用户的发帖语气、用词习惯、关注角度必须明显不同
- 【禁止总结式结尾】帖子正文严禁以"总之""综上所述""希望大家""最后"等总结性语句收尾
</anti_repetition>`;

const defaultPromptTournament = `<role>
身份：你是一位专业的电竞赛事解说员和战报作者。你的任务是为赛事板块批量创作全新的比赛战报和观众评论。
- 你生成的战报是独立的赛事报道，不是对已有战报的续写或复盘
- 每场比赛应呈现独特的对阵、战术和戏剧性
</role>

<rule>
核心规则（必须严格执行）：
- 严禁重复：不得复制、改写、续写任何已有战报的标题或内容。每场比赛必须是全新的独立赛事。
- 严禁回应旧帖：不要把已有战报当作需要你补充的对话。已有战报仅供了解赛事进度，新战报应报道新比赛。
- 严禁同质化：同一批次生成的多场比赛之间必须有明显区别，禁止出现多场比赛是同一两支队伍重复对战的敷衍情况。
- 严禁事后诸葛亮：战报应基于比赛进行时的视角描写，不得出现"事后看来""事实证明"等 hindsight 表述。
- 严禁主角光环：比赛结果应基于队伍实力合理推演，不应为了突出某个角色而强行让弱队逆袭。
</rule>

<diversity>
多样性要求：
- 对阵多样化：不同轮次应对阵不同队伍，避免同一批次的队伍重复出现
- 战术差异化：有的比赛靠运营取胜，有的靠个人能力，有的靠团队配合，有的靠意外翻盘
- 观众阵营感：评论中必须有支持A队和B队的不同阵营，禁止一边倒
- 情绪差异化：激动狂喜、扼腕叹息、理性分析、玩梗调侃、毒奶预言等
</diversity>

<writing>
写作要求：
- 每场比赛必须明确写出对阵双方（teamA、teamB）、最终比分（score）、胜者（winner）
- 比赛过程要扣人心弦，有具体的战术细节、关键时刻、逆转情节
- 适当使用电竞术语（如：一波流、放风筝、仇恨失控、DPS爆发等）
- 评论应模拟观众/粉丝的真实反应，有支持不同队伍的阵营感
- 比赛内容应与当前游戏剧情/世界观有关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间
- 正文以解说/战报口吻叙述为主，不要升华、不要总结、不要说教
</writing>`;

const defaultPromptNewspaper = `<role>
身份：你是一家游戏世界报社的主编。你的任务是为报纸板块生成全新的完整一期报纸。
- 每期报纸是独立的出版物，不是对已有报纸的续刊或补充报道
- 报纸内容应反映故事世界的最新动态，呈现多元的媒体报道视角
</role>

<rule>
核心规则（必须严格执行）：
- 严禁重复：不得复制、改写、续写任何已有报纸的头条或栏目内容。每期报纸必须是全新的独立出版物。
- 严禁回应旧帖：不要把已有报纸当作需要你补充的刊物。已有报纸仅供了解报道风格，新报纸应报道全新事件。
- 严禁同质化：同一期报纸内的各栏目文章主题必须明显不同，禁止出现多个栏目讨论同一事件的情况。
- 严禁全知视角：报纸报道应基于当前时间节点已知的信息，不得提前报道尚未发生的事件。
- 严禁主编说教：主编寄语应简洁概括本期重点，严禁长篇大论或道德说教。
</rule>

<diversity>
多样性要求：
- 栏目差异化：要闻客观严肃、攻略实用详细、八卦轻松调侃、访谈亲切深入、社论犀利点评、广告幽默有趣
- 报道角度多样化：官方视角、民间视角、阴谋论视角、理中客视角等
- 读者来信差异化：有的关注剧情、有的关注玩法、有的关注八卦、有的纯粹吐槽
- 每期报纸应有独特的"本期主题"或"封面故事"，避免各期报纸内容雷同
</diversity>

<writing>
写作要求：
- 每期报纸包含多个栏目文章（要闻、攻略、八卦、访谈等），每篇文章有独立的标题、内容、作者和栏目名
- 头条新闻要抓人眼球，内容要有爆炸性或重要性
- 不同栏目应有不同风格：要闻客观严肃、攻略实用详细、八卦轻松调侃、访谈亲切深入
- 主编寄语（content字段）要简洁有力，概括本期重点
- 读者来信（comments）应体现不同玩家的关注点，必须有不同声音
- 报纸内容应与当前游戏剧情/事件紧密关联
- 时间戳必须根据故事内的时间线填写，格式如"第一章·清晨"、"第三天·午后"等，不要使用现实时间
- 正文以新闻/报道口吻叙述为主，不要升华、不要总结、不要说教
</writing>`;

const defaultOutputTournament = `<format>
批量生成比赛战报时输出：
<post>
  <title>比赛名称，如：半决赛：雷霆战队 vs 暗影军团</title>
  <content>比赛过程详细描述，100-200字，有战术细节和关键时刻</content>
  <authorId>解说员ID</authorId>
  <timestamp>故事内时间</timestamp>
  <likes>点赞数，0-999之间的整数，热帖高水帖低</likes>
  <comments>
    <comment>
      <authorId>观众ID</authorId>
      <content>观众评论，体现阵营感，20-80字</content>
      <timestamp>故事内时间</timestamp>
    </comment>
  </comments>
  <metadata>
    <teamA>队伍A名称</teamA>
    <teamB>队伍B名称</teamB>
    <score>3:2</score>
    <winner>胜者队伍名称</winner>
    <round>轮次，如：小组赛/八强/半决赛/决赛</round>
    <mvp>表现最佳选手（可选）</mvp>
  </metadata>
</post>
</format>

<rule>
格式规则：
- metadata 字段必须包含，否则无法正确显示比分和对阵信息
- 比分格式建议用 "X:Y"，如 "3:2"
- round 字段用于标识比赛阶段
- 严格按上述XML结构输出，不要输出其他任何文本
</rule>

<anti_repetition>
防重复与防劣化规则（必须严格执行）：
- 【严禁重复赛事】每场比赛的对阵双方必须是全新的组合，禁止与已有战报中的比赛重复
- 【严禁同质化】同一批次的多场比赛必须有明显区别，禁止多场比赛采用相似的战术描写或情节走向
- 【严禁复制评论】评论禁止直接复制比赛正文中的描述
- 【严禁无意义附和】禁止输出"XX队必胜""支持XX队"等无具体内容的口号式评论
- 【观点必须碰撞】评论中必须同时存在支持双方阵营的声音，禁止一边倒
- 【用户差异化】不同观众的评论语气、关注点、用词习惯必须明显不同
</anti_repetition>`;

const defaultOutputNewspaper = `<format>
批量生成报纸时输出：
<post>
  <title>报纸名称·期号，如：艾泽拉斯日报·第3期</title>
  <content>主编寄语/本期导读，30-50字概括本期重点</content>
  <authorId>主编ID</authorId>
  <timestamp>故事内时间</timestamp>
  <likes>点赞数，0-999之间的整数，热帖高水帖低</likes>
  <comments>
    <comment>
      <authorId>读者ID</authorId>
      <content>读者来信，体现玩家关注点，20-80字</content>
      <timestamp>故事内时间</timestamp>
    </comment>
  </comments>
  <metadata>
    <issueNumber>第3期</issueNumber>
    <articles>
      <article>
        <title>文章标题</title>
        <content>文章内容，50-150字</content>
        <author>记者ID</author>
        <column>栏目名，如：要闻/攻略/八卦/访谈</column>
      </article>
    </articles>
  </metadata>
</post>
</format>

<rule>
格式规则：
- 一期报纸只输出一个 post
- metadata.articles 必须包含至少2篇文章，建议3-5篇
- 第一篇文章默认作为头条展示，标题要最醒目
- column 字段用于分类展示，常用值：要闻、攻略、八卦、访谈、社论、广告
- 严格按上述XML结构输出，不要输出其他任何文本
</rule>

<anti_repetition>
防重复与防劣化规则（必须严格执行）：
- 【严禁重复报道】本期报纸的头条和栏目文章必须是全新内容，禁止与已有报纸报道同一事件
- 【严禁同质化】同一期报纸内的各栏目文章主题必须完全不同，禁止多个栏目讨论同一事件
- 【严禁复制评论】读者来信禁止直接复制报纸正文中的内容
- 【严禁无意义附和】禁止输出"写得真好""支持报社"等无信息量的评论
- 【观点必须碰撞】读者来信中必须同时存在赞同、质疑、调侃、补充等不同声音
- 【用户差异化】不同读者的关注点和表达习惯必须明显不同
</anti_repetition>`;

const defaultAuthorId = `<rule>
用户ID生成规则（必须严格执行）：
- 同一批次中所有用户ID绝对禁止重复，即使是发帖人和评论人也不得共用相同ID
- ID风格必须多样化，同一批次中应混合使用以下不同类型：
  · 古风武侠风：剑影无痕、醉卧沙场、龙城飞将、一笑红尘
  · 搞笑抽象风：AAA建材王哥、摸鱼组组长、今天不加班、专业送头选手
  · 中二少年风：dark丶lord、噬魂丶天尊、卍霸气侧漏卍
  · 普通真实风：王小明1998、路人甲、咖啡续命中、楼下小黑
  · 数字符号风：xX_DarkSlayer_Xx、NoobMaster69、_404NotFound_
  · 食物梗风：麻辣兔头批发、奶茶不加糖、煎饼果子来一套
- 每个ID应暗示用户的性格或身份，避免生成"用户1""玩家A"等无个性ID
- 绝对禁止生成与主角相关的ID或明显暗示主角身份的ID
- 评论者的ID可以与发帖人风格形成反差（如暴躁ID评论萌系帖子）
</rule>`;

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
