# APK(zip) 묶기: resources.arsc 와 png 는 압축 없이 4바이트 정렬 (안드로이드 11+ 요구사항)
import zipfile, os, glob, struct
G='../public/ninja'
files=[('AndroidManifest.xml','AndroidManifest.xml',True),('resources.arsc','resources.arsc',False),
       ('classes.dex','classes.dex',True),('ic_launcher.png','res/drawable/ic_launcher.png',False),
       ('app_index.html','assets/index.html',True),('splash.html','assets/splash.html',True)]
# 그림을 페이지 안에 data: 주소로 넣는다 → WebView 가 file:// 그림의 픽셀 읽기를 막는 문제를 피한다
import base64, json
amap={os.path.basename(f):'data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob(f'{G}/assets/[fm]_*.webp')+glob.glob(f'{G}/assets/i[fm]01.webp'))}  # 기본 그림만 넣고, 세트 모션은 인터넷에서 받는다
html=open(f'{G}/index.html',encoding='utf-8').read().replace('<body>','<body>\n<script>window.ASSET_MAP='+json.dumps(amap)+';</script>',1)
open('app_index.html','w',encoding='utf-8').write(html)
# 켜자마자 보이는 첫 화면: 게임 로딩 화면과 똑같은 그림이라 최신 버전을 받는 동안에도 자연스럽게 이어진다
sp='data:image/webp;base64,'+base64.b64encode(open('splash.webp','rb').read()).decode()
open('splash.html','w',encoding='utf-8').write('''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>html,body{margin:0;height:100%;background:#0b0a17}
.s{position:fixed;inset:0;background:#0b0a17 url(%s) center top/cover no-repeat}
@media (min-aspect-ratio:941/1672){.s{background-size:auto 100%%}.b{bottom:3%%!important}}
.b{position:absolute;left:50%%;bottom:max(7%%,24px);transform:translateX(-50%%);width:min(74%%,420px);text-align:center;font:15px sans-serif;color:#f3e4c4;text-shadow:0 2px 4px #000}
.bar{margin:10px auto 0;height:10px;border-radius:6px;background:rgba(255,255,255,.08);border:1px solid rgba(214,168,90,.55);overflow:hidden}
.bar i{display:block;height:100%%;width:30%%;background:linear-gradient(90deg,#b8322a,#f0b44a);animation:m 1.2s ease-in-out infinite alternate}
@keyframes m{from{margin-left:0}to{margin-left:70%%}}</style></head>
<body><div class="s"><div class="b">최신 버전 확인 중…<div class="bar"><i></i></div></div></div></body></html>''' % sp)
with zipfile.ZipFile('unsigned.apk','w') as z:
    for src,arc,comp in files:
        data=open(src,'rb').read()
        zi=zipfile.ZipInfo(arc,(2020,1,1,0,0,0))
        zi.compress_type=zipfile.ZIP_DEFLATED if comp else zipfile.ZIP_STORED
        if not comp:
            off=z.fp.tell()+30+len(arc.encode())
            pad=(-(off+4))%4
            zi.extra=struct.pack('<HH',0xD935,pad)+b'\0'*pad
        z.writestr(zi,data)
print(os.path.getsize('unsigned.apk'))
