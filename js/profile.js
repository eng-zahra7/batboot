/* =========================================================
   بطبوط - صفحة الملف الشخصي (profile.js)
   - الإحصائيات كلها تُقرأ من بيانات الأقسام الفعلية في localStorage (الجمع والطرح والأرقام)
     بنفس مفاتيحها وصيغتها التي يقرأها achievements.js، فتتطابق الصفحتان.
   - بيانات الطفل (الاسم، الصورة، العمر...) في سجل واحد:  batboot:profile:v1:<child>
     وهو نقطة الربط مع التسجيل: أي صفحة تسجيل تكتب هذا السجل تظهر بياناته هنا مباشرة.
   - تعديل الاسم والصورة يتم من نافذة تُفتح فوق الصفحة (لا تغيير في HTML/CSS).
   ========================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       1) الإعدادات
       --------------------------------------------------------- */
    var KEYS = {
        addition:    'batboot:addition:v1:',     // يكتبها addition.js
        subtraction: 'batboot:subtraction:v1:',  // يكتبها subtraction.js
        numbers:     'batboot:numbers:v1:',      // ← يُعدَّل هنا إن اختلف مفتاح صفحة الأرقام
        profile:     'batboot:profile:v1:'       // سجل الطفل (التسجيل + هذه الصفحة)
    };

    // نفس ثوابت achievements.js حتى تتطابق الأرقام بين الصفحتين
    var LEVELS_PER_OPERATION = 5;
    var QUESTIONS_PER_LEVEL  = 3;
    var NUMBERS_TOTAL        = 10;
    var STARS_PER_LEVEL      = 15;

    var NAME_MAX = 20;

    // الصور الرمزية المتاحة (كلها صور موجودة في مجلد rec الذي تستخدمه صفحات الموقع)
    var AVATARS = [
        { id: 'duckling-blue',   name: 'البطة الزرقاء',  src: 'rec/Glossy Duckling Blue Badge.png' },
        { id: 'chick-head',      name: 'الكتكوت',        src: 'rec/Glossy Kawaii Chick Head Sticker.png' },
        { id: 'duckling-pencil', name: 'بطبوط والقلم',   src: 'rec/Cheerful Duckling Sticker with Pencil.png' },
        { id: 'chick-trophy',    name: 'بطل الكأس',      src: 'rec/Triumphant Chick with Trophy Sticker.png' }
    ];

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
    function ltr(t) { return '⁦' + t + '⁩'; }
    function setText(sel, text) { var n = $(sel); if (n) { n.textContent = String(text); } }

    function readJSON(key) {
        try { var raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
        catch (e) { return null; }
    }
    function writeJSON(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }

    function animate(node, frames, opts) {
        if (reduceMotion || !node || !node.animate) { return; }
        try { node.animate(frames, opts); } catch (e) { /* لا شيء */ }
    }

    function yearsWord(n) {
        if (n === 1) { return 'سنة واحدة'; }
        if (n === 2) { return 'سنتان'; }
        return n + (n <= 10 ? ' سنوات' : ' سنة');
    }

    function formatDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return ''; }
        try { return d.toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' }); }
        catch (e) { return String(iso).slice(0, 10); }
    }

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

    var main = $('.profile-main');
    if (!main) { return; }

    // الصفحة تحمل data-child-id="0" كقيمة مبدئية؛ نعاملها كالضيف مثل بقية الصفحات (guest)
    var rawChild = main.dataset.childId;
    var childId = (rawChild && rawChild !== '0') ? rawChild : 'guest';

    /* رموز إضافية في نفس مجموعة الأيقونات */
    (function addSymbols() {
        var defs = $('.svg-sprite defs');
        if (!defs) { return; }
        function add(id, markup) {
            if ($('#' + id, defs)) { return; }
            var holder = document.createElementNS(SVGNS, 'svg');
            holder.innerHTML = '<symbol id="' + id + '" viewBox="0 0 24 24">' + markup + '</symbol>';
            defs.appendChild(holder.firstChild);
        }
        add('i-book', '<path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" fill="currentColor"/>');
        add('i-target', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
            '<circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>');
    })();

    /* ---------------------------------------------------------
       3) قراءة التقدّم من الأقسام التعليمية
       --------------------------------------------------------- */
    function readOperation(prefix) {
        var raw = readJSON(prefix + childId);
        var out = { completed: 0, correct: 0, stars: 0, days: [] };
        if (!raw || typeof raw !== 'object' || !raw.levels) { return out; }
        for (var i = 1; i <= LEVELS_PER_OPERATION; i++) {
            var lv = raw.levels[i];
            if (!lv || typeof lv !== 'object') { continue; }
            var done = lv.completed === true;
            if (done) {
                out.completed += 1;
                if (typeof lv.completedAt === 'string') { out.days.push(lv.completedAt); }
            }
            out.correct += done ? QUESTIONS_PER_LEVEL : clamp(toInt(lv.correct), 0, QUESTIONS_PER_LEVEL);
            out.stars += clamp(toInt(lv.stars), 0, 99);
        }
        return out;
    }

    /* قسم الأرقام: يُتوقع { learned: [1..10], stars, correct } (غير موجود = صفر) */
    function readNumbers() {
        var raw = readJSON(KEYS.numbers + childId);
        var out = { learned: 0, correct: 0, stars: 0 };
        if (!raw || typeof raw !== 'object') { return out; }
        var set = {};
        if (Array.isArray(raw.learned)) {
            raw.learned.forEach(function (n) { n = toInt(n); if (n >= 1 && n <= NUMBERS_TOTAL) { set[n] = true; } });
        }
        out.learned = Object.keys(set).length;
        out.correct = Math.max(0, toInt(raw.correct));
        out.stars = clamp(toInt(raw.stars), 0, 9999);
        return out;
    }

    function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

    /* أيام متتالية: أيام إكمال المستويات الفعلية، تنتهي اليوم أو أمس */
    function computeStreak(isoDates) {
        var days = {};
        isoDates.forEach(function (s) { var d = new Date(s); if (!isNaN(d.getTime())) { days[dayKey(d)] = true; } });
        var cursor = new Date();
        if (!days[dayKey(cursor)]) { cursor.setDate(cursor.getDate() - 1); }
        var n = 0;
        while (days[dayKey(cursor)]) { n++; cursor.setDate(cursor.getDate() - 1); }
        return n;
    }

    function collect() {
        var add = readOperation(KEYS.addition);
        var sub = readOperation(KEYS.subtraction);
        var num = readNumbers();
        var stars = add.stars + sub.stars + num.stars;
        var opQuestions = LEVELS_PER_OPERATION * QUESTIONS_PER_LEVEL;
        var unitsAll = 2 * opQuestions + NUMBERS_TOTAL;
        return {
            add: add, sub: sub, num: num,
            stars: stars,
            level: Math.floor(stars / STARS_PER_LEVEL) + 1,
            xp: stars % STARS_PER_LEVEL,
            lessons: add.completed + sub.completed,
            lessonsAll: 2 * LEVELS_PER_OPERATION,
            percent: Math.round((add.correct + sub.correct + num.learned) / unitsAll * 100),
            streak: computeStreak(add.days.concat(sub.days)),
            opQuestions: opQuestions
        };
    }

    /* ---------------------------------------------------------
       4) سجل الطفل (الاسم، الصورة، العمر، التسجيل)
       --------------------------------------------------------- */
    function avatarById(id) {
        for (var i = 0; i < AVATARS.length; i++) { if (AVATARS[i].id === id) { return AVATARS[i]; } }
        return null;
    }

    function loadProfile() {
        var raw = readJSON(KEYS.profile + childId);
        var p = { name: '', avatar: '', birthDate: '', age: 0, gender: '', language: '', registeredAt: '' };
        if (!raw || typeof raw !== 'object') { return p; }
        if (typeof raw.name === 'string') { p.name = raw.name.trim().slice(0, NAME_MAX); }
        if (typeof raw.avatar === 'string' && avatarById(raw.avatar)) { p.avatar = raw.avatar; }
        if (typeof raw.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.birthDate) && !isNaN(new Date(raw.birthDate).getTime())) { p.birthDate = raw.birthDate; }
        var age = toInt(raw.age);
        if (age >= 1 && age <= 18) { p.age = age; }
        if (typeof raw.gender === 'string') { p.gender = raw.gender.slice(0, 20); }
        if (typeof raw.language === 'string') { p.language = raw.language.slice(0, 20); }
        if (typeof raw.registeredAt === 'string' && !isNaN(new Date(raw.registeredAt).getTime())) { p.registeredAt = raw.registeredAt; }
        return p;
    }

    /* يحفظ الاسم والصورة دون المساس بباقي حقول التسجيل في السجل */
    function saveProfile(name, avatarId) {
        var raw = readJSON(KEYS.profile + childId);
        if (!raw || typeof raw !== 'object') { raw = {}; }
        raw.name = name;
        raw.avatar = avatarId;
        if (typeof raw.registeredAt !== 'string' || isNaN(new Date(raw.registeredAt).getTime())) {
            raw.registeredAt = new Date().toISOString();
        }
        return writeJSON(KEYS.profile + childId, raw);
    }

    function ageOf(p) {
        if (p.birthDate) {
            var b = new Date(p.birthDate), now = new Date();
            var a = now.getFullYear() - b.getFullYear();
            var m = now.getMonth() - b.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < b.getDate())) { a--; }
            return a >= 0 ? a : 0;
        }
        return p.age || 0;
    }

    var GENDERS = { male: 'ولد', boy: 'ولد', female: 'بنت', girl: 'بنت' };
    var LANGS = { ar: 'العربية', en: 'الإنجليزية' };
    var NOT_SET = 'غير مسجّل';

    // الصورة الأصلية في الصفحة تبقى الصورة الافتراضية
    var imgEl = $('#profile_image');
    var defaultAvatarSrc = imgEl ? imgEl.getAttribute('src') : AVATARS[0].src;

    /* ---------------------------------------------------------
       5) رسم الصفحة
       --------------------------------------------------------- */
    function ensureInfoItem(id, label, afterId) {
        var dd = document.getElementById(id);
        if (dd) { return dd; }
        var dl = $('.info-card');
        if (!dl) { return null; }
        var item = el('div', 'info-item');
        item.appendChild(el('dt', null, label));
        dd = el('dd');
        dd.id = id;
        item.appendChild(dd);
        var anchor = document.getElementById(afterId);
        var anchorItem = anchor && anchor.closest('.info-item');
        if (anchorItem && anchorItem.nextSibling) { dl.insertBefore(item, anchorItem.nextSibling); }
        else { dl.appendChild(item); }
        return dd;
    }

    function ensureStatRow(id, iconId, color, label) {
        var row = document.getElementById(id);
        if (row) { return row; }
        var card = $('.stats-card');
        if (!card) { return null; }
        row = el('div', 'stat-row');
        row.id = id;
        var icon = svgUse(iconId, 56, 'stat-icon');
        icon.style.color = color;
        row.appendChild(icon);
        var text = el('div', 'stat-text');
        text.appendChild(el('strong'));
        text.appendChild(el('span', null, label));
        row.appendChild(text);
        card.appendChild(row);
        return row;
    }

    function renderIdentity(p) {
        var name = p.name || 'بطل بطبوط';
        setText('#child_name', name);
        setText('#info_name', p.name || NOT_SET);
        var av = avatarById(p.avatar);
        if (imgEl) {
            imgEl.setAttribute('src', av ? av.src : defaultAvatarSrc);
            imgEl.setAttribute('alt', 'صورة ' + name);
        }

        var bd = $('#birth_date');
        if (bd) {
            bd.textContent = p.birthDate ? formatDate(p.birthDate + 'T00:00:00') : NOT_SET;
            if (p.birthDate) { bd.setAttribute('datetime', p.birthDate); } else { bd.removeAttribute('datetime'); }
        }
        setText('#gender', p.gender ? (GENDERS[p.gender.toLowerCase()] || p.gender) : NOT_SET);
        setText('#preferred_language', p.language ? (LANGS[p.language.toLowerCase()] || p.language) : NOT_SET);

        var age = ageOf(p);
        var ageDd = ensureInfoItem('child_age', 'العمر', 'birth_date');
        if (ageDd) { ageDd.textContent = age ? yearsWord(age) : NOT_SET; }
        var regDd = ensureInfoItem('registration_date', 'تاريخ التسجيل', 'child_age');
        if (regDd) { regDd.textContent = p.registeredAt ? formatDate(p.registeredAt) : NOT_SET; }
    }

    function renderStats(d) {
        setText('#current_level', d.level);
        setText('#level_xp', d.xp);
        setText('#level_xp_max', STARS_PER_LEVEL);
        var bar = $('#level_progress');
        if (bar) {
            bar.max = STARS_PER_LEVEL;
            bar.value = d.xp;
            bar.textContent = Math.round(d.xp / STARS_PER_LEVEL * 100) + '%';
        }
        setText('#total_stars', d.stars);
        setText('#streak_days', d.streak);

        var lessons = ensureStatRow('stat_lessons', 'i-book', '#2f8cf0', 'الدروس المكتملة');
        if (lessons) { $('strong', lessons).textContent = ltr(d.lessons + ' / ' + d.lessonsAll); }
        var prog = ensureStatRow('stat_progress', 'i-target', '#2fb36b', 'نسبة التقدم في التعلم');
        if (prog) { $('strong', prog).textContent = d.percent + '%'; }
    }

    /* كورساتي: الرياضيات من البيانات الحقيقية، واللغتان صفر حتى يتصل قسماهما */
    function renderCourses(d) {
        var map = { math: d.percent, arabic: 0, english: 0 };
        Object.keys(map).forEach(function (id) {
            var li = $('[data-course-id="' + id + '"]', main);
            if (!li) { return; }
            var bar = $('.progress-bar', li);
            if (bar) { bar.value = map[id]; bar.max = 100; bar.textContent = map[id] + '%'; }
            var pct = $('.course-percent', li);
            if (pct) { pct.textContent = map[id] + '%'; }
        });
    }

    var SECTIONS = [
        { id: 'numbers',     name: 'تعلّم الأرقام', icon: '123', color: 'course-pink',
          get: function (d) { return { done: d.num.learned, doneAll: NUMBERS_TOTAL, doneLabel: 'الأرقام المتعلَّمة',
              correct: d.num.correct, percent: Math.round(d.num.learned / NUMBERS_TOTAL * 100), stars: d.num.stars }; } },
        { id: 'addition',    name: 'الجمع', icon: '+', color: 'course-green',
          get: function (d) { return { done: d.add.completed, doneAll: LEVELS_PER_OPERATION, doneLabel: 'المستويات المكتملة',
              correct: d.add.correct, percent: Math.round(d.add.correct / d.opQuestions * 100), stars: d.add.stars }; } },
        { id: 'subtraction', name: 'الطرح', icon: '−', color: 'course-blue',
          get: function (d) { return { done: d.sub.completed, doneAll: LEVELS_PER_OPERATION, doneLabel: 'المستويات المكتملة',
              correct: d.sub.correct, percent: Math.round(d.sub.correct / d.opQuestions * 100), stars: d.sub.stars }; } }
    ];

    function renderSections(d) {
        var wrap = document.getElementById('learning_stats');
        if (!wrap) {
            var sec = el('section', 'profile-section');
            sec.setAttribute('aria-labelledby', 'learning-title');
            var h = el('h2', 'section-title', 'إحصائيات التعلم');
            h.id = 'learning-title';
            sec.appendChild(h);
            wrap = el('ul', 'course-list');
            wrap.id = 'learning_stats';
            sec.appendChild(wrap);
            var info = $('#info-title');
            var infoSection = info && info.closest('.profile-section');
            if (infoSection) { main.insertBefore(sec, infoSection); } else { main.appendChild(sec); }
        }

        SECTIONS.forEach(function (s) {
            var v = s.get(d);
            var li = $('[data-section-id="' + s.id + '"]', wrap);
            if (!li) {
                li = el('li', 'dash-card course-card');
                li.dataset.sectionId = s.id;
                li.style.flexWrap = 'wrap';
                var icon = el('span', 'dash-icon course-icon ' + s.color, s.icon);
                icon.setAttribute('aria-hidden', 'true');
                li.appendChild(icon);
                li.appendChild(el('h3', 'course-name', s.name));
                var bar = el('progress', 'progress-bar');
                bar.max = 100;
                bar.setAttribute('aria-label', 'تقدم ' + s.name);
                li.appendChild(bar);
                li.appendChild(el('span', 'course-percent'));
                var mini = el('div', 'section-mini');
                mini.style.cssText = 'flex:1 1 100%;display:flex;flex-wrap:wrap;gap:0.3rem 1.6rem;padding-bottom:0.4rem;' +
                    'font-weight:700;color:var(--navy,#1b2a5c)';
                ['done', 'correct', 'stars'].forEach(function (k) { var sp = el('span'); sp.dataset.k = k; mini.appendChild(sp); });
                li.appendChild(mini);
                wrap.appendChild(li);
            }
            var b = $('.progress-bar', li);
            b.value = v.percent;
            b.textContent = v.percent + '%';
            $('.course-percent', li).textContent = v.percent + '%';
            $('[data-k="done"]', li).textContent = v.doneLabel + ': ' + ltr(v.done + ' / ' + v.doneAll);
            $('[data-k="correct"]', li).textContent = 'الإجابات الصحيحة: ' + v.correct;
            $('[data-k="stars"]', li).textContent = 'النجوم: ' + v.stars;
        });
    }

    function render() {
        var d = collect();
        renderIdentity(loadProfile());
        renderStats(d);
        renderCourses(d);
        renderSections(d);
    }

    /* ---------------------------------------------------------
       6) نافذة تعديل الاسم والصورة
       --------------------------------------------------------- */
    var dialogOpen = false;
    var lastFocus = null;

    function openEditor() {
        if (dialogOpen) { return; }
        dialogOpen = true;
        lastFocus = document.activeElement;
        var p = loadProfile();
        var chosen = p.avatar || (avatarById('duckling-blue') ? 'duckling-blue' : AVATARS[0].id);

        var overlay = el('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'profile-edit-title');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;' +
            'padding:1rem;background:rgba(27,42,92,.5);overflow:auto';

        var form = el('form');
        form.noValidate = true;
        form.style.cssText = 'width:min(460px,100%);padding:1.5rem;background:#fffef8;border:3px solid #b9d7f8;border-radius:28px;' +
            'box-shadow:0 18px 50px rgba(0,0,0,.3);color:var(--navy,#1b2a5c)';

        var title = el('h2', null, 'تعديل ملفي الشخصي');
        title.id = 'profile-edit-title';
        title.style.cssText = 'margin:0 0 1rem;font-size:1.5rem;font-weight:800;text-align:center';
        form.appendChild(title);

        // الاسم
        var nameLabel = el('label', null, 'اسمي');
        nameLabel.setAttribute('for', 'profile-edit-name');
        nameLabel.style.cssText = 'display:block;margin-bottom:0.3rem;font-weight:800';
        var input = el('input');
        input.id = 'profile-edit-name';
        input.type = 'text';
        input.maxLength = NAME_MAX;
        input.value = p.name;
        input.autocomplete = 'off';
        input.placeholder = 'اكتب اسمك هنا';
        input.style.cssText = 'width:100%;box-sizing:border-box;padding:0.6rem 1rem;font:inherit;font-size:1.3rem;font-weight:700;' +
            'color:inherit;background:#fff;border:3px solid #b9d7f8;border-radius:18px';
        form.appendChild(nameLabel);
        form.appendChild(input);

        var err = el('p');
        err.setAttribute('role', 'alert');
        err.style.cssText = 'min-height:1.4em;margin:0.3rem 0 0.6rem;font-weight:700;color:#d33a3f';
        form.appendChild(err);

        // الصور الرمزية
        var fs = el('fieldset');
        fs.style.cssText = 'margin:0 0 1rem;padding:0;border:0';
        var legend = el('legend', null, 'اختر صورتي');
        legend.style.cssText = 'padding:0;margin-bottom:0.5rem;font-weight:800';
        fs.appendChild(legend);
        var grid = el('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:0.7rem';
        fs.appendChild(grid);

        function paint() {
            Array.prototype.forEach.call(grid.children, function (lab) {
                var on = lab.firstChild.value === chosen;
                lab.style.borderColor = on ? '#2f8cf0' : '#dbe6f3';
                lab.style.background = on ? '#dff0ff' : '#fff';
            });
        }

        AVATARS.forEach(function (a) {
            var lab = el('label');
            lab.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;gap:0.3rem;padding:0.5rem;' +
                'cursor:pointer;border:3px solid #dbe6f3;border-radius:20px;font-size:0.85rem;font-weight:700;text-align:center';
            var r = el('input');
            r.type = 'radio';
            r.name = 'avatar';
            r.value = a.id;
            r.checked = a.id === chosen;
            r.style.cssText = 'position:absolute;opacity:0;inset:0;margin:0;cursor:pointer';
            r.addEventListener('change', function () { chosen = a.id; paint(); });
            r.addEventListener('focus', function () { lab.style.outline = '3px solid #ffc727'; lab.style.outlineOffset = '2px'; });
            r.addEventListener('blur', function () { lab.style.outline = ''; });
            var img = el('img');
            img.src = a.src;
            img.alt = '';
            img.width = 72; img.height = 72;
            img.style.cssText = 'width:72px;height:72px;border-radius:50%;object-fit:cover;background:#dff0ff';
            lab.appendChild(r);
            lab.appendChild(img);
            lab.appendChild(el('span', null, a.name));
            grid.appendChild(lab);
        });
        paint();
        form.appendChild(fs);

        // الأزرار
        var row = el('div');
        row.style.cssText = 'display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap';
        var save = el('button', 'btn-next btn-confirm', 'حفظ التعديلات');
        save.type = 'submit';
        var cancel = el('button', null, 'إلغاء');
        cancel.type = 'button';
        cancel.style.cssText = 'padding:0.7rem 1.6rem;font:inherit;font-size:1.15rem;font-weight:800;color:inherit;cursor:pointer;' +
            'background:#eaf3ff;border:2px solid #b9d7f8;border-radius:999px';
        row.appendChild(save);
        row.appendChild(cancel);
        form.appendChild(row);

        overlay.appendChild(form);
        document.body.appendChild(overlay);
        animate(form, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
        input.focus();
        input.select();

        function close() {
            document.removeEventListener('keydown', onKey, true);
            if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
            dialogOpen = false;
            if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
        }

        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            if (e.key !== 'Tab') { return; }
            var f = Array.prototype.slice.call(form.querySelectorAll('input,button')).filter(function (n) { return n.type !== 'radio' || n.checked; });
            if (!f.length) { return; }
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        document.addEventListener('keydown', onKey, true);
        cancel.addEventListener('click', close);
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) { close(); } });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = input.value.replace(/\s+/g, ' ').trim();
            if (!name) {
                err.textContent = 'اكتب اسمك أولًا يا بطل!';
                animate(input, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
                input.focus();
                return;
            }
            if (!saveProfile(name.slice(0, NAME_MAX), chosen)) {
                err.textContent = 'تعذّر الحفظ في هذا المتصفح. حاول مرة أخرى.';
                return;
            }
            close();
            render();
            animate($('.profile-card'), [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 400 });
        });
    }

    function bindEditLinks() {
        // الروابط الأصلية نحو edit-profile.html تفتح النافذة بدل الانتقال
        ['.name-edit', '.btn-edit'].forEach(function (sel) {
            var a = $(sel, main);
            if (!a) { return; }
            a.addEventListener('click', function (e) { e.preventDefault(); openEditor(); });
        });
        if (imgEl) {
            imgEl.style.cursor = 'pointer';
            imgEl.addEventListener('click', openEditor);
        }
    }

    /* ---------------------------------------------------------
       7) التحديث التلقائي
       --------------------------------------------------------- */
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key.indexOf('batboot:') === 0) { if (!dialogOpen) { render(); } }
    });
    window.addEventListener('pageshow', function () { if (!dialogOpen) { render(); } });

    bindEditLinks();
    render();
})();