/*
 * The panel in English or Simplified Chinese. Panels are built in English;
 * translate() swaps the text of their labels, titles and options, and swaps
 * it back. English unless the URL says ?lang=zh (the panel's switch puts
 * it there, with the page's other settings); the browser's language is not
 * consulted. Shared by the wallpaper and the hero scenes.
 */
import { params } from './persist.js';

const ZH = {
  // Tabs and presets
  Shapes: '形状',
  Text: '文字',
  Spacing: '字距',
  'Row gap': '行距',
  Presets: '预设',
  Palette: '配色',
  Effect: '效果',
  Original: '原版',
  Calm: '平静',
  Lively: '活泼',
  Silk: '丝绸',
  'Fine Wire': '细丝',
  Glow: '辉光',
  'Low Light': '暗光',
  'XDR Blue': 'XDR 蓝',
  Graphite: '石墨',
  Ember: '余烬',
  Chroma: '炫彩',
  Violet: '紫罗兰',
  Ocean: '海洋',
  Aurora: '极光',
  'Rose Gold': '玫瑰金',
  Paper: '纸白',
  // Size
  Size: '尺寸',
  Preset: '预设尺寸',
  Custom: '自定义',
  Desktop: '桌面',
  Width: '宽度',
  Height: '高度',
  Scale: '倍率',
  Stretch: '拉伸',
  'Save PNG': '保存 PNG',
  // Motion
  Motion: '动态',
  Speed: '速度',
  Breathing: '呼吸',
  Swell: '涌动',
  'Fibre pace': '彩丝速度',
  Paused: '暂停',
  'Light speed': '光流速度',
  Turn: '旋转',
  Parallax: '视差',
  // Light and look
  Light: '光线',
  Look: '外观',
  Brightness: '亮度',
  Reach: '光照长度',
  'Dim side': '暗侧',
  'Lit side': '亮侧',
  Threads: '丝线',
  Texture: '纹理',
  'Edge rim': '边缘高光',
  Distance: '距离',
  Sheen: '光泽',
  Contrast: '对比度',
  Saturation: '饱和度',
  Strength: '强度',
  From: '起始亮度',
  // Colour
  Colour: '颜色',
  Shadow: '阴影',
  Steel: '钢蓝',
  Silver: '银白',
  Highlight: '高光',
  'Edge glow': '边缘辉光',
  'Fibre cool': '冷色彩丝',
  'Fibre warm 1': '暖色彩丝 1',
  'Fibre warm 2': '暖色彩丝 2',
  'Fibre warm 3': '暖色彩丝 3',
  Background: '背景',
  Warmth: '暖度',
  Fibres: '彩丝',
  // Shape
  Shape: '字形',
  Corner: '圆角',
  Arch: '拱高',
  Tip: '尖角',
  // Scenes
  Scene: '场景',
  'Landing page': '落地页',
  Layout: '布局',
  Left: '靠左',
  Center: '居中',
  Ring: '圆环',
  'Black Hole': '黑洞',
  Perspective: '透视',
  Tunnel: '隧道',
  'Möbius': '莫比乌斯环',
  // Performance and the rest
  Performance: '性能',
  Resolution: '分辨率',
  'Frame rate': '帧率',
  Auto: '自动',
  Pixels: '像素',
  Reset: '重置',
  Embed: '嵌入',
  Close: '关闭',
  Copy: '复制',
  Copied: '已复制',
  Link: '链接',
  'Web component': 'Web 组件',
  'Guide on GitHub →': 'GitHub 上的教程 →',
  'Paste this where the scene should go. It fills the box you give it, with the settings you see now.': '把这段代码贴到要放场景的位置。场景会铺满你给它的区域，并保留现在看到的设置。',
  Language: '语言',
};

export const language = { value: params.get('lang')?.toLowerCase().startsWith('zh') ? 'zh' : 'en' };

// A string in the current language.
export const t = (text) => (language.value === 'zh' && ZH[text]) || text;

// Each translated text node's English, so it can be swapped back.
const english = new WeakMap();

export function translate(root) {
  document.documentElement.lang = language.value === 'zh' ? 'zh-Hans' : 'en';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const en = english.get(node) ?? node.nodeValue;
    if (!ZH[en]) continue;
    english.set(node, en);
    node.nodeValue = t(en);
  }
}

// Adds the EN / 中文 switch at the end of a pane (it needs the Essentials
// plugin) and translates the pane to the current language.
export function addLanguage(pane) {
  pane.addBinding(language, 'value', {
    label: 'Language',
    view: 'radiogrid',
    groupName: 'language',
    size: [2, 1],
    cells: (x) => [{ title: 'EN', value: 'en' }, { title: '中文', value: 'zh' }][x],
  }).on('change', () => translate(pane.element));
  translate(pane.element);
}
