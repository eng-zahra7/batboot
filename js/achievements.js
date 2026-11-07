/* =========================================================
   بطبوط - صفحة الإنجازات (achievements.js)
   - لا يحفظ تقدّم الدروس: يقرأ فقط ما تحفظه صفحات الجمع والطرح (والأرقام) في localStorage.
   - المحفوظ هنا فقط: متى حصل الطفل على كل إنجاز (حتى لا يُمنح مرتين).
   - يعتمد على HTML/CSS الموجودين؛ العناصر الناقصة تُنشأ هنا بكلاسات الصفحة نفسها.
   ========================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       1) الإعدادات ومفاتيح التخزين
       --------------------------------------------------------- */
    // نفس المفاتيح التي تكتبها addition.js و subtraction.js: prefix + معرّف الطفل (guest إن لم يوجد)
    var KEYS = {
        addition:     'batboot:addition:v1:',
        subtraction:  'batboot:subtraction:v1:',
        numbers:      'batboot:numbers:v1:',        // ← يُعدَّل هنا إن اختلف مفتاح صفحة الأرقام
        achievements: 'batboot:achievements:v1:'
    };

    var LEVELS_PER_OPERATION = 5;   // مستويات الجمع/الطرح كما في صفحتيهما
    var QUESTIONS_PER_LEVEL  = 3;   // أسئلة كل مستوى
    var NUMBERS_TOTAL        = 10;  // الأرقام من 1 إلى 10
    var STARS_PER_LEVEL      = 15;  // نجوم كل مستوى للطفل (مستوى الطفل = نجوم ÷ 15 + 1)
    var STAR_COLLECTOR_GOAL  = 30;  // هدف شارة جامع النجوم
    var ACTIVE_LEARNER_GOAL  = 5;   // مستويات مكتملة لشارة المتعلم النشيط

    /* ---------------------------------------------------------
       2) أدوات
       --------------------------------------------------------- */
    var SVGNS = 'http://www.w3.org/2000/svg';
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function $(sel, root) { return (root || document).querySelector(sel); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (text != null) { e.textContent = text; }
        return e;
    }
    function toInt(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

    function svgUse(id, size, cls) {
        var s = document.createElementNS(SVGNS, 'svg');
        s.setAttribute('width', size);
        s.setAttribute('height', size);
        s.setAttribute('aria-hidden', 'true');
        if (cls) { s.setAttribute('class', cls); }
        var u = document.createElementNS(SVGNS, 'use');
        u.setAttribute('href', '#' + id);
        s.appendChild(u);
        return s;
    }

    function readJSON(key) {
        try {
            var raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function writeJSON(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* التخزين غير متاح */ }
    }

    function animate(node, frames, opts) {
        if (reduceMotion || !node || !node.animate) { return; }
        try { node.animate(frames, opts); } catch (e) { /* لا شيء */ }
    }

    function ltr(t) { return '⁦' + t + '⁩'; }

    var main = $('.home-page');
    if (!main) { return; }
    var childId = main.dataset.childId || document.body.dataset.childId || 'guest';
    if (!childId) { childId = 'guest'; }

    /* رمز الطرح غير موجود في أيقونات الصفحة: نضيفه إلى نفس المجموعة */
    (function addMinusSymbol() {
        var defs = $('.svg-sprite defs');
        if (!defs || $('#i-minus', defs)) { return; }
        var sym = document.createElementNS(SVGNS, 'symbol');
        sym.setAttribute('id', 'i-minus');
        sym.setAttribute('viewBox', '0 0 24 24');
        var p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('d', 'M5 12h14');
        p.setAttribute('stroke', 'currentColor');
        p.setAttribute('stroke-width', '3.5');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('fill', 'none');
        sym.appendChild(p);
        defs.appendChild(sym);
    })();

    /* ---------------------------------------------------------
       3) قراءة تقدّم الأقسام (نفس بيانات الصفحات الأخرى)
       --------------------------------------------------------- */
    function readOperation(prefix) {
        var raw = readJSON(prefix + childId);
        var out = { completed: 0, correct: 0, stars: 0 };
        if (!raw || typeof raw !== 'object' || !raw.levels) { return out; }
        for (var i = 1; i <= LEVELS_PER_OPERATION; i++) {
            var lv = raw.levels[i];
            if (!lv || typeof lv !== 'object') { continue; }
            var done = lv.completed === true;
            if (done) { out.completed += 1; }
            out.correct += done ? QUESTIONS_PER_LEVEL : clamp(toInt(lv.correct), 0, QUESTIONS_PER_LEVEL);
            out.stars += clamp(toInt(lv.stars), 0, 99);
        }
        return out;
    }

    /*
       قسم الأرقام: يُتوقع كائن { learned: [1..10], stars: n, correct: n }.
       إذا لم يوجد المفتاح تُعرض القيم صفرًا (غير متصل بعد).
    */
    function readNumbers() {
        var raw = readJSON(KEYS.numbers + childId);
        var out = { learned: 0, learnedSet: {}, correct: 0, stars: 0 };
        if (!raw || typeof raw !== 'object') { return out; }
        if (Array.isArray(raw.learned)) {
            raw.learned.forEach(function (n) {
                n = toInt(n);
                if (n >= 1 && n <= NUMBERS_TOTAL) { out.learnedSet[n] = true; }
            });
        }
        out.learned = Object.keys(out.learnedSet).length;
        out.correct = Math.max(0, toInt(raw.correct));
        out.stars = clamp(toInt(raw.stars), 0, 9999);
        return out;
    }

    function collect() {
        var add = readOperation(KEYS.addition);
        var sub = readOperation(KEYS.subtraction);
        var num = readNumbers();
        var stars = add.stars + sub.stars + num.stars;
        var unitsDone = add.correct + sub.correct + num.learned;
        var unitsAll = 2 * LEVELS_PER_OPERATION * QUESTIONS_PER_LEVEL + NUMBERS_TOTAL;
        return {
            add: add, sub: sub, num: num,
            stars: stars,
            levelsDone: add.completed + sub.completed,
            levelsAll: 2 * LEVELS_PER_OPERATION,
            correct: add.correct + sub.correct + num.correct,
            percent: Math.round(unitsDone / unitsAll * 100),
            childLevel: Math.floor(stars / STARS_PER_LEVEL) + 1,
            xp: stars % STARS_PER_LEVEL
        };
    }

    /* ---------------------------------------------------------
       4) تعريف الشارات (أضف شارة جديدة بإضافة عنصر هنا فقط)
       --------------------------------------------------------- */
    var BADGES = [
        { id: 'first-step', name: 'أول خطوة', desc: 'إكمال أول درس', color: 'blue', icon: 'i-book',
          test: function (d) { return d.levelsDone >= 1 || d.num.learned >= 1; } },
        { id: 'number-lover', name: 'محب الأرقام', desc: 'إكمال تعلّم الأرقام من 1 إلى 10', color: 'orange', text: '123',
          test: function (d) { return d.num.learned >= NUMBERS_TOTAL; } },
        { id: 'addition-hero', name: 'بطل الجمع', desc: 'إكمال جميع مستويات الجمع', color: 'purple', icon: 'i-plus',
          test: function (d) { return d.add.completed >= LEVELS_PER_OPERATION; } },
        { id: 'subtraction-hero', name: 'بطل الطرح', desc: 'إكمال جميع مستويات الطرح', color: 'gold', icon: 'i-minus',
          test: function (d) { return d.sub.completed >= LEVELS_PER_OPERATION; } },
        { id: 'master-learner', name: 'المتعلم المتميز', desc: 'إكمال جميع المستويات', color: 'orange', icon: 'i-star',
          test: function (d) {
              return d.add.completed >= LEVELS_PER_OPERATION && d.sub.completed >= LEVELS_PER_OPERATION &&
                  d.num.learned >= NUMBERS_TOTAL;
          } },
        { id: 'star-collector', name: 'جامع النجوم', desc: 'جمع ' + STAR_COLLECTOR_GOAL + ' نجمة', color: 'gold', icon: 'i-star',
          test: function (d) { return d.stars >= STAR_COLLECTOR_GOAL; } },
        { id: 'active-learner', name: 'المتعلم النشيط', desc: 'إكمال ' + ACTIVE_LEARNER_GOAL + ' مستويات', color: 'purple', icon: 'i-flame',
          test: function (d) { return d.levelsDone >= ACTIVE_LEARNER_GOAL; } }
    ];

    /* ---------------------------------------------------------
       5) الإنجازات المكتسبة (تاريخ الحصول فقط، لمنع التكرار)
       --------------------------------------------------------- */
    function loadEarned() {
        var raw = readJSON(KEYS.achievements + childId);
        var earned = {};
        if (raw && typeof raw === 'object' && raw.earned && typeof raw.earned === 'object') {
            Object.keys(raw.earned).forEach(function (id) {
                if (typeof raw.earned[id] === 'string') { earned[id] = raw.earned[id]; }
            });
        }
        return earned;
    }

    function saveEarned(earned) { writeJSON(KEYS.achievements + childId, { earned: earned }); }

    /* يعيد الشارات الجديدة فقط، ويحفظها فورًا حتى لا تُمنح مرتين */
    function evaluate(data) {
        var earned = loadEarned();
        var fresh = [];
        BADGES.forEach(function (b) {
            if (!earned[b.id] && b.test(data)) {
                earned[b.id] = new Date().toISOString();
                fresh.push(b);
            }
        });
        if (fresh.length) { saveEarned(earned); }
        return { earned: earned, fresh: fresh };
    }

    /* ---------------------------------------------------------
       6) رسم الصفحة
       --------------------------------------------------------- */
    function medalIcon(b, size) {
        if (b.text) {
            var t = el('span', 'medal-text', b.text);
            t.style.fontSize = size > 40 ? '1.5rem' : '1.2rem';
            return t;
        }
        return svgUse(b.icon, size || 34, 'medal-icon');
    }

    function setText(sel, text) { var n = $(sel); if (n) { n.textContent = String(text); } }

    function renderStats(d) {
        setText('#total-stars', d.stars);
        setText('#level-number', d.childLevel);
        setText('#level-xp', d.xp);
        setText('#level-xp-max', STARS_PER_LEVEL);
        var bar = $('#level-progress');
        if (bar) {
            bar.max = STARS_PER_LEVEL;
            bar.value = d.xp;
            bar.textContent = Math.round(d.xp / STARS_PER_LEVEL * 100) + '%';
        }

        var extra = [
            { id: 'stat-levels',  value: ltr(d.levelsDone + ' / ' + d.levelsAll), label: 'المستويات المكتملة' },
            { id: 'stat-correct', value: String(d.correct),                       label: 'الإجابات الصحيحة' },
            { id: 'stat-percent', value: d.percent + '%',                         label: 'نسبة الإنجاز الإجمالية' },
            { id: 'stat-numbers', value: ltr(d.num.learned + ' / ' + NUMBERS_TOTAL), label: 'الأرقام التي تعلمتها' }
        ];
        var grid = $('.ach-stats');
        if (!grid) { return; }
        extra.forEach(function (s) {
            var card = document.getElementById(s.id);
            if (!card) {
                card = el('article', 'dash-card stat-card');
                card.id = s.id;
                card.style.justifyContent = 'center';
                card.style.textAlign = 'center';
                var box = el('div', 'dash-text stars-text');
                box.appendChild(el('strong', 'stars-count'));
                box.appendChild(el('p', null, s.label));
                card.appendChild(box);
                grid.appendChild(card);
            }
            $('.stars-count', card).textContent = s.value;
        });
    }

    function formatDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return { text: '', iso: '' }; }
        var text;
        try { text = d.toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' }); }
        catch (e) { text = iso.slice(0, 10); }
        return { text: text, iso: iso.slice(0, 10) };
    }

    function renderLatest(earned) {
        var grid = $('#latest-achievements');
        if (!grid) { return; }
        var parent = grid.parentNode;
        var empty = $('#latest-empty', parent);
        var list = BADGES.filter(function (b) { return earned[b.id]; }).sort(function (a, b) {
            return earned[b.id] < earned[a.id] ? -1 : (earned[b.id] > earned[a.id] ? 1 : 0);
        }).slice(0, 3);

        while (grid.firstChild) { grid.removeChild(grid.firstChild); }

        if (!list.length) {
            grid.style.display = 'none';
            if (!empty) {
                empty = el('div', 'empty-state');
                empty.id = 'latest-empty';
                empty.appendChild(el('h3', null, 'رحلتك تبدأ من هنا!'));
                empty.appendChild(el('p', null, 'أكمل أول درس لتحصل على أول إنجاز'));
                parent.insertBefore(empty, grid.nextSibling);
            }
            return;
        }
        grid.style.display = '';
        if (empty) { parent.removeChild(empty); }

        list.forEach(function (b) {
            var card = el('article', 'latest-card');
            card.dataset.achievementId = b.id;
            var medal = el('div', 'medal medal-small medal-' + b.color);
            medal.appendChild(medalIcon(b, 32));
            card.appendChild(medal);
            card.appendChild(el('h3', null, b.name));
            card.appendChild(el('p', 'latest-desc', b.desc));
            var f = formatDate(earned[b.id]);
            var t = el('time', 'latest-date', f.text);
            t.setAttribute('datetime', f.iso);
            card.appendChild(t);
            grid.appendChild(card);
        });
    }

    function renderBadges(earned) {
        var ul = $('#badges');
        if (!ul) { return; }
        BADGES.forEach(function (b) {
            var li = $('[data-badge-id="' + b.id + '"]', ul);
            if (!li) {
                li = el('li', 'badge-card');
                li.dataset.badgeId = b.id;
                ul.appendChild(li);
            }
            var on = !!earned[b.id];
            li.classList.toggle('is-earned', on);
            li.dataset.earned = String(on);
            li.dataset.condition = b.desc;
            li.title = b.desc;
            while (li.firstChild) { li.removeChild(li.firstChild); }

            var medal = el('div', 'medal medal-badge ' + (on ? 'medal-' + b.color : 'is-locked'));
            medal.appendChild(on ? medalIcon(b, 34) : svgUse('i-lock', 30, 'lock-icon'));
            li.appendChild(medal);
            li.appendChild(el('span', 'badge-name', b.name));
            li.appendChild(el('span', 'latest-desc', b.desc));
            li.appendChild(el('span', 'visually-hidden', (on ? 'مكتسبة: ' : 'مقفلة: ') + b.desc));
        });
    }

    /* ---------------------------------------------------------
       7) رسالة التهنئة والمؤثرات الاحتفالية
       --------------------------------------------------------- */
    var queue = [];
    var showing = false;

    function confetti() {
        if (reduceMotion) { return; }
        var colors = ['#ffc727', '#ff8a1f', '#6a4fd8', '#1e88e5', '#2fb36b', '#e5484d'];
        var layer = el('div');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;inset:0;z-index:1100;pointer-events:none;overflow:hidden';
        for (var i = 0; i < 40; i++) {
            var p = el('span');
            var size = 8 + Math.random() * 8;
            p.style.cssText = 'position:absolute;top:-20px;left:' + (Math.random() * 100) + '%;width:' + size + 'px;height:' +
                (size * 1.4) + 'px;border-radius:2px;background:' + colors[i % colors.length];
            layer.appendChild(p);
            animate(p, [
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: 'translateY(' + (window.innerHeight + 40) + 'px) translateX(' + ((Math.random() - 0.5) * 160) + 'px) rotate(' + (360 + Math.random() * 360) + 'deg)', opacity: 0.9 }
            ], { duration: 1800 + Math.random() * 1400, delay: Math.random() * 400, easing: 'ease-in', fill: 'forwards' });
        }
        document.body.appendChild(layer);
        window.setTimeout(function () { if (layer.parentNode) { layer.parentNode.removeChild(layer); } }, 3800);
    }

    function showNext() {
        if (showing || !queue.length) { return; }
        showing = true;
        var b = queue.shift();

        var overlay = el('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ach-dialog-title');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;' +
            'padding:1rem;background:rgba(27,42,92,.5)';

        var card = el('div');
        card.style.cssText = 'width:min(400px,100%);padding:1.6rem 1.4rem;text-align:center;background:#fff6d8;' +
            'border:3px solid #ffe9a3;border-radius:28px;box-shadow:0 18px 50px rgba(0,0,0,.3);color:var(--navy,#1b2a5c)';
        var medal = el('div', 'medal medal-badge medal-' + b.color);
        medal.style.margin = '0 auto 0.6rem';
        medal.appendChild(medalIcon(b, 34));
        card.appendChild(medal);
        var h = el('h2', null, 'إنجاز جديد! مبروك يا بطل 🎉');
        h.id = 'ach-dialog-title';
        h.style.cssText = 'margin:0 0 0.3rem;font-size:1.3rem;font-weight:800';
        card.appendChild(h);
        var n = el('p', null, b.name);
        n.style.cssText = 'margin:0;font-size:1.6rem;font-weight:800';
        card.appendChild(n);
        var d = el('p', null, b.desc);
        d.style.cssText = 'margin:0.2rem 0 1rem;font-weight:700;opacity:.8';
        card.appendChild(d);
        var btn = el('button', 'btn-next btn-confirm', 'رائع!');
        btn.type = 'button';
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        animate(card, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
        animate(medal, [{ transform: 'scale(.6) rotate(-20deg)' }, { transform: 'scale(1.15) rotate(8deg)' }, { transform: 'scale(1) rotate(0)' }],
            { duration: 700, easing: 'ease-out' });
        confetti();
        btn.focus();

        function close() {
            document.removeEventListener('keydown', onKey, true);
            if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
            showing = false;
            showNext();
        }
        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'Tab') { e.preventDefault(); }
        }
        btn.addEventListener('click', close);
        document.addEventListener('keydown', onKey, true);
    }

    function celebrate(list) {
        list.forEach(function (b) { queue.push(b); });
        showNext();
    }

    /* ---------------------------------------------------------
       8) التحديث التلقائي
       --------------------------------------------------------- */
    function refresh() {
        var data = collect();
        var res = evaluate(data);
        renderStats(data);
        renderBadges(res.earned);
        renderLatest(res.earned);
        celebrate(res.fresh);
    }

    // تقدّم جديد من صفحة أخرى (تبويب آخر) أو العودة إلى هذه الصفحة
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key.indexOf('batboot:') === 0) { refresh(); }
    });
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { refresh(); } });

    refresh();
})();