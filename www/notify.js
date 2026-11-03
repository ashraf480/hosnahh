/* تنبيهات اسم اليوم.
   - على الأندرويد (Capacitor): تنبيهات محلية مجدولة تعمل والتطبيق مغلق.
   - في المتصفح: إشعار المتصفح ما دامت الصفحة مفتوحة. */
(function () {
  'use strict';

  var DAYS_AHEAD = 45;           // عدد الأيام التي تُجدول مسبقًا
  var CHANNEL = 'asma-daily';
  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var LN = native ? cap.registerPlugin('LocalNotifications') : null;

  var ctx = { names: [], dayIndex: function () { return 0; }, onOpen: function () {} };
  var webTimers = [];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(t) { var p = t.split(':'); return { h: +p[0], m: +p[1] }; }
  function textFor(x) { return { title: 'اسم اليوم: ' + x.n, body: x.b }; }

  /* ---------- الأندرويد ---------- */
  function ensureNativePermission() {
    return LN.checkPermissions().then(function (s) {
      if (s.display === 'granted') return true;
      return LN.requestPermissions().then(function (r) { return r.display === 'granted'; });
    });
  }

  function nativeSync(times, names) {
    return ensureNativePermission().then(function (ok) {
      if (!ok) return { ok: false, message: 'لم يُسمح بالتنبيهات. فعّلها من إعدادات الجهاز ثم أعد المحاولة.' };
      return LN.createChannel({
        id: CHANNEL, name: 'اسم اليوم', description: 'تنبيه يومي باسم من أسماء الله الحسنى',
        importance: 4, visibility: 1, vibration: true
      }).catch(function () {}).then(function () {
        return LN.getPending();
      }).then(function (p) {
        var list = (p && p.notifications) || [];
        return list.length ? LN.cancel({ notifications: list.map(function (n) { return { id: n.id }; }) }) : null;
      }).then(function () {
        if (!times.length) return { ok: true, message: 'أُلغي التنبيه' };
        var now = Date.now(), items = [], d, k;
        for (d = 0; d < DAYS_AHEAD; d++) {
          for (k = 0; k < times.length; k++) {
            var t = parse(times[k]);
            var at = new Date(); at.setDate(at.getDate() + d); at.setHours(t.h, t.m, 0, 0);
            if (at.getTime() <= now + 5000) continue;
            var idx = ctx.dayIndex(at), x = ctx.names[idx], s = textFor(x);
            items.push({
              id: d * 10 + k + 1, title: s.title, body: s.body,
              schedule: { at: at, allowWhileIdle: true },
              channelId: CHANNEL, smallIcon: 'ic_stat_name',
              extra: { id: idx + 1 }
            });
          }
        }
        if (!items.length) return { ok: true };
        return LN.schedule({ notifications: items }).then(function () {
          return exactCheck();
        });
      });
    }).catch(function (e) {
      console.error(e);
      return { ok: false, message: 'تعذّر ضبط التنبيه على الجهاز.' };
    });
  }

  /* أندرويد 12+ قد يحجب التنبيه الدقيق حتى يسمح المستخدم من الإعدادات */
  function exactCheck() {
    if (!LN.checkExactNotificationSetting) return { ok: true };
    return LN.checkExactNotificationSetting().then(function (r) {
      if (r && r.exact_alarm === 'denied') {
        return { ok: true, exactDenied: true, message: 'تم الضبط، لكن للدقة في الوقت اسمح بـ«المنبهات والتذكيرات» للتطبيق من إعدادات الجهاز.' };
      }
      return { ok: true };
    }, function () { return { ok: true }; });
  }

  /* ---------- المتصفح ---------- */
  function webClear() { webTimers.forEach(clearTimeout); webTimers = []; }

  function showWeb(x) {
    var s = textFor(x);
    var opts = { body: s.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'ar', dir: 'rtl', tag: 'asma-' + x.n };
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
      return navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.showNotification) return reg.showNotification(s.title, opts);
        new Notification(s.title, opts);
      }).catch(function () { new Notification(s.title, opts); });
    }
    new Notification(s.title, opts);
    return Promise.resolve();
  }

  function webPermission() {
    if (!('Notification' in window)) return Promise.resolve('unsupported');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    return Promise.resolve(Notification.requestPermission());
  }

  function webSchedule(times) {
    webClear();
    times.forEach(function (tt) {
      var t = parse(tt), at = new Date();
      at.setHours(t.h, t.m, 0, 0);
      if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
      var wait = at.getTime() - Date.now();
      if (wait > 2147000000) return;
      webTimers.push(setTimeout(function () {
        showWeb(ctx.names[ctx.dayIndex(new Date())]);
        webSchedule(times);
      }, wait));
    });
  }

  var lastTimes = [];
  function webSync(times) {
    lastTimes = times;
    if (!times.length) { webClear(); return Promise.resolve({ ok: true, message: 'أُلغي التنبيه' }); }
    return webPermission().then(function (p) {
      if (p === 'unsupported') return { ok: false, message: 'هذا المتصفح لا يدعم التنبيهات.' };
      if (p !== 'granted') return { ok: false, message: 'لم يُسمح بالتنبيهات. اسمح بها من إعدادات المتصفح للموقع.' };
      webSchedule(times);
      return { ok: true };
    });
  }

  /* ---------- الواجهة العامة ---------- */
  function init(opts) {
    ctx.names = opts.names; ctx.dayIndex = opts.dayIndex; ctx.onOpen = opts.onOpen || ctx.onOpen;
    if (native) {
      LN.addListener('localNotificationActionPerformed', function (ev) {
        var id = ev && ev.notification && ev.notification.extra && ev.notification.extra.id;
        if (id) ctx.onOpen(id);
      });
    } else {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && lastTimes.length && 'Notification' in window && Notification.permission === 'granted') webSchedule(lastTimes);
      });
      if (window.addEventListener) {
        try {
          var times = JSON.parse(localStorage.getItem('asma.times') || '[]');
          if (times.length && 'Notification' in window && Notification.permission === 'granted') { lastTimes = times; webSchedule(times); }
        } catch (e) {}
      }
    }
    return Promise.resolve();
  }

  function sync(times, names) {
    if (names) ctx.names = names;
    return native ? nativeSync(times, ctx.names) : webSync(times);
  }

  function test(x) {
    if (native) {
      return ensureNativePermission().then(function (ok) {
        if (!ok) return { message: 'لم يُسمح بالتنبيهات. فعّلها من إعدادات الجهاز.' };
        var s = textFor(x);
        return LN.createChannel({ id: CHANNEL, name: 'اسم اليوم', importance: 4, visibility: 1, vibration: true }).catch(function () {}).then(function () {
          return LN.schedule({ notifications: [{
            id: 9999, title: s.title, body: s.body, channelId: CHANNEL, smallIcon: 'ic_stat_name',
            schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
            extra: { id: ctx.names.indexOf(x) + 1 }
          }] });
        }).then(function () { return { message: 'سيصلك التنبيه بعد ثوانٍ' }; });
      }).catch(function () { return { message: 'تعذّر إرسال التنبيه' }; });
    }
    return webPermission().then(function (p) {
      if (p === 'unsupported') return { message: 'هذا المتصفح لا يدعم التنبيهات' };
      if (p !== 'granted') return { message: 'لم يُسمح بالتنبيهات. اسمح بها من إعدادات المتصفح.' };
      return showWeb(x).then(function () { return { message: 'أُرسل التنبيه' }; });
    });
  }

  window.Notify = { native: native, init: init, sync: sync, test: test };
})();
