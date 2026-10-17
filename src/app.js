import { selectExhibits } from '/catalog.js';

function rememberedVisit() {
  try { return JSON.parse(sessionStorage.getItem('museum-return') || 'null'); }
  catch { return null; }
}

document.querySelectorAll('img[data-exhibit-image]').forEach((img) => {
  const failed = () => {
    img.hidden = true;
    const fallback = img.closest('.image-stage').querySelector('.image-fallback');
    if (fallback) fallback.hidden = false;
  };
  img.addEventListener('error', failed);
  if (img.complete && img.naturalWidth === 0) failed();
});

const form = document.querySelector('#catalog-filters');
if (form) {
  const exhibits = JSON.parse(document.querySelector('#catalog-data').textContent);
  const grid = document.querySelector('#catalog-grid');
  const cards = new Map([...grid.children].map((card) => [card.dataset.slug, card]));
  const fields = ['q', 'category', 'decade', 'sort', 'line', 'award'];
  const result = document.querySelector('#result-count');
  const reset = document.querySelector('#clear-filters');
  let announceTimer;
  function render(writeUrl) {
    const filters = Object.fromEntries(fields.map((name) => [name, form.elements.namedItem(name).value]));
    const selection = selectExhibits(exhibits, filters);
    const lineNote=document.querySelector('#catalog-reading-line');
    const line=JSON.parse(document.querySelector('#reading-lines-data').textContent).find(c=>c.id===filters.line);
    lineNote.hidden=!filters.line;
    lineNote.textContent=line ? `当前阅读线：${line.label}` : '当前阅读线暂无馆藏';
    const ids = new Set(selection.map((e) => e.slug));
    cards.forEach((card, slug) => { card.hidden = !ids.has(slug); });
    selection.forEach((e) => grid.append(cards.get(e.slug)));
    document.querySelector('#empty-state').hidden = selection.length !== 0;
    result.textContent = `${selection.length} 件展品`;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { document.querySelector('#result-announcement').textContent = `找到 ${selection.length} 件展品`; }, 400);
    reset.hidden = !filters.line && !filters.q && !filters.category && !filters.decade && !filters.award && filters.sort !== 'newest';
    document.querySelectorAll('[data-category-tab]').forEach((a) => a.setAttribute('aria-current', a.dataset.categoryTab === filters.category ? 'true' : 'false'));
    if (writeUrl) {
      const params = new URLSearchParams();
      fields.forEach((name) => { if (filters[name] && filters[name] !== 'oldest') params.set(name, filters[name]); });
      history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : ''));
    }
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    const category=form.elements.namedItem('category');
    const requestedCategory=params.get('category');
    const legacy=JSON.parse(document.querySelector('#legacy-category-data').textContent).find(c=>c.id===requestedCategory)
      || (exhibits.some(e=>e.legacyCategory===requestedCategory) ? {id:requestedCategory,label:'原分类馆藏'} : null);
    if(legacy && ![...category.options].some(o=>o.value===legacy.id)) category.add(new Option(legacy.label,legacy.id));
    fields.forEach((name) => {
      const field = form.elements.namedItem(name);
      field.value = params.get(name) || (name === 'sort' ? 'oldest' : '');
      if (field.selectedIndex === -1) field.value = name === 'sort' ? 'oldest' : '';
    });
    render(false);
  }
  form.addEventListener('input', () => render(true));
  form.addEventListener('submit', (event) => { event.preventDefault(); render(true); });
  document.querySelectorAll('[data-clear]').forEach((button) => button.addEventListener('click', () => { form.reset(); form.elements.namedItem('line').value=''; render(true); form.elements.namedItem('q').focus(); }));
  document.querySelectorAll('[data-category-tab]').forEach((a) => a.addEventListener('click', (event) => {
    if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); form.elements.namedItem('category').value = a.dataset.categoryTab; render(true);
  }));
  window.addEventListener('popstate', restore);
  restore();
  grid.addEventListener('click', (event) => {
    if (event.target.closest('a.exhibit-link')) {
      try { sessionStorage.setItem('museum-return', JSON.stringify({ url: location.pathname + location.search, scroll: window.scrollY, exhibitSlug: event.target.closest('.exhibit-card').dataset.slug })); }
      catch { /* Storage is optional; native browser Back still works. */ }
    }
  });
  const remembered = rememberedVisit();
  if (remembered?.url === location.pathname + location.search) requestAnimationFrame(() => window.scrollTo(0, remembered.scroll));
}

const chronicleTabs = document.querySelectorAll('[data-chronicle-tab]');
if (chronicleTabs.length) {
  const sections=[...document.querySelectorAll('[data-chronicle]')];
  history.scrollRestoration='manual';
  function alignChronicleAnchor() {
    const section=sections.find(s=>!s.hidden);
    const node=location.hash && document.getElementById(location.hash.slice(1));
    if(node && section?.contains(node)) node.scrollIntoView({block:'start'});
  }
  function showChronicle() {
    const type=new URLSearchParams(location.search).get('type') || 'phones';
    const section=sections.find(s=>s.dataset.chronicle===type);
    sections.forEach(s=>{s.hidden=s!==section});
    chronicleTabs.forEach(a=>a.setAttribute('aria-current',a.dataset.chronicleTab===type?'true':'false'));
    document.querySelector('#chronicle-empty').hidden=Boolean(section);
    document.querySelector('#chronicle-announcement').textContent=section ? section.getAttribute('aria-label') : '暂未收录这个品类';
    document.documentElement.dataset.chronicleReady='true';
    if(location.hash) requestAnimationFrame(alignChronicleAnchor);
    else window.scrollTo(0,0);
  }
  chronicleTabs.forEach(a=>a.addEventListener('click',event=>{
    if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if((new URLSearchParams(location.search).get('type') || 'phones')===a.dataset.chronicleTab) return;
    const target=new URL(a.getAttribute('href'),location.href);
    target.hash='';
    history.pushState(null,'',target.pathname+target.search);
    showChronicle();
    window.scrollTo(0,0);
  }));
  window.addEventListener('popstate',showChronicle);
  window.addEventListener('load',()=>requestAnimationFrame(alignChronicleAnchor),{once:true});
  window.addEventListener('pageshow',()=>requestAnimationFrame(alignChronicleAnchor));
  window.addEventListener('hashchange',alignChronicleAnchor);
  showChronicle();
}

const back = document.querySelector('[data-return]');
if (back) {
  const params=new URLSearchParams(location.search);
  const appearances=JSON.parse(document.querySelector('#detail-chronicles-data')?.textContent || '[]');
  const origin=params.get('from')==='chronicles' && appearances.find(a=>a.type===params.get('type')&&a.node===params.get('node'));
  if(origin) {
    back.href=`/chronicles/?type=${origin.type}#${origin.node}`;
    back.textContent=`← 返回${origin.label}编年史`;
  } else {
    const remembered = rememberedVisit();
    const slug=location.pathname.split('/')[2];
    if (remembered?.exhibitSlug===slug && /^\/exhibits\/?(?:\?|$)/.test(remembered.url || '')) back.href=remembered.url;
  }
}
