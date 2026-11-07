/* =========================================================
   بطبوط - صفحة الجمع (addition.js)
   - يعتمد على عناصر addition.html وتنسيق addition.css الموجودة، دون أي مكتبات.
   - أسئلة عشوائية، تحقق من الإجابة، نجوم، تقدّم، فتح المستويات، وحفظ في localStorage.
   - لا يغيّر HTML/CSS: كل ما يُضاف يُنشأ هنا باستخدام كلاسات الصفحة الموجودة.
   ========================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       1) الإعدادات (غيّر الأرقام من هنا فقط)
       --------------------------------------------------------- */
    var QUESTIONS_PER_LEVEL = 3;   // عدد أسئلة كل مستوى (كما في «السؤال 1 من 3»)
    var OPTIONS_COUNT       = 4;   // عدد الخيارات أمام الطفل
    var STARS_FIRST_TRY     = 2;   // نجوم الإجابة الصحيحة من أول محاولة
    var STARS_RETRY         = 1;   // نجوم الإجابة الصحيحة بعد محاولة خاطئة
    var STARS_LEVEL_BONUS   = 3;   // مكافأة إكمال المستوى
    var NEXT_DELAY          = 1800; // مهلة عرض التشجيع قبل السؤال التالي (مللي ثانية)
    var LEVEL_DONE_DELAY    = 1100; // مهلة قبل نافذة التهنئة
    var STORAGE_PREFIX      = 'batboot:addition:v1:';

    /*
       المستويات الخمسة كما هي في بطاقات الصفحة:
       1: حتى 5 | 2: حتى 10 | 3: حتى 10 بدون صور | 4: حتى 20 | 5: خانتان حتى 100
       visual: طريقة العرض داخل المعادلة (apples / cubes / numbers)
    */
    var LEVELS = [
        { id: 1, sub: 'الجمع حتى 5',            visual: 'apples',  minSum: 2,  maxSum: 5,  minOp: 1,  maxOp: 4,
          intro: 'عُدّ التفاحات في الصندوقين، ثم اختر الناتج!' },
        { id: 2, sub: 'الجمع حتى 10',           visual: 'cubes',   minSum: 6,  maxSum: 10, minOp: 2,  maxOp: 8,
          intro: 'هيا نعد المكعبات معًا!' },
        { id: 3, sub: 'الجمع حتى 10 بدون صور',  visual: 'numbers', minSum: 7,  maxSum: 10, minOp: 1,  maxOp: 9,
          intro: 'فكّر قليلًا، كم سيكون الناتج؟' },
        { id: 4, sub: 'الجمع حتى 20',           visual: 'numbers', minSum: 11, maxSum: 20, minOp: 2,  maxOp: 14,
          intro: 'ابدأ من الرقم الأول واقفز إلى الأمام على خط الأعداد.' },
        { id: 5, sub: 'الجمع حتى 100',          visual: 'numbers', minSum: 22, maxSum: 99, minOp: 11, maxOp: 88,
          carryChance: 0.35,
          intro: 'اجمع الآحاد أولًا، ثم اجمع العشرات.' }
    ];
    var LEVEL_COUNT = LEVELS.length;

    var CORRECT_MSGS = ['أحسنت يا بطل!', 'ممتاز! إجابة صحيحة', 'رائع جدًا!', 'برافو عليك!', 'شاطر يا بطل!', 'عمل رائع!'];

    /* ---------------------------------------------------------
       2) أدوات صغيرة
       --------------------------------------------------------- */
    var SVGNS = 'http://www.w3.org/2000/svg';
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (text != null) { e.textContent = text; }
        return e;
    }

    function svgUse(id, w, h, cls) {
        var s = document.createElementNS(SVGNS, 'svg');
        s.setAttribute('width', w);
        s.setAttribute('height', h || w);
        s.setAttribute('aria-hidden', 'true');
        if (cls) { s.setAttribute('class', cls); }
        var u = document.createElementNS(SVGNS, 'use');
        u.setAttribute('href', '#' + id);
        s.appendChild(u);
        return s;
    }

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
    function toInt(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

    /* نص يُقرأ من اليسار لليمين داخل جملة عربية (للمعادلات) */
    function ltr(text) { return '⁦' + text + '⁩'; }

    function countWord(n, one, two, few, many) {
        if (n === 1) { return one; }
        if (n === 2) { return two; }
        return n + ' ' + (n <= 10 ? few : many);
    }

    function starsWord(n) { return countWord(n, 'نجمة واحدة', 'نجمتان', 'نجوم', 'نجمة'); }

    function animate(node, frames, opts) {
        if (reduceMotion || !node || !node.animate) { return; }
        try { node.animate(frames, opts); } catch (e) { /* لا شيء */ }
    }

    function pairKey(p) { return Math.min(p.a, p.b) + '+' + Math.max(p.a, p.b); }

    /* ---------------------------------------------------------
       3) توليد الأسئلة والخيارات
       --------------------------------------------------------- */
    function randomPair(cfg) {
        for (var i = 0; i < 500; i++) {
            var a = randInt(cfg.minOp, cfg.maxOp);
            var b = randInt(cfg.minOp, cfg.maxOp);
            var s = a + b;
            if (s < cfg.minSum || s > cfg.maxSum) { continue; }
            // في المستوى الأخير: الجمع مع حمل أقل شيوعًا ليناسب الأطفال
            if (cfg.carryChance !== undefined && (a % 10 + b % 10) >= 10 && Math.random() >= cfg.carryChance) { continue; }
            return { a: a, b: b };
        }
        return { a: cfg.minOp, b: cfg.minSum - cfg.minOp };
    }

    /* مجموعة أسئلة مختلفة؛ والأول فيها لا يساوي آخر سؤال ظهر (avoidKey) */
    function makeSet(level, avoidKey) {
        var cfg = LEVELS[level - 1];
        var set = [];
        var seen = {};
        var tries = 0;
        while (set.length < QUESTIONS_PER_LEVEL && tries < 2000) {
            tries++;
            var p = randomPair(cfg);
            var k = pairKey(p);
            if (seen[k]) { continue; }
            if (set.length === 0 && k === avoidKey) { continue; }
            seen[k] = true;
            set.push(p);
        }
        return set;
    }

    function buildOptions(sum) {
        var pool = [sum - 1, sum + 1, sum - 2, sum + 2, sum - 3, sum + 3];
        if (sum >= 22) { pool = [sum - 10, sum + 10, sum - 1, sum + 1, sum - 2, sum + 2]; }
        var wrong = shuffle(pool).filter(function (v) { return v > 0 && v !== sum; });
        if (sum >= 22) {
            // نضمن خيارًا واحدًا على الأقل يخلط العشرات (مثل 39 و49)
            var tens = [sum - 10, sum + 10].filter(function (v) { return v > 0; });
            wrong = [pick(tens)].concat(wrong.filter(function (v) { return Math.abs(v - sum) !== 10; }));
        }
        var opts = [sum];
        for (var i = 0; i < wrong.length && opts.length < OPTIONS_COUNT; i++) {
            if (opts.indexOf(wrong[i]) === -1) { opts.push(wrong[i]); }
        }
        var extra = sum + 4;
        while (opts.length < OPTIONS_COUNT) { opts.push(extra++); }
        return shuffle(opts);
    }

    /* ---------------------------------------------------------
       4) الحالة والحفظ (localStorage)
       --------------------------------------------------------- */
    var main = $('.addition-page');
    if (!main) { return; }

    function freshState() {
        var levels = {};
        for (var i = 1; i <= LEVEL_COUNT; i++) {
            levels[i] = { questions: null, correct: 0, completed: false, stars: 0, completedAt: null };
        }
        return { levels: levels, last: '' };
    }

    function validSet(raw, level) {
        var cfg = LEVELS[level - 1];
        if (!Array.isArray(raw) || raw.length !== QUESTIONS_PER_LEVEL) { return null; }
        var out = [];
        for (var i = 0; i < raw.length; i++) {
            var a = raw[i] && raw[i].a, b = raw[i] && raw[i].b;
            if (!Number.isInteger(a) || !Number.isInteger(b)) { return null; }
            if (a < 1 || b < 1 || a + b < cfg.minSum || a + b > cfg.maxSum) { return null; }
            out.push({ a: a, b: b });
        }
        return out;
    }

    function sanitize(raw) {
        var s = freshState();
        if (!raw || typeof raw !== 'object' || !raw.levels || typeof raw.levels !== 'object') { return s; }
        var prevDone = true;
        for (var i = 1; i <= LEVEL_COUNT; i++) {
            var r = raw.levels[i];
            if (!prevDone || !r || typeof r !== 'object') { prevDone = false; continue; }
            var lv = s.levels[i];
            lv.completed = r.completed === true;
            lv.questions = validSet(r.questions, i);
            lv.correct = lv.completed ? QUESTIONS_PER_LEVEL : clamp(toInt(r.correct), 0, QUESTIONS_PER_LEVEL - 1);
            if (!lv.completed && !lv.questions) { lv.correct = 0; }
            lv.stars = clamp(toInt(r.stars), 0, 99);
            lv.completedAt = (lv.completed && typeof r.completedAt === 'string') ? r.completedAt.slice(0, 30) : null;
            prevDone = lv.completed;
        }
        s.last = typeof raw.last === 'string' ? raw.last.slice(0, 12) : '';
        return s;
    }

    function storageKey() { return STORAGE_PREFIX + (main.dataset.childId || 'guest'); }

    function loadState() {
        try {
            var raw = window.localStorage.getItem(storageKey());
            return raw ? sanitize(JSON.parse(raw)) : freshState();
        } catch (e) {
            return freshState();
        }
    }

    var state = loadState();
    var lastKey = state.last;

    function saveState() {
        state.last = lastKey;
        try { window.localStorage.setItem(storageKey(), JSON.stringify(state)); } catch (e) { /* التخزين غير متاح */ }
    }

    /* أعلى مستوى مفتوح: أول مستوى غير مكتمل، أو الأخير إذا اكتملت كلها */
    function frontier() {
        for (var i = 1; i <= LEVEL_COUNT; i++) { if (!state.levels[i].completed) { return i; } }
        return LEVEL_COUNT;
    }

    function allDone() { return state.levels[LEVEL_COUNT].completed; }
    function levelPct(lv) { return lv.completed ? 100 : Math.round(lv.correct / QUESTIONS_PER_LEVEL * 100); }

    function totalStars() {
        var t = 0;
        for (var i = 1; i <= LEVEL_COUNT; i++) { t += state.levels[i].stars; }
        return t;
    }

    function totalPct() {
        var c = 0;
        for (var i = 1; i <= LEVEL_COUNT; i++) { c += state.levels[i].completed ? QUESTIONS_PER_LEVEL : state.levels[i].correct; }
        return Math.round(c / (LEVEL_COUNT * QUESTIONS_PER_LEVEL) * 100);
    }

    /* ---------------------------------------------------------
       5) عناصر الصفحة
       --------------------------------------------------------- */
    var equation  = $('.equation', main);
    var answerBox = $('.answer-box', main);
    var fieldset  = $('.answer-options', main);
    var bubble    = $('.mascot-bubble', main);
    var checkBtn  = $('.check-btn', main);
    var cards     = $$('.level-card', main);

    if (!equation || !answerBox || !fieldset || !bubble || !checkBtn) { return; }

    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');

    var view = {
        level: 1, practice: false, questions: [], index: 0,
        mistakes: 0, solved: false, busy: false, timers: []
    };

    function later(fn, ms) { view.timers.push(window.setTimeout(fn, ms)); }
    function clearTimers() { view.timers.forEach(window.clearTimeout); view.timers = []; }
    function currentQuestion() { return view.questions[view.index]; }

    /* ---------------------------------------------------------
       6) عرض السؤال
       --------------------------------------------------------- */
    function fillBox(box, n, visual, side) {
        box.removeAttribute('style');
        while (box.firstChild) { box.removeChild(box.firstChild); }
        box.style.flexWrap = 'wrap';
        box.style.maxWidth = '100%';

        if (visual === 'apples') {
            var w = n === 1 ? 78 : (n === 2 ? 60 : 48);
            for (var i = 0; i < n; i++) { box.appendChild(svgUse('i-apple', w, Math.round(w * 1.13), 'apple')); }
            box.setAttribute('aria-label', countWord(n, 'تفاحة واحدة', 'تفاحتان', 'تفاحات', 'تفاحة'));
        } else if (visual === 'cubes') {
            box.style.maxWidth = '230px';
            for (var j = 0; j < n; j++) { box.appendChild(el('span', 'cube ' + (side === 'a' ? 'cube-a' : 'cube-b'))); }
            box.setAttribute('aria-label', countWord(n, 'مكعب واحد', 'مكعبان', 'مكعبات', 'مكعبًا'));
        } else {
            var t = el('span', null, String(n));
            t.style.cssText = 'font-size:3.4rem;font-weight:800;line-height:1;color:var(--navy,#1b2a5c)';
            box.appendChild(t);
            box.setAttribute('aria-label', 'العدد ' + n);
        }
    }

    function renderEquation(q) {
        var cfg = LEVELS[view.level - 1];
        var boxes = $$('.eq-box', equation);
        equation.style.flexWrap = 'wrap';
        fillBox(boxes[0], q.a, cfg.visual, 'a');
        fillBox(boxes[1], q.b, cfg.visual, 'b');
        equation.setAttribute('aria-label', q.a + ' زائد ' + q.b + ' يساوي كم؟');
    }

    function renderOptions(q) {
        $$('.answer-option', fieldset).forEach(function (n) { fieldset.removeChild(n); });
        buildOptions(q.a + q.b).forEach(function (v) {
            var label = el('label', 'answer-option');
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = 'selected_answer';
            input.value = String(v);
            label.appendChild(input);
            label.appendChild(el('span', null, String(v)));
            fieldset.appendChild(label);
        });
    }

    /* القيمة داخل صندوق الإجابة (تغطي مؤشر الكتابة الشكلي) */
    function showAnswer(value, status) {
        var old = $('.ans-value', answerBox);
        if (old) { answerBox.removeChild(old); }
        answerBox.style.borderColor = status === 'ok' ? 'var(--green,#2fb36b)' : (status === 'bad' ? '#e5484d' : '');
        if (value === null) { return; }
        var v = el('span', 'ans-value', String(value));
        var color = status === 'ok' ? 'var(--green,#2fb36b)' : (status === 'bad' ? '#e5484d' : 'var(--navy,#1b2a5c)');
        v.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;border-radius:24px;' +
            'background:var(--card,#fff);font-size:3.4rem;font-weight:800;color:' + color;
        answerBox.appendChild(v);
        animate(v, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }

    function setBubble(text, mood) {
        bubble.textContent = text;
        var tint = { ok: ['#e9f9ef', '#9be0b8'], retry: ['#fff4e0', '#ffd79a'] }[mood];
        bubble.style.background = tint ? tint[0] : '';
        bubble.style.borderColor = tint ? tint[1] : '';
    }

    function setBusy(b) {
        view.busy = b;
        checkBtn.disabled = b;
        checkBtn.style.opacity = b ? '0.6' : '';
        checkBtn.style.cursor = b ? 'not-allowed' : '';
    }

    function hintFor(q) {
        var hi = Math.max(q.a, q.b), lo = Math.min(q.a, q.b);
        if (view.mistakes >= 2) {
            if (view.level <= 4) {
                var steps = [hi];
                for (var i = 1; i <= lo; i++) { steps.push(hi + i); }
                return 'عُدّ معي من ' + hi + ': ' + ltr(steps.join(' ← '));
            }
            var ones = (q.a % 10) + (q.b % 10);
            var tens = (q.a - q.a % 10) + (q.b - q.b % 10);
            return 'الآحاد: ' + ltr((q.a % 10) + ' + ' + (q.b % 10) + ' = ' + ones) +
                '، والعشرات: ' + ltr((q.a - q.a % 10) + ' + ' + (q.b - q.b % 10) + ' = ' + tens) +
                '. الآن اجمع ' + ltr(ones + ' + ' + tens) + '!';
        }
        switch (view.level) {
            case 1: return 'عُدّ التفاحات في الصندوقين من جديد، ثم اختر الناتج.';
            case 2: return 'عُدّ المكعبات الزرقاء ثم أكمل العدّ مع البرتقالية.';
            case 3: return 'ابدأ من ' + hi + ' وعُدّ للأمام ' + lo + ' خطوات.';
            case 4: return 'ابدأ من ' + q.a + ' واقفز ' + q.b + ' خطوات إلى الأمام على خط الأعداد.';
            default: return 'اجمع الآحاد أولًا، ثم اجمع العشرات.';
        }
    }

    function updateData(q) {
        var lv = state.levels[view.level];
        main.dataset.levelId = String(view.level);
        main.dataset.questionId = view.level + '-' + (view.index + 1);
        main.dataset.question = q.a + '+' + q.b;
        main.dataset.selectedAnswer = '';
        main.dataset.isCorrect = '';
        main.dataset.isCompleted = String(!view.practice && lv.completed);
        main.dataset.starsEarned = String(lv.stars);
        main.dataset.completionDate = lv.completedAt ? lv.completedAt.slice(0, 10) : '';
    }

    function renderQuestion() {
        var q = currentQuestion();
        var cfg = LEVELS[view.level - 1];
        lastKey = pairKey(q);
        view.mistakes = 0;
        view.solved = false;
        renderEquation(q);
        renderOptions(q);
        showAnswer(null);
        setBubble(cfg.intro + (view.practice ? ' (تدريب بدون نجوم)' : ''));
        updateData(q);
        setBusy(false);
        renderLevelUI();
    }

    /* ---------------------------------------------------------
       7) واجهة المستويات والتقدم (البطاقات، النقاط، النجوم)
       --------------------------------------------------------- */
    var GREEN_BG = '#d9f5e4', GREEN_TX = '#1d7a45';

    function renderChips() {
        cards.forEach(function (card) {
            var L = toInt(card.dataset.levelId);
            var lv = state.levels[L];
            var set = null, done = 0, isView = L === view.level;
            if (isView) { set = view.questions; done = view.index + (view.solved ? 1 : 0); }
            else if (lv && lv.questions) { set = lv.questions; done = lv.completed ? QUESTIONS_PER_LEVEL : lv.correct; }
            if (!set) { return; }
            $$('.exercise-list li', card).forEach(function (li, i) {
                var p = set[i];
                if (!p) { return; }
                li.dataset.questionId = L + '-' + (i + 1);
                li.dataset.question = p.a + '+' + p.b;
                var span = $('.ltr-eq', li);
                if (span) { span.textContent = p.a + ' + ' + p.b; }
                li.style.background = i < done ? '#bfe9cf' : '';
                li.style.boxShadow = (isView && i === done) ? '0 0 0 3px #ffd75e' : '';
            });
        });
    }

    function renderCards() {
        var front = frontier();
        cards.forEach(function (card) {
            var L = toInt(card.dataset.levelId);
            var lv = state.levels[L];
            var locked = L > front;
            var isView = L === view.level;
            var pct = levelPct(lv);

            card.classList.toggle('is-locked', locked);
            card.classList.toggle('is-current', isView && !locked);
            card.dataset.state = locked ? 'locked' : (isView ? 'current' : (lv.completed ? 'done' : 'open'));
            if (locked) { card.setAttribute('aria-disabled', 'true'); } else { card.removeAttribute('aria-disabled'); }
            if (isView) { card.setAttribute('aria-current', 'step'); } else { card.removeAttribute('aria-current'); }
            card.style.borderColor = (!locked && !isView && lv.completed) ? '#9be0b8' : '';

            var lock = $('.lvl-lock', card);
            if (lock) { lock.style.display = locked ? '' : 'none'; }

            // شارة الحالة
            var pill = $('.lvl-state', card);
            if (pill) {
                pill.removeAttribute('style');
                var cls = 'lvl-state', text;
                if (locked) { cls += ' state-locked'; text = 'مقفل'; }
                else if (isView) {
                    if (view.practice) { cls += ' state-now'; text = 'تدريب'; }
                    else if (lv.completed) { cls += ' state-now'; text = 'مكتمل'; }
                    else { cls += ' state-now'; text = 'المستوى الحالي'; }
                } else if (lv.completed) { text = 'مكتمل'; pill.style.cssText = 'color:' + GREEN_TX + ';background:' + GREEN_BG; }
                else { text = 'مفتوح'; pill.style.cssText = 'color:#8a5a00;background:#fff0c2'; }
                pill.className = cls;
                pill.textContent = text;
            }

            // الشريط السفلي: نسبة التقدم داخل المستوى
            var foot = $('.lvl-foot', card);
            if (foot) {
                foot.removeAttribute('style');
                foot.className = 'lvl-foot';
                while (foot.firstChild) { foot.removeChild(foot.firstChild); }
                if (locked) {
                    foot.textContent = 'يُفتح بعد إكمال المستوى ' + (L - 1);
                } else if (isView) {
                    foot.className = 'lvl-foot foot-open';
                    var shown = view.practice ? 100 : pct;
                    foot.textContent = (view.practice ? 'تدريب حر' : (lv.completed ? 'مكتمل' : 'أنت هنا')) + ' • ' +
                        (view.practice || lv.completed ? QUESTIONS_PER_LEVEL : lv.correct) + ' من ' + QUESTIONS_PER_LEVEL + ' • ' + shown + '%';
                    foot.style.background = 'linear-gradient(to left, #ffd75e ' + shown + '%, #fff0c2 ' + shown + '%)';
                } else {
                    var btn = el('button', null, (lv.completed ? '✓ مكتمل • تدرّب من جديد' : pct + '% • تابع هذا المستوى'));
                    btn.type = 'button';
                    btn.style.cssText = 'width:100%;padding:0.1rem 0;border:0;background:none;font:inherit;color:inherit;cursor:pointer';
                    btn.addEventListener('click', function () { startLevel(L); scrollToLesson(); });
                    foot.appendChild(btn);
                    foot.style.color = lv.completed ? GREEN_TX : '#8a5a00';
                    foot.style.background = lv.completed ? GREEN_BG :
                        'linear-gradient(to left, #ffd75e ' + pct + '%, #fff0c2 ' + pct + '%)';
                }
            }
        });
    }

    function renderHeader() {
        var cfg = LEVELS[view.level - 1];
        var lv = state.levels[view.level];

        var num = $('.level-badge-main span', main);
        if (num) { num.textContent = String(view.level); }
        var sub = $('.level-badge-sub', main);
        if (sub) { sub.textContent = cfg.sub; }
        var q = $('.level-badge-q', main);
        if (q) {
            var n = Math.min(view.index + 1, QUESTIONS_PER_LEVEL);
            q.textContent = 'السؤال ' + n + ' من ' + QUESTIONS_PER_LEVEL;
        }

        var txt = $('.level-track-text .ltr-eq', main);
        if (txt) { txt.textContent = view.level + ' / ' + LEVEL_COUNT; }
        var track = $('.level-track', main);
        if (track) {
            track.setAttribute('aria-label', 'المستوى ' + view.level + ' من ' + LEVEL_COUNT);
            $$('li', track).forEach(function (li, i) {
                var L = i + 1;
                var isView = L === view.level;
                li.classList.toggle('is-current', isView);
                if (isView) { li.setAttribute('aria-current', 'step'); } else { li.removeAttribute('aria-current'); }
                li.style.background = (!isView && state.levels[L] && state.levels[L].completed) ? 'var(--green,#2fb36b)' : '';
            });
        }

        var stars = totalStars();
        var starNum = $('.path-stars strong', main);
        if (starNum) { starNum.textContent = String(stars); }
        var starIcon = $('.path-stars svg', main);
        if (starIcon) { starIcon.style.color = stars > 0 ? 'var(--gold,#ffc727)' : ''; }

        var pct = totalPct();
        var bar = $('.path-progress .progress-bar', main);
        if (bar) { bar.value = pct; bar.max = 100; bar.textContent = pct + '%'; }
        var pctText = $('.path-progress p strong', main);
        if (pctText) { pctText.textContent = pct + '%'; }

        main.dataset.starsEarned = String(lv.stars);
        main.dataset.isCompleted = String(!view.practice && lv.completed);
        main.dataset.completionDate = lv.completedAt ? lv.completedAt.slice(0, 10) : '';
    }

    function renderLevelUI() {
        renderHeader();
        renderCards();
        renderChips();
    }

    function scrollToLesson() {
        var card = $('.lesson-card', main);
        if (card && card.scrollIntoView) { card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
    }

    /* ---------------------------------------------------------
       8) رسائل النتيجة (تستخدم تصميم result-card الموجود)
       --------------------------------------------------------- */
    var toastEl = null;
    var dialogEl = null;

    function resultCard(kind, iconId, iconSize, title, hint, starsGain) {
        var card = el('div', 'result-card is-' + kind);
        var icon = el('span', 'result-icon');
        icon.setAttribute('aria-hidden', 'true');
        icon.appendChild(svgUse(iconId, iconSize));
        card.appendChild(icon);
        card.appendChild(el('p', 'result-title', title));
        if (hint) { card.appendChild(el('p', 'result-hint', hint)); }
        if (starsGain > 0) {
            var st = el('p', 'result-stars');
            st.appendChild(svgUse('i-star', 40));
            st.appendChild(el('span', null, starsGain === 1 ? 'نجمة جديدة' : '+' + starsWord(starsGain)));
            card.appendChild(st);
        }
        return card;
    }

    function removeToast() {
        if (toastEl && toastEl.parentNode) { toastEl.parentNode.removeChild(toastEl); }
        toastEl = null;
    }

    function showToast(kind, iconId, title, hint, starsGain, ms) {
        removeToast();
        var wrap = el('div', 'addition-toast');
        wrap.setAttribute('aria-hidden', 'true'); // النص نفسه موجود في فقاعة بطبوط
        wrap.style.cssText = 'position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:400;' +
            'width:min(360px,92vw);pointer-events:none';
        var card = resultCard(kind, iconId, kind === 'success' ? 48 : 42, title, hint, starsGain);
        wrap.appendChild(card);
        document.body.appendChild(wrap);
        toastEl = wrap;
        animate(card, [{ opacity: 0, transform: 'translateY(24px) scale(.92)' }, { opacity: 1, transform: 'none' }],
            { duration: 260, easing: 'ease-out' });
        later(function () { if (toastEl === wrap) { removeToast(); } }, ms);
    }

    function closeDialog() {
        if (dialogEl && dialogEl.parentNode) { dialogEl.parentNode.removeChild(dialogEl); }
        dialogEl = null;
        document.removeEventListener('keydown', onDialogKey, true);
    }

    var dialogAction = null;
    function onDialogKey(e) {
        if (e.key === 'Escape' || e.key === 'Tab') {
            e.preventDefault();
            if (e.key === 'Escape' && dialogAction) { dialogAction(); }
        }
    }

    function showDialog(kind, iconId, title, hint, starsText, btnText, action) {
        closeDialog();
        var overlay = el('div', 'addition-dialog');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'addition-dialog-title');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;' +
            'padding:1rem;background:rgba(27,42,92,.45)';
        var card = resultCard(kind, iconId, 44, title, hint, 0);
        card.style.cssText = 'width:min(420px,100%);padding:1.6rem 1.4rem;box-shadow:0 18px 50px rgba(0,0,0,.3)';
        $('.result-title', card).id = 'addition-dialog-title';
        if (starsText) {
            var st = el('p', 'result-stars');
            st.appendChild(svgUse('i-star', 40));
            st.appendChild(el('span', null, starsText));
            card.appendChild(st);
        }
        var btn = el('button', 'btn-next btn-confirm', btnText);
        btn.type = 'button';
        btn.style.marginTop = '0.6rem';
        dialogAction = function () { dialogAction = null; closeDialog(); action(); };
        btn.addEventListener('click', function () { if (dialogAction) { dialogAction(); } });
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        dialogEl = overlay;
        document.addEventListener('keydown', onDialogKey, true);
        animate(card, [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
        btn.focus();
    }

    /* ---------------------------------------------------------
       9) منطق الإجابة
       --------------------------------------------------------- */
    function onChange(e) {
        if (!e.target || e.target.name !== 'selected_answer' || view.busy || view.solved) { return; }
        showAnswer(e.target.value);
        main.dataset.selectedAnswer = e.target.value;
        main.dataset.isCorrect = '';
    }

    function onCheck() {
        if (view.busy || view.solved) { return; }
        var sel = $('input[name="selected_answer"]:checked', fieldset);
        if (!sel) {
            setBubble('اختر إجابة أولًا يا بطل، ثم اضغط «تحقق من إجابتي».', 'retry');
            animate(fieldset, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
            return;
        }
        var q = currentQuestion();
        var value = toInt(sel.value);
        var ok = value === q.a + q.b;
        main.dataset.selectedAnswer = String(value);
        main.dataset.isCorrect = String(ok);
        if (ok) { handleCorrect(q); } else { handleWrong(q, sel); }
    }

    function handleCorrect(q) {
        var L = view.level;
        var lv = state.levels[L];
        var gain = view.practice ? 0 : (view.mistakes === 0 ? STARS_FIRST_TRY : STARS_RETRY);
        var levelDone;

        setBusy(true);
        view.solved = true;
        $$('input[name="selected_answer"]', fieldset).forEach(function (i) { i.disabled = true; });
        showAnswer(q.a + q.b, 'ok');

        if (view.practice) {
            levelDone = view.index + 1 >= QUESTIONS_PER_LEVEL;
        } else {
            lv.correct += 1;
            lv.stars += gain;
            levelDone = lv.correct >= QUESTIONS_PER_LEVEL;
            if (levelDone) {
                lv.completed = true;
                lv.completedAt = new Date().toISOString();
                lv.stars += STARS_LEVEL_BONUS;
                if (L < LEVEL_COUNT && !state.levels[L + 1].questions) {
                    state.levels[L + 1].questions = makeSet(L + 1, pairKey(q));
                }
            }
            lastKey = pairKey(q);
            saveState();
        }

        main.dataset.isCorrect = 'true';
        renderLevelUI();
        if (gain > 0) {
            var sn = $('.path-stars', main);
            animate(sn, [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 400 });
        }

        var msg = pick(CORRECT_MSGS);
        setBubble(ltr(q.a + ' + ' + q.b + ' = ' + (q.a + q.b)) + ' • ' + msg, 'ok');

        if (levelDone) {
            later(function () { removeToast(); showLevelDone(L, lv); }, LEVEL_DONE_DELAY);
        } else {
            showToast('success', 'i-check', msg, null, gain, NEXT_DELAY);
            later(function () { view.index += 1; renderQuestion(); }, NEXT_DELAY);
        }
    }

    function handleWrong(q, sel) {
        view.mistakes += 1;
        // نعطّل الخيار الخاطئ حتى لا يكرره الطفل، ونتيح المحاولة مجددًا
        sel.checked = false;
        sel.disabled = true;
        var label = sel.parentNode;
        label.style.opacity = '0.4';
        label.style.cursor = 'not-allowed';
        sel.style.cursor = 'not-allowed';

        showAnswer(sel.value, 'bad');
        animate(answerBox, [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' },
            { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 420 });
        later(function () { if (!view.solved) { showAnswer(null); } }, 900);

        setBubble('هذه ليست الإجابة الصحيحة، لكن لا بأس! حاول مرة أخرى. ' + hintFor(q), 'retry');
        showToast('retry', 'i-retry', 'محاولة رائعة! جرّب مرة أخرى', 'اختر إجابة أخرى', 0, 1700);
    }

    function showLevelDone(L, lv) {
        var last = L === LEVEL_COUNT;
        if (view.practice) {
            var finished = allDone();
            showDialog('success', 'i-check', 'أحسنت! أنهيت التدريب', 'تدريب ممتاز يا بطل',
                null, finished ? 'تدرّب مرة أخرى' : 'تابع مستواي',
                function () { startLevel(frontier()); scrollToLesson(); });
            return;
        }
        showDialog('level', 'i-trophy',
            'مبروك! أكملت المستوى ' + L + ' بنجاح',
            last ? 'أكملت رحلة الجمع كلها! أنت بطل الجمع' : 'المستوى التالي صار متاحًا',
            'حصلت على ' + starsWord(lv.stars) + ' في هذا المستوى',
            last ? 'تدرّب مرة أخرى' : 'ابدأ المستوى ' + (L + 1),
            function () { startLevel(last ? LEVEL_COUNT : L + 1); scrollToLesson(); });
    }

    /* ---------------------------------------------------------
       10) بدء مستوى
       --------------------------------------------------------- */
    function startLevel(L) {
        clearTimers();
        closeDialog();
        removeToast();
        var lv = state.levels[L];
        view.level = L;
        if (lv.completed) {
            // مستوى مكتمل: وضع تدريب بأسئلة جديدة دون نجوم وبدون تغيير التقدم
            view.practice = true;
            view.questions = makeSet(L, lastKey);
            view.index = 0;
        } else {
            view.practice = false;
            if (!lv.questions) { lv.questions = makeSet(L, lastKey); saveState(); }
            view.questions = lv.questions;
            view.index = lv.correct;
        }
        renderQuestion();
    }

    /* ---------------------------------------------------------
       11) الربط والتشغيل
       --------------------------------------------------------- */
    checkBtn.addEventListener('click', onCheck);
    fieldset.addEventListener('change', onChange);
    fieldset.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); onCheck(); }
    });

    startLevel(frontier());
})();