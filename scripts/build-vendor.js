const fs = require('fs');
const path = require('path');

const vendorDir = path.join('src', 'Zsd网游论坛', 'vendor');
const files = {
  TAILWIND_JS: 'tailwindcss.min.js',
  FONTAWESOME_CSS: 'fontawesome-inline.min.css',
  JQUERY_JS: 'jquery.min.js',
  ADJUST_IFRAME_JS: 'adjust_iframe_height.js',
};

let output = '// 自动生成：本地 CDN 资源内联，避免网络依赖\n';
output += '// 生成命令: node scripts/build-vendor.js\n\n';

for (const [name, file] of Object.entries(files)) {
  const content = fs.readFileSync(path.join(vendorDir, file), 'utf-8');
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  output += `export const ${name} = \`${escaped}\`;\n\n`;
}

fs.writeFileSync(path.join('src', 'Zsd网游论坛', 'vendor.ts'), output, 'utf-8');
console.log('vendor.ts generated');
console.log('Size:', Math.round(fs.statSync(path.join('src', 'Zsd网游论坛', 'vendor.ts')).size / 1024), 'KB');
