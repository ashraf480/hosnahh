#!/usr/bin/env bash
# يولّد مفتاح توقيع التطبيق مرة واحدة فقط. احتفظ به: بدونه لن تستطيع تحديث التطبيق على APKPure.
# الاستخدام: bash scripts/make-keystore.sh
set -euo pipefail
command -v keytool >/dev/null || { echo "ثبّت JDK أولًا (keytool غير موجود)"; exit 1; }

read -r -s -p "اختر كلمة مرور للمفتاح (6 أحرف فأكثر): " PASS; echo
[ ${#PASS} -ge 6 ] || { echo "كلمة المرور قصيرة"; exit 1; }
ALIAS=asma
FILE=asma-release.jks

keytool -genkeypair -v -keystore "$FILE" -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 36500 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=Asma Allah Al-Husna, O=Asma, C=EG"

base64 -w0 "$FILE" > keystore.b64 2>/dev/null || base64 "$FILE" | tr -d '\n' > keystore.b64

cat <<MSG

تم إنشاء: $FILE
أضف هذه الأسرار في GitHub: Settings → Secrets and variables → Actions → New repository secret

  KEYSTORE_BASE64    = محتوى الملف keystore.b64 كاملًا
  KEYSTORE_PASSWORD  = كلمة المرور التي كتبتها
  KEY_ALIAS          = $ALIAS
  KEY_PASSWORD       = كلمة المرور نفسها

احفظ نسخة من $FILE وكلمة المرور في مكان آمن خارج GitHub، ولا ترفعهما إلى المستودع.
MSG
