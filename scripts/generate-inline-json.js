const fs = require('fs');
const path = require('path');

const jsPath = path.join('dist', 'Zsd网游论坛', 'index.js');
const outputPath = path.join('dist', 'Zsd网游论坛', '论坛_本地内联版.json');

const js = fs.readFileSync(jsPath, 'utf-8');

const json = {
  type: 'script',
  enabled: false,
  name: 'Zsd网游论坛_本地版',
  id: 'zsd-forum-local-v1',
  content: js,
  info: 'Zsd网游论坛 - 本地内联版，无需网络，包含诊断层',
  button: {
    enabled: true,
    buttons: [{ name: '论坛', visible: true }]
  },
  data: {},
  export_with: { data: true, button: true }
};

fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf-8');

const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
console.log('Generated:', outputPath);
console.log('Size:', sizeKB, 'KB');
