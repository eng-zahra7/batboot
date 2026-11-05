/* =========================================================
   بطبوط - محرّك الدروس التفاعلية (lesson.js)
   ملف واحد يعمل مع:
   - مجموعات الحروف (letters-1.html ...)   kind = "letters"
     والحروف الإنجليزية (english-letters-1.html) بنفس النوع مع lang = "en"
   - مستويات الكلمات (words-1.html ...)    kind = "words"
   - مستويات الجمل   (sentences-1.html ...) kind = "sentences"
   يقرأ بيانات المستوى من الصفحة، ويعرض الأنشطة واحدًا تلو الآخر،
   وينطق الكلمات، ويتحقق من الإجابات، ويحسب النجوم.
   ملاحظة: الإجابات الصحيحة موجودة في بيانات الصفحة لأن التحقق الآن في المتصفح.
   في مرحلة PHP ستنتقل البيانات والتحقق إلى السيرفر وقاعدة البيانات.
   ========================================================= */

'use strict';

/* ---------- 1) بيانات المستوى ----------
   تأتي من الصفحة نفسها:
   <script type="application/json" id="level-data">
   وفي مرحلة PHP تُكتب من قاعدة البيانات بـ json_encode. */
const LEVEL = JSON.parse(document.getElementById('level-data').textContent);
const ITEMS = LEVEL.items;
const KIND = LEVEL.kind;   // "letters" أو "words" أو "sentences"
const LANG = LEVEL.lang || 'ar';   // لغة محتوى الدرس: "ar" أو "en"

// محتوى الدروس الإنجليزية يُكتب من اليسار لليمين داخل الصفحة العربية
function markLang(node) {
    if (LANG === 'en' && node) {
        node.lang = 'en';
        node.dir = 'ltr';
    }
    return node;
}

/* ---------- 2) عناصر الصفحة ---------- */
const $ = (selector) => document.querySelector(selector);

const ui = {
    page: $('.letters-page'),
    progress: $('#progress'),
    progressText: $('#progress-text'),
    steps: $('#item-steps'),
    img: $('#item-img'),
    text: $('#item-text'),
    sound: $('#item-sound'),
    parts: $('#parts-list'),
    joined: $('#parts-joined'),       // موجود في صفحات الكلمات فقط
    bigLetter: $('#letter-big'),      // موجود في صفحات الحروف فقط
    titleLetter: $('#title-letter'),  // موجود في صفحات الحروف فقط
    coach: $('#coach-text'),
    panel: $('#question-panel'),
    qTitle: $('#q-title'),
    qBody: $('#question-body'),
    feedback: $('#feedback'),
    checkBtn: $('#check-btn'),
    checkLabel: $('#check-label'),
    prevBtn: $('#prev-btn'),
    content: $('#lesson-content'),
    result: $('#result-card'),
    resultStars: $('#result-stars'),
    resultText: $('#result-text'),
    restartBtn: $('#restart-btn'),
    // المستوى الحالي والتالي في القائمة الجانبية حسب رقم المستوى
    levelItem: document.querySelector(`.letters-list [data-level-id="${LEVEL.levelId}"]`),
    nextItem: document.querySelector(`.letters-list [data-level-id="${LEVEL.levelId + 1}"]`)
};

/* ---------- 3) حالة الدرس ---------- */
const state = {
    index: 0,          // رقم النشاط الحالي
    selected: '',      // إجابة الطفل الحالية
    solved: false,     // هل حُلّ النشاط الحالي؟
    attempts: 0,       // عدد المحاولات في النشاط الحالي
    results: []        // لكل نشاط: { solved, firstTry }
};

const current = () => ITEMS[state.index];

// نص النشاط حسب نوع الدرس: الحرف، أو الكلمة، أو كلمات الجملة مجتمعة
const stepLabel = (item) => (KIND === 'letters' ? item.letter : itemText(item));
const itemText = (item) => (KIND === 'sentences' ? item.words.join(' ') : item.word);
// ما يُنطق عند الضغط على زر الصوت الرئيسي: الحرف في درس الحروف، وإلا النص كاملًا
const speechText = (item) => (KIND === 'letters' ? item.letter : itemText(item));

