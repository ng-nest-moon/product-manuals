const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const DIST_DIR = path.join(ROOT, 'dist');
const SRC_CSS_DIR = path.join(ROOT, 'src', 'css');
const SRC_JS_DIR = path.join(ROOT, 'src', 'js');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const BASE_PATH = '/product-manuals';
const SITE_URL = 'https://ng-nest-moon.github.io';
const DEFAULT_OG_IMAGE = 'https://raw.githubusercontent.com/ng-nest-moon/product-manuals/main/site/favicon.ico';

function fullUrl(p) { return SITE_URL + p; }

const CAT_NAMES = { game: '游戏', tool: '工具' };
const CAT_KEYS = { '游戏': 'game', '工具': 'tool' };

/* Parse product list from README.md table */
const README_PATH = path.join(ROOT, 'README.md');

function parseProductsFromReadme() {
  const content = readFile(README_PATH);
  const lines = content.split('\n');
  const inTable = [];
  let inTableSection = false;

  for (const line of lines) {
    const ln = line.replace(/\r$/, '');
    if (ln.startsWith('| 编号 |')) {
      inTableSection = true;
      continue;
    }
    if (inTableSection && /^\|.*\|$/.test(ln) && !ln.includes('---')) {
      inTable.push(ln);
    } else if (inTableSection && !ln.startsWith('|')) {
      break;
    }
  }

  return inTable.map(row => {
    const cols = row.split('|').map(c => c.trim()).filter(c => c);
    const num = parseInt(cols[0], 10);
    const nameMatch = cols[1].match(/\[([^\]]+)\]/);
    const name = nameMatch ? nameMatch[1] : cols[1];
    const cat = CAT_KEYS[cols[2]] || 'tool';
    const desc = cols.slice(3).join(' ');
    return [num, name, cat, desc];
  });
}

const PRODUCTS = parseProductsFromReadme();

/* ========== Markdown custom extensions ========== */

/* Admonition: !!! type "title" ... !!! */
const admonitionExt = {
  name: 'admonition',
  level: 'block',
  tokenizer(src) {
    const rule = /^ {0,3}(!!!)\s*(note|tip|warning|danger)(?:\s+"([^"]*)")?\s*\n([\s\S]*?)\n\1\s*$/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'admonition',
        raw: match[0],
        kind: match[2],
        title: match[3] || match[2],
        text: match[4].trim()
      };
    }
  },
  renderer(token) {
    const body = marked.parse(token.text, { async: false });
    return `<div class="pm-admonition ${token.kind}">
<div class="pm-admonition-title">${token.title}</div>
${body}
</div>\n`;
  }
};

/* Tabbed: === "Tab A" content === "Tab B" content === */
const tabbedExt = {
  name: 'tabbed',
  level: 'block',
  tokenizer(src) {
    const rule = /^ {0,3}===\s*"([^"]+)"\s*\n([\s\S]*?)(?=\n===|$)/;
    const match = rule.exec(src);
    if (match) {
      const tabs = [];
      let remaining = src;
      let m;
      const tabRule = /^ {0,3}===\s*"([^"]+)"\s*\n([\s\S]*?)(?=\n===|$)/g;
      while ((m = tabRule.exec(remaining)) !== null) {
        tabs.push({ label: m[1], content: m[2].trim() });
      }
      if (tabs.length > 0) {
        const raw = tabs.map((t, i) => {
          if (i === 0) return `=== "${t.label}"\n${t.content}`;
          return `\n=== "${t.label}"\n${t.content}`;
        }).join('');
        return { type: 'tabbed', raw, tabs };
      }
    }
  },
  renderer(token) {
    const labels = token.tabs.map((t, i) =>
      `<div class="pm-tabbed-label ${i === 0 ? 'active' : ''}">${t.label}</div>`
    ).join('');
    const panels = token.tabs.map((t, i) => {
      const body = marked.parse(t.content, { async: false });
      return `<div class="pm-tabbed-panel ${i === 0 ? 'active' : ''}">${body}</div>`;
    }).join('');
    return `<div class="pm-tabbed-set">
<div class="pm-tabbed-labels">${labels}</div>
<div class="pm-tabbed-content">${panels}</div>
</div>\n`;
  }
};

