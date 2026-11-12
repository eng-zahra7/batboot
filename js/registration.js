/* =========================================================
   بطبوط - ملف JavaScript واحد لصفحات التسجيل الثلاث
   1) register-parent.html : بيانات ولي الأمر
   2) register.html : بيانات الطفل أو الأطفال
   3) confirm.html  : مراجعة البيانات وتأكيد التسجيل

   فكرة الملف:
   - يكتشف الصفحة الحالية من النموذج الموجود فيها، ويشغّل الجزء الخاص بها فقط.
   - يتحقق من الحقول برسائل عربية واضحة تحت كل حقل.
   - يحفظ البيانات في sessionStorage لتنتقل بين الصفحات الثلاث،
     وتعود الحقول مملوءة عند الضغط على "تعديل".

   مهم: هذا التحقق لراحة المستخدم فقط. في مرحلة PHP يجب إعادة التحقق
   من كل شيء في السيرفر، وتحلّ $_SESSION محل sessionStorage.
   ========================================================= */

'use strict';

/* =========================================================
   أولًا: الإعدادات والأدوات المشتركة
   ========================================================= */

// عندما يجهز PHP نغيّرها إلى true، فتُرسل النماذج فعلًا إلى ملفات PHP
// بعد نجاح التحقق. الآن (false) ننتقل بين صفحات HTML مباشرة.
const PHP_READY = false;

// أسماء صفحات التسجيل في المشروع: إذا غيّرت اسم ملف، عدّله هنا فقط
const PAGES = {
    parent: 'register-parent.html',   // بيانات ولي الأمر
    children: 'register-childe.html',        // بيانات الطفل
    confirm: 'confirm.html',          // التأكيد
    placement: 'fun-exam.html'       // اختبار المستوى بعد التسجيل
};

// اسم المفتاح الذي نحفظ تحته بيانات التسجيل في المتصفح
const STORAGE_KEY = 'batbout-registration';

// عمر الطفل المناسب للتطبيق (بالسنوات)
const MIN_AGE = 3;
const MAX_AGE = 10;

// نصوص عربية لقيم الحقول (القيم في HTML بالإنجليزية لتناسب قاعدة البيانات)
const LABELS = {
    relation: { mother: 'أم', father: 'أب', sister: 'أخت', brother: 'أخ', other: 'أخرى' },
    gender: { girl: 'بنت', boy: 'ولد' },
    language: { ar: 'العربية', en: 'English' }
};

/* ---------- التخزين بين الصفحات ---------- */

// قراءة البيانات المحفوظة (أو كائن فارغ إذا لم يوجد شيء)
function loadData() {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        return {}; // التخزين معطّل أو البيانات تالفة
    }
}

// حفظ جزء من البيانات (parent أو children) مع الإبقاء على الباقي
function saveData(part, value) {
    const data = loadData();
    data[part] = value;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        // إذا فشل الحفظ تبقى الصفحة تعمل، لكن لن تنتقل البيانات
    }
}