/* ---------- 4) رابط مباشر لكل نشاط ----------
   words-1.html?step=2 يفتح النشاط الثاني مباشرة،
   وأثناء التنقل يتغير الرابط، فلكل نشاط رابطه الخاص. */
function readStepFromUrl() {
    const step = Number(new URLSearchParams(window.location.search).get('step'));
    if (Number.isInteger(step) && step >= 1 && step <= ITEMS.length) {
        state.index = step - 1;
    }
}

function writeStepToUrl() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('step', state.index + 1);
        window.history.replaceState(null, '', url);
    } catch (error) {
        // بعض المتصفحات تمنع تغيير الرابط للملفات المحلية: نتجاهل ذلك بأمان
    }
}

/* ---------- 5) أدوات مساعدة ---------- */

// إنشاء عنصر HTML بخصائصه ونصه
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

// أيقونة SVG من مجموعة الرموز في الصفحة
function svgIcon(id, width, height, className = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('aria-hidden', 'true');
    if (className) svg.setAttribute('class', className);
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
}

// خلط عناصر مصفوفة (Fisher–Yates)
function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// نطق النص بصوت المتصفح (Web Speech API) بلغة الدرس
function speak(text, lang = LANG) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'ar-SA';
    utterance.rate = 0.8;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

/* ---------- 6) عرض النشاط الحالي ---------- */
function renderItem() {
    const item = current();
    const total = ITEMS.length;

    // إعادة ضبط حالة السؤال
    state.selected = '';
    state.solved = state.results[state.index]?.solved || false;
    state.attempts = 0;
    ui.qBody.classList.remove('is-solved');
    writeStepToUrl();

    // التقدم
    ui.progress.value = state.index + 1;
    ui.progress.max = total;
    ui.progress.setAttribute('aria-label', `${LEVEL.itemName} ${state.index + 1} من ${total}`);
    ui.progressText.textContent = `${state.index + 1} / ${total}`;

    // شريط أنشطة المستوى
    ui.steps.replaceChildren(...ITEMS.map((entry, i) => {
        const li = el('li', { class: 'word-step' }, stepLabel(entry));
        if (i === state.index) {
            li.classList.add('is-current');
            li.setAttribute('aria-current', 'step');
        } else if (state.results[i]?.solved) {
            li.classList.add('is-done');
        }
        return li;
    }));

    // الصورة والنص وبطبوط
    ui.img.querySelector('use').setAttribute('href', '#' + item.image);
    ui.img.setAttribute('aria-label', 'صورة ' + item.imageLabel);
    if (KIND === 'sentences') {
        ui.text.textContent = itemText(item);
    } else {
        // الحرف الأول من الكلمة ملوّن
        ui.text.replaceChildren(el('span', { class: 'letter-hl' }, item.word[0]), item.word.slice(1));
    }
    if (ui.titleLetter) ui.titleLetter.textContent = item.letter;
    [ui.text, ui.bigLetter, ui.titleLetter, ui.parts, ui.steps].forEach(markLang);
    ui.coach.textContent = item.coach;

    renderParts(item);

    // بيانات الربط مع PHP
    ui.page.dataset.itemId = item.id;
    ui.page.dataset.questionType = item.question.type;
    ui.page.dataset.selectedAnswer = '';
    ui.page.dataset.isCorrect = '';

    renderQuestion();
    hideFeedback();
    updateButtons();
}

