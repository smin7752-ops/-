# 안드로이드 바이너리 AndroidManifest.xml 인코더 (aapt2 없이 직접 작성)
import struct
ANDROID_NS='http://schemas.android.com/apk/res/android'
ATTR_ID={'theme':0x01010000,'label':0x01010001,'icon':0x01010002,'name':0x01010003,'exported':0x01010010,
 'screenOrientation':0x0101001e,'configChanges':0x0101001f,'minSdkVersion':0x0101020c,'versionCode':0x0101021b,
 'versionName':0x0101021c,'targetSdkVersion':0x01010270,'hardwareAccelerated':0x010102d3,'roundIcon':0x0101052c}
T_REF,T_STR,T_DEC,T_HEX,T_BOOL=0x01,0x03,0x10,0x11,0x12
def build(root):
    attrs_used=[]
    def walk(e):
        for a in e[1]:
            if a[0]=='android' and a[1] not in attrs_used: attrs_used.append(a[1])
        for c in e[2]: walk(c)
    walk(root)
    attrs_used.sort(key=lambda n:ATTR_ID[n])
    strings=list(attrs_used)
    def si(s):
        if s not in strings: strings.append(s)
        return strings.index(s)
    for s in ['android',ANDROID_NS]: si(s)
    body=b''
    def attr_bytes(e):
        out=[]
        for ns,name,typ,val in sorted(e[1],key=lambda a:(ATTR_ID.get(a[1],0xffffffff) if a[0]=='android' else 0xffffffff)):
            nsi=si(ANDROID_NS) if ns=='android' else 0xffffffff
            ni=si(name)
            if typ==T_STR: raw=si(val); data=raw
            else: raw=0xffffffff; data=val
            out.append(struct.pack('<IIIHBBI',nsi,ni,raw,8,0,typ,data&0xffffffff))
        return out
    chunks=[]
    def emit(e,line=[1]):
        at=attr_bytes(e)
        name=si(e[0])
        hdr=struct.pack('<IIIIHHHHHH',line[0],0xffffffff,0xffffffff,name,20,20,len(at),0,0,0)
        data=hdr[:8]+hdr[8:]
        chunk=struct.pack('<HHI',0x0102,16,16+20+20*len(at))+struct.pack('<II',line[0],0xffffffff)+struct.pack('<IIHHHHHH',0xffffffff,name,20,20,len(at),0,0,0)+b''.join(at)
        chunks.append(chunk); line[0]+=1
        for c in e[2]: emit(c,line)
        chunks.append(struct.pack('<HHIIIII',0x0103,16,24,line[0],0xffffffff,0xffffffff,name)); line[0]+=1
    emit(root)
    ns_start=struct.pack('<HHIIIII',0x0100,16,24,0,0xffffffff,si('android'),si(ANDROID_NS))
    ns_end=struct.pack('<HHIIIII',0x0101,16,24,0,0xffffffff,si('android'),si(ANDROID_NS))
    # string pool (UTF-16)
    offs=[];blob=b''
    for s in strings:
        offs.append(len(blob)); enc=s.encode('utf-16-le'); blob+=struct.pack('<H',len(s))+enc+b'\0\0'
    while len(blob)%4: blob+=b'\0'
    sp_hdr=28; start=sp_hdr+4*len(strings)
    sp=struct.pack('<HHIIIIII',0x0001,28,start+len(blob),len(strings),0,0,start,0)+b''.join(struct.pack('<I',o) for o in offs)+blob
    rm=struct.pack('<HHI',0x0180,8,8+4*len(attrs_used))+b''.join(struct.pack('<I',ATTR_ID[n]) for n in attrs_used)
    xml=sp+rm+ns_start+b''.join(chunks)+ns_end
    return struct.pack('<HHI',0x0003,8,8+len(xml))+xml
A=lambda n,t,v:('android',n,t,v)
P=lambda n,t,v:('',n,t,v)
manifest=('manifest',[P('package',T_STR,'com.shadowshuriken.game'),A('versionCode',T_DEC,3),A('versionName',T_STR,'1.2')],[
  ('uses-sdk',[A('minSdkVersion',T_DEC,24),A('targetSdkVersion',T_DEC,34)],[]),
  ('uses-permission',[A('name',T_STR,'android.permission.INTERNET')],[]),
  ('application',[A('label',T_STR,'그림자 수리검'),A('icon',T_REF,0x7f010000),A('theme',T_REF,0x01030007),A('hardwareAccelerated',T_BOOL,0xffffffff)],[
    ('activity',[A('name',T_STR,'com.shadowshuriken.game.MainActivity'),A('exported',T_BOOL,0xffffffff),A('screenOrientation',T_DEC,1),A('configChanges',T_HEX,0x4a0)],[
      ('intent-filter',[],[('action',[A('name',T_STR,'android.intent.action.MAIN')],[]),('category',[A('name',T_STR,'android.intent.category.LAUNCHER')],[])])])])])
open('AndroidManifest.xml','wb').write(build(manifest))
print('manifest bytes',len(open('AndroidManifest.xml','rb').read()))
