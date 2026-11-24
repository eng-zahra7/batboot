/* =========================================================
   بطبوط - ملف JavaScript واحد لصفحات التسجيل الثلاث
   1) register-parent.html : بيانات ولي الأمر
   2) register.html : بيانات الطفل أو الأطفال
   3) confirm.html  : مراجعة البيانات وتأكيد التسجيل

   فكرة الملف:
   - يكتشف الصفحة الحالية من النموذج الموجود فيها، ويشغّل الجزء الخاص بها فقط.
   - يتحقق من الحقول برسائل عربية واضحة تحت كل حقل.
   - يرسل النماذج إلى ملفات PHP (مجلد php) عبر fetch، وتُحفظ البيانات
     المؤقتة في جلسة PHP ($_SESSION) لتنتقل بين الصفحات الثلاث،
     وتعود الحقول مملوءة عند الضغط على "تعديل".

   مهم: هذا التحقق لراحة المستخدم فقط، والخادم يعيد التحقق من كل شيء.
   ========================================================= */

'use strict';

/* =========================================================
   أولًا: الإعدادات والأدوات المشتركة
   ========================================================= */

// ملفات PHP التي تستقبل النماذج (نسبةً إلى جذر المشروع حيث توجد صفحات HTML)
const API = {
    parent: 'php/register-parent.php',      // بيانات ولي الأمر
    children: 'php/register-children.php',  // بيانات الأطفال
    confirm: 'php/confirm.php',             // عرض الملخص والحفظ النهائي
    login: 'php/login.php'                  // تسجيل دخول ولي الأمر (login.html)
};

// رسائل الأخطاء العامة (غير المرتبطة بحقل معيّن)
const MESSAGES = {
    network: 'تعذّر الاتصال بالخادم، تأكد من تشغيل Apache وMySQL ثم حاول مرة أخرى',
    server: 'حدث خطأ غير متوقع، حاول مرة أخرى بعد قليل',
    expired: 'انتهت جلسة التسجيل، سنعيدك إلى الخطوة المناسبة'
};

// أسماء صفحات التسجيل في المشروع: إذا غيّرت اسم ملف، عدّله هنا فقط
const PAGES = {
    parent: 'register-parent.html',   // بيانات ولي الأمر
    children: 'register-childe.html',        // بيانات الطفل
    confirm: 'confirm.html',          // التأكيد
    placement: 'fun-exam.html',      // اختبار المستوى بعد التسجيل
    home: 'main-page.html'           // الصفحة الرئيسية بعد تسجيل الدخول
};

// عمر الطفل المناسب للتطبيق (بالسنوات)
const MIN_AGE = 3;
const MAX_AGE = 10;

// نصوص عربية لقيم الحقول (القيم في HTML بالإنجليزية لتناسب قاعدة البيانات)
const LABELS = {
    relation: { mother: 'أم', father: 'أب', sister: 'أخت', brother: 'أخ', other: 'أخرى' },
    gender: { girl: 'بنت', boy: 'ولد' },
    language: { ar: 'العربية', en: 'English' }
};

/* ---------- التواصل مع الخادم (جلسة PHP) ---------- */

// رمز CSRF يأتي من الخادم مع كل صفحة ويُرسل مع كل نموذج
let csrfToken = '';

