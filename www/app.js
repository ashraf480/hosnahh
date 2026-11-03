/* أسماء الله الحسنى — منطق التطبيق */
(function () {
  'use strict';

  var NAMES = window.NAMES || [];
  var TOTAL = NAMES.length;
  var SRC = { Q: 'ثابت في القرآن', S: 'ثابت في السنة', T: 'ورد في رواية الترمذي' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ar = function (n) { try { return Number(n).toLocaleString('ar-EG'); } catch (e) { return String(n); } };

  /* ---------- تخزين محلي آمن ---------- */
  var mem = {};
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) {}
      return k in mem ? mem[k] : d;
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };
  var favs = new Set(store.get('asma.fav', []));
  var learned = new Set(store.get('asma.learned', []));
  var times = store.get('asma.times', []);
  var themePref = store.get('asma.theme', 'auto');

  /* ---------- أدوات ---------- */
  function norm(s) {
    return String(s || '')
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .toLowerCase();
  }
  var haystack = NAMES.map(function (x) { return norm(x.n + ' ' + x.b + ' ' + x.m); });

  function dayIndex(d) {
    d = d || new Date();
    var start = Date.UTC(d.getFullYear(), 0, 0);
    var cur = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((cur - start) / 864e5) % TOTAL;
  }
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, ms || 2800);
  }
  function persist() {
    store.set('asma.fav', Array.from(favs));
    store.set('asma.learned', Array.from(learned));
  }

  /* ---------- المظهر ---------- */
  function applyTheme() {
    var root = document.documentElement;
    if (themePref === 'light' || themePref === 'dark') root.setAttribute('data-theme', themePref);
    else root.removeAttribute('data-theme');
    document.querySelectorAll('#themeSeg button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.v === themePref));
    });
    var dark = isDark();
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#071a1c' : '#0f5c5c');
  }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setTheme(v) { themePref = v; store.set('asma.theme', v); applyTheme(); }

  /* ---------- المربعات ---------- */
  var filter = 'all';
  var query = '';
  var FILTERS = [['all', 'الكل'], ['fav', 'المفضلة'], ['ok', 'حفظتها'], ['todo', 'لم أحفظها']];

  var ICON_STAR = '<svg viewBox="0 0 24 24" class="mk-fav" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9Z"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" class="mk-ok" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function tileHTML(i) {
    var x = NAMES[i], id = i + 1;
    var len = x.n.length;
    var cls = 'tile c' + (i % 7) + (len > 14 ? ' xlong' : len > 8 ? ' long' : '');
    return '<button type="button" class="' + cls + '" data-id="' + id + '" aria-label="' + x.n + '، الاسم رقم ' + ar(id) + '">' +
      '<span class="t-top">' +
        '<span class="t-num"><svg viewBox="0 0 48 48" aria-hidden="true"><use href="#star8"/></svg><span>' + ar(id) + '</span></span>' +
        '<span class="t-marks">' + (favs.has(id) ? ICON_STAR : '') + (learned.has(id) ? ICON_OK : '') + '</span>' +
      '</span>' +
      '<span class="t-name">' + x.n + '</span>' +
      '<span class="t-brief">' + x.b + '</span>' +
    '</button>';
  }

  function visibleIds() {
    var q = norm(query).trim();
    var out = [];
    for (var i = 0; i < TOTAL; i++) {
      var id = i + 1;
      if (filter === 'fav' && !favs.has(id)) continue;
      if (filter === 'ok' && !learned.has(id)) continue;
      if (filter === 'todo' && learned.has(id)) continue;
      if (q && haystack[i].indexOf(q) === -1) continue;
      out.push(i);
    }
    return out;
  }

  function renderGrid() {
    var idx = visibleIds();
    $('#grid').innerHTML = idx.map(tileHTML).join('');
    $('#empty').hidden = idx.length > 0;
  }
  function renderChips() {
    $('#chips').innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="chip" role="tab" data-f="' + f[0] + '" aria-selected="' + (filter === f[0]) + '">' + f[1] + '</button>';
    }).join('');
  }
  function renderProgress() {
    var n = learned.size;
    $('#progress').innerHTML = '<span>حفظتُ ' + ar(n) + ' من ' + ar(TOTAL) + '</span><span class="track"><i style="width:' + (n / TOTAL * 100).toFixed(1) + '%"></i></span>';
  }
  function renderToday() {
    var i = dayIndex(), x = NAMES[i];
    var el = $('#today');
    el.className = 'today tile c' + (i % 7);
    el.style.minHeight = '0';
    el.innerHTML =
      '<div><div class="lbl">اسم اليوم · ' + ar(i + 1) + ' من ' + ar(TOTAL) + '</div>' +
      '<div class="nm">' + x.n + '</div>' +
      '<div class="bf">' + x.b + '</div></div>' +
      '<button type="button" class="go" data-id="' + (i + 1) + '">اقرأ التفاصيل</button>';
  }
  function refreshAll() { renderGrid(); renderProgress(); }

  /* ---------- بطاقة الاسم ---------- */
  var current = 0;
  var overlay = null; // 'sheet' | 'settings' | 'about'

  function sheetHTML(i) {
    var x = NAMES[i], id = i + 1;
    var kinds = ['علميًّا', 'قلبيًّا', 'عمليًّا'];
    return '' +
      '<div class="s-head c' + (i % 7) + '" style="--c1:var(--cc1);--c2:var(--cc2)">' +
        '<div class="s-row">' +
          '<span class="s-num">الاسم ' + ar(id) + ' من ' + ar(TOTAL) + '</span>' +
          '<button class="icon-btn flat s-close" type="button" id="sheetClose" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' +
        '</div>' +
        '<div class="s-name" id="sheetName">' + x.n + '</div>' +
        '<div class="s-badges"><span class="badge">' + SRC[x.s] + '</span><span class="badge">' + x.r + '</span></div>' +
      '</div>' +
      '<div class="s-body" id="sheetBody">' +
        '<h3>المعنى</h3><p class="s-text">' + x.m + '</p>' +
        '<h3>كيف نتعبّد لله بهذا الاسم</h3>' +
        '<ul class="worship">' + x.w.map(function (t, k) {
          return '<li><span class="w-k">' + kinds[k] + '</span><p>' + t + '</p></li>';
        }).join('') + '</ul>' +
        '<h3>دعاء</h3><div class="dua"><p>' + x.d + '</p><button class="pill" type="button" id="copyDua">نسخ الدعاء</button></div>' +
        (x.s === 'T' ? '<p class="s-ref">إثبات هذا الاسم بلفظه محل خلاف بين أهل العلم، ومعناه ثابت بالأدلة. التفصيل في «عن المحتوى ومصادره».</p>' : '') +
      '</div>' +
      '<div class="s-foot">' +
        '<div class="s-actions">' +
          '<button type="button" class="pill fav" id="actFav" aria-pressed="' + favs.has(id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9Z"/></svg>مفضلة</button>' +
          '<button type="button" class="pill" id="actOk" aria-pressed="' + learned.has(id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>حفظتُه</button>' +
          '<button type="button" class="pill" id="actPdf">PDF</button>' +
        '</div>' +
        '<div class="nav">' +
          '<button type="button" class="pill" id="navPrev" aria-label="الاسم السابق">السابق</button>' +
          '<button type="button" class="pill" id="navNext" aria-label="الاسم التالي">التالي</button>' +
        '</div>' +
      '</div>';
  }

  var PAL = [['#0f6a68', '#0a4749'], ['#3d4ca6', '#262e72'], ['#8a427d', '#5a2755'], ['#5f7230', '#414f1e'], ['#8d5f12', '#65420a'], ['#2f6a8a', '#1d4660'], ['#9d3545', '#6c2030']];

  function paintSheet(i) {
    current = i;
    var sh = $('#sheet');
    sh.style.setProperty('--cc1', PAL[i % 7][0]);
    sh.style.setProperty('--cc2', PAL[i % 7][1]);
    sh.innerHTML = sheetHTML(i);
    var body = $('#sheetBody'); if (body) body.scrollTop = 0;
  }

  function openSheet(id, replace) {
    var i = id - 1;
    if (i < 0 || i >= TOTAL) return;
    paintSheet(i);
    if (overlay !== 'sheet') {
      $('#sheet').hidden = false; $('#backdrop').hidden = false;
      document.body.classList.add('lock');
      overlay = 'sheet';
      history.pushState({ o: 'sheet' }, '');
      setTimeout(function () { var c = $('#sheetClose'); if (c) c.focus({ preventScroll: true }); }, 30);
    } else if (!replace) {
      /* تنقّل داخل البطاقة نفسها */
    }
  }

  function showPanel(kind) {
    var el = kind === 'settings' ? $('#panel') : $('#about');
    hideOverlays(true);
    el.hidden = false; $('#backdrop2').hidden = false;
    document.body.classList.add('lock');
    overlay = kind;
    history.pushState({ o: kind }, '');
  }

  function hideOverlays(silent) {
    ['#sheet', '#panel', '#about', '#backdrop', '#backdrop2'].forEach(function (s) { $(s).hidden = true; });
    document.body.classList.remove('lock');
    var was = overlay; overlay = null;
    return was;
  }
  function closeOverlay() {
    if (!overlay) return;
    if (history.state && history.state.o) history.back();
    else hideOverlays();
  }
  window.addEventListener('popstate', function () {
    if (overlay) { hideOverlays(); refreshAll(); }
  });

  function step(d) {
    var i = (current + d + TOTAL) % TOTAL;
    paintSheet(i);
  }

  /* ---------- النسخ ---------- */
  function copyText(t) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); toast(ok ? 'تم النسخ' : 'تعذّر النسخ');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast('تم النسخ'); }, fallback);
    } else fallback();
  }

  /* ---------- PDF ---------- */
  var pdfBusy = false;
  function setPdfUI(busy, pct, msg) {
    ['#pdfAll', '#pdfFav', '#pdfLearned'].forEach(function (s) { $(s).disabled = busy; });
    $('#pdfBar').hidden = !busy;
    $('#pdfBarFill').style.width = (pct || 0) + '%';
    if (msg !== undefined) $('#pdfStatus').textContent = msg;
  }
  function makePdf(ids, label) {
    if (pdfBusy) return;
    if (!ids.length) { toast('القائمة فارغة، أضف أسماء أولًا'); return; }
    if (!window.PDF) { toast('ميزة PDF غير متاحة'); return; }
    pdfBusy = true;
    setPdfUI(true, 0, 'جارٍ تجهيز الملف…');
    var items = ids.map(function (id) { var x = NAMES[id - 1]; return { id: id, x: x, c: PAL[(id - 1) % 7] }; });
    PDF.build(items, {
      total: TOTAL,
      onProgress: function (p) { setPdfUI(true, Math.round(p * 100), 'جارٍ تجهيز الملف… ' + ar(Math.round(p * 100)) + '٪'); }
    }).then(function (blob) {
      var name = ids.length === 1 ? 'asma-allah-' + NAMES[ids[0] - 1].n.replace(/[^ء-ي]/g, '') + '.pdf' : 'asma-allah-alhusna-' + label + '.pdf';
      return PDF.save(blob, name);
    }).then(function (res) {
      setPdfUI(false, 0, res && res.message ? res.message : 'تم حفظ الملف');
      toast(res && res.message ? res.message : 'تم حفظ الملف');
    }).catch(function (e) {
      console.error(e);
      setPdfUI(false, 0, 'تعذّر إنشاء الملف. حاول مرة أخرى.');
      toast('تعذّر إنشاء الملف');
    }).then(function () { pdfBusy = false; });
  }
  function allIds() { var a = []; for (var i = 1; i <= TOTAL; i++) a.push(i); return a; }

  /* ---------- التنبيهات ---------- */
  function renderTimes() {
    var el = $('#times');
    el.innerHTML = times.map(function (t, k) {
      return '<span class="time-chip"><span>' + t.replace(/\d/g, function (d) { return ar(d); }) + '</span>' +
        '<button type="button" data-k="' + k + '" aria-label="حذف الوقت ' + t + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></span>';
    }).join('');
    var n = $('#notifNote');
    n.textContent = (window.Notify && Notify.native)
      ? 'يعمل التنبيه حتى والتطبيق مغلق. يُجدَّد جدول الأسماء لثلاثين يومًا قادمة كلما فتحتَ التطبيق.'
      : 'في المتصفح يصلك التنبيه ما دامت الصفحة مفتوحة. لتنبيه يعمل والتطبيق مغلق، ثبّت تطبيق الأندرويد.';
    $('#notifStatus').textContent = times.length ? 'مفعّل: ' + ar(times.length) + (times.length === 1 ? ' وقت' : ' أوقات') : 'غير مفعّل';
  }
  function syncNotify(showMsg) {
    if (!window.Notify) return Promise.resolve();
    return Notify.sync(times, NAMES).then(function (r) {
      if (showMsg && r && !r.ok) toast(r.message || 'تعذّر ضبط التنبيه');
      return r;
    });
  }

  /* ---------- الأحداث ---------- */
  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('button, .tile');
      if (!t) return;

      var id = t.dataset && t.dataset.id;
      if (id && (t.classList.contains('tile') || t.classList.contains('go'))) { openSheet(+id); return; }

      if (t.classList.contains('chip')) { filter = t.dataset.f; renderChips(); renderGrid(); return; }

      switch (t.id) {
        case 'sheetClose': case 'panelClose': case 'aboutClose': closeOverlay(); break;
        case 'navPrev': step(-1); break;
        case 'navNext': step(1); break;
        case 'actFav':
          var f = current + 1;
          if (favs.has(f)) favs.delete(f); else favs.add(f);
          persist(); t.setAttribute('aria-pressed', String(favs.has(f)));
          toast(favs.has(f) ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة'); break;
        case 'actOk':
          var o = current + 1;
          if (learned.has(o)) learned.delete(o); else learned.add(o);
          persist(); t.setAttribute('aria-pressed', String(learned.has(o)));
          toast(learned.has(o) ? 'بارك الله فيك، سُجّل أنك حفظته' : 'أُزيل من المحفوظ'); break;
        case 'actPdf': makePdf([current + 1], String(current + 1)); break;
        case 'copyDua': copyText(NAMES[current].d); break;
        case 'btnSettings': showPanel('settings'); break;
        case 'btnAbout': showPanel('about'); break;
        case 'btnTheme': setTheme(isDark() ? 'light' : 'dark'); break;
        case 'pdfAll': makePdf(allIds(), 'all'); break;
        case 'pdfFav': makePdf(Array.from(favs).sort(function (a, b) { return a - b; }), 'favorites'); break;
        case 'pdfLearned': makePdf(Array.from(learned).sort(function (a, b) { return a - b; }), 'learned'); break;
        case 'btnReset':
          if (t.dataset.arm === '1') {
            favs.clear(); learned.clear(); persist(); refreshAll();
            t.dataset.arm = ''; t.textContent = 'مسح المفضلة والحفظ'; toast('تم المسح');
          } else {
            t.dataset.arm = '1'; t.textContent = 'اضغط مرة أخرى للتأكيد';
            setTimeout(function () { t.dataset.arm = ''; t.textContent = 'مسح المفضلة والحفظ'; }, 4000);
          }
          break;
        case 'btnAddTime': addTime(); break;
        case 'btnTestNotif':
          if (window.Notify) Notify.test(NAMES[dayIndex()]).then(function (r) { toast(r && r.message ? r.message : 'أُرسل التنبيه'); });
          break;
      }
      var rm = t.closest('.time-chip button');
      if (rm) { times.splice(+rm.dataset.k, 1); store.set('asma.times', times); renderTimes(); syncNotify(true); }
      var seg = t.closest('#themeSeg button');
      if (seg) setTheme(seg.dataset.v);
    });

    $('#backdrop').addEventListener('click', closeOverlay);
    $('#backdrop2').addEventListener('click', closeOverlay);
    $('#q').addEventListener('input', function (e) { query = e.target.value; renderGrid(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay) { closeOverlay(); }
      else if (overlay === 'sheet') {
        if (e.key === 'ArrowLeft') step(1);
        if (e.key === 'ArrowRight') step(-1);
      }
    });

    /* السحب الأفقي للتنقل بين الأسماء */
    var sx = null;
    $('#sheet').addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    $('#sheet').addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 90) step(dx > 0 ? -1 : 1);
    }, { passive: true });

    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var h = function () { if (themePref === 'auto') applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', h);
    }
  }

  function addTime() {
    var v = $('#timeInput').value;
    if (!/^\d{2}:\d{2}$/.test(v)) { toast('اختر وقتًا صحيحًا'); return; }
    if (times.indexOf(v) !== -1) { toast('هذا الوقت مضاف مسبقًا'); return; }
    if (times.length >= 3) { toast('الحد الأقصى ثلاثة أوقات'); return; }
    times.push(v); times.sort();
    store.set('asma.times', times);
    renderTimes();
    syncNotify(true).then(function (r) { if (r && r.ok) toast(r.message || 'تم ضبط التنبيه', r.message ? 6000 : 2800); });
  }

  /* ---------- البدء ---------- */
  function init() {
    applyTheme();
    renderToday(); renderChips(); renderProgress(); renderGrid(); renderTimes();
    bind();

    if (window.Notify) {
      Notify.init({
        names: NAMES,
        dayIndex: dayIndex,
        onOpen: function (id) { if (id) openSheet(+id); }
      }).then(function () { renderTimes(); if (times.length) syncNotify(false); });
    }

    var m = /#n=(\d+)/.exec(location.hash);
    if (m) openSheet(+m[1]);

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (TOTAL !== 99) console.warn('عدد الأسماء ليس 99:', TOTAL);
  init();
})();