// بطاقة التفكيك: الحرف وحركاته، أو حروف الكلمة، أو كلمات الجملة مع دورها
function renderParts(item) {
    if (KIND === 'letters') {
        ui.bigLetter.textContent = item.big || item.letter;   // مثل: Aa في الإنجليزية
        ui.parts.setAttribute('aria-label', LANG === 'en' ? `أشكال حرف ${item.letter}` : `حرف ${item.letter} مع الحركات`);
        ui.parts.replaceChildren(...item.harakat.map((h) => {
            const btn = el('button', { type: 'button', class: 'haraka-btn', 'aria-label': `استمع إلى ${h}` }, h);
            btn.addEventListener('click', () => speak(h));
            const li = el('li');
            li.append(btn);
            return li;
        }));
    } else if (KIND === 'words') {
        ui.parts.setAttribute('aria-label', `حروف كلمة ${item.word}`);
        ui.parts.replaceChildren(...item.letters.map((letter, i) => {
            const btn = el('button', {
                type: 'button',
                class: 'haraka-btn spell-letter' + (i === 0 ? ' is-first' : ''),
                'aria-label': `استمع إلى حرف ${letter}`
            }, letter);
            btn.addEventListener('click', () => speak(letter));
            const li = el('li');
            li.append(btn);
            return li;
        }));
        // الكلمة موصولة والحرف الأول ملوّن
        ui.joined.replaceChildren(el('span', { class: 'letter-hl' }, item.word[0]), item.word.slice(1));
    } else {
        ui.parts.replaceChildren(...item.words.map((word, i) => {
            const li = el('li', { class: 'sentence-part' });
            const btn = el('button', { type: 'button', class: 'haraka-btn word-chip', 'aria-label': `استمع إلى كلمة ${word}` }, word);
            btn.addEventListener('click', () => speak(word));
            li.append(btn, el('span', { class: 'word-role' }, item.roles[i]));
            return li;
        }));
    }
}

/* ---------- 7) بناء السؤال حسب نوعه ---------- */
function renderQuestion() {
    const q = current().question;
    ui.qTitle.textContent = q.title;
    ui.qBody.replaceChildren();
    ui.panel.classList.remove('is-shaking');

    const builders = {
        'arrange-words': buildArrange,     // جمل: رتّب الكلمات
        'arrange-letters': buildArrange,   // كلمات: رتّب الحروف
        'sentence-choice': buildImageChoice,
        'word-choice': buildImageChoice,
        'complete': buildFillBlank,        // جمل: أكمل الجملة
        'missing-letter': buildFillBlank,  // كلمات: الحرف الناقص
        'picture-choice': buildPictureChoice,
        'find-letter': buildFindLetter     // حروف: أين الحرف؟
    };
    builders[q.type](q);

    // نشاط محلول سابقًا: نعرض الإجابة الصحيحة مباشرة
    if (state.solved) showSolved();
}

// تقسيم الإجابة إلى أجزاء: كلمات (بمسافات) أو حروف
const answerParts = (q) => (q.type === 'arrange-words' ? q.answer.split(' ') : Array.from(q.answer));
const joinParts = (q, parts) => parts.join(q.type === 'arrange-words' ? ' ' : '');

// (أ) الترتيب: كلمات أو حروف
function buildArrange(q) {
    const wide = q.type === 'arrange-words' ? ' sentence-slots' : '';
    const slots = el('ol', { class: 'arrange-slots' + wide, 'aria-label': 'الخانات' });
    const tiles = el('ul', { class: 'arrange-tiles' + (wide ? ' sentence-tiles' : ''), 'aria-label': 'القطع المتاحة' });

    answerParts(q).forEach((_, i) => {
        const slot = el('button', { type: 'button', class: 'arrange-slot', 'aria-label': `الخانة ${i + 1} فارغة`, disabled: '' });
        slot.addEventListener('click', () => returnTile(slot));
        const li = el('li');
        li.append(slot);
        slots.append(li);
    });

    shuffle(q.tiles).forEach((part) => {
        const tile = el('button', { type: 'button', class: 'arrange-tile', dataset: { part } }, part);
        tile.addEventListener('click', () => placeTile(tile, slots));
        const li = el('li');
        li.append(tile);
        tiles.append(li);
    });

    const reset = el('button', { type: 'button', class: 'arrange-reset' });
    reset.append(el('span', { 'aria-hidden': 'true' }, '↺'), ' أعد المحاولة');
    reset.addEventListener('click', () => {
        if (state.solved) return;
        renderQuestion();
        hideFeedback();
        updateArrangeAnswer();
    });

    markLang(slots);
    markLang(tiles);
    ui.qBody.append(slots, tiles, reset);
}

