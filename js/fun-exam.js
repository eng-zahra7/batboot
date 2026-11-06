/* =========================================================
   بطبوط - اختبار تحديد المستوى (placement.js)
   9 أسئلة: 3 عربية + 3 إنجليزية + 3 رياضيات.
   كل سؤال له محاولة واحدة لأن الهدف قياس معرفة الطفل،
   وعند الخطأ تظهر الإجابة الصحيحة بلطف.
   في النهاية: نتيجة كل مادة وتوصية بالمكان المناسب للبدء.
   ========================================================= */

'use strict';

/* ---------- 1) البيانات ---------- */
const DATA = JSON.parse(document.getElementById('quiz-data').textContent);
const QUESTIONS = DATA.questions;
const SUBJECTS = DATA.subjects;

/* ---------- 2) عناصر الصفحة ---------- */
const $ = (selector) => document.querySelector(selector);

const ui = {
    main: $('.quiz-main'),
    intro: $('#screen-intro'),
    question: $('#screen-question'),
    result: $('#screen-result'),
    startBtn: $('#start-btn'),
    badge: $('#subject-badge'),
    counter: $('#quiz-counter'),
    muteBtn: $('#mute-btn'),
    dots: $('#quiz-dots'),
    promptText: $('#prompt-text'),
    promptHint: $('#prompt-hint'),
    promptSound: $('#prompt-sound'),
    visual: $('#quiz-visual'),
    answers: $('#quiz-answers'),
    feedback: $('#quiz-feedback'),
    nextBtn: $('#next-btn'),
    nextLabel: $('#next-label'),
    confetti: $('#confetti'),
    resultTitle: $('#result-title'),
    resultTotal: $('#result-total'),
    resultStars: $('#result-stars'),
    subjectResults: $('#subject-results'),
    retryBtn: $('#retry-btn'),
    resultsInput: $('#results-input')
};

/* ---------- 3) الحالة ---------- */
const state = {
    index: 0,
    answered: false,
    muted: false,
    results: []     // لكل سؤال: { id, subject, selected, correct }
};

const current = () => QUESTIONS[state.index];

/* ---------- 4) أدوات مساعدة ---------- */
function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') node.className = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else node.setAttribute(key, value);
    }
    if (text) node.textContent = text;
    return node;
}

function svgIcon(id, size, className = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    if (className) svg.setAttribute('class', className);
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
}

function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/* ---------- 5) الأصوات ---------- */

