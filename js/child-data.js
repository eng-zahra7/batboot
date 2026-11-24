/* =========================================================
   بطبوط - ربط صفحات الطفل ببيانات MySQL (js/child-data.js)
   الصفحات: main-page.html / profile.html / edit-profile.html
   - يجلب بيانات الطفل الحالي من php/me.php (جلسة PHP) ويملأ العناصر الموجودة
     أصلًا في الصفحة بالـ id، دون إنشاء عناصر جديدة (باستثناء قائمة اختيار الطفل
     التي تظهر فقط عندما يكون لدى ولي الأمر أكثر من طفل).
   - الصفحة تبقى مخفية حتى تصل البيانات، فلا تظهر القيم التجريبية القديمة.
   - بدون جلسة صالحة (401) => تحويل إلى login.html.
   ========================================================= */
(function () {
    'use strict';

    // نخفي الصفحة فورًا (السكربت في <head>) إلى أن تصل البيانات الحقيقية
    var root = document.documentElement;
    root.style.visibility = 'hidden';

    var API = {
        me: 'php/me.php',
        select: 'php/select-child.php',
        update: 'php/update-profile.php'
    };
    var LOGIN_PAGE = 'login.html';
    var GENDER_LABEL = { boy: 'ولد', girl: 'بنت' };
    var LANGUAGE_LABEL = { ar: 'العربية', en: 'English' };

    var csrfToken = '';
    var redirecting = false;

    function $(sel) { return document.querySelector(sel); }
    function setText(sel, text) { var n = $(sel); if (n) { n.textContent = String(text); } }
    function reveal() { if (!redirecting) { root.style.visibility = ''; } }

    function goToLogin(url) {
        redirecting = true;
        window.location.replace(url || LOGIN_PAGE);
    }

    function request(url, options) {
        options = options || {};
        return fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
        }).then(function (response) {
            return response.json().catch(function () { return null; }).then(function (data) {
                if (!data || typeof data !== 'object') { data = { ok: false, message: 'حدث خطأ غير متوقع، حاول مرة أخرى بعد قليل' }; }
                data.status = response.status;
                if (data.csrf) { csrfToken = data.csrf; }
                return data;
            });
        });
    }

    function formatBirthDate(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
        if (!m) { return iso || ''; }
        var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        try {
            return new Intl.DateTimeFormat('ar-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
        } catch (e) { return m[3] + ' / ' + m[2] + ' / ' + m[1]; }
    }

    /* ---------- اختيار الطفل (يظهر فقط إذا كان هناك أكثر من طفل) ---------- */
    function renderChildSwitcher(data) {
        var holder = $('.header-actions');
        if (!holder || !data.children || data.children.length < 2) { return; }

        var select = document.createElement('select');
        select.setAttribute('aria-label', 'اختيار الطفل');
        select.style.cssText = 'font:inherit;font-size:.95rem;padding:.25rem .6rem;border-radius:999px;border:2px solid currentColor;background:transparent;color:inherit;cursor:pointer;';
        data.children.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = String(c.id);
            opt.textContent = c.name;
            if (c.id === data.child.id) { opt.selected = true; }
            select.appendChild(opt);
        });
        select.addEventListener('change', function () {
            var body = new FormData();
            body.append('child_id', select.value);
            body.append('csrf_token', csrfToken);
            select.disabled = true;
            request(API.select, { method: 'POST', body: body }).then(function (res) {
                if (res.status === 401) { goToLogin(res.redirect); return; }
                if (!res.ok) { select.disabled = false; select.value = String(data.child.id); window.alert(res.message || 'تعذّر تغيير الطفل'); return; }
                window.location.reload();   // كل الصفحات تقرأ الطفل الحالي من الجلسة
            }).catch(function () { select.disabled = false; select.value = String(data.child.id); window.alert('تعذّر الاتصال بالخادم'); });
        });
        holder.insertBefore(select, holder.firstChild);
    }

    /* ---------- الصفحة الرئيسية ---------- */
    function renderMain(data) {
        var c = data.child, p = data.progress;
        setText('#hero-title', 'مرحباً يا ' + c.name + '!');

        var strong = $('.progress-head strong');
        if (strong) {
            strong.textContent = p.levelPercent + '%';
            var label = strong.parentNode;                      // <p><strong>45%</strong> من المستوى</p>
            if (label && label.lastChild && label.lastChild.nodeType === Node.TEXT_NODE) {
                label.lastChild.textContent = ' من المستوى ' + p.currentLevel;
            }
        }
        var bar = $('.progress-card progress');
        if (bar) { bar.max = 100; bar.value = p.levelPercent; bar.textContent = p.levelPercent + '%'; }
        var card = $('.progress-card');
        if (card) { card.title = p.totalStars + ' نجمة • المستوى ' + p.currentLevel; }

        // أكمل من حيث توقفت: لا يوجد سجل لآخر درس، فنعرض عدد الدروس المكتملة الحقيقي فقط
        var line = $('.continue-card .dash-text p');
        if (line) { line.textContent = p.completedLessons > 0 ? 'الدروس المكتملة: ' + p.completedLessons : 'ابدأ أول درس لك'; }
        var go = $('.continue-card a.subject-btn');
        if (go) { go.setAttribute('href', 'arabic.html'); go.setAttribute('aria-label', 'أكمل التعلّم'); }
    }

    /* ---------- الملف الشخصي ---------- */
    function renderProfile(data) {
        var c = data.child, p = data.progress;
        var main = $('.profile-main');
        if (main) { main.setAttribute('data-child-id', String(c.id)); }

        setText('#child_name', c.name);
        setText('#info_name', c.name);
        setText('#current_level', p.currentLevel);
        setText('#total_stars', p.totalStars);
        setText('#streak_days', p.streakDays);
        setText('#level_xp', p.levelXp);
        setText('#level_xp_max', p.levelXpMax);

        var bar = $('#level_progress');
        if (bar) { bar.max = p.levelXpMax; bar.value = p.levelXp; bar.textContent = p.levelPercent + '%'; }

        var time = $('#birth_date');
        if (time) { time.setAttribute('datetime', c.birthDate); time.textContent = formatBirthDate(c.birthDate); }
        setText('#gender', GENDER_LABEL[c.gender] || '');
        setText('#preferred_language', LANGUAGE_LABEL[c.language] || '');

        // النسب مشتقة من سجلات MySQL الفعلية. لا تُقرأ من localStorage.
        var stats = data.statistics || {};
        var by = stats.bySubject || {};
        var courseUnits = {
            math: (by.addition ? by.addition.completedUnits : 0) + (by.subtraction ? by.subtraction.completedUnits : 0),
            arabic: ['arabic-letters','arabic-words','arabic-sentences'].reduce(function(n,k){return n+(by[k]?by[k].completedUnits:0);},0),
            english: ['english-letters','english-words','english-sentences'].reduce(function(n,k){return n+(by[k]?by[k].completedUnits:0);},0)
        };
        // تعرض الصفحة عدد الوحدات المسجلة من مجموع الوحدات المسجلة في المادة؛
        // عند عدم وجود أي وحدة تكون النسبة صفرًا بدل قيمة تجريبية.
        document.querySelectorAll('.course-card').forEach(function (li) {
            var id = li.getAttribute('data-course-id');
            var units = courseUnits[id] || 0;
            var pr = li.querySelector('progress');
            var pc = li.querySelector('.course-percent');
            var pct = units > 0 ? 100 : 0;
            if (pr) { pr.value = pct; pr.max = 100; pr.textContent = pct + '%'; }
            if (pc) { pc.textContent = pct + '%'; }
            li.setAttribute('data-completed-units', String(units));
        });
    }

    /* ---------- تعديل الملف الشخصي ---------- */
    function renderEdit(data) {
        var c = data.child, p = data.progress;
        var form = $('#edit_profile_form');
        if (!form) { return; }

        form.elements['child_id'].value = String(c.id);
        form.elements['child_name'].value = c.name;
        form.elements['birth_date'].value = c.birthDate;
        form.elements['gender'].value = (c.gender === 'girl') ? 'female' : 'male';   // قيم القائمة في الصفحة: male / female
        form.elements['preferred_language'].value = c.language;
        var level = form.elements['academic_level'];
        if (level) { level.value = String(Math.min(6, p.currentLevel)); }

        setText('#side_child_name', c.name);
        setText('#side_academic_level', p.currentLevel);

        var box = $('#form_message');
        var button = form.querySelector('.btn-save');
        var busy = false;

        function showMessage(text, ok) {
            if (!box) { window.alert(text); return; }
            box.className = ok ? 'form-alert is-success' : 'form-message form-message-error';   // أنماط الرسائل الموجودة في CSS
            box.textContent = text;
            box.hidden = false;
            box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (busy) { return; }
            busy = true;
            if (button) { button.disabled = true; }
            if (box) { box.hidden = true; }

            var body = new FormData(form);
            body.delete('profile_image');          // الصورة غير مدعومة (لا عمود لها في children)
            body.append('csrf_token', csrfToken);

            request(API.update, { method: 'POST', body: body }).then(function (res) {
                if (res.status === 401) { goToLogin(res.redirect); return; }
                if (res.ok) {
                    showMessage(res.message || 'تم حفظ التغييرات بنجاح.', true);
                    window.setTimeout(function () { window.location.href = res.redirect || 'profile.html'; }, 900);
                    return;
                }
                showMessage(res.message || 'لم ينجح حفظ التغييرات. تحقق من البيانات وحاول مرة أخرى.', false);
                busy = false;
                if (button) { button.disabled = false; }
            }).catch(function () {
                showMessage('تعذّر الاتصال بالخادم، حاول مرة أخرى.', false);
                busy = false;
                if (button) { button.disabled = false; }
            });
        });
    }

    /* ---------- التشغيل ---------- */
    function start() {
        request(API.me).then(function (data) {
            if (data.status === 401) { goToLogin(data.redirect); return; }
            if (!data.ok) { window.alert(data.message || 'تعذّر تحميل بيانات الطفل.'); return; }

            if ($('.home-page')) { renderMain(data); }
            if ($('.profile-main')) { renderProfile(data); }
            if ($('#edit_profile_form')) { renderEdit(data); }
            renderChildSwitcher(data);
        }).catch(function () {
            window.alert('تعذّر الاتصال بالخادم، تأكد من تشغيل Apache وMySQL ثم حاول مرة أخرى.');
        }).then(reveal);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); }
    else { start(); }

    // زر الرجوع قد يعرض نسخة من الذاكرة: نعيد التحميل ليُتحقق من الجلسة من جديد
    window.addEventListener('pageshow', function (event) { if (event.persisted) { window.location.reload(); } });
})();
