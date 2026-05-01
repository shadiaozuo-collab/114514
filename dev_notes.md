# 开发记录

## 酒馆页面地址
- 用户本地 SillyTavern: `http://localhost:8000/`

## 论坛脚本导入链接
**关键发现：`testingcf.jsdelivr.net`（中国大陆加速节点）缓存极其顽固，`?v=xxx` 完全无效！**
**必须使用 `cdn.jsdelivr.net` 并加上 `@main` 分支名：**

```javascript
// ✅ 正确写法（实时同步最新代码）
import 'https://cdn.jsdelivr.net/gh/shadiaozuo-collab/114514@main/dist/Zsd网游论坛/index.js'

// ❌ 错误写法（永远返回旧缓存）
import 'https://testingcf.jsdelivr.net/gh/shadiaozuo-collab/114514/dist/Zsd网游论坛/index.js?v=999'
```

**以后每次更新后，直接告诉用户刷新页面即可，不需要改文件名！**

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

## SillyTavern 注意事项
- 修改导入链接后必须刷新页面才能生效
- 酒馆变量以 `Z` 开头，通过 `clearAllForumVariables()` 可一键清除