/* Emoji icons in markdown */
function renderEmoji(text) {
  const iconMap = {
    ':material-check-bold:': '✓',
    ':material-close:': '✕',
    ':material-alert:': '⚠',
    ':material-star:': '★',
    ':material-fire:': '🔥',
    ':material-rocket:': '🚀',
    ':material-lightbulb:': '💡',
    ':material-heart:': '♥',
    ':material-arrow-right:': '→',
    ':material-arrow-down:': '↓',
    ':material-arrow-up:': '↑',
    ':material-menu:': '≡',
    ':material-settings:': '⚙',
    ':material-information:': 'ℹ',
    ':material-check:': '✓',
    ':material-plus:': '+',
    ':material-minus:': '−',
    ':material-account:': '👤',
    ':material-clock:': '⏱',
    ':material-calendar:': '📅',
    ':material-email:': '✉',
    ':material-github:': '🐙',
    ':material-web:': '🌐',
    ':material-phone:': '📱',
    ':material-file:': '📄',
    ':material-folder:': '📁',
    ':material-tag:': '🏷',
    ':material-download:': '⬇',
    ':material-upload:': '⬆',
    ':material-search:': '⌕',
    ':material-lock:': '🔒',
    ':material-key:': '🔑',
    ':material-bell:': '🔔',
    ':material-eye:': '👁',
    ':material-eye-off:': '👁‍🗨',
    ':material-pencil:': '✏',
    ':material-delete:': '🗑',
    ':material-cog:': '⚙',
    ':material-home:': '🏠',
    ':material-school:': '🏫',
    ':material- hospital:': '🏥',
    ':material-phone:': '📱',
    ':material-chat:': '💬',
    ':material-flag:': '🚩',
    ':material-trophy:': '🏆',
    ':material-medal:': '🏅',
    ':material-run:': '🏃',
    ':material-walk:': '🚶',
    ':material-car:': '🚗',
    ':material-bus:': '🚌',
    ':material-train:': '🚆',
    ':material-airplane:': '✈',
    ':material-ship:': '🚢',
    ':material-bike:': '🚲',
    ':material-wallet:': '👛',
    ':material-cart:': '🛒',
    ':material-gift:': '🎁',
    ':material-music:': '🎵',
    ':material-video:': '🎬',
    ':material-game:': '🎮',
    ':material-palette:': '🎨',
    ':material-camera:': '📷',
    ':material- printer:': '🖨',
    ':material-monitor:': '🖥',
    ':material-laptop:': '💻',
    ':material-tablet:': '📱',
    ':material-cellphone:': '📱',
    ':material-watch:': '⌚',
    ':material-light:': '💡',
    ':material-flash:': '⚡',
    ':material-sun:': '☀',
    ':material-moon:': '☾',
    ':material-cloud:': '☁',
    ':material-rain:': '🌧',
    ':material-snow:': '❄',
    ':material-wind:': '🌪',
    ':material-umbrella:': '☂',
    ':material-thermometer:': '🌡',
    ':material-compass:': '🧭',
    ':material-map:': '🗺',
    ':material-globe:': '🌐',
    ':material-coin:': '🪙',
    ':material-bank:': '🏦',
    ':material-chart:': '📊',
    ':material-graph:': '📈',
    ':material-pie:': '📊',
    ':material-data:': '📋',
    ':material-database:': '🗄',
    ':material-shield:': '🛡',
    ':material-sword:': '⚔',
    ':material-axe:': '🪓',
    ':material-bow:': '🏹',
    ':material-helmet:': '⛑',
    ':material-tools:': '🔧',
    ':material-wrench:': '🔧',
    ':material-hammer:': '🔨',
    ':material-screwdriver:': '🪛',
    ':material-nut:': '🔩',
    ':material-chain:': '⛓',
    ':material-magnet:': '🧲',
    ':material-lightning:': '⚡',
    ':material-bug:': '🐛',
    ':material-beaker:': '🧪',
    ':material-dna:': '🧬',
    ':material-microscope:': '🔬',
    ':material-telescope:': '🔭',
    ':material-satellite:': '🛰',
    ':material-robot:': '🤖',
    ':material-chip:': '🖥',
    ':material-cpu:': '🖥',
    ':material-harddisk:': '💾',
    ':material-network:': '🌐',
    ':material-wifi:': '📶',
    ':material-bluetooth:': '📡',
    ':material-nfc:': '📡',
    ':material-qrcode:': '📱',
    ':material-barcode:': '📊',
    ':material-print:': '🖨',
    ':material-scan:': '📄',
    ':material-copy:': '📋',
    ':material-paste:': '📋',
    ':material-cut:': '✂',
    ':material-attachment:': '📎',
    ':material-link:': '🔗',
    ':material-unlink:': '⛓‍💥',
    ':material-book:': '📖',
    ':material-book-open:': '📖',
    ':material-bookmark:': '🔖',
    ':material-newspaper:': '📰',
    ':material-note:': '📝',
    ':material-notebook:': '📓',
    ':material-journal:': '📔',
    ':material-clipboard:': '📋',
    ':material-list:': '📋',
    ':material-order:': '📋',
    ':material-checklist:': '✅',
    ':material-table:': '📊',
    ':material-grid:': '🔲',
    ':material-layout:': '🔲',
    ':material-widget:': '🔲',
    ':material-panel:': '🔲',
    ':material-sidebar:': '🔲',
    ':material-header:': '🔲',
    ':material-footer:': '🔲',
    ':material-divider:': '➖',
    ':material-spacer:': '🔲',
    ':material-section:': '🔲'
  };
  return text.replace(/:[\w-]+:(?:[\w-]+:)?/g, (m) => iconMap[m] || m);
}