// نطق النص: العربية أو الإنجليزية حسب السؤال
function speak(text, lang = 'ar') {
    if (state.muted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'ar-SA';
    utterance.rate = 0.85;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

// نغمات قصيرة بدون ملفات صوت (Web Audio API)
let audioCtx = null;
function playTones(frequencies, wave = 'sine') {
    if (state.muted) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const start = audioCtx.currentTime;
        frequencies.forEach((freq, i) => {
            const t = start + i * 0.12;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = wave;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    } catch (error) {
        // المتصفح لا يدعم الصوت: نكمل بدونه
    }
}

const soundCorrect = () => playTones([523, 659, 784]);
const soundWrong = () => playTones([260, 200], 'triangle');

/* ---------- 6) التنقل بين الشاشات ---------- */
function showScreen(screen) {
    [ui.intro, ui.question, ui.result].forEach((s) => { s.hidden = s !== screen; });
}

function startQuiz() {
    state.index = 0;
    state.results = [];
    showScreen(ui.question);
    renderQuestion();
}

/* ---------- 7) عرض السؤال ---------- */
function renderQuestion() {
    const q = current();
    const subject = SUBJECTS[q.subject];
    state.answered = false;

    // لون الصفحة حسب المادة
    ui.question.dataset.subject = q.subject;

    ui.badge.replaceChildren(el('span', { class: 'chip-icon', 'aria-hidden': 'true' }, subject.icon), ' ' + subject.name);
    ui.counter.textContent = `السؤال ${state.index + 1} من ${QUESTIONS.length}`;

    // نقاط التقدم
    ui.dots.replaceChildren(...QUESTIONS.map((item, i) => {
        const dot = el('li', { class: `quiz-dot dot-${item.subject}` });
        const label = `السؤال ${i + 1}`;
        if (i < state.index) {
            const ok = state.results[i]?.correct;
            dot.classList.add(ok ? 'is-correct' : 'is-wrong');
            dot.setAttribute('aria-label', `${label}: ${ok ? 'صحيح' : 'خطأ'}`);
        } else if (i === state.index) {
            dot.classList.add('is-current');
            dot.setAttribute('aria-current', 'step');
            dot.setAttribute('aria-label', `${label}: الحالي`);
        } else {
            dot.setAttribute('aria-label', label);
        }
        return dot;
    }));

    // نص السؤال (الإنجليزي يُكتب من اليسار لليمين مع تلميح عربي)
    ui.promptText.textContent = q.prompt;
    ui.promptText.lang = q.lang === 'en' ? 'en' : 'ar';
    ui.promptText.dir = q.lang === 'en' ? 'ltr' : 'rtl';
    ui.promptHint.hidden = !q.hint;
    ui.promptHint.textContent = q.hint || '';

    renderVisual(q.visual);
    renderAnswers(q);

    ui.feedback.hidden = true;
    ui.nextBtn.hidden = true;

    // حركة دخول السؤال
    ui.question.classList.remove('is-entering');
    void ui.question.offsetWidth;
    ui.question.classList.add('is-entering');

    speak(q.prompt, q.lang);
}

// الصورة أو العدّ أو المسألة
function renderVisual(visual) {
    ui.visual.replaceChildren();
    ui.visual.hidden = visual.kind === 'none';

    if (visual.kind === 'image') {
        const fig = el('figure', { class: 'visual-image' });
        fig.append(svgIcon(visual.image, 140));
        if (visual.caption) fig.append(el('figcaption', {}, visual.caption));
        ui.visual.append(fig);
    }

    if (visual.kind === 'big-text') {
        ui.visual.append(el('p', { class: 'visual-big', lang: 'en', dir: 'ltr' }, visual.text));
    }

    // أشياء للعدّ: تظهر واحدة تلو الأخرى
    if (visual.kind === 'count') {
        const row = el('div', { class: 'visual-count', role: 'img', 'aria-label': 'مجموعة نجوم للعدّ' });
        for (let i = 0; i < visual.count; i++) {
            const item = svgIcon(visual.image, 64, 'count-item');
            item.style.animationDelay = `${i * 0.15}s`;
            row.append(item);
        }
        ui.visual.append(row);
    }

    // مسألة جمع بالصور: مجموعة + مجموعة
    if (visual.kind === 'equation') {
        const eq = el('div', { class: 'visual-equation', dir: 'ltr', role: 'img',
            'aria-label': `${visual.left} تفاحة زائد ${visual.right} تفاحة` });
        const group = (n) => {
            const g = el('span', { class: 'eq-group' });
            for (let i = 0; i < n; i++) g.append(svgIcon(visual.image, 54, 'count-item'));
            g.append(el('span', { class: 'eq-num' }, String(n)));
            return g;
        };
        eq.append(group(visual.left), el('span', { class: 'eq-sign' }, '+'), group(visual.right),
            el('span', { class: 'eq-sign' }, '='), el('span', { class: 'eq-sign eq-ask' }, '?'));
        ui.visual.append(eq);
    }
}

/* ---------- 8) الإجابات ---------- */
function renderAnswers(q) {
    ui.answers.replaceChildren();
    ui.answers.className = 'quiz-answers';
    if (q.type === 'arrange') return buildArrange(q);

    ui.answers.classList.add(`answers-${q.options.length}`);
    q.options.forEach((option, i) => {
        const btn = el('button', {
            type: 'button',
            class: `answer-tile style-${q.style.split(' ').join(' style-')} tile-color-${i % 4}`,
            dataset: { value: option }
        }, option);
        if (q.lang === 'en') {
            btn.lang = 'en';
            btn.dir = 'ltr';
        }
        btn.addEventListener('click', () => choose(btn, option));
        ui.answers.append(btn);
    });
}

function choose(btn, option) {
    if (state.answered) return;
    const q = current();
    const correct = option === q.answer;
    btn.classList.add(correct ? 'is-correct' : 'is-wrong');

    if (!correct) {
        // إظهار الإجابة الصحيحة
        const right = ui.answers.querySelector(`[data-value="${CSS.escape(q.answer)}"]`);
        if (right) right.classList.add('is-correct', 'is-reveal');
    }
    ui.answers.querySelectorAll('.answer-tile').forEach((b) => {
        b.disabled = true;
        if (!b.classList.contains('is-correct') && !b.classList.contains('is-wrong')) b.classList.add('is-dim');
    });
    finishQuestion(option, correct);
}

// رتّب الحروف: الضغط على حرف ينقله لأول خانة، وعند امتلاء الخانات نتحقق تلقائيًا
function buildArrange(q) {
    const parts = Array.from(q.answer);
    const slots = el('ol', { class: 'quiz-slots', 'aria-label': 'خانات الكلمة' });
    const tiles = el('ul', { class: 'quiz-tiles', 'aria-label': 'الحروف المتاحة' });

    parts.forEach((_, i) => {
        const slot = el('button', { type: 'button', class: 'quiz-slot', disabled: '', 'aria-label': `الخانة ${i + 1} فارغة` });
        slot.addEventListener('click', () => {
            if (state.answered || !slot.dataset.part) return;
            const tile = [...tiles.querySelectorAll('.answer-tile')].find((t) => t.disabled && t.dataset.value === slot.dataset.part);
            if (tile) tile.disabled = false;
            delete slot.dataset.part;
            slot.textContent = '';
            slot.disabled = true;
            slot.classList.remove('is-filled');
        });
        const li = el('li');
        li.append(slot);
        slots.append(li);
    });

    shuffle(q.tiles).forEach((part, i) => {
        const tile = el('button', { type: 'button', class: `answer-tile style-letter tile-color-${i % 4}`, dataset: { value: part } }, part);
        tile.addEventListener('click', () => {
            if (state.answered) return;
            const empty = [...slots.querySelectorAll('.quiz-slot')].find((s) => !s.dataset.part);
            if (!empty) return;
            empty.dataset.part = part;
            empty.textContent = part;
            empty.disabled = false;
            empty.classList.add('is-filled');
            tile.disabled = true;
            playTones([440]);

            const all = [...slots.querySelectorAll('.quiz-slot')];
            if (all.every((s) => s.dataset.part)) {
                const word = all.map((s) => s.dataset.part).join('');
                const correct = word === q.answer;
                all.forEach((s, k) => {
                    s.disabled = true;
                    s.classList.add(correct ? 'is-correct' : 'is-wrong');
                    if (!correct) s.dataset.right = parts[k];
                });
                if (!correct) showArrangeAnswer(all, parts);
                finishQuestion(word, correct);
            }
        });
        const li = el('li');
        li.append(tile);
        tiles.append(li);
    });

    ui.answers.classList.add('answers-arrange');
    ui.answers.append(slots, tiles);
}

// بعد الخطأ في الترتيب: نعرض الترتيب الصحيح بعد لحظة
function showArrangeAnswer(slots, parts) {
    setTimeout(() => {
        slots.forEach((s, k) => {
            s.textContent = parts[k];
            s.classList.remove('is-wrong');
            s.classList.add('is-correct', 'is-reveal');
        });
    }, 900);
}

/* ---------- 9) بعد الإجابة ---------- */
const PRAISE = ['رائع!', 'ممتاز!', 'أحسنت!', 'بطل!', 'عبقري!'];

function finishQuestion(selected, correct) {
    const q = current();
    state.answered = true;
    state.results[state.index] = { id: q.id, subject: q.subject, selected, correct };

    // تحديث نقطة السؤال الحالي فورًا
    const dot = ui.dots.children[state.index];
    dot.classList.remove('is-current');
    dot.classList.add(correct ? 'is-correct' : 'is-wrong');

    ui.feedback.hidden = false;
    ui.feedback.classList.toggle('is-correct', correct);
    ui.feedback.classList.toggle('is-wrong', !correct);

    if (correct) {
        const word = PRAISE[Math.floor(Math.random() * PRAISE.length)];
        ui.feedback.textContent = `${word} إجابة صحيحة ⭐`;
        soundCorrect();
        burstConfetti();
    } else {
        ui.feedback.textContent = `لا بأس! الإجابة الصحيحة: ${q.answer}`;
        soundWrong();
    }

    const isLast = state.index === QUESTIONS.length - 1;
    ui.nextLabel.textContent = isLast ? 'اعرض نتيجتي' : 'السؤال التالي';
    ui.nextBtn.hidden = false;
    ui.nextBtn.focus({ preventScroll: true });
}

// نجوم وقطع ملونة تتطاير من وسط البطاقة
function burstConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ui.confetti.replaceChildren();
    const colors = ['#ffc727', '#2f8cf0', '#2fb36b', '#ff6b9d', '#8a5cf6', '#ff8a1f'];
    for (let i = 0; i < 26; i++) {
        const piece = el('span', { class: 'confetti-piece' + (i % 3 === 0 ? ' is-star' : '') });
        const angle = Math.random() * Math.PI * 2;
        const distance = 120 + Math.random() * 160;
        piece.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        piece.style.setProperty('--y', `${Math.sin(angle) * distance - 60}px`);
        piece.style.setProperty('--r', `${Math.random() * 540 - 270}deg`);
        piece.style.setProperty('--c', colors[i % colors.length]);
        piece.style.animationDelay = `${Math.random() * 0.1}s`;
        if (i % 3 === 0) piece.textContent = '★';
        ui.confetti.append(piece);
    }
    setTimeout(() => ui.confetti.replaceChildren(), 1300);
}

function nextQuestion() {
    if (state.index < QUESTIONS.length - 1) {
        state.index++;
        renderQuestion();
    } else {
        showResult();
    }
}

/* ---------- 10) النتيجة ---------- */
function levelFor(score) {
    if (score === 3) return { label: 'ممتاز', note: 'مستعد للتحدي! ابدأ من المستوى الثاني.', className: 'lvl-high' };
    if (score === 2) return { label: 'جيد جدًا', note: 'معرفة جيدة، نراجع قليلًا ثم ننطلق.', className: 'lvl-mid' };
    return { label: 'لنبدأ معًا', note: 'سنبدأ من الأساسيات خطوة بخطوة.', className: 'lvl-start' };
}

function showResult() {
    const total = state.results.filter((r) => r.correct).length;
    const scores = {};
    Object.keys(SUBJECTS).forEach((key) => {
        scores[key] = state.results.filter((r) => r.subject === key && r.correct).length;
    });

    ui.resultTitle.textContent = total >= 7 ? 'رائع يا بطل!' : total >= 4 ? 'أحسنت يا بطل!' : 'بداية رائعة يا بطل!';
    ui.resultTotal.textContent = `أجبت ${total} من ${QUESTIONS.length} إجابات صحيحة`;

    ui.resultStars.replaceChildren(...state.results.map((r, i) => {
        const star = el('span', { class: 'result-star' + (r.correct ? ' is-on' : '') });
        star.style.animationDelay = `${i * 0.08}s`;
        star.append(svgIcon('i-star', 34));
        return star;
    }));
    ui.resultStars.setAttribute('aria-label', `${total} نجوم من ${QUESTIONS.length}`);

    // بطاقة لكل مادة: الدرجة + شريط + توصية + رابط
    ui.subjectResults.replaceChildren(...Object.entries(SUBJECTS).map(([key, subject]) => {
        const score = scores[key];
        const level = levelFor(score);
        const li = el('li', { class: `subject-result result-${key} ${level.className}` });

        const head = el('div', { class: 'sr-head' });
        head.append(el('span', { class: 'chip-icon', 'aria-hidden': 'true' }, subject.icon),
            el('h3', { class: 'sr-name' }, subject.name),
            el('span', { class: 'sr-score' }, `${score} من 3`));

        const bar = el('progress', { class: 'sr-bar', max: '3', value: String(score), 'aria-label': `${subject.name}: ${score} من 3` });

        const note = el('p', { class: 'sr-note' });
        note.append(el('strong', {}, level.label + ': '), level.note);

        const link = el('a', { href: subject.link, class: 'sr-link' }, 'ابدأ هنا ←');
        li.append(head, bar, note, link);
        return li;
    }));

    // بيانات الربط مع PHP
    ui.main.dataset.arabicScore = scores.arabic;
    ui.main.dataset.englishScore = scores.english;
    ui.main.dataset.mathScore = scores.math;
    ui.main.dataset.totalScore = total;
    ui.main.dataset.testDate = new Date().toISOString().slice(0, 10);
    ui.resultsInput.value = JSON.stringify({ scores, total, answers: state.results });

    showScreen(ui.result);
    if (total >= 4) burstConfetti();
    soundCorrect();
    speak(ui.resultTitle.textContent);
}

/* ---------- 11) الأحداث ---------- */
ui.startBtn.addEventListener('click', startQuiz);
ui.nextBtn.addEventListener('click', nextQuestion);
ui.retryBtn.addEventListener('click', startQuiz);
ui.promptSound.addEventListener('click', () => {
    const q = current();
    const wasMuted = state.muted;
    state.muted = false;           // زر السماعة يعمل حتى مع كتم المؤثرات
    speak(q.prompt, q.lang);
    state.muted = wasMuted;
});
ui.muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    if (state.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    ui.muteBtn.setAttribute('aria-pressed', String(state.muted));
    ui.muteBtn.setAttribute('aria-label', state.muted ? 'تشغيل الأصوات' : 'كتم الأصوات');
    ui.muteBtn.firstElementChild.textContent = state.muted ? '🔇' : '🔊';
});

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
