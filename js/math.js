/* =========================================================
   بطبوط - صفحة الرياضيات (math.html)
   الوظيفة: جعل بطاقات الدروس (الأرقام / الجمع / الطرح) تنقل الطفل
   إلى صفحة الدرس الصحيحة، مع الحفاظ على التصميم الحالي دون تعديل.
   ========================================================= */
(function () {
    'use strict';

    // خريطة الدروس: قيمة data-lesson-id ← صفحة الدرس
    var LESSON_PAGES = {
        numbers: 'numbers.html',
        addition: 'addition.html',
        subtraction: 'subtraction.html'
    };

    // الانتقال إلى صفحة الدرس
    function openLesson(lessonId) {
        var page = LESSON_PAGES[lessonId];
        if (!page) {
            console.warn('درس غير معروف:', lessonId);
            return;
        }
        window.location.href = page;
    }

    // ربط بطاقة واحدة
    function setupCard(card) {
        var lessonId = card.getAttribute('data-lesson-id');

        if (!LESSON_PAGES[lessonId]) {
            console.warn('بطاقة بدون data-lesson-id صالح:', card);
            return;
        }

        // التأكد من أن الرابط يشير إلى الصفحة الصحيحة
        card.setAttribute('href', LESSON_PAGES[lessonId]);

        // الضغط على البطاقة يفتح الدرس
        card.addEventListener('click', function (event) {
            event.preventDefault();
            openLesson(lessonId);
        });

        // دعم لوحة المفاتيح (مسافة) إضافة إلى Enter الذي تدعمه الروابط أصلًا
        card.addEventListener('keydown', function (event) {
            if (event.key === ' ' || event.code === 'Space') {
                event.preventDefault();
                openLesson(lessonId);
            }
        });
    }

    // التشغيل بعد تحميل الصفحة
    function init() {
        var cards = document.querySelectorAll('#math_lessons .lesson-card');

        if (cards.length === 0) {
            console.warn('لم يتم العثور على بطاقات الدروس داخل #math_lessons');
            return;
        }

        cards.forEach(setupCard);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();