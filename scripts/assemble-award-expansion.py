"""Assemble reviewed award research; never publish incomplete prose or duplicate models."""
import json
from pathlib import Path

read = lambda p: json.loads(Path(p).read_text())
baseline = read('docs/evidence/expansion-400/before-collection.json')
history = read('docs/evidence/expansion-400/before-chronicles.json')
first = read('docs/expansion/awards-400-research-a.json')
second = read('docs/expansion/awards-400-research-b.json')
# Same hardware recognised by two programmes remains one museum product.
aliases = {'anker-solix-f3800': 'anker-solix-f3800-portable-power-station',
           'eufy-x10-omni': 'eufy-x10-pro-omni'}
records = {}
for r in first + second:
    slug = aliases.get(r['slug'], r['slug'])
    previous = records.get(slug)
    if previous:
        assert slug in aliases.values(), f'Unreviewed duplicate: {slug}'
        # X10 Omni's award description conflicts with X10 Pro Omni's verified specifications.
        # Keep the precise B model; do not transfer the uncertain A award or 15 mm claim.
        if slug!='eufy-x10-pro-omni':
            r = {**r, 'additionalAwards': [previous['award'], *previous.get('additionalAwards', [])]}
    records[slug] = r
for name in ['awards-400-narratives-c.json', 'awards-400-narratives-d.json', 'awards-400-narratives-b-tail.json', 'awards-400-narratives-review.json']:
    path=Path('docs/expansion')/name
    if path.exists():
        for slug, prose in read(path).items():
            assert slug in records, f'Unknown narrative model: {slug}'
            records[slug].update(prose)
# Prefer a specific commercial model over a broad award family with no identified SKU.
excluded={
 'pegiant-power-station':'获奖登记名未锁定准确商业型号，不跨版本导入参数。',
 'bosch-accent-line-coffee':'获奖对象为系列，尚未核准单一商业型号。',
 'philips-e7000':'显示器系列缺少唯一型号，保留为研究候选。',
 'philips-air-purifier-600':'系列记录尚未核准具体AC型号。',
 'philips-homerun-3000-aqua':'系列命名未确认唯一型号范围。',
 'hp-pavilion-all-in-one-desktop':'产品家族记录缺少明确配置型号。',
 'asko-elements-wine-climate-cabinet':'系列酒柜缺少本条对应的唯一商业型号。'
 ,'soundblade':'2023获奖MSB60与现售Soundblade官方接口及功率存在差异，暂不跨版本使用。'
 ,'asus-zenbook17-fold':'已核查备用产品；本轮400件范围暂不加入。'
 ,'canon-octr1':'已核查备用产品；本轮400件范围暂不加入。'
}
for slug in excluded:
    assert slug in records, slug
    del records[slug]
# The official ARC 5 record mentions UV surface treatment without locating it inside the box.
records['cleer-arc5']['functionDetails'][1]='资料列有紫外表面消毒设计，不将其解读为消除所有卫生风险'
assert not set(records).intersection(e['slug'] for e in baseline['exhibits']), 'Existing products must not count as additions'
pending = []
for slug, r in records.items():
    for key in ['context', 'design', 'usage', 'significance', 'limitationsNarrative']:
        if len(r.get(key, '').strip()) < 60:
            pending.append(f'{slug}.{key}')
report = {'target': 400, 'baseline': 176, 'uniqueCandidates': len(records),
          'requiredAdditions': 224, 'pendingParagraphs': pending,
          'excludedCandidates':excluded,'automaticApproval': False}
