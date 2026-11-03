"""يولّد أيقونات الموقع والأندرويد (نجمة ثمانية على خلفية خضراء مزرقة)."""
import math, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = 4  # تنعيم الحواف

def star_pts(cx, cy, R, r, n=8):
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n - math.pi / 2
        rad = R if i % 2 == 0 else r
        pts.append((cx + math.cos(a) * rad, cy + math.sin(a) * rad))
    return pts

def gradient(size, c1, c2):
    img = Image.new("RGB", (size, size), c1)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img

def emblem(size, scale=1.0, bg=True, mono=False):
    """نجمة ذهبية كبيرة وداخلها نجمة أصغر. scale يتحكم بالحجم داخل الإطار الآمن."""
    S = size * SS
    base = gradient(S, (15, 106, 104), (8, 47, 49)).convert("RGBA") if bg else Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    c = S / 2
    R = S * 0.36 * scale
    if mono:
        d.polygon(star_pts(c, c, R, R * 0.62), fill=(255, 255, 255, 255))
        d.polygon(star_pts(c, c, R * 0.52, R * 0.32), fill=(0, 0, 0, 0))
        # ثقب داخلي شفاف
        hole = Image.new("L", (S, S), 255)
        ImageDraw.Draw(hole).polygon(star_pts(c, c, R * 0.5, R * 0.31), fill=0)
        a = base.split()[3]
        base.putalpha(Image.composite(a, Image.new("L", (S, S), 0), hole))
    else:
        gold, gold2 = (228, 185, 92, 255), (233, 199, 120, 255)
        d.polygon(star_pts(c, c, R, R * 0.62), fill=gold)
        d.polygon(star_pts(c, c, R * 0.74, R * 0.46), fill=(10, 71, 73, 255))
        d.polygon(star_pts(c, c, R * 0.50, R * 0.31), fill=gold2)
    return base.resize((size, size), Image.LANCZOS)

def save(img, *parts):
    p = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, optimize=True)

# ---- الموقع ----
save(emblem(192).convert("RGB"), "www", "icons", "icon-192.png")
save(emblem(512).convert("RGB"), "www", "icons", "icon-512.png")
save(emblem(512, scale=0.82).convert("RGB"), "www", "icons", "icon-maskable-512.png")
save(emblem(512).convert("RGB"), "store", "icon-512.png")

# ---- الأندرويد ----
res = os.path.join("android-res")
for name, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    full = emblem(px).convert("RGBA")
    save(full, res, f"mipmap-{name}", "ic_launcher.png")
    mask = Image.new("L", (px * SS, px * SS), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, px * SS - 1, px * SS - 1), fill=255)
    mask = mask.resize((px, px), Image.LANCZOS)
    rnd = Image.new("RGBA", (px, px), (0, 0, 0, 0)); rnd.paste(full, (0, 0), mask)
    save(rnd, res, f"mipmap-{name}", "ic_launcher_round.png")
for name, px in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]:
    save(emblem(px, scale=0.62, bg=False), res, f"mipmap-{name}", "ic_launcher_foreground.png")
for name, px in [("mdpi", 24), ("hdpi", 36), ("xhdpi", 48), ("xxhdpi", 72), ("xxxhdpi", 96)]:
    save(emblem(px, scale=1.2, bg=False, mono=True), res, f"drawable-{name}", "ic_stat_name.png")

os.makedirs(os.path.join(ROOT, res, "mipmap-anydpi-v26"), exist_ok=True)
for n in ("ic_launcher", "ic_launcher_round"):
    open(os.path.join(ROOT, res, "mipmap-anydpi-v26", n + ".xml"), "w").write(
        '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
os.makedirs(os.path.join(ROOT, res, "values"), exist_ok=True)
open(os.path.join(ROOT, res, "values", "ic_launcher_background.xml"), "w").write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0A4749</color>\n</resources>\n')
print("ok")
