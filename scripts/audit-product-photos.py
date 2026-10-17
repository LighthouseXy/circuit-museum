"""Publish a complete review ledger for the 142 initially unillustrated products."""
import csv,json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
p=root/'docs/evidence/photo-expansion'
catalog=json.loads((root/'src/collection.json').read_text())['exhibits']
before=json.loads((p/'before-image-overrides.json').read_text())
images=json.loads((root/'src/image-overrides.json').read_text())
imported=json.loads((p/'imported-photos.json').read_text())
new={r['slug']:r for r in imported['records']}
choices={r['slug']:r for r in json.loads((p/'review-choices.json').read_text())}
source_selections=json.loads((p/'product-source-selections.json').read_text())['selections']

def product_source(e):
 selection=source_selections.get(e['slug'],{})
 selected=next((s for s in e['sources'] if s['id']==selection.get('sourceId')),None)
 if selected:
  current_scope=selected.get('verifiedScope')or selected.get('supports','')
  if selected['title']==selection.get('reviewedTitle') and current_scope==selection.get('reviewedScope') and selected['url']==selection.get('reviewedUrl') and selected['publisher']==selection.get('reviewedPublisher'):
   return {'productSource':selected['url'],'productSourceId':selected['id'],'productSourceNote':selection['selectionNote']}
 return {'productSource':'','productSourceId':'','productSourceNote':'未可靠匹配本型号直接史料；待人工核对，未使用来源列表首项或其他机型比较资料代替。'}

# The original 142-item request stays fixed when the museum later expands.
targets=[e for e in catalog if e['slug'] in source_selections]
assert all(e['slug'] not in before for e in targets)
assert len(targets)==142
reasons={
 'koss-sp3':'仅找到其他Koss型号等候选，不能用Porta Pro代替SP/3。',
 'logitech-mx-master-3':'可查照片主要是MX Master 2S或3S，未确认MX Master 3准确型号。',
 'samsung-t7-2020':'T7 Shield候选不等于2020年的普通T7。',
 'garmin-gps155-tso':'公开候选标明Prototype，不能当成GPS 155 TSO量产实物。',
 'microsoft-hololens-2':'HoloLens 2.jpeg实为2015首代；另一个Openverse索引的Microsoft HoloLens 2.webp原文件因许可问题已缺失，不能沿用缓存授权。',
 'samsung-galaxy-xr':'Project Moohan候选为2024年的展示原型，未核实商业款一致性。',
 'sony-ccd-v8':'候选为CCD-V8AF，不能未经证明代替CCD-V8。',
 'nintendo-virtual-boy-jp':'已找到日本店内原式Virtual Boy展示台实拍，但未见机身区域型号背标；日文展示架和拍摄地点不足以确认日本零售版本。',
 'sega-dreamcast-jp':'候选为北美机或混用PAL配件，未确认日本初售版。',
 'nest-learning-thermostat-1':'候选涉及二代、三代或Thermostat E，未确认首代。',
 'nest-protect-1':'有首代包装照片，机身候选的代际证据不足。',
 'philips-hue-2012':'尚未核实2012首代灯泡与圆形Bridge套装，不能混用后续Bridge。',
 'perkins-smart-brailler':'候选带功能箭头，为标注示意图，尚未确认为实物摄影。',
 'amazon-echo-1':'孤立白底候选尚未确认是实拍而非产品渲染图。',
 'asus-rog-xbox-ally-x':'一张署名为ROG Xbox Ally X的候选实际展示2023白色ROG Ally；已排除。',
 'valve-steam-machine-2026':'未核实候选实物属于Valve 2026款及其最终版本。',
}
round3_file=p/'round3/candidate-manifest.json'
round3={r['slug']:r for r in json.loads(round3_file.read_text())['records']} if round3_file.exists() else {}
records=[]
for e in targets:
 s=e['slug'];files=[f for f in [p/(s+suffix+'.json') for suffix in ['', '.second','.third','.fourth','.wiki','.direct','.round2','.wordpress-round2','.flickr-round2','.openverse-round2']] if f.exists()]
 research=[{'file':str(f.relative_to(root)),'query':(d:=json.loads(f.read_text())).get('query'),'candidateCount':len(d.get('candidates',d.get('results',[]))),'error':d.get('error')} for f in files]
 latest=round3.get(s)
 if latest:
  research.append({'file':latest['researchFile'],'query':latest['query'],'candidateCount':latest.get('returned',0),'error':latest.get('error')})
  wordpress=latest.get('phase2WordPress')
  if wordpress:
   research.append({'file':str(pathlib.Path(wordpress['researchFile']).relative_to(root)) if pathlib.Path(wordpress['researchFile']).is_absolute() else wordpress['researchFile'],'query':wordpress['query'],'candidateCount':len(wordpress.get('photoPages',[])),'error':wordpress.get('error')})
 r={'slug':s,'name':e['name'],'brand':e['brand'],'regionVersion':e.get('regionVersion',''),**product_source(e),'research':research}
 if s in new:
  assert images[s]['path']==new[s]['path']
  r.update(status='published',**{k:new[s].get(k,'') for k in ['caption','creator','license','licenseUrl','sourcePage','modelVerification','mediaKind','path','outputSha256']})
 else:
  r.update(status='pending-verified-photograph',reason=reasons.get(s,'在已核查候选中，尚未确认同时符合准确型号、实物摄影与可复用授权的图片。'),nextAction='补充准确型号的自摄照片，或取得原作者明确的可复用许可与型号证据。')
  if s in choices:r['rejectedOrPendingChoice']={k:choices[s].get(k) for k in ['title','researchFile','status','visualReview']}
 if s in choices and choices[s].get('rejectedCandidate'):r['rejectedCandidate']=choices[s]['rejectedCandidate']
 if latest:r['latestResearchNote']=latest.get('obstacle','')
 records.append(r)
assert len(new)==sum(r['status']=='published' for r in records)
for s,m in before.items():assert images[s]==m
summary={'checkedOn':imported['checkedOn'],'requested':142,'newlyIllustrated':len(new),'newPhotographs':sum(r.get('mediaKind')=='photograph' for r in records),'licensedVideoFrames':sum(r.get('mediaKind')=='licensed-video-frame' for r in records),'pending':142-len(new),'existingIllustratedProducts':sum(e['slug'] in before for e in catalog),'totalIllustratedProducts':sum(e['slug'] in images for e in catalog),'allRequestedComplete':len(new)==142,'records':records}
(p/'review-ledger.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
fields={'slug':'产品标识','name':'产品名称','regionVersion':'型号与版本','status':'核查状态','caption':'照片说明','creator':'作者','license':'许可','sourcePage':'图片原出处','licenseUrl':'许可原文','reason':'待补原因','latestResearchNote':'本轮研究记录','productSource':'产品史料','productSourceId':'产品史料ID','productSourceNote':'史料选择说明'}
with (p/'photo-review-ledger.csv').open('w',encoding='utf-8-sig',newline='')as f:
 writer=csv.DictWriter(f,fieldnames=list(fields.values()));writer.writeheader();writer.writerows({label:('已补入' if r.get(key)=='published' else '待补') if key=='status' else r.get(key,'') for key,label in fields.items()} for r in records)
print(json.dumps({k:v for k,v in summary.items() if k!='records'},ensure_ascii=False))