function clearData() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* لا شيء */ }
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
    const relationGroup = form.querySelector('.relation-group');
    const otherBox = form.querySelector('.other-relation');
    const otherInput = form.querySelector('#relation-other-text');
    const submitBtn = form.querySelector('.btn-next');

    // نستخدم رسائلنا العربية بدل رسائل المتصفح
    form.noValidate = true;

    // قائمة الحقول مع دالة التحقق والحاوية التي تظهر بعدها الرسالة
    const fields = [
        { input: name, box: name.closest('.form-group'), check: () => checkName(name.value, 3, 50, 'اسم ولي الأمر') },
        { input: phone, box: phone.closest('.form-group'), check: () => checkPhone(phone.value) },
        { input: email, box: email.closest('.form-group'), check: () => checkEmail(email.value) },
        {
            input: null,
            box: relationGroup,
            check: () => (radioValue(form, 'relation') ? '' : 'اختر صلة القرابة بالطفل')
        },
        {
            input: otherInput,
            box: otherBox,
            check: () => {
                if (radioValue(form, 'relation') !== 'other') return '';
                return otherInput.value.trim() ? '' : 'حدّد صلة القرابة';
            }
        }
    ];

    // --- (1) استرجاع البيانات عند العودة من صفحة التأكيد للتعديل ---
    const saved = loadData().parent;
    if (saved) {
        name.value = saved.name || '';
        phone.value = saved.phone || '';
        email.value = saved.email || '';
        const radio = form.querySelector(`input[name="relation"][value="${saved.relation}"]`);
        if (radio) radio.checked = true;
        otherInput.value = saved.relationOther || '';
    }

    // --- (2) حقل "أخرى": يظهر ويصبح مطلوبًا فقط عند اختيار "أخرى" ---
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

    // --- (3) الجوال: نقبل الأرقام فقط ونحذف أي شيء آخر أثناء الكتابة ---
    phone.addEventListener('input', () => {
        phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
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

    // --- (5) الإرسال: نتحقق من الكل، ثم نحفظ وننتقل ---
    form.addEventListener('submit', (event) => {
        const allValid = fields.map(validateField).every(Boolean);
        if (!allValid) {
            event.preventDefault();
            focusFirstError(form);
            return;
        }

        saveData('parent', {
            name: name.value.trim(),
            phone: phone.value,
            email: email.value.trim(),
            relation: radioValue(form, 'relation'),
            relationOther: otherInput.value.trim()
        });

        if (!PHP_READY) {
            event.preventDefault();
            window.location.href = PAGES.children;
        }
    });
}

/* =========================================================
   ثالثًا: صفحة بيانات الأطفال (register.html)
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
            { box: nameInput.closest('.form-group'), input: nameInput, check: () => checkName(nameInput.value, 2, 30, 'اسم الطفل') },
            { box: birthInput.closest('.form-group'), input: birthInput, check: () => checkBirthdate(birthInput.value) },
            { box: genderGroup, input: null, check: () => (radioValue(form, radioName(genderGroup)) ? '' : 'اختر بنت أو ولد') },
            { box: langGroup, input: null, check: () => (radioValue(form, radioName(langGroup)) ? '' : 'اختر اللغة المفضلة') }
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

    // --- (4) تجهيز البطاقة الأولى واسترجاع البيانات المحفوظة ---
    setupCard(template);

    const saved = loadData().children;
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

    // --- (5) الإرسال ---
    form.addEventListener('submit', (event) => {
        const allValid = allFields().map(validateField).every(Boolean);
        if (!allValid) {
            event.preventDefault();
            focusFirstError(form);
            return;
        }

        const children = allCards().map((card, i) => ({
            name: card.querySelector('input[type="text"]').value.trim(),
            birthdate: card.querySelector('input[type="date"]').value,
            gender: radioValue(form, `children[${i}][gender]`),
            language: radioValue(form, `children[${i}][language]`)
        }));
        saveData('children', children);

        if (!PHP_READY) {
            event.preventDefault();
            window.location.href = PAGES.confirm;
        }
    });
}

/* =========================================================
   رابعًا: صفحة التأكيد (confirm.html)
   ========================================================= */
function initConfirmPage(form) {
    const { parent, children } = loadData();
    const box = document.querySelector('.confirm-box');
    const confirmBtn = form.querySelector('.btn-confirm');

    // --- (1) لا توجد بيانات: رسالة ورابط لبدء التسجيل من صفحة ولي الأمر ---
    if (!parent || !Array.isArray(children) || !children.length) {
        document.querySelectorAll('.summary-card').forEach((card) => { card.hidden = true; });
        form.hidden = true;   // لا معنى لزر التأكيد بدون بيانات

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

    // --- (2) تعبئة جدول ولي الأمر بالترتيب: الاسم، الجوال، البريد، القرابة ---
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

    // --- (3) بناء صفوف جدول الأطفال من البيانات الحقيقية ---
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

    // --- (4) التأكيد: منع الضغط المزدوج، ثم رسالة نجاح ---
    form.addEventListener('submit', (event) => {
        confirmBtn.disabled = true;
        confirmBtn.lastChild.textContent = ' جارٍ التسجيل...';

        if (PHP_READY) return;   // يُرسل إلى confirm.php ليحفظ في MySQL

        event.preventDefault();
        // محاكاة الحفظ لثانية واحدة في مرحلة HTML
        setTimeout(() => showSuccess(children), 1000);
    });

    function showSuccess(list) {
        clearData();   // انتهى التسجيل، لا نحتاج البيانات المؤقتة

        const names = list.map((c) => c.name).join(' و');
        const success = document.createElement('div');
        success.className = 'form-notice is-success';
        success.setAttribute('role', 'status');

        const title = document.createElement('h2');
        title.textContent = 'تم التسجيل بنجاح! 🎉';
        const text = document.createElement('p');
        text.textContent = `أهلًا بـ ${names} في بطبوط. لنتعرّف على المستوى أولًا!`;
        const link = document.createElement('a');
        link.href = PAGES.placement;
        link.className = 'btn-next';
        link.textContent = 'ابدأ اختبار المستوى ←';

        success.append(title, text, link);
        form.replaceWith(success);
        document.querySelectorAll('.edit-link').forEach((a) => { a.hidden = true; });
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/* =========================================================
   خامسًا: التشغيل - نكتشف الصفحة من النموذج الموجود فيها
   ========================================================= */
const parentForm = document.getElementById('parent-form');
const childrenForm = document.getElementById('register-form');
const confirmForm = document.getElementById('confirm-form');

if (parentForm) initParentPage(parentForm);
if (childrenForm) initChildrenPage(childrenForm);
if (confirmForm) initConfirmPage(confirmForm);