/* ========== Configure marked ========== */

marked.use({
  gfm: true,
  breaks: false,
  pedantic: false,
  async: false,
  extensions: [admonitionExt, tabbedExt]
});

/* Render hooks aren't supported in all marked versions, so override walk */
const originalLexer = marked.Lexer.prototype.lex;
marked.Lexer.prototype.lex = function(src) {
  /* Pre-process emoji */
  src = renderEmoji(src);
  return originalLexer.call(this, src);
};

/* Custom renderers */
const renderer = {
  code({ text, lang }) {
    const language = lang || '';
    const cls = language ? ` class="language-${language}"` : '';
    return `<pre><code${cls}>${text}</code></pre>\n`;
  },
  heading({ depth, text }) {
    if (depth === 1) {
      return `<h1>${text}</h1>\n`;
    }
    const plainText = text.replace(/<[^>]+>/g, '');
    const id = plainText.toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '');
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  }
};

marked.use({ renderer });

/* ========== Helper functions ========== */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getNumberedName(num, name) {
  const pad = String(num).padStart(2, '0');
  return `${pad}-${name}`;
}

function getProductUrl(num, name) {
  return `${BASE_PATH}/manuals/${getNumberedName(num, name)}/`;
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.slice(0, len).replace(/\s+\S*$/, '') + '...';
}

/* ========== Build processes ========== */

function buildStatic() {
  /* Copy CSS */
  const cssFiles = fs.readdirSync(SRC_CSS_DIR).filter(f => f.endsWith('.css'));
  cssFiles.forEach(f => {
    writeFile(path.join(DIST_DIR, 'css', f), readFile(path.join(SRC_CSS_DIR, f)));
  });
  /* Copy JS */
  const jsFiles = fs.readdirSync(SRC_JS_DIR).filter(f => f.endsWith('.js'));
  jsFiles.forEach(f => {
    writeFile(path.join(DIST_DIR, 'js', f), readFile(path.join(SRC_JS_DIR, f)));
  });
  /* Copy minisearch UMD bundle from node_modules */
  const miniSearchSrc = path.join(ROOT, 'node_modules', 'minisearch', 'dist', 'umd', 'index.js');
  if (fs.existsSync(miniSearchSrc)) {
    const miniSearchContent = fs.readFileSync(miniSearchSrc, 'utf-8');
    writeFile(path.join(DIST_DIR, 'js', 'minisearch.js'), miniSearchContent);
    console.log('  ✓ minisearch.js copied');
  } else {
    console.warn('  ⚠ minisearch UMD not found');
  }
  console.log('  ✓ Static assets copied');
}

