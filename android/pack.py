# APK(zip) 묶기: resources.arsc 와 png 는 압축 없이 4바이트 정렬 (안드로이드 11+ 요구사항)
import zipfile, os, glob, struct
G='../public/ninja'
files=[('AndroidManifest.xml','AndroidManifest.xml',True),('resources.arsc','resources.arsc',False),
       ('classes.dex','classes.dex',True),('ic_launcher.png','res/drawable/ic_launcher.png',False),
       (f'{G}/index.html','assets/index.html',True)]
for f in sorted(glob.glob(f'{G}/assets/*.webp')): files.append((f,'assets/assets/'+os.path.basename(f),False))
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
