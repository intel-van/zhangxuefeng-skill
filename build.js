const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const DOCS = path.join(ROOT, 'docs');

marked.setOptions({ gfm: true, breaks: false });

// ── 页面信息 ──
const PAGES = [
  { key: 'index',                title: '首页',                      src: null,                       out: 'index.html' },
  { key: 'skill/index',          title: '心智模型与表达DNA',          src: 'SKILL.md',                  out: 'skill/index.html' },
  { key: 'research/index',       title: '调研档案总览',               src: null,                       out: 'research/index.html' },
  { key: 'research/01-writings', title: '著作与系统思考',             src: 'references/research/01-writings.md',  out: 'research/01-writings.html' },
  { key: 'research/02-conversations', title: '深度采访与对谈',        src: 'references/research/02-conversations.md', out: 'research/02-conversations.html' },
  { key: 'research/03-expression-dna', title: '表达风格DNA',          src: 'references/research/03-expression-dna.md', out: 'research/03-expression-dna.html' },
  { key: 'research/04-external-views', title: '他者视角与批评',       src: 'references/research/04-external-views.md', out: 'research/04-external-views.html' },
  { key: 'research/05-decisions', title: '重大决策分析',              src: 'references/research/05-decisions.md', out: 'research/05-decisions.html' },
  { key: 'research/06-timeline', title: '完整人生时间线',             src: 'references/research/06-timeline.md', out: 'research/06-timeline.html' },
  { key: 'examples/demo-conversation', title: '对话实录',             src: 'examples/demo-conversation.md', out: 'examples/demo-conversation.html' },
];
const PAGE_LOOKUP = {};
PAGES.forEach(p => {
  if (p.src) PAGE_LOOKUP[p.src] = p;
});

// ── 源文件路径 → 输出 HTML 路径 ──
function resolveHtml(srcRel) {
  if (srcRel === 'README.md') return 'index.html';
  if (PAGE_LOOKUP[srcRel]) return PAGE_LOOKUP[srcRel].out;
  // 尝试匹配 references/research/XX-*.md
  const m = srcRel.match(/^references\/research\/(.+)\.md$/);
  if (m) {
    for (const p of PAGES) {
      if (p.key === `research/${m[1]}`) return p.out;
    }
  }
  return null;
}

// ── 解析输出路径中的链接 ──
function fixLinks(md, srcFile, outPath) {
  const outDir = path.dirname(path.join(DOCS, outPath));
  const srcDir = path.dirname(srcFile);

  // .md 链接 → .html
  md = md.replace(/(\[[^\]]*\]\()([^)]+\.md)(\))/g, (m, pre, link, suf) => {
    if (link.startsWith('http')) return m;
    const abs = path.resolve(srcDir, link);
    const rel = path.relative(ROOT, abs);
    const mapped = resolveHtml(rel);
    if (!mapped) return m;
    const relLink = path.relative(outDir, path.join(DOCS, mapped));
    return `${pre}${relLink.startsWith('.') ? relLink : './' + relLink}${suf}`;
  });

  // 图片路径
  md = md.replace(/(\]\()([^)]+\.(png|jpg|gif|jpeg|svg|webp))\)/g, (m, pre, src, ext) => {
    if (src.startsWith('http')) return m;
    const abs = path.resolve(srcDir, src);
    const rel = path.relative(ROOT, abs);
    const relLink = path.relative(outDir, path.join(DOCS, rel));
    return `${pre}${relLink.startsWith('.') ? relLink : './' + relLink})`;
  });

  return md;
}

// ── 读取 markdown → HTML ──
function convert(srcRel, outPath) {
  const filePath = path.join(ROOT, srcRel);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = raw.replace(/^---[\s\S]*?---\n*/, '');
  const fixed = fixLinks(content, filePath, outPath);
  return marked.parse(fixed);
}

// ── 面包屑 ──
function breadcrumb(key) {
  if (key === 'index') return '';
  const parts = key.split('/');
  let html = '<a href="../index.html">首页</a>';
  if (parts[0] === 'research' && parts.length > 1) {
    html += ' <span class="sep">/</span> <a href="../research/index.html">调研档案</a>';
    html += ' <span class="sep">/</span> <span class="current">' + PAGES.find(p => p.key === key).title + '</span>';
  } else if (parts[0] === 'skill') {
    html += ' <span class="sep">/</span> <span class="current">知识库</span>';
  } else if (parts[0] === 'examples') {
    html += ' <span class="sep">/</span> <span class="current">对话实录</span>';
  } else if (parts[0] === 'research') {
    html += ' <span class="sep">/</span> <span class="current">调研档案总览</span>';
  }
  return html;
}

