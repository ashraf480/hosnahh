// ينسخ الخطوط العربية من حزم @fontsource إلى www/fonts ويكتب fonts.css
// الاستخدام: npm install && npm run fonts
import { readdirSync, copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www', 'fonts');
mkdirSync(out, { recursive: true });

const families = [
  { pkg: 'amiri', name: 'Amiri', weights: [400, 700] },
  { pkg: 'aref-ruqaa', name: 'Aref Ruqaa', weights: [400, 700] },
  { pkg: 'tajawal', name: 'Tajawal', weights: [400, 500, 700] }
];

let css = '/* مُولَّد آليًا بواسطة scripts/build-fonts.mjs */\n';
for (const f of families) {
  const dir = join(root, 'node_modules', '@fontsource', f.pkg, 'files');
  if (!existsSync(dir)) throw new Error('الحزمة غير مثبتة: @fontsource/' + f.pkg + ' (شغّل npm install)');
  const files = readdirSync(dir);
  for (const w of f.weights) {
    const src = files.find((n) => n === `${f.pkg}-arabic-${w}-normal.woff2`);
    if (!src) throw new Error(`لم يوجد ملف الخط ${f.pkg} بوزن ${w}`);
    copyFileSync(join(dir, src), join(out, src));
    css += `@font-face{font-family:"${f.name}";font-style:normal;font-weight:${w};font-display:swap;src:url("${src}") format("woff2");}\n`;
  }
}
writeFileSync(join(out, 'fonts.css'), css);
console.log('تم نسخ الخطوط وكتابة fonts.css');
