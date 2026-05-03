const fs = require('fs');
const path = require('path');

const vendorDir = path.join('src', 'Zsd网游论坛', 'vendor');

// 读取 fontawesome CSS
let css = fs.readFileSync(path.join(vendorDir, 'fontawesome.min.css'), 'utf-8');

// 把 woff2 字体文件内联为 base64 data URI
const fonts = {
  'fa-brands-400.woff2': 'font/woff2',
  'fa-regular-400.woff2': 'font/woff2',
  'fa-solid-900.woff2': 'font/woff2',
};

for (const [filename, mime] of Object.entries(fonts)) {
  const fontPath = path.join(vendorDir, filename);
  if (!fs.existsSync(fontPath)) continue;
  const base64 = fs.readFileSync(fontPath).toString('base64');
  const dataUri = `data:${mime};base64,${base64}`;
  // 替换所有匹配的 url 路径（可能有 ../webfonts/xxx.woff2 或 ./webfonts/xxx.woff2 等变体）
  const regex = new RegExp(`url\\(["']?[^"')]*${filename.replace(/\./g, '\\.')}[^"')]*["']?\\)`, 'g');
  css = css.replace(regex, `url("${dataUri}")`);
  console.log(`Inlined: ${filename} -> ${Math.round(base64.length / 1024)} KB base64`);
}

// 保存内联后的 CSS
fs.writeFileSync(path.join(vendorDir, 'fontawesome-inline.min.css'), css, 'utf-8');
console.log('Saved: fontawesome-inline.min.css');
