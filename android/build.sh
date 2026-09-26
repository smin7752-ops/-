#!/usr/bin/env bash
# 그림자 수리검 안드로이드 APK 빌드 (Android SDK 없이 Maven Central 도구만 사용)
# 결과: ../public/ninja/shadow-shuriken.apk
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p tools out
M=https://repo1.maven.org/maven2
[ -f tools/android.jar ] || curl -sSfo tools/android.jar $M/com/google/android/android/4.1.1.4/android-4.1.1.4.jar
[ -f tools/dx.jar ]      || curl -sSfo tools/dx.jar $M/com/google/android/tools/dx/1.7/dx-1.7.jar
[ -f tools/apksig.jar ]  || curl -sSfo tools/apksig.jar $M/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar

# 1) 자바 → 클래스 → dex (dx 1.7 은 자바 6 형식까지만 읽어서 버전 번호만 50으로 낮춘다)
rm -rf out/* && javac --release 8 -cp tools/android.jar -d out src/com/shadowshuriken/game/MainActivity.java
python3 -c "import glob
for f in glob.glob('out/**/*.class',recursive=True):
    b=bytearray(open(f,'rb').read()); b[6]=0; b[7]=50; open(f,'wb').write(b)"
java -cp tools/dx.jar com.android.dx.command.Main --dex --output=classes.dex out

# 2) 매니페스트 · 리소스(아이콘) · 묶기
python3 axml.py && python3 arsc.py && python3 pack.py

# 3) v2 서명 + 검증 (ninja.p12 는 이 게임 전용 키: 업데이트 설치하려면 같은 키가 필요)
J="java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED --add-exports java.base/sun.security.util=ALL-UNNAMED -cp tools/apksig.jar:."
javac -cp tools/apksig.jar Sign.java Verify.java
rm -f ../public/ninja/shadow-shuriken.apk
$J Sign unsigned.apk ../public/ninja/shadow-shuriken.apk ninja.p12
$J Verify ../public/ninja/shadow-shuriken.apk
rm -f unsigned.apk classes.dex AndroidManifest.xml resources.arsc app_index.html *.class