// نقل قطعة إلى أول خانة فارغة
function placeTile(tile, slots) {
    if (state.solved) return;
    const empty = [...slots.querySelectorAll('.arrange-slot')].find((s) => !s.dataset.part);
    if (!empty) return;
    empty.dataset.part = tile.dataset.part;
    empty.textContent = tile.dataset.part;
    empty.classList.add('is-filled');
    empty.disabled = false;
    empty.setAttribute('aria-label', `${tile.dataset.part}، اضغط لإرجاعها`);
    tile.disabled = true;
    speak(tile.dataset.part);
    hideFeedback();
    updateArrangeAnswer();
}

// إرجاع القطعة من الخانة (نبحث عن قطعة مستخدمة بنفس النص، لأن الحرف قد يتكرر)
function returnTile(slot) {
    if (state.solved || !slot.dataset.part) return;
    const tile = [...ui.qBody.querySelectorAll('.arrange-tile')]
        .find((t) => t.disabled && t.dataset.part === slot.dataset.part);
    if (tile) tile.disabled = false;
    delete slot.dataset.part;
    slot.textContent = '';
    slot.classList.remove('is-filled', 'is-wrong');
    slot.disabled = true;
    slot.setAttribute('aria-label', 'خانة فارغة');
    hideFeedback();
    updateArrangeAnswer();
}

function updateArrangeAnswer() {
    const q = current().question;
    const slots = [...ui.qBody.querySelectorAll('.arrange-slot')];
    const full = slots.length > 0 && slots.every((s) => s.dataset.part);
    state.selected = full ? joinParts(q, slots.map((s) => s.dataset.part)) : '';
    updateButtons();
}

// خيارات نصية: لاختيار جملة أو كلمة أو حرف
function buildTextOptions(q, onPick) {
    const fieldset = markLang(el('fieldset', { class: 'answer-options text-options' }));
    if (q.type === 'sentence-choice') fieldset.classList.add('sentence-options');
    fieldset.append(el('legend', { class: 'visually-hidden' }, 'اختر الإجابة'));
    const textClass = (q.type === 'missing-letter' || q.type === 'find-letter') ? 'option-letter' : 'option-word';

    q.options.forEach((option) => {
        const label = el('label', { class: 'picture-option text-option' });
        const input = el('input', { type: 'radio', name: 'selected_answer', value: option });
        input.addEventListener('change', () => pick(option, onPick));
        const check = el('span', { class: 'option-check', 'aria-hidden': 'true' });
        check.append(svgIcon('i-check', 20, 20));
        label.append(input, check, el('span', { class: textClass }, option));
        fieldset.append(label);
    });
    return fieldset;
}

// (ب) صورة + خيارات نصية: "اختر الجملة/الكلمة المناسبة للصورة"
function buildImageChoice(q) {
    const img = svgIcon(q.image, 120, 120, 'question-img');
    img.setAttribute('role', 'img');
    img.setAttribute('aria-label', 'الصورة');
    img.removeAttribute('aria-hidden');
    ui.qBody.append(img, buildTextOptions(q));
}

// (ج) الفراغ: "أكمل الجملة" (الفراغ بعد النص) أو "الحرف الناقص" (الفراغ قبل النص)
function buildFillBlank(q) {
    const line = markLang(el('p', { class: 'missing-word' + (q.before ? ' complete-line' : '') }));
    const blank = el('span', { class: 'blank-box', id: 'blank-box' }, '؟');
    if (q.before) line.append(el('span', {}, q.before));
    line.append(blank);
    if (q.after) line.append(el('span', {}, q.after));

    const options = buildTextOptions(q, (value) => {
        blank.textContent = value;
        blank.classList.add('is-filled');
    });
    ui.qBody.append(line, options);
}