function buildHomepage() {
  const baseTemplate = readFile(path.join(TEMPLATES_DIR, 'base.html'));

  /* Stats */
  const statsHtml = `
<div class="pm-stats pm-fade-in">
  <div class="pm-stat-item">
    <div class="pm-stat-number">${PRODUCTS.length}</div>
    <div class="pm-stat-label">产品说明书</div>
  </div>
  <div class="pm-stat-item">
    <div class="pm-stat-number">2</div>
    <div class="pm-stat-label">产品分类</div>
  </div>
  <div class="pm-stat-item">
    <div class="pm-stat-number">1</div>
    <div class="pm-stat-label">写作规范 Skill</div>
  </div>
</div>`;

  /* Product grid */
  const cards = PRODUCTS.map(p => {
    const [num, name, cat, desc] = p;
    const url = getProductUrl(num, name);
    const badgeClass = cat === 'game' ? 'pm-category-badge--game' : 'pm-category-badge--tool';
    return `<div class="pm-product-card pm-fade-in">
  <div class="pm-card-header">
    <div class="pm-card-number">${String(num).padStart(2, '0')}</div>
    <h3 class="pm-card-title">${name}</h3>
    <span class="pm-category-badge ${badgeClass}">${CAT_NAMES[cat]}</span>
  </div>
  <p class="pm-card-desc">${desc}</p>
  <div class="pm-card-footer">
    <a href="${url}" class="pm-card-link">阅读详情</a>
  </div>
</div>`;
  }).join('\n');

  const gridHtml = `<div class="pm-product-grid">\n${cards}\n</div>`;

  /* Features section */
  const featuresHtml = `
<div class="pm-section pm-fade-in">
  <div class="pm-section-header">
    <h2 class="pm-section-title pm-section-title-underline">为什么使用 product-manuals</h2>
    <p class="pm-section-desc">标准化的产品定义文档，AI 驱动，人人可写</p>
  </div>
  <div class="pm-features">
    <div class="pm-feature-card">
      <div class="pm-feature-icon">📋</div>
      <h3 class="pm-feature-title">标准化模板</h3>
      <p class="pm-feature-desc">每份说明书遵循统一格式——一句话定义、系统架构、核心功能、用户流程、边界声明。</p>
    </div>
    <div class="pm-feature-card">
      <div class="pm-feature-icon">🤖</div>
      <h3 class="pm-feature-title">AI 驱动</h3>
      <p class="pm-feature-desc">每个产品说明书均由 AI 辅助编写，聚焦产品做什么而非怎么做。</p>
    </div>
    <div class="pm-feature-card">
      <div class="pm-feature-icon">📐</div>
      <h3 class="pm-feature-title">架构优先</h3>
      <p class="pm-feature-desc">每个说明包含完整的系统架构总览，树状结构清晰展示功能模块。</p>
    </div>
    <div class="pm-feature-card">
      <div class="pm-feature-icon">🔗</div>
      <h3 class="pm-feature-title">开源协作</h3>
      <p class="pm-feature-desc">基于 GitHub 维护，欢迎提交 PR 贡献新的产品说明书。</p>
    </div>
  </div>
</div>`;

  /* CTA section */
  const ctaHtml = `
<div class="pm-section pm-fade-in">
  <div class="pm-cta-section">
    <h2>想贡献一份说明书？</h2>
    <p>本仓库使用标准化的 Markdown 模板编写产品功能说明书，每份文档均包含完整的产品定义模块。</p>
    <a href="https://github.com/ng-nest-moon/product-manuals/tree/main/.github/skills/writing-product-specs" class="pm-btn pm-btn-primary" target="_blank">查看写作规范</a>
  </div>
</div>`;

  /* Hero */
  const heroHtml = `
<div class="pm-hero">
  <div class="pm-hero-badge">📚 ${PRODUCTS.length} 份产品说明书</div>
  <h1>产品功能说明书合集</h1>
  <p class="pm-subtitle">AI 驱动的产品定义文档——每个文档描述一个产品<strong>做什么</strong>，而非<strong>怎么做</strong>。</p>
  <div class="pm-hero-cta">
    <a href="#产品说明书" class="pm-btn pm-btn-primary">浏览全部产品</a>
    <a href="https://github.com/ng-nest-moon/product-manuals" class="pm-btn pm-btn-outline" target="_blank">GitHub 仓库</a>
  </div>
</div>`;

  const content = heroHtml + statsHtml + `<div class="pm-section" id="产品说明书">\n<h2 class="pm-section-title pm-section-title-underline" style="text-align:center;">产品说明书</h2>\n` + gridHtml + `\n</div>` + featuresHtml + ctaHtml;

  const desc = '产品功能说明书合集 — AI 驱动的产品定义文档';
  const homeUrl = fullUrl(BASE_PATH + '/');

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Product Manuals',
    'url': homeUrl,
    'description': desc
  });

  const html = baseTemplate
    .replace(/{title}/g, '首页')
    .replace(/{description}/g, desc)
    .replace(/{ogTitle}/g, '首页')
    .replace(/{ogDescription}/g, desc)
    .replace(/{ogType}/g, 'website')
    .replace(/{ogUrl}/g, homeUrl)
    .replace(/{ogImage}/g, DEFAULT_OG_IMAGE)
    .replace(/{twitterCard}/g, 'summary')
    .replace(/{twitterTitle}/g, '首页')
    .replace(/{twitterDescription}/g, desc)
    .replace(/{canonicalUrl}/g, homeUrl)
    .replace(/{jsonld}/g, jsonld)
    .replace(/{basePath}/g, BASE_PATH)
    .replace(/{content}/g, content)
    .replace(/{homeActive}/g, 'active')
    .replace(/{themeIcon}/g, '\u263E');

  writeFile(path.join(DIST_DIR, 'index.html'), html);
  console.log('  ✓ Homepage built');
}

