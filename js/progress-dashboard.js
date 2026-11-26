/* بطبوط: تحديث بيانات لوحة الإنجازات من MySQL */
(function () {
  'use strict';
  function set(id, value) {
    var n = document.getElementById(id);
    if (n) n.textContent = String(value);
  }
  function load() {
    return fetch('php/me.php', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok || !d || !d.ok) throw new Error((d && d.message) || 'تعذر تحميل التقدم');
        return d;
      });
    }).then(function (d) {
      var p = d.progress || {}, st = d.statistics || {};
      set('total-stars', st.totalStars || 0);
      set('level-number', p.currentLevel || 1);
      set('level-xp', p.levelXp || 0);
      set('level-xp-max', p.levelXpMax || 200);
      var bar = document.getElementById('level-progress');
      if (bar) {
        bar.max = p.levelXpMax || 200;
        bar.value = p.levelXp || 0;
      }
      var rows = d.achievements || [];
      var earned = {};
      rows.forEach(function (a) { earned[a.achievement_code] = true; });
      document.querySelectorAll('[data-badge-id]').forEach(function (n) {
        var id = n.getAttribute('data-badge-id');
        var yes = !!earned[id];
        n.classList.toggle('is-earned', yes);
        n.dataset.earned = String(yes);
        var lock = n.querySelector('.is-locked');
        if (lock && yes) lock.classList.remove('is-locked');
      });
      var count = document.querySelector('[data-progress-total]');
      if (count) count.textContent = String(st.completedUnits || 0);
      document.documentElement.dataset.progressLoaded = 'true';
      return d;
    }).catch(function (e) {
      console.error('[Batboot] database progress unavailable:', e);
      return null;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
  window.addEventListener('batboot:progress-saved', load);
  window.addEventListener('pageshow', load);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  window.BatbootProgressDashboard = { refresh: load };
})();
