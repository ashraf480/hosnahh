/* إنشاء ملف PDF محليًا بدون مكتبات خارجية.
   تُرسم كل صفحة على canvas (فيستفيد النص العربي من تشكيل المتصفح)،
   ثم تُجمع الصفحات صورًا JPEG داخل ملف PDF بسيط. */
(function () {
  'use strict';

  var W = 1050, H = 1485;               // نسبة A4
  var MX = 70, TOP = 78, BOTTOM = H - 96;
  var CW = W - MX * 2, XR = W - MX;
  var F_TEXT = '"Amiri","Noto Naskh Arabic","Droid Arabic Naskh","FreeSerif",serif';
  var F_DISP = '"Aref Ruqaa","Amiri","Noto Naskh Arabic","Droid Arabic Naskh","FreeSerif",serif';
  var F_UI = '"Tajawal","Noto Sans Arabic","Noto Naskh Arabic","Droid Arabic Naskh","DejaVu Sans",sans-serif';
  var INK = '#14282a', MUTED = '#5a6f70', GOLD = '#8a5d0c', LINE = '#c9d6d2', SOFT = '#edf3f0';
  var SRC = { Q: 'ثابت في القرآن', S: 'ثابت في السنة', T: 'ورد في رواية الترمذي' };
  var KINDS = ['علميًّا', 'قلبيًّا', 'عمليًّا'];

  function ar(n) { try { return Number(n).toLocaleString('ar-EG'); } catch (e) { return String(n); } }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var list = ['700 70px "Aref Ruqaa"', '400 24px "Amiri"', '700 24px "Amiri"', '400 20px "Tajawal"', '700 20px "Tajawal"'];
    return Promise.all(list.map(function (f) { return document.fonts.load(f, 'أسماء الله الحسنى').catch(function () {}); }));
  }

  function setup(ctx) { ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function star(ctx, cx, cy, R, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = Math.PI * i / n - Math.PI / 2, rad = i % 2 ? r : R;
      var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function pattern(ctx, x, y, w, h, alpha, size) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')'; ctx.lineWidth = 1.4;
    for (var py = y - size / 2; py < y + h + size; py += size) {
      for (var px = x - size / 2; px < x + w + size; px += size) {
        star(ctx, px + size / 2, py + size / 2, size * .46, size * .27, 8); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- صفحة جديدة ---------- */
  function newPage(state) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    setup(ctx);
    state.canvas = c; state.ctx = ctx; state.y = TOP; state.n += 1;
    // تذييل
    ctx.fillStyle = MUTED; ctx.font = '400 20px ' + F_UI; ctx.textAlign = 'center';
    ctx.fillText('أسماء الله الحسنى  ·  ' + ar(state.n), W / 2, H - 44);
    ctx.fillStyle = LINE; ctx.fillRect(MX, H - 74, CW, 1.5);
    ctx.textAlign = 'right';
    return ctx;
  }

  function flush(state, pages) {
    return new Promise(function (resolve, reject) {
      state.canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('toBlob')); return; }
        var fr = new FileReader();
        fr.onload = function () {
          pages.push({ bytes: new Uint8Array(fr.result), w: W, h: H });
          state.canvas.width = 0; state.canvas = null;
          resolve();
        };
        fr.onerror = reject;
        fr.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.84);
    });
  }

  /* ---------- الغلاف ---------- */
  function cover(state, items, total) {
    var ctx = newPage(state);
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0f6a68'); g.addColorStop(1, '#082f31');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    pattern(ctx, 0, 0, W, H, 0.09, 110);
    // إطار
    ctx.strokeStyle = 'rgba(228,185,92,.85)'; ctx.lineWidth = 3;
    rrect(ctx, 46, 46, W - 92, H - 92, 22); ctx.stroke();
    ctx.lineWidth = 1.2; rrect(ctx, 62, 62, W - 124, H - 124, 16); ctx.stroke();
    // نجمة كبيرة
    ctx.fillStyle = 'rgba(228,185,92,.18)'; ctx.strokeStyle = '#e4b95c'; ctx.lineWidth = 3;
    star(ctx, W / 2, 520, 190, 118, 8); ctx.fill(); ctx.stroke();
    star(ctx, W / 2, 520, 120, 74, 8); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    ctx.font = '700 150px ' + F_DISP; ctx.fillText('أسماء الله', W / 2, 860);
    ctx.fillStyle = '#e9c778'; ctx.fillText('الحسنى', W / 2, 1010);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '500 32px ' + F_UI;
    ctx.fillText('المعنى · كيفية التعبد · الدعاء', W / 2, 1100);
    ctx.font = '400 28px ' + F_UI; ctx.fillStyle = 'rgba(255,255,255,.75)';
    var cnt = items.length === total ? 'الأسماء كاملة: ' + ar(total) + ' اسمًا' : 'مختارات: ' + ar(items.length) + ' من ' + ar(total) + ' اسمًا';
    ctx.fillText(cnt, W / 2, 1180);
    var d = '';
    try { d = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) {}
    if (d) ctx.fillText(d, W / 2, 1230);
    ctx.font = '400 24px ' + F_TEXT; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText('﴿ وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا ﴾', W / 2, 1340);
    // لا تذييل على الغلاف
    ctx.textAlign = 'right';
  }

  /* ---------- الفهرس ---------- */
  function indexPages(state, items, pages) {
    var cols = 3, rowH = 52, per = Math.floor((BOTTOM - TOP - 100) / rowH) * cols;
    var chain = Promise.resolve();
    for (var s = 0; s < items.length; s += per) {
      (function (start) {
        chain = chain.then(function () {
          var ctx = newPage(state);
          ctx.fillStyle = INK; ctx.font = '700 54px ' + F_DISP; ctx.textAlign = 'right';
          if (start === 0) ctx.fillText('الفهرس', XR, TOP + 56);
          var part = items.slice(start, start + per), rows = Math.ceil(part.length / cols);
          var colW = CW / cols;
          part.forEach(function (it, k) {
            var col = Math.floor(k / rows), row = k % rows;
            var x = XR - col * colW, y = TOP + 130 + row * rowH;
            ctx.fillStyle = GOLD; ctx.font = '700 22px ' + F_UI; ctx.fillText(ar(it.id), x, y);
            ctx.fillStyle = INK; ctx.font = '700 32px ' + F_DISP; ctx.fillText(it.x.n, x - 56, y + 2);
          });
          return flush(state, pages);
        });
      })(s);
    }
    return chain;
  }

  /* ---------- كتلة اسم واحد ---------- */
  function measureBlock(ctx, it) {
    var x = it.x, TW = CW - 126;
    ctx.font = '400 24px ' + F_TEXT;
    var mLines = wrap(ctx, x.m, CW);
    var wLines = x.w.map(function (t) { return wrap(ctx, t, TW); });
    ctx.font = '400 24px ' + F_TEXT;
    var dLines = wrap(ctx, x.d, CW - 56);
    var LH = 44;
    var h = 150 + 26;                                  // الرأس
    h += 44 + mLines.length * LH + 14;                 // المعنى
    h += 44 + wLines.reduce(function (a, l) { return a + l.length * LH + 12; }, 0) + 10; // التعبد
    h += 44 + dLines.length * LH + 40 + 16;            // الدعاء
    h += 34;                                           // فاصل
    return { h: h, mLines: mLines, wLines: wLines, dLines: dLines, LH: LH };
  }

  function section(ctx, y, label) {
    ctx.fillStyle = GOLD; ctx.font = '700 25px ' + F_UI; ctx.textAlign = 'right';
    ctx.fillText(label, XR, y + 26);
    var w = ctx.measureText(label).width;
    ctx.fillStyle = LINE; ctx.fillRect(MX, y + 18, CW - w - 18, 1.5);
  }

  function drawBlock(ctx, it, y, m) {
    var x = it.x, c = it.c;
    // الرأس الملوّن
    var g = ctx.createLinearGradient(MX, y, XR, y + 150);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    rrect(ctx, MX, y, CW, 150, 22); ctx.fillStyle = g; ctx.fill();
    ctx.save(); rrect(ctx, MX, y, CW, 150, 22); ctx.clip(); pattern(ctx, MX, y, CW, 150, 0.12, 64); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '500 22px ' + F_UI; ctx.textAlign = 'right';
    ctx.fillText('الاسم ' + ar(it.id), XR - 26, y + 40);
    ctx.textAlign = 'left';
    ctx.fillText(SRC[x.s], MX + 26, y + 40);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    var size = x.n.length > 12 ? 62 : 80;
    ctx.font = '700 ' + size + 'px ' + F_DISP;
    ctx.fillText(x.n, W / 2, y + 112);
    ctx.textAlign = 'right';
    y += 150 + 26;

    section(ctx, y, 'المعنى'); y += 44;
    ctx.fillStyle = INK; ctx.font = '400 24px ' + F_TEXT;
    m.mLines.forEach(function (l, k) { ctx.fillText(l, XR, y + 30 + k * m.LH); });
    y += m.mLines.length * m.LH + 14;

    section(ctx, y, 'كيف نتعبّد لله بهذا الاسم'); y += 44;
    m.wLines.forEach(function (lines, k) {
      // وسم النوع
      ctx.font = '700 19px ' + F_UI;
      var bw = 98, bx = XR - bw;
      rrect(ctx, bx, y + 6, bw, 34, 10); ctx.fillStyle = SOFT; ctx.fill();
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(KINDS[k], bx + bw / 2, y + 30);
      ctx.textAlign = 'right'; ctx.font = '400 24px ' + F_TEXT;
      lines.forEach(function (l, j) { ctx.fillText(l, XR - 126 + 0, y + 30 + j * m.LH); });
      y += lines.length * m.LH + 12;
    });
    y += 10;

    section(ctx, y, 'دعاء'); y += 44;
    var bh = m.dLines.length * m.LH + 40;
    rrect(ctx, MX, y, CW, bh, 16); ctx.fillStyle = SOFT; ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = '400 24px ' + F_TEXT;
    m.dLines.forEach(function (l, k) { ctx.fillText(l, XR - 28, y + 20 + 30 + k * m.LH); });
    y += bh + 16;
    return y + 34;
  }

  /* ---------- ملف PDF ---------- */
  function utf16hex(s) {
    var h = 'FEFF';
    for (var i = 0; i < s.length; i++) h += ('0000' + s.charCodeAt(i).toString(16)).slice(-4);
    return '<' + h.toUpperCase() + '>';
  }

  function assemble(pages, title) {
    var enc = new TextEncoder(), chunks = [], offsets = [], pos = 0;
    function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); pos += b.length; }
    function begin(n) { offsets[n] = pos; push(n + ' 0 obj\n'); }
    var PW = 595.28, PH = 841.89, n = pages.length;

    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((4 + i * 3) + ' 0 R');
    begin(2); push('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\nendobj\n');
    begin(3); push('<< /Title ' + utf16hex(title) + ' /Producer (Asma Allah Al-Husna) >>\nendobj\n');
    for (var p = 0; p < n; p++) {
      var po = 4 + p * 3, co = po + 1, io = po + 2, pg = pages[p];
      begin(po);
      push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + io + ' 0 R >> >> /Contents ' + co + ' 0 R >>\nendobj\n');
      var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q\n';
      begin(co); push('<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream\nendobj\n');
      begin(io);
      push('<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.bytes.length + ' >>\nstream\n');
      push(pg.bytes); push('\nendstream\nendobj\n');
    }
    var xref = pos, count = 4 + n * 3;
    var x = 'xref\n0 ' + count + '\n0000000000 65535 f \n';
    for (var k = 1; k < count; k++) x += ('0000000000' + offsets[k]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + count + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* ---------- الواجهة العامة ---------- */
  function build(items, opts) {
    opts = opts || {};
    var onP = opts.onProgress || function () {};
    var state = { canvas: null, ctx: null, y: 0, n: 0 };
    var pages = [];
    return loadFonts().then(function () {
      cover(state, items, opts.total || items.length);
      return flush(state, pages);
    }).then(function () {
      state.n = 1;
      if (items.length > 12) return indexPages(state, items, pages);
    }).then(function () {
      var chain = Promise.resolve(), open = false;
      items.forEach(function (it, k) {
        chain = chain.then(function () {
          var ctx = open ? state.ctx : null;
          if (!ctx) { ctx = newPage(state); open = true; }
          var m = measureBlock(ctx, it);
          if (state.y + m.h > BOTTOM && state.y > TOP + 1) {
            return flush(state, pages).then(function () { ctx = newPage(state); open = true; return ctx; }).then(function (c2) {
              state.y = drawBlock(c2, it, state.y, m);
            });
          }
          state.y = drawBlock(ctx, it, state.y, m);
        }).then(function () { onP((k + 1) / items.length * 0.92); return tick(); });
      });
      return chain.then(function () { if (open && state.canvas) return flush(state, pages); });
    }).then(function () {
      onP(0.97);
      var blob = assemble(pages, 'أسماء الله الحسنى');
      onP(1);
      return blob;
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1]); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }

  function save(blob, filename) {
    var cap = window.Capacitor;
    var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    if (native) {
      return blobToBase64(blob).then(function (b64) {
        var FS = cap.registerPlugin('Filesystem'), Share = cap.registerPlugin('Share');
        function write(dir) { return FS.writeFile({ path: filename, data: b64, directory: dir, recursive: true }); }
        return write('DOCUMENTS').then(function (r) { return { r: r, where: 'مجلد المستندات (Documents)' }; }, function () {
          return write('CACHE').then(function (r) { return { r: r, where: 'ذاكرة التطبيق' }; });
        }).then(function (o) {
          return Share.share({ title: 'أسماء الله الحسنى', url: o.r.uri, dialogTitle: 'حفظ الملف أو مشاركته' })
            .catch(function () {})
            .then(function () { return { message: 'حُفظ الملف في ' + o.where + ' باسم ' + filename }; });
        });
      });
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
    return Promise.resolve({ message: 'تم تنزيل الملف ' + filename });
  }

  window.PDF = { build: build, save: save };
})();