function buildManualPages() {
  const baseTemplate = readFile(path.join(TEMPLATES_DIR, 'base.html'));
  const manualTemplate = readFile(path.join(TEMPLATES_DIR, 'manual.html'));

  /* Build sidebar items */
  const sidebarItems = PRODUCTS.map(p => {
    const [num, name] = p;
    const url = getProductUrl(num, name);
    return `<a href="${url}" class="pm-sidebar-item">${num}. ${name}</a>`;
  }).join('\n');

  PRODUCTS.forEach(p => {
    const [num, name, cat, desc] = p;
    const numberedName = getNumberedName(num, name);
    const filePath = path.join(DOCS_DIR, `${numberedName}.md`);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ File not found: ${numberedName}.md`);
      return;
    }

    let mdContent = readFile(filePath);

    /* Parse HTML from markdown */
    const htmlContent = marked.parse(mdContent);

    /* Extract headings for TOC */
    const tocItems = extractToc(htmlContent);

    /* Strip the h1 from content (it's shown in the product header) */
    const bodyContent = htmlContent.replace(/<h1>.*?<\/h1>/, '');

    const manualContentHtml = manualTemplate
      .replace(/{sidebarItems}/g, sidebarItems)
      .replace(/{tocItems}/g, tocItems)
      .replace(/{basePath}/g, BASE_PATH)
      .replace(/{productName}/g, name)
      .replace(/{productNum}/g, String(num).padStart(2, '0'))
      .replace(/{productCat}/g, cat)
      .replace(/{productCatName}/g, CAT_NAMES[cat])
      .replace(/{productDesc}/g, desc)
      .replace(/{manualContent}/g, bodyContent);

    /* Extract better description from first paragraph of content */
    const pMatch = bodyContent.match(/<p>(.+?)<\/p>/);
    const pageDesc = pMatch ? truncate(stripHtml(pMatch[1]), 150) : `${name} — 产品功能说明书`;

    const title = `${name} — 产品功能说明书`;
    const pageUrl = fullUrl(getProductUrl(num, name));
    const homeUrl = fullUrl(BASE_PATH + '/');

    const jsonld = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': homeUrl },
          { '@type': 'ListItem', 'position': 2, 'name': '产品说明书', 'item': homeUrl },
          { '@type': 'ListItem', 'position': 3, 'name': name }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': name,
        'description': pageDesc,
        'category': CAT_NAMES[cat]
      }
    ]);

    const html = baseTemplate
      .replace(/{title}/g, title)
      .replace(/{description}/g, pageDesc)
      .replace(/{ogTitle}/g, title)
      .replace(/{ogDescription}/g, pageDesc)
      .replace(/{ogType}/g, 'article')
      .replace(/{ogUrl}/g, pageUrl)
      .replace(/{ogImage}/g, DEFAULT_OG_IMAGE)
      .replace(/{twitterCard}/g, 'summary')
      .replace(/{twitterTitle}/g, title)
      .replace(/{twitterDescription}/g, pageDesc)
      .replace(/{canonicalUrl}/g, pageUrl)
      .replace(/{jsonld}/g, jsonld)
      .replace(/{basePath}/g, BASE_PATH)
      .replace(/{content}/g, manualContentHtml)
      .replace(/{homeActive}/g, '')
      .replace(/{themeIcon}/g, '\u263E');

    const outDir = path.join(DIST_DIR, 'manuals', numberedName);
    writeFile(path.join(outDir, 'index.html'), html);
    console.log(`  ✓ ${numberedName}.md → manuals/${numberedName}/index.html`);
  });
}

function extractToc(html) {
  const headingRegex = /<h([2-3])\s*[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[2-3]>/g;
  let match;
  const items = [];
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    const text = match[3].replace(/<[^>]+>/g, '');
    items.push({ level, id, text });
  }

  if (items.length === 0) {
    /* Fallback: use simpler regex without id */
    const simpleRegex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/g;
    let m;
    while ((m = simpleRegex.exec(html)) !== null) {
      const level = parseInt(m[1]);
      const text = m[2].replace(/<[^>]+>/g, '');
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
      items.push({ level, id, text });
    }
  }

  return items.map(item => {
    const indent = item.level === 3 ? ' style="padding-left: 1.5em;font-size:0.8em;"' : '';
    return `<a href="#${item.id}" class="pm-toc-item"${indent}>${item.text}</a>`;
  }).join('\n') || '<div class="pm-toc-empty">无目录</div>';
}

function buildSearchIndex() {
  const index = PRODUCTS.map(p => {
    const [num, name, , desc] = p;
    return {
      title: `${num}. ${name}`,
      url: getProductUrl(num, name),
      excerpt: desc,
      content: desc
    };
  });

  writeFile(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(index));
  console.log('  ✓ search-index.json built');
}

function buildLlmsTxt() {
  /* llms.txt — lightweight index for LLM crawlers (llmstxt.org spec) */
  const homeUrl = fullUrl(BASE_PATH + '/');

  const lines = [];
  lines.push('# Product Manuals');
  lines.push('> AI 驱动的产品功能说明书合集——每个文档描述一个产品做什么，而非怎么做。');
  lines.push('');
  lines.push('## 首页');
  lines.push(`- [Product Manuals](${homeUrl}) — ${PRODUCTS.length} 份产品说明书合集`);
  lines.push('');
  lines.push('## 产品说明书');
  PRODUCTS.forEach(p => {
    const [num, name, cat, desc] = p;
    const url = fullUrl(getProductUrl(num, name));
    lines.push(`- [${String(num).padStart(2, '0')} — ${name}](${url}) — ${desc}`);
  });
  lines.push('');
  writeFile(path.join(DIST_DIR, 'llms.txt'), lines.join('\n'));
  console.log('  ✓ llms.txt built');

  /* llms-full.txt — detailed version with full descriptions */
  const fullLines = [];
  fullLines.push('# Product Manuals');
  fullLines.push('> AI 驱动的产品功能说明书合集——每个文档描述一个产品做什么，而非怎么做。');
  fullLines.push('');
  fullLines.push(`URL: ${homeUrl}`);
  fullLines.push(`产品总数: ${PRODUCTS.length}`);
  fullLines.push('');
  fullLines.push('## 产品说明书列表');
  fullLines.push('');
  PRODUCTS.forEach(p => {
    const [num, name, cat, desc] = p;
    const url = fullUrl(getProductUrl(num, name));
    fullLines.push(`### ${String(num).padStart(2, '0')} — ${name}`);
    fullLines.push(`- 分类: ${CAT_NAMES[cat]}`);
    fullLines.push(`- 简介: ${desc}`);
    fullLines.push(`- 链接: ${url}`);
    fullLines.push('');
  });
  writeFile(path.join(DIST_DIR, 'llms-full.txt'), fullLines.join('\n'));
  console.log('  ✓ llms-full.txt built');
}

