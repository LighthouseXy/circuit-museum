import json,re,urllib.request,urllib.parse,concurrent.futures,time,pathlib,html,sys
root=pathlib.Path(__file__).resolve().parent.parent
catalog=json.loads((root/'docs/collection.json').read_text())
images=json.loads((root/'src/image-overrides.json').read_text())
missing=[e for e in catalog['exhibits'] if e['slug'] not in images]
output=root/'docs/evidence/photo-expansion'
output.mkdir(parents=True,exist_ok=True)
queries={
'amazon-kindle-1':'Amazon Kindle first generation','ipad-1':'iPad 2010',
'macbook-air-m5-2026':'MacBook Air M5','xiaomi-smart-band-11-active':'Xiaomi Smart Band 11 Active',
'casio-f91w':'Casio F-91W','ibm-thinkpad-701c':'ThinkPad 701C','nokia-3310-2000':'Nokia 3310 2000',
'framework-laptop-13-2021':'Framework laptop 2021','toshiba-er4':'Toshiba ER-4','epson-ep101':'EP-101',
'roland-tr808':'Roland TR-808','roland-tb303':'Roland TB-303','hp-laserjet-1984':'HP LaserJet 1984',
'apple-newton-messagepad-1993':'Apple Newton Original MessagePad','teac-portastudio144':'Tascam 144',
'iomega-zip100':'Iomega Zip 100','sony-playstation-vr-cuh-zvr1':'PlayStation VR CUH-ZVR1',
'sony-playstation-2':'PlayStation 2 original','sony-playstation-3':'PlayStation 3 original',
'sony-playstation-4':'PlayStation 4 original','sony-playstation-5':'PlayStation 5',
'sony-playstation-vita':'PlayStation Vita PCH-1000','nintendo-switch-2017':'Nintendo Switch 2017',
'nintendo-game-watch-ball-1980':'Nintendo Game Watch Ball 1980','nintendo-virtual-boy-jp':'Nintendo Virtual Boy',
'sega-dreamcast-jp':'Sega Dreamcast','irobot-roomba-2002':'Roomba first generation',
'apple-airport-1999':'AirPort graphite','avm-fritzbox-2004':'FritzBox 2004',
'violet-nabaztag-v1':'Nabaztag original','kitchenaid-h5':'KitchenAid H-5','toastmaster-1a1':'Toastmaster 1A1',
'national-ec36':'National EC-36','sharp-r10':'Sharp R-10','omron-hem1':'Omron HEM-1',
'western-electric-500':'Western Electric 500','western-electric-picturephone-mod-ii':'Picturephone Mod II',
'canon-eos-5d-mark-ii':'Canon EOS 5D Mark II','kodak-dcs-1991':'Kodak DCS 100',
'humanware-victor-reader-stream-3':'Victor Reader Stream 3','nest-learning-thermostat-1':'Nest thermostat first generation',
'valve-steam-controller-2026':'Steam Controller 2026','valve-steam-machine-2026':'Steam Machine 2026',
'canon-ae-1':'Canon AE-1 -Program','nikon-f3':'Nikon F3 -HP',
}
def clean(v):return html.unescape(re.sub('<[^>]+>',' ',str(v))).strip()
second='--second' in sys.argv
third='--third' in sys.argv
fourth='--fourth' in sys.argv
terms={'koss-sp3':'SP/3','hamilton-pulsar-p1':'Pulsar P1','amazon-kindle-1':'Kindle','ipad-1':'iPad','macbook-air-m5-2026':'MacBook Air M5','framework-laptop-13-2021':'Framework laptop','roland-tr808':'TR-808','roland-tb303':'TB-303','teac-portastudio144':'Portastudio 144','hp-laserjet-1984':'LaserJet','apple-newton-messagepad-1993':'MessagePad','iomega-zip100':'Zip 100','logitech-k380-2015':'K380','kobo-touch-2011':'Kobo Touch','samsung-t7-2020':'Samsung T7','sony-playstation-vr-cuh-zvr1':'PlayStation VR','sony-playstation-vita':'PlayStation Vita','nintendo-game-watch-ball-1980':'Game Watch Ball','irobot-roomba-2002':'Roomba','apple-airport-1999':'AirPort','avm-fritzbox-2004':'FRITZ!Box','tomtom-go-2004':'TomTom GO','violet-nabaztag-v1':'Nabaztag','western-electric-500':'Western Electric 500','hoover-constellation-444':'Hoover Constellation','motorola-pageboy-i':'Pageboy','western-electric-picturephone-mod-ii':'Picturephone','magellan-nav1000':'Magellan NAV','garmin-gps155-tso':'Garmin GPS 155','samsung-the-frame-ls003':'Samsung Frame','samsung-the-sero-ls05t':'Samsung Sero','lg-signature-oled-r-rx':'LG OLED R','samsung-the-freestyle-2022':'Samsung Freestyle','lg-stanbyme-go-27lx5qkna':'StanbyME Go','lg-oled-evo-m5-65':'LG M5','samsung-micro-rgb-r95h-65':'Samsung R95H','htc-vive-2016':'HTC Vive','sony-betamax-sl-6300':'SL-6300','kodak-dcs-1991':'Kodak DCS','sony-access-controller':'PlayStation Access','nest-learning-thermostat-1':'Nest Thermostat','perkins-smart-brailler':'Smart Brailler','philips-hue-2012':'Philips Hue','nest-protect-1':'Nest Protect','amazon-echo-1':'Amazon Echo','google-home-2016':'Google Home','humanware-victor-reader-stream-3':'Victor Reader Stream','switchbot-s10':'SwitchBot S10','sony-playstation-portal':'PlayStation Portal','asus-rog-ally-2023':'ROG Ally','lenovo-legion-go-2023':'Legion Go','msi-claw-a1m':'MSI Claw','valve-steam-controller-2015':'Steam Controller','valve-steam-controller-2026':'Steam Controller 2026','valve-steam-machine-2026':'Steam Machine 2026','dji-phantom-2013':'DJI Phantom','insta360-x5':'Insta360 X5'}
def search(e):
 path=output/(e['slug']+('.fourth' if fourth else '.third' if third else '.second' if second else '')+'.json')
 if path.exists():
  cached=json.loads(path.read_text())
  if not cached.get('error'):return cached
 q=queries.get(e['slug'])
 if not q:
  brand={'Hewlett-Packard':'HP','Sony Interactive Entertainment':'Sony','东京芝浦电气（Toshiba）':'Toshiba','TEAC / Tascam':'Tascam'}.get(e['brand'],e['brand'])
  name=re.sub(r'（[^）]*）|\([^)]*\)',' ',e['name'])
  name=re.sub(r'[\u3400-\u9fff]',' ',name)
  q=(brand+' '+name).strip()
 if second:
  term=terms.get(e['slug']) or re.sub(r'[\u3400-\u9fff]|（[^）]*）|\([^)]*\)','',e['name']).strip()
  q='intitle:"'+term+'"'
 if third:
  term=terms.get(e['slug']) or re.sub(r'[\u3400-\u9fff]|（[^）]*）|\([^)]*\)','',e['name']).strip()
  if e['slug']=='hamilton-pulsar-p1':q='Hamilton Pulsar gold P1'
  elif e['slug']=='koss-sp3':q='Koss "SP/3"'
  elif e['slug']=='htc-vive-2016':q='HTC Vive -intitle:Pro -intitle:Pre -2015'
  elif e['slug']=='nikon-f3':q='Nikon F3 -intitle:HP -intitle:DCS'
  elif e['slug']=='logitech-mx-master-3':q='Logitech "MX Master 3"'
  elif e['slug']=='hp-laserjet-1984':q='HP LaserJet "1984"'
  else:q=e['brand']+' "'+term+'"'
 if fourth:
  term=terms.get(e['slug']) or re.sub(r'[\u3400-\u9fff]|（[^）]*）|\([^)]*\)','',e['name']).strip()
  term=term.replace('原版','').strip()
  q=' AND '.join('"'+part+'"' for part in term.split())
  if e['slug']=='canon-xl1':q='Canon AND XL1'
  elif e['slug']=='braun-hl1':q='Braun AND HL1'
  elif e['slug']=='sony-aibo-ers110':q='Aibo AND "ERS-110"'
  elif e['slug']=='teac-portastudio144':q='Tascam AND 144'
  elif e['slug']=='toshiba-er4':q='Toshiba AND "ER-4"'
  elif e['slug']=='hamilton-pulsar-p1':q='Pulsar AND "P1"'
  elif e['slug']=='sony-kv-1310':q='Sony AND "KV-1310"'
 params={'action' :'query','format':'json','generator':'search','gsrsearch':q,'gsrnamespace':'6','gsrlimit':'8','prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':'960'}
 req=urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params),headers={'User-Agent':'CircuitMuseum/1.0 (public model-photo attribution research)'})
 result={'slug':e['slug'],'name':e['name'],'regionVersion':e.get('regionVersion'),'query':q,'checkedOn':'2026-10-13','candidates':[]}
 for attempt in range(3):
  try:
   data=json.load(urllib.request.urlopen(req,timeout=35))
   if 'error' in data:raise ValueError(str(data['error']))
   for p in sorted(data.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',0)):
    if not p.get('imageinfo'):continue
    info=p['imageinfo'][0];meta=info.get('extmetadata',{})
    result['candidates'].append({'title':p['title'],'pageid':p['pageid'],'sourcePage':info['descriptionurl'],'original':info['url'],'thumbnail':info.get('thumburl'),'metadata':meta,'description':clean(meta.get('ImageDescription',{}).get('value','')),'artist':clean(meta.get('Artist',{}).get('value','')),'license':meta.get('LicenseShortName',{}).get('value',''),'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'date':clean(meta.get('DateTimeOriginal',{}).get('value',''))})
   break
  except Exception as err:
   if attempt==2:result['error']=str(err)
   else:time.sleep(max(int(getattr(err,'headers',{}).get('Retry-After','8')),12))
 path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 time.sleep(9)
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
 results=list(pool.map(search,missing))
(output/('research-index-fourth.json' if fourth else 'research-index-third.json' if third else 'research-index-second.json' if second else 'research-index.json')).write_text(json.dumps({'checkedOn':'2026-10-13','requestedProducts':len(missing),'items':[{'slug':r['slug'],'query':r['query'],'candidates':len(r['candidates']),'error':r.get('error')} for r in results]},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'requested':len(missing),'withCandidates':sum(bool(r['candidates'])for r in results),'errors':sum('error'in r for r in results)}))
