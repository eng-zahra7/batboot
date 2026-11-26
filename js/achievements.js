/* بطبوط: صفحة الإنجازات تقرأ المصدر الأساسي من MySQL عبر php/me.php */
(function () {
    'use strict';

    const BADGES = [
        { id: 'first-step', name: 'أول خطوة', desc: 'إكمال أول وحدة تعليمية', icon: '★' },
        { id: 'number-lover', name: 'محب الأرقام', desc: 'إكمال تعلّم الأرقام من 1 إلى 10', icon: '123' },
        { id: 'addition-hero', name: 'بطل الجمع', desc: 'إكمال مستويات الجمع المطلوبة', icon: '+' },
        { id: 'subtraction-hero', name: 'بطل الطرح', desc: 'إكمال مستويات الطرح المطلوبة', icon: '−' },
        { id: 'master-learner', name: 'المتعلم المتميز', desc: 'إكمال متطلبات التعلّم كاملة', icon: '★' },
        { id: 'star-collector', name: 'جامع النجوم', desc: 'جمع 30 نجمة', icon: '★' },
        { id: 'active-learner', name: 'المتعلم النشيط', desc: 'إكمال 5 مستويات رياضيات', icon: '🔥' },
        { id: 'arabic', name: 'شارة العربية', desc: 'إكمال أول نشاط في اللغة العربية', icon: 'ع' },
        { id: 'english', name: 'شارة الإنجليزية', desc: 'إكمال أول نشاط في اللغة الإنجليزية', icon: 'A' },
        { id: 'math', name: 'شارة الرياضيات', desc: 'إكمال أول نشاط في الرياضيات', icon: '+' },
        { id: 'all-rounder', name: 'البطل الشامل', desc: 'التعلّم في العربية والإنجليزية والرياضيات', icon: '★' }
    ];
    const $ = (s, r) => (r || document).querySelector(s);
    const make = (tag, cls, value) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (value !== undefined) n.textContent = value;
        return n;
    };
    const dateValue = (v) => {
        if (!v) return null;
        const d = new Date(String(v).replace(' ', 'T'));
        return Number.isNaN(d.getTime()) ? null : d;
    };
    const formatDate = (v) => {
        const d = dateValue(v);
        if (!d) return '—';
        try { return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }); }
        catch (_) { return d.toLocaleDateString(); }
    };
    function setText(id, value) {
        const n = document.getElementById(id);
        if (n) n.textContent = String(value);
    }
    function render(data) {
        const stats = data.statistics || {};
        const progress = data.progress || {};
        const earnedRows = data.achievements || [];
        const earned = {};
        earnedRows.forEach((a) => { earned[a.achievement_code] = a; });

        const stars = Number(stats.totalStars || progress.totalStars || 0);
        const xpMax = Number(progress.levelXpMax || 200);
        const level = Number(progress.currentLevel || 1);
        const xp = Number(progress.levelXp || 0);
        setText('total-stars', stars);
        setText('level-number', level);
        setText('level-xp', xp);
        setText('level-xp-max', xpMax);
        const bar = $('#level-progress');
        if (bar) {
            bar.max = xpMax;
            bar.value = xp;
            bar.setAttribute('aria-valuenow', String(xp));
        }

        const statsGrid = $('.ach-stats');
        if (statsGrid) {
            const extraStats = [
                ['stat-levels', String(stats.completedUnits || 0), 'الوحدات المكتملة'],
                ['stat-correct', String(stats.correctAnswers || 0), 'الإجابات الصحيحة'],
                ['stat-percent', (stats.attempts ? Math.round((stats.correctAnswers || 0) / stats.attempts * 100) : 0) + '%', 'نسبة الإجابات الصحيحة'],
                ['stat-numbers', String((stats.bySubject && stats.bySubject.numbers && stats.bySubject.numbers.completedUnits) || 0) + ' / 10', 'الأرقام التي تعلمتها']
            ];
            extraStats.forEach(([id, value, label]) => {
                let card = document.getElementById(id);
                if (!card) {
                    card = make('article', 'dash-card stat-card');
                    card.id = id;
                    const text = make('div', 'dash-text stars-text');
                    text.append(make('strong', 'stars-count', value));
                    text.append(make('p', '', label));
                    card.append(text);
                    statsGrid.append(card);
                } else {
                    const number = card.querySelector('.stars-count');
                    if (number) number.textContent = value;
                }
            });
        }

        const latest = $('#latest-achievements');
        if (latest) {
            latest.replaceChildren();
            const sorted = earnedRows.slice().sort((a, b) => {
                const da = dateValue(a.earned_at)?.getTime() || 0;
                const db = dateValue(b.earned_at)?.getTime() || 0;
                return db - da;
            }).slice(0, 3);
            const parent = latest.parentElement;
            let empty = $('#latest-empty', parent);
            if (!sorted.length) {
                latest.hidden = true;
                if (!empty) {
                    empty = make('div', 'empty-state');
                    empty.id = 'latest-empty';
                    empty.append(make('h3', '', 'رحلتك تبدأ من هنا!'));
                    empty.append(make('p', '', 'أكمل أول نشاط لتحصل على أول إنجاز'));
                    parent.insertBefore(empty, latest);
                }
            } else {
                latest.hidden = false;
                if (empty) empty.remove();
                sorted.forEach((a) => {
                    const card = make('article', 'latest-card');
                    card.dataset.achievementId = a.achievement_code;
                    card.append(make('div', 'medal medal-small medal-gold', '★'));
                    card.append(make('h3', '', a.title || (BADGES.find(b => b.id === a.achievement_code) || {}).name || a.achievement_code));
                    if (a.description) card.append(make('p', 'latest-desc', a.description));
                    const time = make('time', 'latest-date', formatDate(a.earned_at));
                    if (a.earned_at) time.dateTime = String(a.earned_at).replace(' ', 'T');
                    card.append(time);
                    latest.append(card);
                });
            }
        }

        const list = $('#badges');
        if (list) {
            list.replaceChildren();
            BADGES.forEach((b) => {
                const row = earned[b.id];
                const on = !!row;
                const li = make('li', 'badge-card' + (on ? ' is-earned' : ''));
                li.dataset.badgeId = b.id;
                li.dataset.earned = String(on);
                const medal = make('div', 'medal medal-badge ' + (on ? 'medal-gold' : 'is-locked'));
                medal.append(make('span', 'medal-text', on ? b.icon : '🔒'));
                li.append(medal);
                li.append(make('span', 'badge-name', row?.title || b.name));
                li.append(make('span', 'latest-desc', row?.description || b.desc));
                li.append(make('span', 'visually-hidden', on ? 'مكتسبة' : 'مقفلة'));
                list.append(li);
            });
        }

        // تحديث إحصائيات إضافية إن كانت موجودة في الصفحة.
        setText('stat-levels', stats.completedUnits || 0);
        setText('stat-correct', stats.correctAnswers || 0);
        const all = Math.max(1, Number(stats.completedUnits || 0));
        setText('stat-percent', Math.round(Number(stats.correctAnswers || 0) / all * 100) + '%');
    }

    let loading = false;
    let lastPayload = null;
    function refresh() {
        if (loading) return Promise.resolve(lastPayload);
        loading = true;
        return fetch('php/me.php', {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
        }).then((r) => r.json().then((d) => {
            if (!r.ok || !d || !d.ok) {
                if (r.status === 401) location.replace((d && d.redirect) || 'login.html');
                throw new Error((d && d.message) || 'تعذر تحديث الإنجازات');
            }
            lastPayload = d;
            render(d);
            return d;
        })).catch((e) => {
            console.error('[Batboot achievements]', e);
            const msg = $('#achievement-load-error');
            if (msg) msg.textContent = 'تعذر تحديث الإنجازات. تحقق من الاتصال ثم أعد المحاولة.';
            return null;
        }).finally(() => { loading = false; });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
    else refresh();
    window.addEventListener('pageshow', refresh);
    window.addEventListener('batboot:progress-saved', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.BatbootAchievements = { refresh };
})();