// طلب إلى ملف PHP: يُرجع دائمًا كائنًا (حتى لو كان الرد خطأ)، ويرمي الخطأ فقط عند انقطاع الاتصال
async function callServer(url, { method = 'GET', body } = {}) {
    const response = await fetch(url, {
        method,
        body,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;   // الرد ليس JSON (مثل صفحة خطأ من Apache)
    }
    if (!data || typeof data !== 'object') data = { ok: false, message: MESSAGES.server };
    data.status = response.status;
    return data;
}

// قراءة حالة الصفحة من الخادم: البيانات المحفوظة في الجلسة + رمز CSRF
// عند الفشل نعرض رسالة فوق النموذج ونُرجع { ok: false }
async function loadState(url, form) {
    try {
        const state = await callServer(url);
        if (state.csrf) csrfToken = state.csrf;
        if (!state.ok) showFormAlert(form, state.message || MESSAGES.server);
        return state;
    } catch (error) {
        showFormAlert(form, MESSAGES.network);
        return { ok: false };
    }
}

// إرسال بيانات النموذج (والحقول الإضافية) إلى ملف PHP مع رمز CSRF
async function submitToServer(url, form, extra = {}) {
    const body = new FormData(form);
    Object.entries(extra).forEach(([key, value]) => body.append(key, value));
    body.append('csrf_token', csrfToken);

    const result = await callServer(url, { method: 'POST', body });
    if (result.csrf) csrfToken = result.csrf;   // الخادم يجدّد الرمز عند انتهاء صلاحيته
    return result;
}

// رسالة عامة فوق النموذج (لأخطاء لا تخص حقلًا معيّنًا)
function showFormAlert(form, message) {
    let alertBox = form.previousElementSibling;
    if (!alertBox || !alertBox.classList.contains('form-alert')) {
        alertBox = document.createElement('p');
        alertBox.setAttribute('role', 'alert');
        form.before(alertBox);
    }
    alertBox.className = 'form-alert is-error';
    alertBox.textContent = message;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideFormAlert(form) {
    const alertBox = form.previousElementSibling;
    if (alertBox && alertBox.classList.contains('form-alert')) alertBox.hidden = true;
}

// عرض أخطاء الخادم تحت الحقول المناسبة، ويُرجع عدد الأخطاء التي وجدت حقلها
function showServerErrors(fields, errors) {
    let shown = 0;
    fields.forEach((field) => {
        const message = errors && errors[field.key];
        if (message) {
            showError(field.box, field.input, message);
            shown++;
        }
    });
    return shown;
}

// الخادم يطلب العودة لخطوة سابقة (مثل انتهاء الجلسة): نعرض الرسالة ثم ننتقل
function redirectWithMessage(form, result) {
    showFormAlert(form, result.message || MESSAGES.expired);
    window.setTimeout(() => window.location.replace(result.redirect), 1800);
}

// تعطيل الزر أثناء المعالجة (يمنع الإرسال المزدوج) وتغيير نصه ثم إعادته
function setBusy(button, busy, busyText) {
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');

    const textNode = [...button.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!textNode) return;
    if (busy) {
        button.dataset.originalText = textNode.textContent;
        textNode.textContent = ` ${busyText} `;
    } else if (button.dataset.originalText !== undefined) {
        textNode.textContent = button.dataset.originalText;
    }
}

// زر العين: إظهار كلمة السر وإخفاؤها (صفحة التسجيل وصفحة الدخول)
function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach((button) => {
        const input = document.getElementById(button.getAttribute('aria-controls'));
        if (!input) return;
        button.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(show));
            button.setAttribute('aria-label', show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر');
        });
    });
}

/* ---------- عرض رسائل الخطأ ---------- */

// كل حقل (أو مجموعة اختيارات) له "حاوية" نضع بعدها رسالة الخطأ
function getErrorBox(container) {
    let box = container.nextElementSibling;
    if (!box || !box.classList.contains('field-error')) {
        box = document.createElement('p');
        box.className = 'field-error';
        box.id = 'error-' + Math.random().toString(36).slice(2, 9);
        box.setAttribute('aria-live', 'polite');
        container.after(box);
    }
    return box;
}

// إظهار رسالة خطأ وربطها بالحقل لقارئات الشاشة
function showError(container, field, message) {
    const box = getErrorBox(container);
    box.textContent = message;
    box.hidden = false;
    container.classList.add('is-invalid');
    if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', box.id);
    }
}

// إخفاء رسالة الخطأ عند تصحيح الحقل
function clearError(container, field) {
    const box = container.nextElementSibling;
    if (box && box.classList.contains('field-error')) box.hidden = true;
    container.classList.remove('is-invalid');
    if (field) field.removeAttribute('aria-invalid');
}

/* ---------- قواعد التحقق ----------
   كل دالة تُرجع نص الخطأ، أو نصًا فارغًا إذا كانت القيمة صحيحة */

const NAME_PATTERN = /^[\p{L}\s]+$/u;        // حروف (عربية أو إنجليزية) ومسافات فقط
const PHONE_PATTERN = /^05\d{8}$/;            // 05 ثم 8 أرقام
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function checkName(value, min, max, who) {
    const v = value.trim();
    if (!v) return `اكتب ${who}`;
    if (!NAME_PATTERN.test(v)) return 'الاسم يجب أن يحتوي على حروف فقط';
    if (v.length < min) return `الاسم قصير، يجب أن يكون ${min} حروف على الأقل`;
    if (v.length > max) return `الاسم طويل، الحد الأقصى ${max} حرفًا`;
    return '';
}

