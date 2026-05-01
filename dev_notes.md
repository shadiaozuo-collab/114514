# 开发记录

## 酒馆页面地址
- 用户本地 SillyTavern: `http://localhost:8000/`

## CDN 与版本管理

### ❌ 踩过的坑
- `testingcf.jsdelivr.net`（中国大陆加速节点）缓存极其顽固，`?v=xxx` 完全无效！
- 改文件名（如 `index2.js`）对新文件 jsdelivr 索引延迟数小时，不可用

### ✅ 正确方案
```javascript
// 开发测试：用 @main 分支，push 后等待几分钟到几小时刷新
import 'https://cdn.jsdelivr.net/gh/shadiaozuo-collab/114514@main/dist/Zsd网游论坛/index.js'

// 正式发布：用 Git tag（如 v1.0），缓存 12h
import 'https://cdn.jsdelivr.net/gh/shadiaozuo-collab/114514@v1.0/dist/Zsd网游论坛/index.js'
```

### 🤖 CI 自动打包（bundle.yaml）
**CI = Continuous Integration（持续集成）**，说人话就是：你 push 代码到 GitHub 后，**云服务器自动帮你执行打包、测试、发布等操作**。

本项目配置好的 CI 行为：
1. 你 `git push` 源码到 `main` 分支
2. GitHub Actions 自动运行 `pnpm install && pnpm build`
3. 自动 commit 新的 `dist/` 文件夹
4. **自动打语义化版本 tag**：`v1.0.0` → `v1.0.1` → `v1.1.0`...
   - `fix:` 开头 commit → patch 版本 +1（如 1.0.0 → 1.0.1）
   - `feat:` 开头 commit → minor 版本 +1（如 1.0.0 → 1.1.0）
   - `BREAKING CHANGE:` → major 版本 +1（如 1.0.0 → 2.0.0）
5. 版本号 tag 让 jsdelivr **12h 内刷新缓存**（分支名如 `@main` 要 7 天）

**怎么知道当前版本？**
- 打开 GitHub 仓库 → 右侧 Releases 或 Tags 页面
- 最新的 tag 就是当前版本（如 `v1.0.3`）
- 在酒馆中使用 `...@v1.0.3/dist/...` 即可锁定该版本

**版本回退**：如果发现新版本有问题，直接把酒馆链接改回上一个 tag（如 `v1.0.2`）即可，不需要删文件！

### 工作流程总结
| 阶段 | 操作 |
|------|------|
| 本地开发 | `pnpm build` 测试，不 push dist |
| 发布 | `git add src/ && git commit -m "feat: xxx" && git push` |
| CI 自动 | 打包 dist → commit → 打 tag |
| 使用 | 去 GitHub 看最新 tag，更新酒馆 CDN 链接 |

## 手机版全屏适配
- **阈值**：`window.innerWidth <= 480`（只有真正的手机会全屏）
- 之前用 `768` 会误判 iPad 和桌面小窗口！
- 移动端：100vw × 100vh 全屏面板
- 桌面端：420px × 560px 可拖拽悬浮窗

## 界面质感技术参考

### "有质感"是怎么做出来的？
虽然你不喜欢素纱风格，但了解技术原理有助于做出其他有质感的主题：

**1. 纹理背景（Texture Background）**
```css
background-image: url("data:image/svg+xml,..."); /* 微妙的噪点/纹理 */
/* 或者 */
background: linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
background-size: 100% 4px; /* 扫描线效果 */
```

**2. 多层阴影（Layered Shadows）**
```css
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.1),   /* 顶部高光 */
  inset 0 -1px 0 rgba(0,0,0,0.3),        /* 底部阴影 */
  0 4px 6px rgba(0,0,0,0.1),             /* 外阴影 */
  0 1px 3px rgba(0,0,0,0.08);            /* 细化阴影 */
```

**3. 边框高光（Border Highlight）**
```css
border: 1px solid rgba(255,255,255,0.1);  /* 微妙的亮边 */
/* 配合深色背景，营造"浮雕"感 */
```

**4. 毛玻璃效果（Frosted Glass）**
```css
backdrop-filter: blur(10px) saturate(180%);
background: rgba(30, 30, 30, 0.7);
```

**5. 渐变叠加（Gradient Overlay）**
```css
background: linear-gradient(
  180deg,
  rgba(255,255,255,0.05) 0%,
  transparent 50%,
  rgba(0,0,0,0.2) 100%
);
```

**6. 字体质感**
```css
text-shadow: 0 1px 2px rgba(0,0,0,0.5);  /* 文字阴影增加厚重感 */
letter-spacing: 0.02em;                   /* 微字间距 */
```

**羊皮纸/复古纸质感觉的核心**：暖色调（米色、棕黄）+ 纸张纹理 + 轻微不规则边框

**你现有的主题已经用了一些**：`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5)` 就是大阴影营造"悬浮卡片"的质感。如果要更有质感，可以尝试给卡片加 `inset` 阴影和微妙的顶部高光。

## 待开发功能（备忘）
### 多板块 + 生成模式选择
- **动态板块**：用户可自由添加/删除/命名板块（限制 4~5 个，标签栏横向滚动）
- **生成模式选择**：
  - 仅当前板块（单次对话）
  - 全部合并（一次对话产出所有板块）
  - 全部独立（每个板块各调一次 AI，串行执行）
  - 自选组合（勾选哪几个就生成哪几个）
- **数据结构**：`Zposts` 从 `{A:[],B:[]}` 改为动态 `Record<string, ForumPost[]>`
- **向后兼容**：旧版 A/B 数据自动迁移到新结构