// ── 底部导航 ──
function navFooter(key) {
  const idx = PAGES.findIndex(p => p.key === key);
  const prev = idx > 0 ? PAGES[idx - 1] : null;
  const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;
  const depth = key.split('/').length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const parts = [];
  parts.push(prev ? `<a href="${prefix}${prev.out}">← ${prev.title}</a>` : '<span></span>');
  parts.push(`<a href="${prefix}index.html">↑ 返回首页</a>`);
  parts.push(next ? `<a href="${prefix}${next.out}">${next.title} →</a>` : '<span></span>');
  return `<div class="nav-footer">${parts.join('')}</div>`;
}

// ── HTML 模板 ──
function template(title, body, key) {
  const nav = breadcrumb(key);
  const topNav = nav ? `<nav class="navbar"><div class="navbar-inner">${nav}</div></nav>` : '';
  const depth = key.split('/').length - 1;
  const cssRel = depth > 0 ? '../'.repeat(depth) + 'assets/style.css' : 'assets/style.css';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 张雪峰.skill</title>
<link rel="stylesheet" href="${cssRel}">
</head>
<body>
${topNav}
<div class="container">
${body}
</div>
</body>
</html>`;
}

// ── 首页 ──
function buildIndex() {
  return `
<div class="hero">
  <h1>张雪峰 · 认知操作系统</h1>
  <p class="tagline">社会就是一个大筛子，用学历筛孩子，用房子筛父母，用工作筛家庭。</p>
  <p class="sub">不是语录合集，是可运行的思维框架</p>
  <div class="badges">
    <span class="badge">5 个心智模型</span>
    <span class="badge">8 条决策启发式</span>
    <span class="badge">完整的表达 DNA</span>
    <span class="badge">6 份深度调研</span>
  </div>
</div>
<p style="text-align:center;color:#666;font-size:1.05em">基于 5 本著作、15+ 篇权威媒体深度采访、30+ 条一手语录、<br>11 个关键决策记录和完整人生时间线的深度调研。</p>
<hr>
<h2 class="section-title">📖 知识库</h2>
<p>张雪峰最核心的思维框架，可直接用于分析教育选择、职业规划、阶层流动等问题。</p>
<div class="toc-grid">
  <a href="skill/index.html" class="toc-card">
    <h3>心智模型与表达DNA</h3>
    <p>5 个核心心智模型 · 8 条决策启发式 · 表达风格DNA · 角色扮演规则</p>
    <div class="meta">基于 SKILL.md 整理 →</div>
  </a>
</div>
<hr>
<h2 class="section-title">🔬 调研档案</h2>
<p>6 份深度调研报告，覆盖张雪峰的著作、对话、表达风格、外部评价、决策分析、时间线。</p>
<div class="toc-grid">
  <a href="research/01-writings.html" class="toc-card"><h3>著作与系统思考</h3><p>5 本著作 · 核心论点体系 · 自创术语 · 峰学蔚来商业模式</p><div class="meta">60 行</div></a>
  <a href="research/02-conversations.html" class="toc-card"><h3>深度采访与对谈</h3><p>新浪财经对谈 · 界面新闻采访 · 综艺辩论名场面 · 直播互动分析</p><div class="meta">284 行</div></a>
  <a href="research/03-expression-dna.html" class="toc-card"><h3>表达风格 DNA</h3><p>经典语录 · 口头禅 · 幽默方式 · 争议言论 · 辩论策略</p><div class="meta">264 行</div></a>
  <a href="research/04-external-views.html" class="toc-card"><h3>他者视角与批评</h3><p>正面评价 · 争议批评 · 功利主义反思 · 同行对比</p><div class="meta">70 行</div></a>
  <a href="research/05-decisions.html" class="toc-card"><h3>重大决策分析</h3><p>11 个关键决策 · 行为模式分析 · 核心矛盾总结</p><div class="meta">176 行</div></a>
  <a href="research/06-timeline.html" class="toc-card"><h3>完整人生时间线</h3><p>1984-2026 · 关键转折点 · 最近 12 个月动态</p><div class="meta">63 行</div></a>
</div>
<hr>
<h2 class="section-title">💬 对话示例</h2>
<p>张雪峰视角下 4 个典型问题的完整对话实录。</p>
<div class="toc-grid">
  <a href="examples/demo-conversation.html" class="toc-card"><h3>对话实录</h3><p>高考志愿 · 考研选择 · AI 时代专业 · 理想与现实 · 金句索引</p><div class="meta">108 行</div></a>
</div>
<hr>
<div style="text-align:center;color:#666;font-size:.9em;margin:2em 0">
  <p>本项目基于 MIT License 开源 · 由 女娲.skill 自动生成</p>
  <p>GitHub: <a href="https://github.com/intel-van/zhangxuefeng-skill" target="_blank">intel-van/zhangxuefeng-skill</a></p>
</div>`;
}

function buildResearchIndex() {
  return `
<h1>🔬 调研档案</h1>
<p>以下 6 份文件是对张雪峰全方面的深度调研。</p>
<div class="toc-grid">
  <a href="01-writings.html" class="toc-card"><h3>📝 著作与系统思考</h3><p>5 本著作拆解 · 核心论点 · 自创术语 · 付费产品分析</p></a>
  <a href="02-conversations.html" class="toc-card"><h3>🗣 深度采访与对谈</h3><p>权威媒体采访 · 综艺辩论 · 直播互动 · 回应策略分析</p></a>
  <a href="03-expression-dna.html" class="toc-card"><h3>🧬 表达风格 DNA</h3><p>经典语录 · 口头禅 · 幽默方式 · 争议言论 · 攻防策略</p></a>
  <a href="04-external-views.html" class="toc-card"><h3>👁 他者视角与批评</h3><p>正面评价 · 争议批评 · 功利主义反思 · 同行对比</p></a>
  <a href="05-decisions.html" class="toc-card"><h3>🎯 重大决策分析</h3><p>11 个决策记录 · 行为模式 · 核心矛盾 · 言行一致性评估</p></a>
  <a href="06-timeline.html" class="toc-card"><h3>📅 完整人生时间线</h3><p>1984 → 2026 · 关键转折 · 最近动态</p></a>
</div>` + navFooter('research/index');
}

// ══════════════════════════════════════
function build() {
  ['', 'skill', 'research', 'examples', 'assets'].forEach(d => {
    const p = path.join(DOCS, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  // 首页
  fs.writeFileSync(path.join(DOCS, 'index.html'), template('张雪峰 · 认知操作系统', buildIndex(), 'index'));
  console.log('✓ docs/index.html');

  // SKILL.md
  const skillBody = convert('SKILL.md', 'skill/index.html') + navFooter('skill/index');
  fs.writeFileSync(path.join(DOCS, 'skill', 'index.html'), template('心智模型与表达DNA', skillBody, 'skill/index'));
  console.log('✓ docs/skill/index.html');

  // 调研文件
  const researchFiles = [
    '01-writings.md', '02-conversations.md', '03-expression-dna.md',
    '04-external-views.md', '05-decisions.md', '06-timeline.md'
  ];
  for (const f of researchFiles) {
    const base = f.replace('.md', '');
    const key = `research/${base}`;
    const outPath = `research/${base}.html`;
    const body = convert(`references/research/${f}`, outPath) + navFooter(key);
    fs.writeFileSync(path.join(DOCS, outPath), template(PAGES.find(p => p.key === key).title, body, key));
    console.log(`✓ docs/${outPath}`);
  }

  // research/index.html
  fs.writeFileSync(path.join(DOCS, 'research', 'index.html'), template('调研档案总览', buildResearchIndex(), 'research/index'));
  console.log('✓ docs/research/index.html');

  // examples
  const exBody = convert('examples/demo-conversation.md', 'examples/demo-conversation.html') + navFooter('examples/demo-conversation');
  fs.writeFileSync(path.join(DOCS, 'examples', 'demo-conversation.html'), template('对话实录', exBody, 'examples/demo-conversation'));
  console.log('✓ docs/examples/demo-conversation.html');

  // 复制资源
  const assetFiles = ['assets/hero.gif', 'wechat-qrcode.jpg'];
  for (const f of assetFiles) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DOCS, f));
  }

  console.log('\n✅ 构建完成');
}

build();