function buildSitemap() {
  const now = new Date().toISOString().split('T')[0];
  const urls = [];

  const homeUrl = fullUrl(BASE_PATH + '/');
  urls.push(`  <url>
    <loc>${homeUrl}</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>`);

  PRODUCTS.forEach(p => {
    const [num, name] = p;
    const url = fullUrl(getProductUrl(num, name));
    urls.push(`  <url>
    <loc>${url}</loc>
    <priority>0.8</priority>
    <changefreq>monthly</changefreq>
  </url>`);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml);
  console.log('  ✓ sitemap.xml built');
}

function buildRobots() {
  const sitemapUrl = fullUrl(BASE_PATH + '/sitemap.xml');
  const content = `User-agent: *
Allow: /
Sitemap: ${sitemapUrl}
`;
  writeFile(path.join(DIST_DIR, 'robots.txt'), content);
  console.log('  ✓ robots.txt built');
}

/* ========== Main ========== */

function main() {
  console.log('Building product-manuals...\n');

  /* Clean dist */
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDir(DIST_DIR);

  buildStatic();
  buildHomepage();
  buildManualPages();
  buildSearchIndex();
  buildLlmsTxt();
  buildSitemap();
  buildRobots();

  console.log('\n✓ Build complete! Output in ./dist/');
}

main();
