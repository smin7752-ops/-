# APK(zip) 묶기: resources.arsc 와 png 는 압축 없이 4바이트 정렬 (안드로이드 11+ 요구사항)
import zipfile, os, glob, struct
G='../public/ninja'
files=[('AndroidManifest.xml','AndroidManifest.xml',True),('resources.arsc','resources.arsc',False),
       ('classes.dex','classes.dex',True),('ic_launcher.png','res/drawable/ic_launcher.png',False),
       ('app_index.html','assets/index.html',True)]
# 그림을 페이지 안에 data: 주소로 넣는다 → WebView 가 file:// 그림의 픽셀 읽기를 막는 문제를 피한다
import base64, json
amap={os.path.basename(f):'data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob(f'{G}/assets/*.webp'))}
html=open(f'{G}/index.html',encoding='utf-8').read().replace('<body>','<body>\n<script>window.ASSET_MAP='+json.dumps(amap)+';</script>',1)
open('app_index.html','w',encoding='utf-8').write(html)
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