Path('docs/evidence/expansion-400/assembly-status.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
assert len(records) == 224, f'Expected exactly 224 selected models, have {len(records)}'
assert not pending, f'{len(pending)} paragraphs still incomplete; inspect assembly-status.json'
assert all(r['dateKind']=='award' for r in records.values())
# Stable research order. Any reserve candidates are kept outside the public count.
selected = list(records.values())
placement = {
 'phones':('phones',1), 'computers':('computers',2), 'reading':('reading',1),
 'input-printing':('input-printing',2), 'storage':('computers',2),
 'players':('players',2), 'headphones':('headphones',1), 'music':('music',1),
 'imaging':('imaging',3), 'display':('display',2), 'projectors':('display',2),
 'immersive':('immersive',0), 'gaming':('gaming',3), 'watches':('watches',1),
 'bands':('bands',0), 'telephony':('communications',1), 'navigation':('navigation',1),
 'kitchen':('home',3), 'cleaning':('home',3), 'environment':('home',3),
 'smart-home':('home',3), 'robotics':('home',3), 'care':('home',2),
 'making':('input-printing',2)
}
source_records, exhibits = [], []
for index, r in enumerate(selected, 177):
    sid = f'AW400-S{index:03d}'
    award_list = [r['award'], *r.get('additionalAwards', [])]
    source_ids, awards = [], []
    for ai, award in enumerate(award_list):
        source_id = sid if ai == 0 else f'{sid}-{ai+1}'
        host = award['url'].split('/')[2]
        program = ('red-dot' if host.endswith('red-dot.org') else 'australian-good-design' if host.endswith('good-design.org')
                   else 'if' if host.endswith('ifdesign.com') else 'g-mark' if host.endswith('g-mark.org')
                   else 'idea' if host.endswith('idsa.org') else 'ces' if host.endswith('ces.tech')
                   else 'german-design' if host.endswith('german-design-award.com')
                   else 'red-dot' if host=='global.canon' and 'Red Dot' in award['name'] else None)
        assert program, host
        assert isinstance(award['year'], int) and 2020 <= award['year'] <= 2026
        source_records.append({'id':source_id, 'title':f"{r['name']} — {award['name']} {award['year']}",
          'url':award['url'], 'publisher':'Canon' if host=='global.canon' else award['name'], 'checkedOn':'2026-10-15',
          'sourceType':'原厂获奖公告' if host=='global.canon' else '官方获奖作品明细',
          'independence':'制造商官方公告，不视为独立评测' if host=='global.canon' else '奖项机构记录；产品技术描述由参赛方提供，评语为评审观点',
          'supports':f"准确获奖对象、{award['year']}年{award['level']}记录；"+'；'.join(r['designDetails']+r['functionDetails']),
          'verification':'实际核读官方作品页；获奖年份不等于上市年份；功能与体验不视为本站实测。',
          'verificationRecords':r.get('sourceEvidence',[])})
        source_ids.append(source_id)
        awards.append({**award,'programId':program,'model':r['name'],'sourceIds':[source_id]})
    seen_urls={s['url'] for s in source_records if s['id'] in source_ids}
    for evidence in r.get('sourceEvidence',[]) + r.get('supplementalSources',[]):
        url=evidence.get('url')
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        extra_id=f'{sid}-P{len(seen_urls)}'
        facts=evidence.get('facts') or evidence.get('supports') or evidence.get('verification')
        assert facts, f'{r["slug"]}: supplemental source requires a verified scope'
        source_records.append({'id':extra_id,'title':evidence.get('title') or f"{r['name']} — 产品与操作说明",
          'url':url,'publisher':evidence.get('publisher') or url.split('/')[2],
          'checkedOn':evidence.get('checkedOn','2026-10-15'),'sourceType':'原厂产品、发布或操作资料',
          'supports':'；'.join(facts) if isinstance(facts,list) else facts,
          'verification':'仅采用实际查阅资料中属于本型号的内容；不转移其他版本的能力。'})
        source_ids.append(extra_id)
    category=r['category']; line_id, stage_index=placement[category]
    line=next(c for c in history['categories'] if c['id']==line_id)
    stage=line['stages'][stage_index]
    paragraphs={k:r['limitationsNarrative'] if k=='limitations' else r[k] for k in ['context','design','usage','significance','limitations']}
    related=[e['slug'] for e in baseline['exhibits'] if baseline['categoryAssignments'][e['slug']]==category][-2:]
    summary=r.get('summary') or r['whyRepresentative']
    e={**paragraphs,'id':index,'slug':r['slug'],'name':r['name'],'brand':r['brand'],
       'year':r['year'],'dateKind':'award','dateLabel':f"{r['year']}年获奖记录（非上市年份）",
       'category':category,'regionVersion':r.get('regionVersion','按官方获奖页所列产品范围；地区配置不作推定'),
       'aliases':r.get('aliases',[]),'tags':[category,'设计奖项',*dict.fromkeys(a['name'] for a in awards)],
       'summary':summary,'features':r['designDetails'],'designDetails':r['designDetails'],
       'functionDetails':r['functionDetails'],'readerTakeaway':r['whyRepresentative'],
       'facts':[{'label':'获奖记录年份','value':f"{r['year']}年；非上市年份",'sourceIds':source_ids},
                {'label':'获奖对象','value':r['name'],'sourceIds':source_ids},
                {'label':'主要功能','value':'；'.join(r['functionDetails']),'sourceIds':source_ids}],
       'sourceIds':source_ids,'paragraphSources':{k:source_ids for k in [*paragraphs,'readerTakeaway','awards']},
       'relatedSlugs':related,'awards':awards,'commercialStatus':r['commercialStatus'],
       'chroniclePlacement':{'lineId':line_id,'stageId':stage['id']},'chronicleIds':[],
       'reviewedOn':'2026-10-15','contentStatus':'reviewed-award-expansion','significanceLabel':'策展解读',
       'evidenceLimits':['获奖年用于定位评审记录，不代替上市日期；设计取舍为基于资料的策展解读。'],
       'mediaOpinions':[],'videoIds':[]}
    exhibits.append(e)
assert len({e['slug'] for e in exhibits})==224
Path('docs/expansion/awards-400-approved.json').write_text(json.dumps({'checkedOn':'2026-10-15','target':400,
 'reviewBoundary':'官方获奖页事实和策展解读分别呈现；图像许可独立审核。',
 'exhibits':exhibits,'sources':source_records},ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(exhibits)} additions, {len(source_records)} source records; importer performs final graph and preservation checks.')