// (د) اختر الصورة: بدون كلمات تحتها (ليقرأ الطفل بنفسه)،
//     أو مع الكلمات إذا كان showLabels = true (في درس الحروف)
function buildPictureChoice(q) {
    const fieldset = el('fieldset', { class: 'answer-options picture-options' });
    fieldset.append(el('legend', { class: 'visually-hidden' }, 'اختر الصورة المناسبة'));
    q.options.forEach((option) => {
        const label = el('label', { class: 'picture-option' });
        const input = el('input', { type: 'radio', name: 'selected_answer', value: option.value, 'aria-label': option.label });
        input.addEventListener('change', () => pick(option.value));
        const check = el('span', { class: 'option-check', 'aria-hidden': 'true' });
        check.append(svgIcon('i-check', 20, 20));
        label.append(input, check, svgIcon(option.image, 96, 96, 'option-img'));
        if (q.showLabels) label.append(markLang(el('span', { class: 'option-word' }, option.label)));
        fieldset.append(label);
    });
    if (q.text) ui.qBody.append(markLang(el('p', { class: 'read-word' }, q.text)));
    ui.qBody.append(fieldset);
}

// (هـ) أين الحرف؟ خيارات حروف متشابهة الشكل
function buildFindLetter(q) {
    ui.qBody.append(buildTextOptions(q));
}

// اختيار إجابة من الخيارات
function pick(value, extra) {
    if (state.solved) return;
    state.selected = value;
    ui.qBody.querySelectorAll('.is-wrong').forEach((n) => n.classList.remove('is-wrong'));
    if (extra) extra(value);
    hideFeedback();
    updateButtons();
}

/* ---------- 8) التحقق من الإجابة ---------- */
function checkAnswer() {
    const q = current().question;
    if (!state.selected) return;

    state.attempts++;
    const correct = state.selected === q.answer;

    ui.page.dataset.selectedAnswer = state.selected;
    ui.page.dataset.isCorrect = String(correct);

    if (correct) {
        state.solved = true;
        if (!state.results[state.index]?.solved) {
            state.results[state.index] = { solved: true, firstTry: state.attempts === 1 };
        }
        showSolved();
        showFeedback(true, state.attempts === 1 ? 'ممتاز! إجابة صحيحة من أول مرة ⭐' : 'أحسنت! إجابة صحيحة');
        speak(itemText(current()));
        ui.steps.children[state.index].classList.add('is-done');
    } else {
        markWrong();
        showFeedback(false, 'ليست هذه، حاول مرة أخرى!');
    }
    updateButtons();
}

// إظهار الإجابة الصحيحة وقفل الخيارات
function showSolved() {
    const q = current().question;
    ui.qBody.classList.add('is-solved');
    ui.qBody.querySelectorAll('.is-wrong').forEach((n) => n.classList.remove('is-wrong'));

    if (q.type === 'arrange-words' || q.type === 'arrange-letters') {
        const slots = ui.qBody.querySelectorAll('.arrange-slot');
        answerParts(q).forEach((part, i) => {
            slots[i].dataset.part = part;
            slots[i].textContent = part;
            slots[i].classList.add('is-filled', 'is-correct');
            slots[i].disabled = true;
        });
        ui.qBody.querySelectorAll('.arrange-tile').forEach((t) => { t.disabled = true; });
    } else {
        ui.qBody.querySelectorAll('input[type="radio"]').forEach((input) => {
            const isAnswer = input.value === q.answer;
            input.checked = isAnswer;
            input.disabled = true;
            input.closest('label').classList.toggle('is-correct', isAnswer);
        });
        const blank = ui.qBody.querySelector('#blank-box');
        if (blank) {
            blank.textContent = q.answer;
            blank.classList.add('is-filled', 'is-correct');
        }
    }
}

// تمييز الإجابة الخاطئة مع اهتزاز
function markWrong() {
    const q = current().question;
    if (q.type === 'arrange-words' || q.type === 'arrange-letters') {
        ui.qBody.querySelectorAll('.arrange-slot').forEach((s) => s.classList.add('is-wrong'));
    } else {
        const checked = ui.qBody.querySelector('input:checked');
        if (checked) checked.closest('label').classList.add('is-wrong');
    }
    ui.panel.classList.remove('is-shaking');
    void ui.panel.offsetWidth; // إعادة تشغيل الحركة
    ui.panel.classList.add('is-shaking');
}