function checkPhone(value) {
    if (!value) return 'اكتب رقم الجوال';
    if (!PHONE_PATTERN.test(value)) return 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    return '';
}

function checkEmail(value) {
    const v = value.trim();
    if (!v) return 'اكتب البريد الإلكتروني';
    if (!EMAIL_PATTERN.test(v)) return 'صيغة البريد غير صحيحة، مثال: name@example.com';
    return '';
}

// كلمة السر: 8 أحرف على الأقل (حتى 64)، وفيها حرف ورقم
// optional = true عند التعديل إذا كانت كلمة السر محفوظة، فيجوز تركها فارغة
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 64;

function checkPassword(value, optional) {
    if (!value) return optional ? '' : 'اكتب كلمة السر';
    if (value.length < MIN_PASSWORD) return `كلمة السر قصيرة، يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل`;
    if (value.length > MAX_PASSWORD) return `كلمة السر طويلة، الحد الأقصى ${MAX_PASSWORD} حرفًا`;
    if (!/\p{L}/u.test(value)) return 'كلمة السر يجب أن تحتوي على حرف واحد على الأقل';
    if (!/\d/.test(value)) return 'كلمة السر يجب أن تحتوي على رقم واحد على الأقل';
    return '';
}

function checkPasswordConfirm(password, confirm, optional) {
    if (!password && !confirm) return optional ? '' : 'أعد كتابة كلمة السر';
    if (!confirm) return 'أعد كتابة كلمة السر';
    if (password !== confirm) return 'كلمتا السر غير متطابقتين';
    return '';
}

// حساب عمر الطفل بالسنوات الكاملة من تاريخ الميلاد
function ageFrom(dateText) {
    const birth = new Date(dateText);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday = today.getMonth() < birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (beforeBirthday) age--;
    return age;
}

function checkBirthdate(value) {
    if (!value) return 'اختر تاريخ الميلاد';
    const age = ageFrom(value);
    if (Number.isNaN(age)) return 'تاريخ غير صحيح';
    if (age < MIN_AGE) return `بطبوط مناسب للأطفال من عمر ${MIN_AGE} سنوات`;
    if (age > MAX_AGE) return `بطبوط مناسب للأطفال حتى عمر ${MAX_AGE} سنوات`;
    return '';
}

/* ---------- أدوات صغيرة ---------- */

// تاريخ اليوم ناقص عدد من السنوات بصيغة yyyy-mm-dd (لحقل التاريخ)
function yearsAgo(years) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString().slice(0, 10);
}

