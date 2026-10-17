import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderChronicles } from './render-chronicles.mjs';
import { readingParagraphs, separateResearchNotes } from '../src/story.js';

const data = JSON.parse(await readFile('src/collection.json', 'utf8'));
const { categories, chronicles, videos = [] } = data;
const exhibits=data.exhibits.map(e=>({...e,summary:e.presentation?.summary || e.summary,designDetails:e.presentation?.designDetails || e.designDetails,awards:(e.awards || []).map(a=>({...a,programId:a.programId || (a.name==='Good Design Award'?'g-mark':'')}))}));
const awardPrograms = JSON.parse(await readFile('docs/award-programs.json', 'utf8'));
const availableAwardPrograms=awardPrograms.programs.filter(p=>exhibits.some(e=>e.awards.some(a=>a.programId===p.id)));
const bySlug = new Map(exhibits.map((e) => [e.slug, e]));
const categoryName = (id) => categories.find((c) => c.id === id)?.name || id;
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const external = (url, text, cls = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="${cls}">${text}<span class="sr-only">（在新标签页打开）</span></a>`;
const path = (e) => `/exhibits/${e.slug}/`;
const sorted = [...exhibits].sort((a,b) => a.year-b.year || a.name.localeCompare(b.name));
const reviewedOn = exhibits.map(e => e.reviewedOn).filter(Boolean).sort().at(-1) || '';
const decades = [...new Set(sorted.map((e) => Math.floor(e.year/10)*10))];
const navigation = [['home','首页','/'],['exhibits','馆藏','/exhibits/'],['chronicles','产品编年史','/chronicles/'],['about','关于','/about/']];


function sourceLinks(e, section) {
  const ids=e.paragraphSources?.[section];
  return e.sources.map((s, i) => !ids || ids.includes(s.id) ? `<a class="source-tag" href="#source-${i+1}">[${i+1}] ${esc(s.publisher)}</a>` : '').filter(Boolean).join(' ');
}
function credit(e) {
  const m = e.image;
  if (!m) return `<p class="credit">馆藏资料 · 实物照片待补 · <a href="${path(e)}#sources">查看本型号的资料与图像出处 ↓</a></p>`;
  return `<p class="credit">作者：${m.creatorUrl ? external(m.creatorUrl,esc(m.creator)) : esc(m.creator)} · ${external(m.licenseUrl, esc(m.license))} · ${external(m.sourcePage,m.workTitle?'原图：《'+esc(m.workTitle)+'》 ↗':'图片来源 ↗')}${m.originalPublicationUrl ? ' · '+external(m.originalPublicationUrl,'原发布页 ↗') : ''}${m.changes ? ` · ${esc(m.changes)}` : ''}${m.caption || m.alt ? `<br>${esc(m.caption || m.alt)}` : ''}</p>`;
}
function image(e, eager = false) {
  if (!e.image) return `<div class="image-stage archive-stage"><div><span class="eyebrow">馆藏资料</span><strong class="year">${e.year}</strong><span>${esc(e.brand)}</span><p>实物照片待补</p></div></div>`;
  return `<div class="image-stage"><img data-exhibit-image src="${esc(e.image.path)}" alt="${esc(e.image.alt || e.name+' 实物照片')}" width="720" height="540" loading="${eager ? 'eager' : 'lazy'}" decoding="async"><div class="image-fallback" hidden><strong>${esc(e.name)}</strong><p>展品照片暂时无法显示</p><span>请使用图片来源链接查看原图</span></div></div>`;
}
function card(e) {
  return `<article class="exhibit-card" data-slug="${esc(e.slug)}"><a class="exhibit-link" href="${path(e)}">${image(e)}<div class="card-copy"><div class="card-meta"><span class="year">${e.year}${e.dateKind==='award'?' 获奖':''}</span><span>${esc(categoryName(e.category))}</span></div><h3>${esc(e.name)}<span class="card-arrow" aria-hidden="true">↗</span></h3><p class="summary">${esc(e.summary)}</p></div></a>${credit(e)}</article>`;
}
function videoCard(v) {
  return `<article class="video-card"><span class="play-icon" aria-hidden="true">▶</span><small> &nbsp; ${esc(v.publisher)} · 原发布方影像</small><h3>${esc(v.title)}</h3><p>${esc(v.summary)}</p>${external(v.url, '前往原发布页 ↗', 'text-link')}<p class="credit">站外观看 · 不自动播放 · 可用性取决于第三方服务</p></article>`;
}
function teardownSection(e) {
  const t=e.teardown;
  if(!t) return '';
  return `<section class="story-section" id="teardown"><span class="eyebrow">内部结构与拆解</span><h2>${esc(t.title)}</h2><p>${esc(t.summary)}</p>${t.image ? `<figure class="internal-photo">${image({name:e.name,image:t.image})}<figcaption>${credit({image:t.image})}</figcaption></figure>` : ''}<ul class="teardown-points">${t.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><p class="credit">${t.image ? '内部细节观察' : '基于原拆解资料的中文简述'}</p>${t.sources.map(s=>external(s.url,esc(s.title)+' ↗','text-link')).join(' ')}</section>`;
}
function narrativeSection(e, key, label, title) {
  const {body,notes}=separateResearchNotes(e[key]);
  const paragraphs=readingParagraphs(body);
  if(!paragraphs.length) return '';
  const points=key==='design' ? (e.designDetails || e.features || []) : key==='usage' ? (e.functionDetails || []) : [];
  const details=points.length ? `<div class="product-detail-points"><h3>${key==='design'?'先看这些设计细节':'主要功能与操作'}</h3><ol>${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></div>` : '';
  return `<section class="story-section${key==='significance'?' interpretation':''}" id="${key}"><span class="eyebrow">${esc(label)}</span><h2>${esc(title)}</h2>${details}${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<div class="paragraph-sources">${sourceLinks(e,key)}</div>${notes.length?`<details class="source-scope"><summary>资料核查与阅读注记</summary>${notes.map(n=>`<p>${esc(n)}</p>`).join('')}</details>`:''}${key==='design'&&e.image?`<p class="photo-reading-link"><a href="#product-photo">对照实物照片查看外形与布局 ↑</a></p>`:''}</section>`;
}
function awardSection(e) {
  if(!e.awards?.length) return '';
  return `<section class="story-section" id="awards"><span class="eyebrow">获奖记录</span><h2>它在哪些设计评审中被关注</h2><ul class="award-records">${e.awards.map(a=>`<li><strong>${esc(a.name)}</strong> · ${esc(a.year)} · ${esc(a.level)}${a.model?`<p>获奖型号：${esc(a.model)}</p>`:''}${a.url?external(a.url,'查看官方获奖记录 ↗'):sourceLinks(e,'awards')}${a.limits?`<p class="muted">${esc(a.limits)}</p>`:''}</li>`).join('')}</ul><p class="muted">获奖记录说明评审认可的设计方向；它不代替独立测试、长期使用反馈或产品交付记录。</p><a class="text-link" href="/awards/">了解选品参考的奖项 →</a></section>`;
}
function detailNarrative(e) {
  const contemporary=e.year>=2026||e.significanceLabel==='当代观察';
  const sections=[
    ['significance',contemporary?'当代观察':e.significanceLabel || '策展解读',contemporary?'这件当代产品值得观察什么':'它的代表性在哪里'],
    ['context','时代背景','它回应了什么问题'],
    ['design','设计与技术','关键设计如何工作'],
    ['usage','使用方式','它是怎样使用的'],
    ['limitations','取舍与边界','它有哪些局限']
  ].filter(([key])=>e[key]);
  return `<nav class="detail-reading-nav" aria-label="展品阅读目录">${sections.map(([key,label])=>`<a href="#${key}">${esc(key==='significance' ? (contemporary?'当代观察':'代表性') : label)}</a>`).join('')}</nav>${sections.map(args=>narrativeSection(e,...args)).join('')}`;
}
function significancePreview(e) {
  const contemporary=e.year>=2026||e.significanceLabel==='当代观察';
  const text=e.readerTakeaway || String(e.significance).match(/[^。]+。?/g)?.slice(0,2).join('') || e.summary;
  return `<aside class="significance-preview" aria-label="入藏理由"><p class="eyebrow">${esc(contemporary?'当代观察':e.significanceLabel||'策展解读')}</p><h2>${contemporary?'这件产品值得观察什么':'为什么值得入藏'}</h2><p>${esc(text)}</p><a class="text-link" href="#significance">阅读完整代表性与依据 ↓</a></aside>`;
}
function mediaOpinions(e) {
  if(!e.mediaOpinions?.length) return '';
  const fields=[['author','作者'],['articleDate','文章日期'],['exactModelVersion','具体型号'],['modelVersion','版本范围'],['praise','认可之处'],['shortcomings','局限与批评'],['evaluationConditions','测试条件'],['commercialDisclosure','商业关系'],['verificationDepth','核读深度']];
  return `<section class="story-section" id="media-opinions"><span class="eyebrow">媒体观察</span><h2>在具体条件下，他们怎样评价</h2><p>以下是署名作者对指定产品的观察，不能代替所有用户的体验。</p>${e.mediaOpinions.map(o=>`<article class="media-opinion"><h3>${esc(o.media)}</h3><dl>${fields.filter(([k])=>o[k]).map(([k,label])=>`<div><dt>${label}</dt><dd>${esc(Array.isArray(o[k])?o[k].join('；'):o[k])}</dd></div>`).join('')}</dl>${external(o.originalURL||o.url||e.sources.find(s=>s.id===o.sourceId).url,'阅读原文 ↗')}</article>`).join('')}</section>`;
}
function sourceScope(s) {
 const fields=[['supports','支持范围'],['verification','核查方式与限制'],['sourceType','资料类型'],['independence','独立性'],['commercialDisclosure','商业关系']];
 return `<details class="source-scope"><summary>资料范围与核查记录</summary>${fields.filter(([k])=>s[k]).map(([k,label])=>`<p><strong>${label}</strong> ${esc(s[k])}</p>`).join('')}</details>`;
}
function layout(title, body, active = '', head = '') {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Circuit Museum</title><meta name="description" content="Circuit Museum 是关于真实电子产品设计、技术与生活变化的线上博物馆，通过馆藏与产品编年史阅读产品如何改变日常。"><meta name="theme-color" content="#ffffff"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><script type="module" src="/app.js"></script>${head}</head><body><a class="skip" href="#main">跳到主要内容</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="/" aria-label="Circuit Museum 首页"><span><strong>CIRCUIT MUSEUM</strong><small>赛博电子博物馆</small></span></a><nav aria-label="主导航">${navigation.map(([key,label,href])=>`<a href="${href}"${active===key?' aria-current="page"':''}>${label}</a>`).join('')}</nav></div></header><main id="main" class="shell">${body}</main><footer class="site-footer"><div class="shell"><div class="footer-top"><a class="brand" href="/"><span><strong>CIRCUIT MUSEUM</strong><small>通过产品，阅读技术与日常</small></span></a><a class="text-link" href="/about/#credits">史料与影像署名 <span>↗</span></a></div><div class="footer-bottom"><p>${exhibits.length} 件精选馆藏 · ${chronicles.categories.length} 条产品阅读线。</p><p>独立策展 · 不代表品牌官方 · 2026</p></div></div></footer></body></html>`;
}
async function page(route, title, body, active, head) {
  const file = route.endsWith('.html') ? `dist/${route}` : `dist/${route}/index.html`;
  await mkdir(resolve(file, '..'), { recursive:true });
  await writeFile(file, layout(title, body, active, head));
}
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
await cp('public', 'dist', { recursive:true });
for (const name of ['style.css','app.js','catalog.js']) await cp(`src/${name}`, `dist/${name}`);
await writeFile('dist/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="white"/><text x="3" y="32" fill="#202020" font-family="sans-serif" font-size="25">CM</text></svg>');

const chronicleBody = renderChronicles(chronicles, bySlug, {esc,external,image,credit});
const homeRows=chronicles.homeRows.map(row=>{
  const lines=chronicles.categories.filter(c=>row.lineIds.includes(c.id));
  const featured=bySlug.get(row.featuredSlug);
  const products=lines.flatMap(c=>c.nodes.filter(n=>n.kind==='exhibit').map(n=>bySlug.get(n.exhibitSlug))).sort((a,b)=>a.year-b.year);
  const milestones=products.length>4 ? [products[0],products[Math.floor(products.length/3)],products[Math.floor(2*products.length/3)],products.at(-1)] : products;
  const readingLinks=lines.map(c=>`<a class="text-link" href="/chronicles/?type=${c.id}">阅读${esc(c.label)}编年史 →</a><a class="text-link" href="/exhibits/?line=${c.id}">浏览相关馆藏 →</a>`).join('');
  const stageLinks=lines.flatMap(c=>c.stages.filter(s=>s.nodeIds.length).map(s=>`<li><a href="/chronicles/?type=${c.id}#${s.id}">${esc(s.title)}</a><small>${s.yearRange.start}—${s.yearRange.end}</small></li>`)).join('');
  return `<section class="home-development" data-home-row="true"><div class="home-row-heading"><p class="eyebrow">${products.length} 件完整展品</p><h2>${esc(row.label)}</h2><p>${lines.map(c=>esc(c.introduction)).join(' ')}</p></div>${featured?`<figure class="home-row-image"><a href="${path(featured)}">${image(featured)}<figcaption><strong>${esc(featured.name)}</strong> · ${featured.year}</figcaption></a>${credit(featured)}</figure><div class="home-row-story"><h3>从这件产品读起</h3><p>${esc(featured.readerTakeaway||featured.summary)}</p><a class="text-link" href="${path(featured)}#significance">它的代表性在哪里 →</a><ol class="home-stage-path" aria-label="${esc(row.label)}发展阶段">${stageLinks}</ol>${readingLinks}<ol class="home-product-path">${milestones.map(e=>`<li><span class="year">${e.year}</span> <a href="${path(e)}">${esc(e.name)}</a></li>`).join('')}</ol></div>`:`<div class="home-pending"><h3>完整介绍准备中</h3><p>我们正在整理型号、使用方式和来源。这条阅读线会在资料完整后加入展品。</p></div>`}</section>`;
}).join('');
await page('', '首页', `<header class="home-introduction"><p class="eyebrow">电子产品设计与生活史</p><h1>从一件熟悉的东西，<br>读懂技术如何进入日常。</h1><p>这是一座关于真实电子产品的线上博物馆。${exhibits.length} 件完整展品介绍，从时代背景、关键设计、实际使用和局限解释它们的代表性。</p><div class="home-entry-links"><a class="button primary" data-home-collection href="/exhibits/">浏览馆藏 →</a><a class="text-link" href="/chronicles/">阅读产品编年史 →</a></div></header><div class="home-reading-rows">${homeRows}</div>`, 'home');
await page('chronicles', '产品编年史', chronicleBody, 'chronicles');
await page('awards', '从设计奖项看产品', `<header class="page-title"><p class="eyebrow">选品与依据</p><h1>从设计奖项，回到产品本身</h1><p>${esc(awardPrograms.selectionPolicy)}</p><a class="text-link" href="/exhibits/">返回全部馆藏 →</a></header><div class="award-programs">${awardPrograms.programs.map(p=>`<section class="story-section" id="${esc(p.id)}"><h2>${esc(p.name)}</h2><p class="eyebrow">${esc(p.organizer)}</p><p>${esc(p.focus)}</p><p>${esc(p.levels)}</p>${p.boundary?`<p>${esc(p.boundary)}</p>`:''}<p>${external(p.url,'奖项与作品库 ↗')} · ${external(p.criteriaUrl,'评审范围与规则 ↗')}</p></section>`).join('')}</div><section class="story-section"><h2>怎样从获奖名单筛选馆藏</h2><ol class="selection-principles"><li>先确认实体产品及准确型号，再核对年份和级别；同一型号重复获奖只收录一次。</li><li>解释结构、材料、控制布局和功能如何回应使用任务，并记录兼容、维护及使用条件。</li><li>把评审意见、制造商介绍与策展解读分别说明；不将设计奖写成性能排名。</li><li>产品史料的阅读许可与照片的复用许可分别核查。没有明确图像授权时，保留原始出处供读者查看。</li></ol><p>奖项资料核对于 ${esc(awardPrograms.checkedOn)}。</p></section>`, 'exhibits');

const options = (items) => items.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
const categoryOptions = categories.map(c=>[c.id,c.name]);
await page('exhibits', '馆藏', `<header class="page-title catalog-title"><p class="eyebrow">馆藏目录</p><div class="title-row"><h1>走近每一件产品</h1><span class="collection-count mono">${sorted[0].year} — ${sorted.at(-1).year} &nbsp; / &nbsp; ${exhibits.length} 件馆藏</span></div><p>先选一种产品，再沿年代与关键词探索。每一件都有自己的设计选择与时代背景。</p><a class="text-link" href="/awards/">从设计与电子奖项探索选品依据 →</a></header><section class="catalog-section" aria-label="浏览馆藏"><div class="category-tabs" aria-label="按产品类型浏览"><a class="category-tab" href="/exhibits/" data-category-tab="" aria-current="true">全部馆藏<span>${exhibits.length}</span></a>${categories.map(c=>`<a class="category-tab" href="/exhibits/?category=${c.id}" data-category-tab="${c.id}" aria-current="false">${esc(c.name)}<span>${exhibits.filter(e=>e.category===c.id).length}</span></a>`).join('')}</div><p id="catalog-reading-line" class="reading-line-note" hidden></p><form id="catalog-filters" class="filters" action="/exhibits/"><input type="hidden" name="line" value=""><div class="field field-search"><label for="q">搜索展品</label><input id="q" name="q" type="search" placeholder="产品、品牌或关键词，如：随身听" autocomplete="off"></div><div class="field field-category"><label for="category">产品类型</label><select id="category" name="category"><option value="">全部类型</option>${options(categoryOptions)}</select></div><div class="field"><label for="decade">年代</label><select id="decade" name="decade"><option value="">全部年代</option>${options(decades.map(d=>[d,`${d} 年代`]))}</select></div><div class="field field-award"><label for="award">设计奖项</label><select id="award" name="award"><option value="">全部奖项</option>${options(availableAwardPrograms.map(p=>[p.id,p.name]))}</select></div><div class="field field-sort"><label for="sort">排列方式</label><select id="sort" name="sort"><option value="oldest">年代由早到晚</option><option value="newest">年代由晚到早</option></select></div></form><div class="result-bar"><span id="result-count">${exhibits.length} 件展品</span><a class="text-link" href="/awards/">设计奖项选品依据 ↗</a><button class="button" id="clear-filters" data-clear hidden>清除全部条件 ×</button></div><span id="result-announcement" class="sr-only" role="status" aria-live="polite"></span><div id="catalog-grid" class="cards">${sorted.map(card).join('')}</div><div id="empty-state" class="empty-state" hidden><p class="eyebrow">空结果</p><h2>没有找到符合这些条件的展品</h2><p>试试其他关键词，或清除筛选后重新浏览。</p><button class="button primary" data-clear>清除全部条件</button></div></section><script id="catalog-data" type="application/json">${JSON.stringify(exhibits.map(({slug,name,brand,aliases,tags,summary,category,legacyCategory,readingLine,year,awards})=>({slug,name,brand,aliases,tags,summary,category,legacyCategory,readingLine,year,awards}))).replace(/</g,'\\u003c')}</script><script id="legacy-category-data" type="application/json">${JSON.stringify(data.legacyCategories)}</script><script id="reading-lines-data" type="application/json">${JSON.stringify(chronicles.categories.map(c=>({id:c.id,label:c.label})))}</script>`, 'exhibits');

for (const e of exhibits) {
  const ev = videos.filter(v=>v.exhibitSlug===e.slug);
  const related = e.relatedSlugs.map(s=>bySlug.get(s));
  const appearances=chronicles.categories.flatMap(c=>c.nodes.filter(n=>n.exhibitSlug===e.slug).map(n=>({type:c.id,label:c.label,node:n.id})));
  const chronicleLinks=appearances.map(a=>`<a href="/chronicles/?type=${a.type}#${a.node}">在${esc(a.label)}编年史中查看 →</a>`).join('');
  await page(`exhibits/${e.slug}`, e.name, `<section class="detail-intro"><a class="back-link" data-return href="/exhibits/">← 返回馆藏</a><header class="detail-header"><p class="eyebrow">${esc(e.brand)} &nbsp; / &nbsp; ${esc(categoryName(e.category))} &nbsp; / &nbsp; 展品 ${String(sorted.findIndex(x=>x.slug===e.slug)+1).padStart(2,'0')}</p><h1>${esc(e.name)}</h1><p class="lead">${esc(e.summary)}</p></header>${significancePreview(e)}<div class="detail-layout"><figure class="detail-image" id="product-photo" style="margin:0">${image(e,true)}<figcaption>${credit(e)}${e.image ? external(e.image.sourcePage,'查看大图与原始照片 ↗','text-link') : ''}</figcaption></figure><aside class="detail-plate" aria-label="展品档案"><p class="eyebrow">展品档案</p><div class="big-year">${e.year}</div>${e.dateKind==='award'?'<p class="date-basis">获奖记录年份 · 非上市日期</p>':''}<dl class="fact-list"><div><dt>品牌</dt><dd>${esc(e.brand)}</dd></div><div><dt>类型</dt><dd>${esc(categoryName(e.category))}</dd></div>${e.facts.filter(f=>!['品牌','类型','产品类型'].includes(f.label)).map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl><p>${sourceLinks(e)}</p></aside></div></section><div class="chronicle-detail-links">${chronicleLinks}</div><script id="detail-chronicles-data" type="application/json">${JSON.stringify(appearances).replace(/</g,'\\u003c')}</script><div class="detail-body">${detailNarrative(e)}${awardSection(e)}${mediaOpinions(e)}${teardownSection(e)}${ev.length?`<section class="story-section"><span class="eyebrow">相关影像</span><h2>在影像中继续探索</h2>${ev.map(videoCard).join('')}</section>`:''}<section class="story-section" id="sources"><span class="eyebrow">引用与依据</span><h2>史料来源</h2><p class="muted">事实叙述依据以下资料；“代表性”与“当代观察”为本展策展解读，所引资料支持其中的产品事实。</p><ol class="source-list">${e.sources.map((s,i)=>`<li id="source-${i+1}"><span class="mono">[${i+1}]</span> ${external(s.url,esc(s.title)+' ↗')}<small>${esc(s.publisher)} · 核对于 ${esc(s.checkedOn || e.reviewedOn)}${s.note?' · '+esc(s.note):''}</small>${sourceScope(s)}</li>`).join('')}</ol></section></div>${related.length ? `<section class="section"><div class="section-head"><div><span class="eyebrow">相关展品</span><h2>继续探索</h2></div><a class="text-link" href="/exhibits/">全部馆藏 ↗</a></div><div class="cards">${related.map(card).join('')}</div></section>` : ''}`, 'exhibits');
}

await page('timeline','产品编年史',`<section class="page-title"><h1>产品编年史</h1><p>时间线已按品类整理为产品发展图录。</p><a class="text-link" href="/chronicles/">进入产品编年史 →</a></section>`,'chronicles','<meta http-equiv="refresh" content="0;url=/chronicles/">');

await page('about','关于本展',`<header class="page-title"><p class="eyebrow">关于本展</p><h1>关于这份产品史图录</h1><p>Circuit Museum · 赛博电子博物馆，是一场关于电子产品与生活方式的独立线上展览。</p></header><div class="about-body"><h2>从早期形态到当代观察</h2><p>本展收录 ${sorted[0].year}—${sorted.at(-1).year} 年的 ${exhibits.length} 件精选产品。产品编年史以 ${chronicles.categories.length} 条阅读线和45个阶段讲述产品的变化，暂无完整稿的阶段标明准备中；馆藏仍可按 ${categories.length} 种主类型和年代查找。我们选择形态、交互或用途具有代表性的产品，不以销量或排名定义它们的价值，也不宣称覆盖完整的电子产品史。</p><div class="about-principles"><article><h3>真实的产品</h3><p>标明型号与代际，用可追溯的实物照片呈现外观，避免把后续型号的功能移植到初代产品。</p></article><article><h3>清楚的依据</h3><p>史实连接品牌档案、博物馆与原始发布资料；策展解读独立标注，供读者判断。</p></article><article><h3>克制的展示</h3><p>照片、特点与历史意义优先。没有自动播放，站外影像保留文字摘要与原发布页入口。</p></article></div><h2>关于范围与年代</h2><p>年份依据产品发布、上市或获奖记录；获奖年明确标注，不等同上市时间，不同市场也可能存在时间差。每件展品的档案与史料说明采用的口径。所选产品并不代表每个国家、品牌或技术路线；未收录不意味着缺乏历史价值。</p><h2>影像与版权</h2><p>照片依据逐图注明的授权条件使用，包括开放许可、Unsplash许可及注明限制的原图转载许可；摄影作品的许可不代表品牌背书。尺寸、格式处理或原样转载方式逐图说明，原始出处、作者与许可在每件展品旁保留。视频采用原发布方页面外链，不复制或重新托管视频文件。少量实物画面取自明确开放许可的视频，图片旁标明原作者、许可与原发布页；第三方服务不可访问时，展品正文仍然完整。</p><h2 id="credits">照片来源与署名</h2><ul class="source-list">${sorted.map(e=>`<li><a href="${path(e)}">${esc(e.name)}</a>${credit(e)}</li>`).join('')}</ul><h2>阅读原始史料</h2><p>每个详情页的事实段落设有引用入口，页末列出具体资料标题、发布方与链接。内容更新于 ${esc(chronicles.contentUpdatedOn||reviewedOn)}，各来源保留实际核查日期。</p><a class="button primary" href="/exhibits/">进入馆藏 ↗</a></div>`,'about');
await page('404.html','未找到展品',`<section class="not-found"><p class="eyebrow">未找到展品</p><h1>这件展品不在当前展厅</h1><p>地址可能有误，回到馆藏继续探索。</p><a class="button primary" href="/exhibits/">返回馆藏 ↗</a></section>`);
console.log(`Built ${exhibits.length} exhibit pages and 7 public pages → dist/`);
