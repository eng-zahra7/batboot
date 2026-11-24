/* Batboot: client for persisting lesson progress to MySQL. */
(function () {
    'use strict';
    var csrf = '';
    var childId = null;
    var ready = fetch('php/me.php', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
    }).then(function (r) {
        return r.json().then(function (d) {
            if (!r.ok || !d || !d.ok) {
                if (r.status === 401) { window.location.replace((d && d.redirect) || 'login.html'); }
                throw new Error((d && d.message) || 'تعذر تحميل جلسة الطفل');
            }
            csrf = d.csrf || '';
            childId = d.child && d.child.id;
            document.querySelectorAll('[data-child-id]').forEach(function (n) {
                n.setAttribute('data-child-id', String(childId || ''));
            });
            return d;
        });
    });
    window.BatbootProgress = {
        ready: ready,
        childId: function () { return childId; },
        save: function (record) {
            return ready.then(function () {
                var body = new FormData();
                Object.keys(record).forEach(function (k) {
                    body.append(k, String(record[k]));
                });
                body.append('csrf_token', csrf);
                return fetch('php/save-progress.php', {
                    method: 'POST',
                    body: body,
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
                }).then(function (r) {
                    return r.json().then(function (d) {
                        if (!r.ok || !d || !d.ok) {
                            if (r.status === 401) { window.location.replace((d && d.redirect) || 'login.html'); }
                            throw new Error((d && d.message) || 'تعذر حفظ التقدم');
                        }
                        window.dispatchEvent(new CustomEvent('batboot:progress-saved', { detail: d }));
                        return d;
                    });
                });
            });
        }
    };
})();
