# 아이콘 하나(@drawable/ic_launcher = 0x7f010000)만 있는 resources.arsc 직접 작성
import struct
def pool(strings):
    offs=[];blob=b''
    for s in strings:
        offs.append(len(blob)); blob+=struct.pack('<H',len(s))+s.encode('utf-16-le')+b'\0\0'
    while len(blob)%4: blob+=b'\0'
    start=28+4*len(strings)
    return struct.pack('<HHIIIIII',0x0001,28,start+len(blob),len(strings),0,0,start,0)+b''.join(struct.pack('<I',o) for o in offs)+blob
gpool=pool(['res/drawable/ic_launcher.png'])
tpool=pool(['drawable']); kpool=pool(['ic_launcher'])
spec=struct.pack('<HHIBBHI',0x0202,16,16+4,1,0,0,1)+struct.pack('<I',0)
cfg=struct.pack('<I',64)+b'\0'*60
thdr=8+1+1+2+4+4+64
entry=struct.pack('<HHI',8,0,0)+struct.pack('<HBBI',8,0,0x03,0)
typ=struct.pack('<HHIBBHII',0x0201,thdr,thdr+4+len(entry),1,0,0,1,thdr+4)+cfg+struct.pack('<I',0)+entry
name='com.shadowshuriken.game'.encode('utf-16-le').ljust(256,b'\0')
phdr=288
pkg_body=tpool+kpool+spec+typ
pkg=struct.pack('<HHII',0x0200,phdr,phdr+len(pkg_body),0x7f)+name+struct.pack('<IIIII',phdr,1,phdr+len(tpool),1,0)+pkg_body
res=gpool+pkg
open('resources.arsc','wb').write(struct.pack('<HHII',0x0002,12,12+len(res),1)+res)
print('arsc',len(open('resources.arsc','rb').read()))