// عرض التاريخ بالشكل: 15 / 03 / 2019
function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d} / ${m} / ${y}`;
}

// قيمة زر الاختيار المحدد في مجموعة (أو نص فارغ)
function radioValue(form, name) {
    const checked = form.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
    return checked ? checked.value : '';
}

// إظهار زر "التالي" باهتًا حتى تكتمل البيانات، مع بقائه قابلًا للضغط
// حتى يُظهر للمستخدم ما الذي ينقصه
function setButtonReady(button, ready) {
    button.classList.toggle('is-waiting', !ready);
}

// تحريك الصفحة إلى أول خطأ وتركيز المؤشر فيه
function focusFirstError(form) {
    const first = form.querySelector('.is-invalid input, .is-invalid select, [aria-invalid="true"]');
    if (first) {
        first.focus({ preventScroll: true });
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/* =========================================================
   ثانيًا: صفحة ولي الأمر (register-parent.html)
   ========================================================= */
function initParentPage(form) {
    const name = form.querySelector('#parent-name');
    const phone = form.querySelector('#parent-phone');
    const email = form.querySelector('#parent-email');
    const password = form.querySelector('#parent-password');
    const passwordConfirm = form.querySelector('#parent-password-confirm');
    const relationGroup = form.querySelector('.relation-group');
    const otherBox = form.querySelector('.other-relation');
    const otherInput = form.querySelector('#relation-other-text');
    const submitBtn = form.querySelector('.btn-next');

    // عند العودة للتعديل تكون كلمة السر محفوظة (مشفّرة) في جلسة PHP،
    // فيجوز ترك حقليها فارغين للإبقاء عليها
    let keepPassword = false;

    // نستخدم رسائلنا العربية بدل رسائل المتصفح
    form.noValidate = true;

    // قائمة الحقول مع دالة التحقق والحاوية التي تظهر بعدها الرسالة
    // key = اسم الحقل في النموذج، ويُستخدم لعرض أخطاء الخادم تحت الحقل الصحيح
    const fields = [
        { key: 'parent_name', input: name, box: name.closest('.form-group'), check: () => checkName(name.value, 3, 50, 'اسم ولي الأمر') },
        { key: 'parent_phone', input: phone, box: phone.closest('.form-group'), check: () => checkPhone(phone.value) },
        { key: 'parent_email', input: email, box: email.closest('.form-group'), check: () => checkEmail(email.value) },
        { key: 'parent_password', input: password, box: password.closest('.form-group'), check: () => checkPassword(password.value, keepPassword) },
        {
            key: 'parent_password_confirm',
            input: passwordConfirm,
            box: passwordConfirm.closest('.form-group'),
            check: () => checkPasswordConfirm(password.value, passwordConfirm.value, keepPassword)
        },
        {
            key: 'relation',
            input: null,
            box: relationGroup,
            check: () => (radioValue(form, 'relation') ? '' : 'اختر صلة القرابة بالطفل')
        },
        {
            key: 'relation_other',
            input: otherInput,
            box: otherBox,
            check: () => {
                if (radioValue(form, 'relation') !== 'other') return '';
                return otherInput.value.trim() ? '' : 'حدّد صلة القرابة';
            }
        }
    ];
    const confirmField = fields.find((f) => f.key === 'parent_password_confirm');

    // --- (1) حقل "أخرى": يظهر ويصبح مطلوبًا فقط عند اختيار "أخرى" ---
    function updateOtherField() {
        const isOther = radioValue(form, 'relation') === 'other';
        otherBox.hidden = !isOther;
        otherInput.required = isOther;
        if (!isOther) {
            otherInput.value = '';
            clearError(otherBox, otherInput);
        }
    }
    updateOtherField();

    // --- (2) الجوال: نقبل الأرقام فقط ونحذف أي شيء آخر أثناء الكتابة ---
    phone.addEventListener('input', () => {
        phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
    });

    // --- (3) شروط كلمة السر: علامة ✓ على كل شرط يتحقق أثناء الكتابة ---
    const passwordRules = {
        length: (value) => value.length >= MIN_PASSWORD,
        letter: (value) => /\p{L}/u.test(value),
        number: (value) => /\d/.test(value)
    };

    function updatePasswordRules() {
        form.querySelectorAll('.password-rules li').forEach((item) => {
            const rule = passwordRules[item.dataset.rule];
            item.classList.toggle('is-met', Boolean(rule && rule(password.value)));
        });
    }

    password.addEventListener('input', () => {
        updatePasswordRules();
        // تغيير كلمة السر يؤثر على تطابقها مع حقل التأكيد
        if (passwordConfirm.value || confirmField.box.classList.contains('is-invalid')) {
            validateField(confirmField);
        }
    });

    // --- (4) التحقق: بعد مغادرة الحقل أول مرة، ثم مباشرة أثناء الكتابة ---
    fields.forEach((field) => {
        if (!field.input) return;
        field.input.addEventListener('blur', () => validateField(field));
        field.input.addEventListener('input', () => {
            if (field.box.classList.contains('is-invalid')) validateField(field);
            refreshButton();
        });
    });

    form.querySelectorAll('input[name="relation"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            updateOtherField();
            clearError(relationGroup);
            refreshButton();
        });
    });

    function validateField(field) {
        const message = field.check();
        if (message) showError(field.box, field.input, message);
        else clearError(field.box, field.input);
        return !message;
    }

    // فحص صامت (بدون إظهار رسائل) لتحديث شكل الزر
    function refreshButton() {
        setButtonReady(submitBtn, fields.every((f) => !f.check()));
    }
    refreshButton();

    // --- (5) استرجاع البيانات من جلسة PHP عند العودة من الخطوات التالية للتعديل ---
    loadState(API.parent, form).then((state) => {
        const saved = state.parent;
        if (!saved) return;

        name.value = saved.name || '';
        phone.value = saved.phone || '';
        email.value = saved.email || '';
        const radio = form.querySelector(`input[name="relation"][value="${saved.relation}"]`);
        if (radio) radio.checked = true;
        otherInput.value = saved.relationOther || '';

        keepPassword = Boolean(saved.hasPassword);
        if (keepPassword) {
            // كلمة السر لا تعود من الخادم أبدًا؛ نترك الحقلين فارغين للإبقاء عليها
            password.placeholder = 'اتركها فارغة للإبقاء على كلمة السر الحالية';
            passwordConfirm.placeholder = 'اتركها فارغة للإبقاء على كلمة السر الحالية';
        }

        updateOtherField();
        refreshButton();
    });

    // --- (6) الإرسال: نتحقق من الكل، ثم نرسل إلى php/register-parent.php ---
    let busy = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;   // منع الإرسال المزدوج أثناء المعالجة
        hideFormAlert(form);

        const allValid = fields.map(validateField).every(Boolean);
        if (!allValid) {
            focusFirstError(form);
            return;
        }

        busy = true;
        setBusy(submitBtn, true, 'جارٍ الحفظ...');
        try {
            const result = await submitToServer(API.parent, form);
            if (result.ok) {
                window.location.href = result.redirect || PAGES.children;
                return;   // نبقي الزر معطّلًا حتى تفتح الصفحة التالية
            }
            // أخطاء الخادم (مثل البريد المسجّل مسبقًا) تظهر تحت الحقل المعني
            if (showServerErrors(fields, result.errors)) focusFirstError(form);
            else showFormAlert(form, result.message || MESSAGES.server);
        } catch (error) {
            showFormAlert(form, MESSAGES.network);
        }
        busy = false;
        setBusy(submitBtn, false);
    });
}

/* =========================================================
   ثالثًا: صفحة بيانات الأطفال (register-childe.html)
   ========================================================= */
function initChildrenPage(form) {
    const countSelect = form.querySelector('#children-count');
    const template = form.querySelector('#child-1');   // بطاقة الطفل الأول نستخدمها قالبًا
    const submitBtn = form.querySelector('.btn-next');
    form.noValidate = true;

    // حدود تاريخ الميلاد حسب العمر المناسب (تُحدَّث كل سنة تلقائيًا)
    const minDate = yearsAgo(MAX_AGE + 1);
    const maxDate = yearsAgo(MIN_AGE);

    // --- (1) إنشاء بطاقة طفل جديدة بنسخ بطاقة الطفل الأول ---
    function createChildCard(number) {
        const card = template.cloneNode(true);
        const index = number - 1;   // children[0] للطفل الأول، children[1] للثاني...

        card.id = `child-${number}`;
        card.querySelector('legend').textContent = `الطفل ${number}`;

        // تحديث المعرّفات وأسماء الحقول حتى لا تتكرر بين البطاقات
        card.querySelectorAll('[id]').forEach((node) => {
            node.id = node.id.replace(/-\d+$/, `-${number}`);
        });
        card.querySelectorAll('[for]').forEach((node) => {
            node.htmlFor = node.htmlFor.replace(/-\d+$/, `-${number}`);
        });
        card.querySelectorAll('[aria-labelledby]').forEach((node) => {
            node.setAttribute('aria-labelledby', node.getAttribute('aria-labelledby').replace(/-\d+$/, `-${number}`));
        });
        card.querySelectorAll('[name]').forEach((node) => {
            node.name = node.name.replace(/children\[\d+\]/, `children[${index}]`);
        });

        // تفريغ القيم والأخطاء المنسوخة من البطاقة الأولى
        card.querySelectorAll('input[type="text"], input[type="date"]').forEach((input) => { input.value = ''; });
        card.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
        card.querySelectorAll('.field-error').forEach((node) => node.remove());
        card.querySelectorAll('.is-invalid').forEach((node) => node.classList.remove('is-invalid'));
        card.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));

        setupCard(card);
        return card;
    }

    // --- (2) ربط أحداث التحقق ببطاقة طفل ---
    function setupCard(card) {
        const birth = card.querySelector('input[type="date"]');
        birth.min = minDate;
        birth.max = maxDate;

        card.querySelectorAll('input').forEach((input) => {
            const event = input.type === 'radio' ? 'change' : 'input';
            input.addEventListener(event, () => {
                const field = fieldsOf(card).find((f) => f.box.contains(input));
                if (field && (input.type === 'radio' || field.box.classList.contains('is-invalid'))) {
                    validateField(field);
                }
                refreshButton();
            });
            if (input.type !== 'radio') {
                input.addEventListener('blur', () => {
                    const field = fieldsOf(card).find((f) => f.box.contains(input));
                    if (field) validateField(field);
                });
            }
        });
    }

    // حقول بطاقة واحدة مع قواعدها
    function fieldsOf(card) {
        const nameInput = card.querySelector('input[type="text"]');
        const birthInput = card.querySelector('input[type="date"]');
        const [genderGroup, langGroup] = card.querySelectorAll('.choice-group');
        const radioName = (group) => group.querySelector('input[type="radio"]').name;

        return [
            { key: 'name', box: nameInput.closest('.form-group'), input: nameInput, check: () => checkName(nameInput.value, 2, 30, 'اسم الطفل') },
            { key: 'birthdate', box: birthInput.closest('.form-group'), input: birthInput, check: () => checkBirthdate(birthInput.value) },
            { key: 'gender', box: genderGroup, input: null, check: () => (radioValue(form, radioName(genderGroup)) ? '' : 'اختر بنت أو ولد') },
            { key: 'language', box: langGroup, input: null, check: () => (radioValue(form, radioName(langGroup)) ? '' : 'اختر اللغة المفضلة') }
        ];
    }

    const allCards = () => [...form.querySelectorAll('.child-card')];
    const allFields = () => allCards().flatMap(fieldsOf);

    function validateField(field) {
        const message = field.check();
        if (message) showError(field.box, field.input, message);
        else clearError(field.box, field.input);
        return !message;
    }

    function refreshButton() {
        setButtonReady(submitBtn, allFields().every((f) => !f.check()));
    }

    // --- (3) تغيير عدد الأطفال: نضيف بطاقات أو نحذف من الأخير ---
    function renderCount(count) {
        const cards = allCards();

        // إضافة بطاقات جديدة بعد آخر بطاقة
        for (let n = cards.length + 1; n <= count; n++) {
            const card = createChildCard(n);
            allCards().at(-1).after(card);
            card.classList.add('is-new');   // حركة ظهور بسيطة من CSS
        }

        // حذف البطاقات الزائدة من الأخير
        allCards().slice(count).forEach((card) => card.remove());
        refreshButton();
    }

    countSelect.addEventListener('change', () => {
        const newCount = Number(countSelect.value);
        const cards = allCards();

        // تنبيه قبل حذف بطاقة فيها بيانات مكتوبة
        const willRemove = cards.slice(newCount);
        const hasData = willRemove.some((card) =>
            [...card.querySelectorAll('input')].some((i) => (i.type === 'radio' ? i.checked : i.value.trim())));
        if (hasData && !window.confirm('سيتم حذف بيانات الطفل الأخير، هل أنت متأكد؟')) {
            countSelect.value = String(cards.length);   // التراجع عن التغيير
            return;
        }
        renderCount(newCount);
    });

    // --- (4) تجهيز البطاقة الأولى واسترجاع البيانات المحفوظة في جلسة PHP ---
    setupCard(template);
    refreshButton();

    loadState(API.children, form).then((state) => {
        if (state.redirect) {   // لم تُدخل بيانات ولي الأمر بعد: نعود للخطوة الأولى
            window.location.replace(state.redirect);
            return;
        }

        const saved = state.children;
        if (Array.isArray(saved) && saved.length) {
            countSelect.value = String(Math.min(saved.length, countSelect.options.length));
            renderCount(Number(countSelect.value));
            allCards().forEach((card, i) => {
                const child = saved[i];
                if (!child) return;
                card.querySelector('input[type="text"]').value = child.name || '';
                card.querySelector('input[type="date"]').value = child.birthdate || '';
                const setRadio = (suffix, value) => {
                    const r = card.querySelector(`input[name="children[${i}][${suffix}]"][value="${value}"]`);
                    if (r) r.checked = true;
                };
                setRadio('gender', child.gender);
                setRadio('language', child.language);
            });
        }
        refreshButton();
    });

    // --- (5) الإرسال: نتحقق من كل الأطفال ثم نرسل إلى php/register-children.php ---
    // أخطاء الخادم تظهر تحت حقل الطفل المعني (مفتاحها children.<رقم>.<الحقل>)
    function serverFields() {
        return allCards().flatMap((card, i) =>
            fieldsOf(card).map((field) => ({ ...field, key: `children.${i}.${field.key}` })));
    }

    let busy = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;   // منع الإرسال المزدوج أثناء المعالجة
        hideFormAlert(form);

        const allValid = allFields().map(validateField).every(Boolean);
        if (!allValid) {
            focusFirstError(form);
            return;
        }

        busy = true;
        setBusy(submitBtn, true, 'جارٍ الحفظ...');
        try {
            const result = await submitToServer(API.children, form);
            if (result.ok) {
                window.location.href = result.redirect || PAGES.confirm;
                return;   // نبقي الزر معطّلًا حتى تفتح الصفحة التالية
            }
            if (result.redirect) {   // مثل: انتهت الجلسة ولم تعد بيانات ولي الأمر موجودة
                redirectWithMessage(form, result);
                return;
            }
            if (showServerErrors(serverFields(), result.errors)) focusFirstError(form);
            else showFormAlert(form, result.message || MESSAGES.server);
        } catch (error) {
            showFormAlert(form, MESSAGES.network);
        }
        busy = false;
        setBusy(submitBtn, false);
    });
}

/* =========================================================
   رابعًا: صفحة التأكيد (confirm.html)
   ========================================================= */
async function initConfirmPage(form) {
    const box = document.querySelector('.confirm-box');
    const confirmBtn = form.querySelector('.btn-confirm');
    const summaryCards = document.querySelectorAll('.summary-card');

    // الصفحة تحتوي بيانات تجريبية في HTML؛ نخفيها حتى تصل بيانات الجلسة الحقيقية
    summaryCards.forEach((card) => { card.hidden = true; });
    form.hidden = true;

    // --- (1) قراءة بيانات التسجيل من جلسة PHP ---
    const state = await loadState(API.confirm, form);
    if (!state.ok) return;   // loadState عرضت رسالة الخطأ فوق النموذج

    const { parent, children } = state;

    // --- (2) لا توجد بيانات: رسالة ورابط لبدء التسجيل من صفحة ولي الأمر ---
    if (state.empty || !parent || !Array.isArray(children) || !children.length) {
        const notice = document.createElement('div');
        notice.className = 'form-notice';
        notice.innerHTML = '<p>لم نجد بيانات تسجيل بعد.</p>';
        const link = document.createElement('a');
        link.href = PAGES.parent;
        link.className = 'btn-next';
        link.textContent = 'ابدأ التسجيل ←';
        notice.append(link);
        box.querySelector('.subtitle').after(notice);
        return;
    }

    // --- (3) تعبئة جدول ولي الأمر بالترتيب: الاسم، الجوال، البريد، القرابة ---
    const relationText = parent.relation === 'other'
        ? parent.relationOther
        : LABELS.relation[parent.relation];
    const parentCells = document.querySelectorAll('.info-table td');
    const parentValues = [parent.name, parent.phone, parent.email, relationText];
    parentCells.forEach((cell, i) => {
        // الجوال والبريد يُكتبان من اليسار لليمين
        if (i === 1 || i === 2) {
            const span = document.createElement('span');
            span.dir = 'ltr';
            span.textContent = parentValues[i];
            cell.replaceChildren(span);
        } else {
            cell.textContent = parentValues[i];   // textContent يمنع إدخال HTML ضار
        }
    });

    // --- (4) بناء صفوف جدول الأطفال من البيانات الحقيقية ---
    document.querySelector('.count-badge').textContent = children.length;
    const tbody = document.querySelector('.children-table tbody');
    tbody.replaceChildren(...children.map((child, i) => {
        const row = document.createElement('tr');

        const cell = (label, content) => {
            const td = document.createElement('td');
            td.dataset.label = label;          // يستخدمه CSS لعرض العنوان على الجوال
            td.append(content);
            row.append(td);
        };

        const time = document.createElement('time');
        time.dateTime = child.birthdate;
        time.textContent = formatDate(child.birthdate);

        const tag = document.createElement('span');
        tag.className = `tag tag-${child.gender}`;
        tag.textContent = LABELS.gender[child.gender];

        const lang = document.createElement('span');
        lang.textContent = LABELS.language[child.language];
        if (child.language === 'en') { lang.lang = 'en'; lang.dir = 'ltr'; }

        cell('#', String(i + 1));
        cell('الاسم', child.name);
        cell('تاريخ الميلاد', time);
        cell('الجنس', tag);
        cell('اللغة المفضلة', lang);
        return row;
    }));

    summaryCards.forEach((card) => { card.hidden = false; });
    form.hidden = false;

    // --- (5) التأكيد: منع الضغط المزدوج، ثم الحفظ في MySQL عبر php/confirm.php ---
    let busy = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        hideFormAlert(form);
        setBusy(confirmBtn, true, 'جارٍ التسجيل...');

        try {
            const result = await submitToServer(API.confirm, form, { action: 'confirm' });
            if (result.ok) {
                showSuccess(result.names || children.map((c) => c.name), result.redirect || PAGES.placement);
                return;   // لا نعيد تفعيل الزر: التسجيل تم
            }
            if (result.redirect) {   // مثل: انتهت الجلسة أو البيانات ناقصة
                redirectWithMessage(form, result);
                return;
            }
            showFormAlert(form, result.message || MESSAGES.server);
        } catch (error) {
            showFormAlert(form, MESSAGES.network);
        }
        busy = false;
        setBusy(confirmBtn, false);
    });

    function showSuccess(list, next) {
        const names = list.join(' و');
        const success = document.createElement('div');
        success.className = 'form-notice is-success';
        success.setAttribute('role', 'status');

        const title = document.createElement('h2');
        title.textContent = 'تم التسجيل بنجاح! 🎉';
        const text = document.createElement('p');
        text.textContent = `أهلًا بـ ${names} في بطبوط. لنتعرّف على المستوى أولًا!`;
        const link = document.createElement('a');
        link.href = next;
        link.className = 'btn-next';
        link.textContent = 'ابدأ اختبار المستوى ←';

        success.append(title, text, link);
        hideFormAlert(form);
        form.replaceWith(success);
        document.querySelectorAll('.edit-link').forEach((a) => { a.hidden = true; });
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // ننتقل تلقائيًا؛ replace يمنع العودة إلى صفحة التأكيد بزر الرجوع
        window.setTimeout(() => window.location.replace(next), 3000);
    }
}

/* =========================================================
   رابعًا (مكرر): صفحة تسجيل الدخول (login.html)
   ترسل الحقول إلى php/login.php؛ التحقق الحقيقي (password_verify
   والجلسة) يتم في الخادم، وهنا نعرض النتيجة فقط.
   ========================================================= */
function initLoginPage(form) {
    const submitBtn = form.querySelector('.btn-next');

    // رمز CSRF من الخادم؛ وإذا كان المستخدم مسجّلًا دخوله أصلًا ننقله للرئيسية
    loadState(API.login, form).then((state) => {
        if (state.ok && state.loggedIn) window.location.replace(state.redirect || PAGES.home);
    });

    let busy = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        hideFormAlert(form);
        setBusy(submitBtn, true, 'جارٍ الدخول...');

        try {
            const result = await submitToServer(API.login, form);
            if (result.ok) {
                window.location.replace(result.redirect || PAGES.home);   // replace: لا يعود زر الرجوع لصفحة الدخول
                return;
            }
            showFormAlert(form, result.message || MESSAGES.server);
        } catch (error) {
            showFormAlert(form, MESSAGES.network);
        }
        busy = false;
        setBusy(submitBtn, false);
    });
}

/* =========================================================
   خامسًا: التشغيل - نكتشف الصفحة من النموذج الموجود فيها
   ========================================================= */
const parentForm = document.getElementById('parent-form');
const childrenForm = document.getElementById('register-form');
const confirmForm = document.getElementById('confirm-form');
const loginForm = document.getElementById('login-form');

initPasswordToggles();
if (parentForm) initParentPage(parentForm);
if (childrenForm) initChildrenPage(childrenForm);
if (confirmForm) initConfirmPage(confirmForm).catch((error) => console.error(error));
if (loginForm) initLoginPage(loginForm);

// الرجوع بزر المتصفح قد يعرض نسخة قديمة من الصفحة من الذاكرة:
// نعيد تحميلها لتُقرأ البيانات الحالية من الجلسة (فلا تضيع تعديلات المستخدم)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
});
