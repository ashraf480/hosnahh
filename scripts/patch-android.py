"""يعدّل مشروع الأندرويد المولَّد بواسطة `npx cap add android`:
أيقونات، صلاحيات التنبيه، اسم التطبيق، رقم الإصدار، وتوقيع الإصدار.
المتغيرات: VERSION_NAME, VERSION_CODE (اختياري)."""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "android", "app")
RES = os.path.join(APP, "src", "main", "res")

def fail(msg):
    print("خطأ:", msg); sys.exit(1)

if not os.path.isdir(APP):
    fail("مشروع الأندرويد غير موجود. شغّل: npx cap add android")

# 1) الأيقونات
src = os.path.join(ROOT, "android-res")
for d in ("drawable-v24", "drawable"):
    for f in ("ic_launcher_foreground.xml", "ic_launcher_background.xml"):
        p = os.path.join(RES, d, f)
        if os.path.exists(p): os.remove(p)
for base, _, files in os.walk(src):
    for f in files:
        rel = os.path.relpath(os.path.join(base, f), src)
        dst = os.path.join(RES, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(base, f), dst)

# 2) الصلاحيات
mpath = os.path.join(APP, "src", "main", "AndroidManifest.xml")
m = open(mpath, encoding="utf-8").read()
perms = ["POST_NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED", "SCHEDULE_EXACT_ALARM", "VIBRATE", "WAKE_LOCK"]
add = "".join(f'    <uses-permission android:name="android.permission.{p}" />\n' for p in perms
              if f"android.permission.{p}" not in m)
if "</manifest>" not in m: fail("AndroidManifest غير متوقع")
m = m.replace("</manifest>", add + "</manifest>")
if "android:supportsRtl" not in m:
    m = m.replace("<application", '<application\n        android:supportsRtl="true"', 1)
open(mpath, "w", encoding="utf-8").write(m)

# 3) اسم التطبيق
spath = os.path.join(RES, "values", "strings.xml")
s = open(spath, encoding="utf-8").read()
s = re.sub(r'(<string name="app_name">).*?(</string>)', r"\1أسماء الله الحسنى\2", s)
s = re.sub(r'(<string name="title_activity_main">).*?(</string>)', r"\1أسماء الله الحسنى\2", s)
open(spath, "w", encoding="utf-8").write(s)

# 4) الإصدار والتوقيع
gpath = os.path.join(APP, "build.gradle")
g = open(gpath, encoding="utf-8").read()
vname = os.environ.get("VERSION_NAME", "1.0.0")
vcode = os.environ.get("VERSION_CODE", "1")
g, n1 = re.subn(r"versionCode\s+\d+", f"versionCode {vcode}", g)
g, n2 = re.subn(r'versionName\s+"[^"]*"', f'versionName "{vname}"', g)
if not (n1 and n2): fail("لم أجد versionCode/versionName في build.gradle")

signing = '''    signingConfigs {
        release {
            def ksFile = System.getenv("KEYSTORE_FILE")
            if (ksFile) {
                storeFile file(ksFile)
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
'''
if "signingConfigs" not in g:
    # أولًا: اربط كتلة release داخل buildTypes بالتوقيع (قبل إدراج signingConfigs
    # حتى لا يطابق التعبير كتلة release الموجودة داخل signingConfigs).
    bt = re.search(r"buildTypes\s*\{", g)
    if not bt: fail("لم أجد buildTypes في build.gradle")
    head, tail = g[:bt.end()], g[bt.end():]
    tail, n4 = re.subn(r"(release\s*\{)", r"\1\n            signingConfig signingConfigs.release", tail, count=1)
    if not n4: fail("لم أجد كتلة release في build.gradle")
    g = head + tail
    # ثانيًا: أدرج signingConfigs قبل buildTypes.
    g, n3 = re.subn(r"(\n[ \t]*)buildTypes\s*\{", "\n" + signing + r"\1buildTypes {", g, count=1)
    if not n3: fail("تعذّر إدراج signingConfigs")
open(gpath, "w", encoding="utf-8").write(g)
print(f"تم تعديل مشروع الأندرويد: {vname} ({vcode})")
