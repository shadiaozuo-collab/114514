# 开发记录

## 酒馆页面地址
- 用户本地 SillyTavern: `http://localhost:8000/`
- 这是用户实际使用的页面，用于测试论坛效果

## 论坛脚本导入链接（版本号方案）
**关键：jsdelivr 对 `gh` 路径的缓存会忽略 `?v=xxx` query string！**
**解决方案：每次更新都把 `index.js` 复制为递增版本号文件名，jsdelivr 会当作全新文件无缓存返回。**

| 版本 | 文件名 | 导入链接 |
|------|--------|----------|
| v0 | `index.js` | `.../dist/Zsd网游论坛/index.js` |
| v1 | `forum.js` | `.../dist/Zsd网游论坛/forum.js` |
| v2 | `index2.js` | `.../dist/Zsd网游论坛/index2.js` |
| v3 | `index3.js` | `.../dist/Zsd网游论坛/index3.js` |
| ... | `indexN.js` | `.../dist/Zsd网游论坛/indexN.js` |

**每次更新流程：**
1. 修改代码 → `pnpm build`
2. 复制 `dist/Zsd网游论坛/index.js` 为 `dist/Zsd网游论坛/index{N+1}.js`
3. `git add . && git commit && git push`
4. 告诉用户新链接：`.../index{N+1}.js`

## SillyTavern 注意事项
- 修改导入链接后必须刷新页面才能生效
- 酒馆变量以 `Z` 开头，通过 `clearAllForumVariables()` 可一键清除