/* ---------- 9) الرسائل والأزرار والتنقل ---------- */
function showFeedback(ok, message) {
    ui.feedback.hidden = false;
    ui.feedback.textContent = message;
    ui.feedback.classList.toggle('is-correct', ok);
    ui.feedback.classList.toggle('is-wrong', !ok);
}

function hideFeedback() {
    ui.feedback.hidden = true;
    ui.feedback.textContent = '';
}

function updateButtons() {
    const isLast = state.index === ITEMS.length - 1;
    ui.prevBtn.disabled = state.index === 0;

    if (state.solved) {
        ui.checkLabel.textContent = isLast ? 'إنهاء المستوى' : 'التالي';
        ui.checkBtn.disabled = false;
    } else {
        ui.checkLabel.textContent = 'تحقّق';
        ui.checkBtn.disabled = !state.selected;
    }
}

function goNext() {
    if (state.index < ITEMS.length - 1) {
        state.index++;
        renderItem();
    } else {
        finishLevel();
    }
}

function goPrev() {
    if (state.index === 0) return;
    state.index--;
    renderItem();
}

/* ---------- 10) نهاية المستوى ---------- */
function finishLevel() {
    const stars = state.results.filter((r) => r?.firstTry).length;
    const total = ITEMS.length;

    // بيانات الربط مع PHP
    ui.page.dataset.isCompleted = 'true';
    ui.page.dataset.starsEarned = String(stars);
    ui.page.dataset.completionDate = new Date().toISOString().slice(0, 10);

    // النجوم
    ui.resultStars.replaceChildren(...ITEMS.map((_, i) => {
        const star = el('span', { class: 'result-star' + (i < stars ? ' is-on' : '') });
        star.style.animationDelay = `${i * 0.15}s`;
        star.append(svgIcon('i-star', 48, 48));
        return star;
    }));
    ui.resultStars.setAttribute('aria-label', `حصلت على ${stars} من ${total} نجوم`);

    ui.resultText.textContent = stars === total
        ? 'كل الإجابات صحيحة من أول مرة! أنت بطل حقيقي.'
        : `حصلت على ${stars} من ${total} نجوم. يمكنك إعادة المستوى لتجمع كل النجوم!`;

    ui.levelItem.classList.replace('is-current', 'is-done');
    unlockNextLevel();

    ui.content.hidden = true;
    ui.result.hidden = false;
    speak('أحسنت يا بطل', 'ar');
}

// فتح المستوى التالي في القائمة الجانبية
function unlockNextLevel() {
    const item = ui.nextItem;
    if (!item || !LEVEL.nextUrl || item.dataset.state === 'open') return;
    item.classList.remove('is-locked');
    item.dataset.state = 'open';
    item.removeAttribute('aria-disabled');
    const name = item.querySelector('.topic-name').textContent;
    const link = el('a', { href: LEVEL.nextUrl });
    link.append(el('span', { class: 'lvl-num' }, String(LEVEL.levelId + 1)), el('span', { class: 'letter-char topic-name' }, name));
    item.replaceChildren(link);
    item.classList.add('is-unlocked');
}

function restartLevel() {
    state.index = 0;
    state.results = [];
    ui.page.dataset.isCompleted = 'false';
    ui.page.dataset.starsEarned = '0';
    ui.page.dataset.completionDate = '';
    ui.levelItem.classList.replace('is-done', 'is-current');
    ui.result.hidden = true;
    ui.content.hidden = false;
    renderItem();
}

/* ---------- 11) ربط الأحداث وبدء الدرس ---------- */
ui.sound.addEventListener('click', () => speak(speechText(current())));
ui.checkBtn.addEventListener('click', () => (state.solved ? goNext() : checkAnswer()));
ui.prevBtn.addEventListener('click', goPrev);
ui.restartBtn.addEventListener('click', restartLevel);

// بعض المتصفحات تحمّل الأصوات متأخرًا
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

readStepFromUrl();
renderItem();
