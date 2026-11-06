/* =========================================================
   بطبوط - درس الأرقام (numbers.html)
   يعمل على عناصر HTML الموجودة فقط (لا ينشئ عناصر جديدة سوى نسخ
   من تفاحة الصفحة نفسها لعرض العدد، وعنصر canvas داخل مساحة الكتابة
   .draw-pad لاستقبال الرسم)، ولا يعدّل CSS (أنماط الـ canvas مكتوبة
   مباشرة على العنصر نفسه).

   مراحل الدرس لكل رقم:
     1) تعرّف على الرقم   2) شاهد طريقة الكتابة
     3) جرّب بنفسك        4) تحقق من الإجابة

   الرسم والتعرّف (المرحلة 3):
     - يرسم الطفل الرقم بالماوس أو بالإصبع أو بالقلم على canvas.
     - عند الضغط على "تحقق من إجابتي" تُقارن الرسمة بقوالب الأرقام
       (خطوط التتبع نفسها المستخدمة في المرحلة 2) دون أي مكتبة خارجية.
     - الكتابة بلوحة المفاتيح ما زالت تعمل كما كانت.
   ========================================================= */
(function () {
    'use strict';

    /* ---------- إعدادات ---------- */
    var TOTAL_STAGES = 4;
    var MATH_PAGE = 'math.html';

    // إخفاء نصوص المعاينة التطويرية ("معاينة للتصميم فقط" و"مثال: ...")
    // لأن الأزرار أصبحت تعمل. غيّرها إلى false لإظهارها.
    var HIDE_PREVIEW_LABELS = true;

    // رسائل التشجيع عند الإجابة الصحيحة
    var CHEERS = ['أحسنت يا بطل!', 'رائع جدًا!', 'عمل ممتاز!', 'برافو عليك!', 'أنت مذهل!'];

    // تحويل الأرقام العربية الهندية إلى أرقام عادية عند الكتابة بلوحة المفاتيح
    var ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

    /*
      رسم الرقم بخط متقطع للمرحلة الثانية (مساحة 200×230).
      الرقم 1 يُقرأ من HTML الحالي كما هو، والبقية هنا.
      d: مسار الرقم | arrows: سهمان | start/end: نقطتا البداية والنهاية | tags: مكان "ابدأ" و"انتهِ"
    */
    var TRACE_SHAPES = {
        2: { d: 'M48 78C48 46 76 36 104 36C138 36 154 60 152 88C150 120 96 150 46 190L158 190',
             arrows: ['M34 58L58 42', 'M176 108L158 144'], start: [48, 78], end: [158, 190], tags: [[24, 104], [158, 222]] },
        3: { d: 'M50 62C62 44 82 36 104 36C138 36 152 60 148 82C144 104 120 108 92 108C124 108 156 120 156 150C156 182 130 196 102 196C74 196 56 184 46 164',
             arrows: ['M36 44L60 30', 'M176 120V160'], start: [50, 62], end: [46, 164], tags: [[24, 88], [46, 222]] },
        4: { d: 'M118 38L38 148H168M128 86V196',
             arrows: ['M92 40L70 72', 'M160 96V132'], start: [118, 38], end: [128, 196], tags: [[140, 24], [128, 222]] },
        5: { d: 'M152 40H70L60 100C74 92 90 90 104 90C140 90 156 116 156 144C156 178 130 196 100 196C72 196 56 184 46 168',
             arrows: ['M136 20H100', 'M182 112V152'], start: [152, 40], end: [46, 168], tags: [[176, 70], [46, 222]] },
        6: { d: 'M138 44C96 54 52 100 50 150C48 186 74 196 100 196C134 196 152 176 152 148C152 120 130 104 102 104C74 104 52 124 50 150',
             arrows: ['M114 26L88 40', 'M176 130V170'], start: [138, 44], end: [50, 150], tags: [[160, 36], [26, 184]] },
        7: { d: 'M44 46H158L92 196',
             arrows: ['M70 24H132', 'M162 96L144 138'], start: [44, 46], end: [92, 196], tags: [[20, 72], [92, 222]] },
        8: { d: 'M86 42C56 54 60 98 100 108C150 118 156 196 100 196C46 196 50 118 100 108C142 98 142 52 118 42',
             arrows: ['M72 22L46 32', 'M178 140V176'], start: [86, 42], end: [118, 42], tags: [[100, 22], [152, 32]] },
        9: { d: 'M150 84C150 52 128 38 100 38C68 38 50 58 50 88C50 118 74 136 100 136C128 136 150 118 150 84L150 120C150 170 130 196 96 196C80 196 66 192 54 184',
             arrows: ['M176 90V56', 'M110 220H74'], start: [150, 84], end: [54, 184], tags: [[176, 112], [24, 206]] },
        10: { d: 'M30 82L62 58V190M134 40C96 40 92 190 134 190C176 190 172 40 134 40',
              arrows: ['M20 56L44 38', 'M184 140V96'], start: [30, 82], end: [134, 40], tags: [[30, 112], [134, 22]] }
    };

    /*
      أشكال بديلة مقبولة عند التعرّف (الأطفال يكتبون هذه الأرقام بأكثر من طريقة).
      القالب الأساسي هو خط التتبع نفسه، وهذه تُضاف إليه فقط.
    */
    var ALT_SHAPES = {
        1: ['M108 44V188', 'M70 70L108 44V188M70 188H146'],
        4: ['M70 40V120H162M130 40V196'],
        7: ['M44 46H158L92 196M66 118H134'],
        9: ['M150 84C150 52 128 38 100 38C68 38 50 58 50 88C50 118 74 136 100 136C128 136 150 118 150 84V196']
    };

    /* ---------- إعدادات الرسم ---------- */
    var PEN_COLOR = '#1b2a5c';     // لون قلم الطفل (نفس لون النص الداكن في الصفحة)
    var PEN_RATIO = 0.06;          // سُمك القلم نسبةً لعرض مساحة الكتابة
    var MIN_POINT_GAP = 0.004;     // أقل مسافة بين نقطتين مسجّلتين (نسبةً للعرض)
    var MAX_POINTS = 2500;         // حد أقصى لنقاط الرسمة الواحدة

    /* ---------- أدوات صغيرة ---------- */
    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    // إظهار/إخفاء عنصر (display مباشرة لأن بعض الأصناف تحدد display بنفسها)
    function setShown(element, shown) {
        if (!element) { return; }
        element.hidden = !shown;
        element.style.display = shown ? '' : 'none';
    }

    // قراءة نص الزر دون السهم الموجود داخله
    function getButtonLabel(button) {
        var node = button.firstChild;
        while (node && node.nodeType !== 3) { node = node.nextSibling; }
        return node ? node.textContent.trim() : '';
    }

    // تغيير نص الزر مع الإبقاء على السهم الموجود داخله
    function setButtonLabel(button, text) {
        var node = button.firstChild;
        while (node && node.nodeType !== 3) { node = node.nextSibling; }
        if (node) { node.textContent = text + ' '; }
    }

    // يحوّل زر لوحة المفاتيح إلى رقم ('' إذا لم يكن رقمًا)
    function keyToDigit(key) {
        if (/^[0-9]$/.test(key)) { return key; }
        var index = ARABIC_DIGITS.indexOf(key);
        return index > -1 && key.length === 1 ? String(index) : '';
    }

    // وصف عدد التفاح بالعربية
    function applesLabel(count) {
        if (count === 1) { return 'تفاحة واحدة'; }
        if (count === 2) { return 'تفاحتان'; }
        return count + (count <= 10 ? ' تفاحات' : ' تفاحة');
    }

    /* =========================================================
       التعرّف على الأرقام المرسومة (دوال نقية لا تلمس الصفحة)
       الفكرة: تُحوَّل الرسمة وقالب كل رقم إلى شبكة صغيرة بعد تطبيع
       الحجم والموضع، ثم تُحسب درجة التشابه (دقة + تغطية) بين الرسمة
       والقالب بتسامح مناسب لرسم الأطفال. الرقم المطلوب يُقبل إذا
       كانت درجته كافية وليست أسوأ بوضوح من أي رقم آخر.
       ========================================================= */
    /* ==== RECOGNIZER:START ==== */
    var GRID = 56;             // حجم الشبكة (خلايا)
    var GRID_MARGIN = 5;       // هامش داخل الشبكة
    var NEAR_CELLS = 5;        // أقصى بعد يُعدّ "قريبًا" من القالب (بالخلايا)
    var ACCEPT_SCORE = 0.6;    // أقل درجة تشابه لقبول الرقم المطلوب
    var SCORE_MARGIN = 0.05;   // الهامش المسموح عن أفضل رقم آخر
    var MIN_SIZE = 0.2;        // أصغر حجم مقبول للرسمة (نسبةً لعرض اللوحة)
    var MIN_LENGTH = 0.3;      // أقل طول إجمالي للخطوط (نسبةً لعرض اللوحة)

    // خريطة المسافات: لكل خلية أقرب مسافة إلى خلية حبر (مسح مرتين)
    function distanceMap(cells) {
        var n = GRID, dist = new Float32Array(n * n), INF = 1e9, i, x, y, v;
        for (i = 0; i < n * n; i++) { dist[i] = cells[i] ? 0 : INF; }

        for (y = 0; y < n; y++) {
            for (x = 0; x < n; x++) {
                i = y * n + x;
                v = dist[i];
                if (x > 0) { v = Math.min(v, dist[i - 1] + 1); }
                if (y > 0) {
                    v = Math.min(v, dist[i - n] + 1);
                    if (x > 0) { v = Math.min(v, dist[i - n - 1] + 1.414); }
                    if (x < n - 1) { v = Math.min(v, dist[i - n + 1] + 1.414); }
                }
                dist[i] = v;
            }
        }
        for (y = n - 1; y >= 0; y--) {
            for (x = n - 1; x >= 0; x--) {
                i = y * n + x;
                v = dist[i];
                if (x < n - 1) { v = Math.min(v, dist[i + 1] + 1); }
                if (y < n - 1) {
                    v = Math.min(v, dist[i + n] + 1);
                    if (x < n - 1) { v = Math.min(v, dist[i + n + 1] + 1.414); }
                    if (x > 0) { v = Math.min(v, dist[i + n - 1] + 1.414); }
                }
                dist[i] = v;
            }
        }
        return dist;
    }

    // حدود مجموعة خطوط وطولها الإجمالي
    function strokeStats(strokes) {
        var s = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, length: 0 };
        strokes.forEach(function (stroke) {
            stroke.forEach(function (p, i) {
                if (p.x < s.minX) { s.minX = p.x; }
                if (p.x > s.maxX) { s.maxX = p.x; }
                if (p.y < s.minY) { s.minY = p.y; }
                if (p.y > s.maxY) { s.maxY = p.y; }
                if (i > 0) {
                    var dx = p.x - stroke[i - 1].x, dy = p.y - stroke[i - 1].y;
                    s.length += Math.sqrt(dx * dx + dy * dy);
                }
            });
        });
        s.empty = s.minX === Infinity;
        s.width = s.empty ? 0 : s.maxX - s.minX;
        s.height = s.empty ? 0 : s.maxY - s.minY;
        return s;
    }

    // تحويل الخطوط إلى شبكة مطبّعة (نفس نسبة الأبعاد، في منتصف الشبكة)
    function gridFromStrokes(strokes, densify) {
        var st = strokeStats(strokes);
        if (st.empty) { return null; }

        var size = Math.max(st.width, st.height) || 1;
        var scale = (GRID - 2 * GRID_MARGIN) / size;
        var ox = (GRID - st.width * scale) / 2 - st.minX * scale;
        var oy = (GRID - st.height * scale) / 2 - st.minY * scale;
        var cells = new Uint8Array(GRID * GRID);
        var list = [];

        function mark(x, y) {
            var cx = Math.min(GRID - 1, Math.max(0, Math.round(x)));
            var cy = Math.min(GRID - 1, Math.max(0, Math.round(y)));
            var index = cy * GRID + cx;
            if (!cells[index]) { cells[index] = 1; list.push(index); }
        }

        strokes.forEach(function (stroke) {
            var prev = null;
            stroke.forEach(function (p) {
                var x = p.x * scale + ox, y = p.y * scale + oy;
                if (densify && prev) {
                    var dx = x - prev.x, dy = y - prev.y;
                    var steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 0.5);
                    for (var s = 1; s < steps; s++) {
                        mark(prev.x + dx * s / steps, prev.y + dy * s / steps);
                    }
                }
                mark(x, y);
                prev = { x: x, y: y };
            });
        });

        return { cells: cells, list: list, dist: distanceMap(cells) };
    }

    // درجة التشابه (0-1): توازن بين "الرسمة قريبة من القالب" و"القالب مغطّى بالرسمة"
    function similarity(user, tpl) {
        var hitTpl = 0, hitUser = 0, i;
        for (i = 0; i < tpl.list.length; i++) {
            if (user.dist[tpl.list[i]] <= NEAR_CELLS) { hitTpl++; }
        }
        for (i = 0; i < user.list.length; i++) {
            if (tpl.dist[user.list[i]] <= NEAR_CELLS) { hitUser++; }
        }
        var recall = hitTpl / tpl.list.length;
        var precision = hitUser / user.list.length;
        return (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
    }

    /*
      rasterize(d): تعيد خطوطًا (مصفوفة من مصفوفات النقاط {x, y}) لمسار SVG واحد.
      shapes: { الرقم: [مسارات مقبولة] }
    */
    function createRecognizer(rasterize, shapes) {
        var cache = {};

        function templatesFor(value) {
            if (!cache[value]) {
                cache[value] = shapes[value].map(function (d) {
                    return gridFromStrokes(rasterize(d), false);
                });
            }
            return cache[value];
        }

        return {
            // strokes: خطوط الطفل بإحداثيات نسبية؛ target: الرقم المطلوب
            recognize: function (strokes, target) {
                var st = strokeStats(strokes);
                if (st.empty || Math.max(st.width, st.height) < MIN_SIZE || st.length < MIN_LENGTH) {
                    return { ok: false, reason: 'small', best: null, score: 0, scores: {} };
                }

                var user = gridFromStrokes(strokes, true);
                var scores = {}, best = null, bestScore = -1;

                Object.keys(shapes).forEach(function (key) {
                    var top = 0;
                    templatesFor(key).forEach(function (tpl) {
                        top = Math.max(top, similarity(user, tpl));
                    });
                    scores[key] = top;
                    if (top > bestScore) { bestScore = top; best = Number(key); }
                });

                var score = scores[target] || 0;
                var ok = score >= ACCEPT_SCORE && score >= bestScore - SCORE_MARGIN;
                return { ok: ok, reason: ok ? '' : 'mismatch', best: best, score: score, scores: scores };
            }
        };
    }
    /* ==== RECOGNIZER:END ==== */

    // تحويل مسار SVG إلى نقاط عبر canvas خارج الصفحة (لبناء قوالب التعرّف)
    function rasterizePathWithCanvas(d) {
        var w = 200, h = 230;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.stroke(new Path2D(d));

        var data = ctx.getImageData(0, 0, w, h).data;
        var points = [];
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 60) { points.push({ x: x, y: y }); }
            }
        }
        return [points];
    }

    function canvasRecognitionSupported() {
        try {
            return typeof Path2D === 'function' &&
                !!document.createElement('canvas').getContext &&
                !!document.createElement('canvas').getContext('2d');
        } catch (error) {
            return false;
        }
    }

    /* =========================================================
       لوحة الرسم: canvas داخل مساحة الكتابة (ماوس + لمس + قلم)
       الإحداثيات تُخزَّن نسبةً لعرض اللوحة، فتبقى الرسمة سليمة عند
       تغيّر حجم الشاشة. تُعيد null إذا لم يدعم المتصفح ما يلزم.
       ========================================================= */
    function createDrawingPad(pad, onChange) {
        if (!canvasRecognitionSupported() || !window.PointerEvent) { return null; }

        var canvas = document.createElement('canvas');
        canvas.className = 'draw-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
            'border-radius:inherit;touch-action:none;cursor:crosshair;' +
            'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;';
        pad.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        var strokes = [];
        var active = null;
        var pointerId = null;
        var enabled = false;
        var width = 0;
        var dpr = 1;

        function redraw() {
            if (!width) { return; }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            ctx.strokeStyle = PEN_COLOR;
            ctx.fillStyle = PEN_COLOR;
            ctx.lineWidth = Math.max(8, width * PEN_RATIO);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            strokes.forEach(function (stroke) {
                var pts = stroke.map(function (p) { return { x: p.x * width, y: p.y * width }; });
                if (pts.length === 1) {
                    ctx.beginPath();
                    ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
                    ctx.fill();
                    return;
                }
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length - 1; i++) {
                    var midX = (pts[i].x + pts[i + 1].x) / 2;
                    var midY = (pts[i].y + pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
                }
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                ctx.stroke();
            });
        }

        // ضبط دقة الـ canvas حسب الحجم الظاهر (يُستدعى عند ظهور اللوحة وتغيّر الحجم)
        function resize() {
            var rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) { return; }
            var ratio = Math.min(window.devicePixelRatio || 1, 3);
            var pxW = Math.round(rect.width * ratio);
            var pxH = Math.round(rect.height * ratio);
            if (canvas.width !== pxW || canvas.height !== pxH || width !== rect.width) {
                canvas.width = pxW;
                canvas.height = pxH;
                width = rect.width;
                dpr = ratio;
            }
            redraw();
        }

        function pointFrom(event) {
            var rect = canvas.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) / rect.width,
                y: (event.clientY - rect.top) / rect.width    // نفس الوحدة للمحورين (اللوحة مربعة)
            };
        }

        function addPoint(point) {
            if (!active || active.length >= MAX_POINTS) { return; }
            var last = active[active.length - 1];
            var dx = point.x - last.x, dy = point.y - last.y;
            if (dx * dx + dy * dy < MIN_POINT_GAP * MIN_POINT_GAP) { return; }
            active.push(point);
        }

        function finish(event) {
            if (pointerId === null || event.pointerId !== pointerId) { return; }
            try { canvas.releasePointerCapture(pointerId); } catch (error) { /* لا شيء */ }
            pointerId = null;
            active = null;
            redraw();
            onChange();
        }

        canvas.addEventListener('pointerdown', function (event) {
            if (!enabled || pointerId !== null) { return; }
            if (event.pointerType === 'mouse' && event.button !== 0) { return; }
            event.preventDefault();
            if (!width) { resize(); }

            pointerId = event.pointerId;
            try { canvas.setPointerCapture(pointerId); } catch (error) { /* لا شيء */ }
            active = [pointFrom(event)];
            strokes.push(active);
            redraw();
            onChange();
        });

        canvas.addEventListener('pointermove', function (event) {
            if (pointerId === null || event.pointerId !== pointerId) { return; }
            event.preventDefault();
            var events = event.getCoalescedEvents ? event.getCoalescedEvents() : null;
            if (events && events.length) {
                events.forEach(function (e) { addPoint(pointFrom(e)); });
            } else {
                addPoint(pointFrom(event));
            }
            redraw();
        });

        canvas.addEventListener('pointerup', finish);
        canvas.addEventListener('pointercancel', finish);
        canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

        return {
            resize: resize,
            hasInk: function () { return strokes.length > 0; },
            getStrokes: function () { return strokes; },
            setEnabled: function (value) {
                enabled = !!value;
                canvas.style.cursor = enabled ? 'crosshair' : 'default';
            },
            // silent: مسح بدون إبلاغ الصفحة (عند تبديل المرحلة أو الرقم)
            clear: function (silent) {
                strokes = [];
                active = null;
                pointerId = null;
                redraw();
                if (!silent) { onChange(); }
            }
        };
    }

    function init() {
        var page = $('.numbers-page');
        if (!page) {
            console.warn('numbers.js: لم يتم العثور على .numbers-page');
            return;
        }

        /* ---------- عناصر الصفحة ---------- */
        var ui = {
            lessonCard: $('.lesson-card', page),
            bubble: $('.mascot-bubble', page),
            badgeNum: $('.lesson-badge-num', page),
            numberPanel: $('.number-panel', page),
            speakBtn: $('.speak-btn', page),
            bigNumber: $('.big-number', page),
            numberName: $('.number-name', page),
            appleRow: $('.apple-row', page),
            countAnswer: $('.count-answer', page),
            navBtns: $$('.lesson-nav .nav-btn', page),
            stageDotsList: $('.stage-dots', page),
            stageDots: $$('.stage-dots li', page),
            trackerItems: $$('.stage-item', page),
            nodes: $$('.number-grid .number-node', page),
            pathStars: $('.path-stars', page),
            starsTotal: $('.path-stars strong', page),
            progressBar: $('.progress-bar', page),
            progressText: $('.path-progress p strong', page),
            award: $('.award', page),
            previews: $('.stage-previews', page),
            previewsTitle: $('#previews-title', page),
            previewsNote: $('.previews-note', page),
            card2: $('.preview-card[data-stage="2"]', page),
            card3: $('.preview-card[data-stage="3"]', page),
            card4: $('.preview-card[data-stage="4"]', page),
            traceSvg: $('.trace-svg', page),
            pad: $('.draw-pad', page)
        };

        // عناصر داخل البطاقات
        ui.startTraceBtn = $('.btn-next', ui.card2);
        ui.clearBtn = $('.btn-edit', ui.card3);
        ui.confirmBtn = $('.btn-confirm', ui.card3);
        ui.resultSuccess = $('.result-card.is-success', ui.card4);
        ui.resultRetry = $('.result-card.is-retry', ui.card4);
        ui.successTitle = $('.result-title', ui.resultSuccess);
        ui.successNextBtn = $('.btn-next', ui.resultSuccess);
        ui.retryHint = $('.result-hint', ui.resultRetry);
        ui.retryBtn = $('.btn-edit', ui.resultRetry);

        // حقل إدخال مخفي بصريًا لإظهار لوحة الأرقام على الجوال واللوحي (اختياري)
        ui.input = $('#number-input', ui.card3);

        // التأكد من وجود العناصر الأساسية قبل البدء
        var required = ['lessonCard', 'bubble', 'badgeNum', 'numberPanel', 'speakBtn', 'bigNumber',
            'numberName', 'appleRow', 'countAnswer', 'stageDotsList', 'pathStars', 'starsTotal',
            'progressBar', 'progressText', 'award', 'previews', 'card2', 'card3', 'card4', 'traceSvg',
            'pad', 'startTraceBtn', 'clearBtn', 'confirmBtn', 'resultSuccess', 'resultRetry',
            'successTitle', 'successNextBtn', 'retryHint', 'retryBtn'];
        var missing = required.filter(function (key) { return !ui[key]; });
        if (missing.length || ui.navBtns.length < 2 || ui.nodes.length === 0) {
            console.warn('numbers.js: عناصر ناقصة في الصفحة:', missing.join(', '));
            return;
        }
        ui.navPrev = ui.navBtns[0];
        ui.navNext = ui.navBtns[1];

        /* ---------- قائمة الأرقام (تُقرأ من "رحلة الأرقام" في HTML) ---------- */
        var numbers = ui.nodes.map(function (node) {
            return {
                value: Number(node.getAttribute('data-number-id')),
                name: $('.node-name', node).textContent.trim(),
                el: node
            };
        });
        var lastIndex = numbers.length - 1;

        function nameOf(value) {
            var found = numbers.filter(function (n) { return n.value === value; })[0];
            return found ? found.name : String(value);
        }

        /* ---------- نسخ احتياطية من محتوى الصفحة الأصلي ---------- */
        var appleTemplate = $('.apple', ui.appleRow);
        var padLabel = ui.pad.getAttribute('aria-label') || '';
        var defaultHint = ui.retryHint.textContent.trim();
        var successNextLabel = getButtonLabel(ui.successNextBtn);

        // رسم الرقم 1 كما هو مكتوب في HTML
        var traceParts = {
            dots: $('.trace-dots', ui.traceSvg),
            arrows: $$('.trace-dir', ui.traceSvg),
            circles: $$('circle', ui.traceSvg),
            tags: $$('.trace-tag', ui.traceSvg)
        };
        TRACE_SHAPES[1] = readTraceFromDom();

        function readTraceFromDom() {
            return {
                d: traceParts.dots.getAttribute('d'),
                arrows: traceParts.arrows.map(function (a) { return a.getAttribute('d'); }),
                start: [traceParts.circles[0].getAttribute('cx'), traceParts.circles[0].getAttribute('cy')],
                end: [traceParts.circles[1].getAttribute('cx'), traceParts.circles[1].getAttribute('cy')],
                tags: traceParts.tags.map(function (t) { return [t.getAttribute('x'), t.getAttribute('y')]; })
            };
        }

        /* ---------- الرسم والتعرّف ---------- */
        // نص الكتابة بلوحة المفاتيح يُعرض في عنصر مستقل فوق اللوحة حتى لا يمسح الـ canvas
        ui.typed = document.createElement('span');
        ui.typed.className = 'draw-typed';
        ui.typed.setAttribute('aria-hidden', 'true');
        ui.typed.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;display:grid;' +
            'place-items:center;font-weight:800;line-height:1;color:' + PEN_COLOR + ';' +
            'pointer-events:none;';
        ui.pad.appendChild(ui.typed);

        var drawing = createDrawingPad(ui.pad, onDrawingChange);

        // قوالب التعرّف: خط التتبع لكل رقم + الأشكال البديلة المقبولة
        var recognizer = null;
        if (drawing) {
            var shapesMap = {};
            numbers.forEach(function (n) {
                if (TRACE_SHAPES[n.value]) {
                    shapesMap[n.value] = [TRACE_SHAPES[n.value].d].concat(ALT_SHAPES[n.value] || []);
                }
            });
            recognizer = createRecognizer(rasterizePathWithCanvas, shapesMap);
        }

        function hasInk() {
            return !!(drawing && drawing.hasInk());
        }

        function clearDrawing(silent) {
            if (drawing) { drawing.clear(silent); }
        }

        // عند بدء الرسم نلغي ما كُتب بلوحة المفاتيح (إجابة واحدة فقط في كل مرة)
        function onDrawingChange() {
            if (hasInk()) { state.buffer = ''; }
            renderPad();
        }

        /* ---------- حالة الدرس ---------- */
        var startId = Number(page.getAttribute('data-number-id')) || numbers[0].value;
        var startIndex = 0;
        numbers.forEach(function (n, i) { if (n.value === startId) { startIndex = i; } });

        var state = {
            index: startIndex,   // الرقم الحالي
            stage: 1,            // المرحلة الحالية (1-4)
            buffer: '',          // ما كتبه الطفل بلوحة المفاتيح
            attempts: 0,         // محاولات الرقم الحالي
            result: null,        // 'success' أو 'retry' في المرحلة 4
            verdict: null,       // آخر نتيجة تعرّف على الرسم
            cheer: CHEERS[0],
            cheerIndex: 0,
            stars: Number(page.getAttribute('data-stars-earned')) || 0,
            done: numbers.map(function (n, i) { return i < startIndex; }),
            completed: false
        };

        function current() {
            return numbers[state.index];
        }

        function doneCount() {
            return state.done.filter(Boolean).length;
        }

        /* ---------- عرض الرقم الحالي (المرحلة 1 + بقية العناصر المرتبطة بالرقم) ---------- */
        function renderNumber() {
            var n = current();

            ui.badgeNum.textContent = n.value;
            ui.bigNumber.textContent = n.value;
            ui.numberName.textContent = n.name;
            ui.numberPanel.setAttribute('aria-label', 'الرقم ' + n.name);
            ui.previewsTitle.textContent = 'ما ينتظرك في الرقم ' + n.value;

            // التفاح: نسخ من التفاحة الموجودة بعدد الرقم
            $$('.apple[data-clone]', ui.appleRow).forEach(function (apple) {
                apple.parentNode.removeChild(apple);
            });
            for (var i = 1; i < n.value; i++) {
                var copy = appleTemplate.cloneNode(true);
                copy.setAttribute('data-clone', '');
                ui.appleRow.appendChild(copy);
            }
            ui.appleRow.setAttribute('aria-label', applesLabel(n.value));
            ui.countAnswer.textContent = n.value;
            ui.countAnswer.setAttribute('aria-label', 'الإجابة: ' + n.value);

            renderTrace(n);
        }

        // رسم تتبع الرقم (المرحلة 2)
        function renderTrace(n) {
            var shape = TRACE_SHAPES[n.value];
            var box = ui.traceSvg.parentNode;

            if (!shape) { setShown(box, false); return; }
            setShown(box, true);

            traceParts.dots.setAttribute('d', shape.d);
            traceParts.arrows.forEach(function (arrow, i) {
                arrow.setAttribute('d', shape.arrows[i] || '');
            });
            traceParts.circles[0].setAttribute('cx', shape.start[0]);
            traceParts.circles[0].setAttribute('cy', shape.start[1]);
            traceParts.circles[1].setAttribute('cx', shape.end[0]);
            traceParts.circles[1].setAttribute('cy', shape.end[1]);
            traceParts.tags.forEach(function (tag, i) {
                tag.setAttribute('x', shape.tags[i][0]);
                tag.setAttribute('y', shape.tags[i][1]);
            });
            ui.traceSvg.setAttribute('aria-label',
                'الرقم ' + n.value + ' بخط متقطع مع سهمين ونقطتي بداية ونهاية');
        }

        /* ---------- رحلة الأرقام والتقدم والنجوم ---------- */
        function renderJourney() {
            numbers.forEach(function (n, i) {
                var isDone = state.done[i];
                var isCurrent = !isDone && i === state.index;
                var isLocked = !isDone && !isCurrent;
                var lock = $('.node-lock', n.el);
                var hiddenLabel = $('.visually-hidden', n.el);

                n.el.classList.toggle('is-done', isDone);
                n.el.classList.toggle('is-current', isCurrent);
                n.el.classList.toggle('is-locked', isLocked);

                if (isCurrent) { n.el.setAttribute('aria-current', 'step'); } else { n.el.removeAttribute('aria-current'); }
                if (isLocked) { n.el.setAttribute('aria-disabled', 'true'); } else { n.el.removeAttribute('aria-disabled'); }
                if (lock) { lock.style.display = isLocked ? '' : 'none'; }
                if (hiddenLabel) { hiddenLabel.textContent = isDone ? 'مكتمل' : (isCurrent ? 'الرقم الحالي' : 'مقفل'); }
            });

            // مؤشر التقدم: عدد الأرقام المكتملة من الكل (مثل 1 من 10)
            var count = doneCount();
            var percent = Math.round(count / numbers.length * 100);
            var progressLabel = count + ' من ' + numbers.length;

            ui.progressBar.value = percent;
            ui.progressBar.textContent = percent + '%';
            ui.progressBar.setAttribute('aria-valuetext', progressLabel);
            ui.progressBar.setAttribute('title', progressLabel);
            ui.progressText.textContent = percent + '%';

            // النجوم
            ui.starsTotal.textContent = state.stars;
            ui.pathStars.classList.toggle('has-stars', state.stars > 0);

            // إنجاز بطل الأرقام
            ui.award.classList.toggle('is-locked', !state.completed);
            ui.award.classList.toggle('is-unlocked', state.completed);
            if (state.completed) {
                var awardText = $('span', ui.award);
                if (awardText && awardText.lastChild) { awardText.lastChild.textContent = ' تم فتحه، مبروك!'; }
            }
        }

        /* ---------- المراحل ---------- */
        function bubbleText() {
            var n = current();
            if (state.stage === 1) { return 'مرحبًا يا بطل! هذا هو الرقم ' + n.name; }
            if (state.stage === 2) { return 'شاهد كيف نكتب الرقم ' + n.name; }
            if (state.stage === 3) {
                return drawing
                    ? 'الآن ارسم الرقم ' + n.name + ' بإصبعك أو بالفأرة'
                    : 'الآن جرّب أن تكتب الرقم ' + n.name;
            }
            if (state.result === 'success') {
                if (state.completed) {
                    return 'مبروك يا بطل! أكملت الأرقام من ' + numbers[0].value + ' إلى ' + numbers[lastIndex].value;
                }
                return state.cheer + ' هذا هو الرقم ' + n.name;
            }
            return 'محاولة رائعة! جرّب مرة أخرى';
        }

        function renderStage() {
            var s = state.stage;
            var solved = state.result === 'success';

            // البطاقات: 2 تُعرض مع 3 حتى يرى الطفل الخط المتقطع أثناء الكتابة
            setShown(ui.previews, s >= 2);
            setShown(ui.card2, s === 2 || s === 3);
            setShown(ui.card3, s === 3);
            setShown(ui.card4, s === 4);
            setShown(ui.resultSuccess, s === 4 && solved);
            setShown(ui.resultRetry, s === 4 && !solved);

            // مؤشر المراحل
            ui.trackerItems.forEach(function (item) {
                var itemStage = Number(item.getAttribute('data-stage'));
                var isDone = itemStage < s || (solved && itemStage === s);
                var isCurrent = itemStage === s && !isDone;
                item.classList.toggle('is-current', isCurrent);
                item.classList.toggle('is-done', isDone);
                if (isCurrent) { item.setAttribute('aria-current', 'step'); } else { item.removeAttribute('aria-current'); }
            });

            // نقاط التنقل
            ui.stageDotsList.setAttribute('aria-label', 'المرحلة ' + s + ' من ' + TOTAL_STAGES);
            ui.stageDots.forEach(function (dot, i) {
                dot.classList.toggle('is-current', i + 1 === s);
                if (i + 1 === s) { dot.setAttribute('aria-current', 'step'); } else { dot.removeAttribute('aria-current'); }
            });

            // أزرار السابق والتالي: متاحة في المراحل 1-3 فقط
            ui.navPrev.disabled = !(s === 2 || s === 3);
            ui.navNext.disabled = !(s === 1 || s === 2);

            // زر "ابدأ التتبع" يعمل الآن
            ui.startTraceBtn.removeAttribute('aria-disabled');

            // مساحة الكتابة قابلة للتركيز في المرحلة 3 فقط
            if (s === 3) { ui.pad.setAttribute('tabindex', '0'); } else { ui.pad.removeAttribute('tabindex'); }

            // الرسم متاح في المرحلة 3 فقط، ويُضبط حجم الـ canvas بعد ظهور اللوحة
            if (drawing) {
                drawing.setEnabled(s === 3);
                if (s === 3) { drawing.resize(); }
            }
            renderPad();

            ui.bubble.textContent = bubbleText();
            syncDataAttributes();
        }

        // عرض ما كتبه الطفل (بلوحة المفاتيح) أو رسمه داخل مساحة الكتابة
        function renderPad() {
            var inked = hasInk();

            ui.typed.textContent = state.buffer;
            ui.typed.style.fontSize = state.buffer.length > 1 ? '5.5rem' : '8rem';
            if (ui.input && ui.input.value !== state.buffer) { ui.input.value = state.buffer; }
            ui.pad.classList.toggle('has-answer', state.buffer !== '' || inked);

            var label = padLabel;
            if (state.buffer) { label = 'الرقم الذي كتبته: ' + state.buffer; }
            else if (inked) { label = 'رسمتَ الرقم، اضغط تحقق من إجابتي'; }
            ui.pad.setAttribute('aria-label', label);

            ui.confirmBtn.disabled = (state.buffer === '' && !inked) || state.stage !== 3;
        }

        // تحديث سمات data-* التي سيقرأها PHP لاحقًا
        function syncDataAttributes() {
            var stagesDone = [];
            for (var i = 1; i < state.stage; i++) { stagesDone.push(i); }
            if (state.result === 'success') { stagesDone.push(state.stage); }

            page.setAttribute('data-number-id', current().value);
            page.setAttribute('data-current-stage', state.stage);
            page.setAttribute('data-completed-stages', stagesDone.join(','));
            page.setAttribute('data-stars-earned', state.stars);
            page.setAttribute('data-is-completed', state.completed ? 'true' : 'false');
            if (state.completed && !page.getAttribute('data-completion-date')) {
                page.setAttribute('data-completion-date', new Date().toISOString().slice(0, 10));
            }
        }

        /* ---------- التنقل ---------- */
        function prefersReducedMotion() {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        function scrollToActive() {
            var behavior = prefersReducedMotion() ? 'auto' : 'smooth';
            if (state.stage === 1) {
                window.scrollTo({ top: 0, behavior: behavior });
                return;
            }
            var target = state.stage === 4 ? ui.card4 : (state.stage === 3 ? ui.card3 : ui.card2);
            if (target && target.scrollIntoView) {
                target.scrollIntoView({ behavior: behavior, block: 'center' });
            }
        }

        function goStage(stage) {
            if (stage < 1 || stage > TOTAL_STAGES) { return; }
            state.stage = stage;
            if (stage !== 4) { state.result = null; }
            renderStage();
            scrollToActive();
            if (stage === 3) { focusWriting(); }
        }

        function goNumber(index) {
            state.index = index;
            state.stage = 1;
            state.buffer = '';
            state.attempts = 0;
            state.result = null;
            state.verdict = null;
            clearDrawing(true);
            renderNumber();
            renderJourney();
            renderStage();
            scrollToActive();
        }

        /* ---------- الكتابة والتحقق ---------- */
        // التركيز على حقل الكتابة (أو مساحة الكتابة إذا لم يوجد الحقل)
        function focusWriting() {
            (ui.input || ui.pad).focus({ preventScroll: true });
        }

        function addDigit(digit) {
            var maxLength = String(current().value).length;
            clearDrawing(true);   // الكتابة بلوحة المفاتيح تلغي الرسمة
            // عند امتلاء الخانات نبدأ من جديد (يسمح للطفل بتغيير رأيه)
            state.buffer = state.buffer.length >= maxLength ? digit : state.buffer + digit;
            renderPad();
        }

        function removeDigit() {
            if (hasInk()) {
                clearDrawing(true);
            } else {
                state.buffer = state.buffer.slice(0, -1);
            }
            renderPad();
        }

        function clearAnswer() {
            state.buffer = '';
            clearDrawing(true);
            renderPad();
            focusWriting();
        }

        function checkAnswer() {
            if (state.stage !== 3) { return; }

            // 1) إجابة مكتوبة بلوحة المفاتيح
            if (state.buffer !== '') {
                state.attempts += 1;
                state.verdict = null;
                if (state.buffer === String(current().value)) { onCorrect(); } else { onWrong(); }
                return;
            }

            // 2) رسمة على الـ canvas: نتعرّف عليها ونقارنها بالرقم المطلوب
            if (!hasInk() || !recognizer) { return; }
            state.attempts += 1;
            state.verdict = recognizer.recognize(drawing.getStrokes(), current().value);
            if (state.verdict.ok) { onCorrect(); } else { onWrong(); }
        }

        function onCorrect() {
            var isLast = state.index === lastIndex;

            // نجمة واحدة لكل رقم يُكمل بنجاح
            state.done[state.index] = true;
            state.stars += 1;
            state.completed = state.done.every(Boolean);

            state.cheer = CHEERS[state.cheerIndex % CHEERS.length];
            state.cheerIndex += 1;
            state.result = 'success';
            state.stage = 4;

            ui.successTitle.textContent = state.completed
                ? 'أكملت كل الأرقام! أنت بطل الأرقام'
                : state.cheer;
            setButtonLabel(ui.successNextBtn, isLast ? 'العودة للرياضيات' : successNextLabel);

            renderJourney();
            renderStage();
            scrollToActive();
        }

        function onWrong() {
            var n = current();
            var verdict = state.verdict;
            var hint;

            // تلميح لطيف، وبعد محاولتين نكشف الرقم لتجنب الإحباط
            if (state.attempts >= 2) {
                hint = 'الرقم هو ' + n.name + ' ويُكتب هكذا: ' + n.value;
            } else if (verdict && verdict.reason === 'small') {
                hint = 'ارسم الرقم كبيرًا داخل المربع';
            } else if (verdict && verdict.best !== null && verdict.best !== n.value) {
                hint = 'رسمتك تشبه الرقم ' + nameOf(verdict.best) + '، جرّب أن ترسم الرقم ' + n.name;
            } else if (verdict) {
                hint = 'اتبع الخط المتقطع وارسم الرقم ' + n.value + ' بهدوء';
            } else if (state.index === 0) {
                hint = defaultHint;
            } else {
                hint = 'عدّ التفاح في الصورة مرة أخرى ثم اكتب الرقم';
            }
            ui.retryHint.textContent = hint;

            state.result = 'retry';
            state.stage = 4;
            renderStage();
            scrollToActive();
        }

        function retry() {
            state.buffer = '';
            state.verdict = null;
            clearDrawing(true);
            goStage(3);
        }

        function nextNumber() {
            if (state.index === lastIndex) {
                window.location.href = MATH_PAGE;
                return;
            }
            goNumber(state.index + 1);
        }

        /* ---------- نطق اسم الرقم ---------- */
        function speak(text) {
            var audioSrc = ui.speakBtn.getAttribute('data-audio-src');
            try {
                if (audioSrc) {
                    new Audio(audioSrc).play().catch(function () {});
                    return;
                }
                if ('speechSynthesis' in window && window.SpeechSynthesisUtterance) {
                    var utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'ar-SA';
                    utterance.rate = 0.8;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                }
            } catch (error) {
                console.warn('تعذّر تشغيل الصوت:', error);
            }
        }

        /* ---------- ربط الأحداث ---------- */
        ui.speakBtn.addEventListener('click', function () { speak(current().name); });

        ui.navPrev.addEventListener('click', function () {
            if (state.stage === 2 || state.stage === 3) { goStage(state.stage - 1); }
        });

        ui.navNext.addEventListener('click', function () {
            if (state.stage === 1 || state.stage === 2) { goStage(state.stage + 1); }
        });

        ui.startTraceBtn.addEventListener('click', function (event) {
            event.preventDefault();
            goStage(3);
        });

        ui.pad.addEventListener('click', function () {
            if (state.stage === 3) { focusWriting(); }
        });

        // الكتابة من الحقل المخفي (لوحة الأرقام على الأجهزة اللمسية)
        if (ui.input) {
            ui.input.addEventListener('input', function () {
                var digits = Array.prototype.map.call(ui.input.value, keyToDigit).join('');
                var maxLength = String(current().value).length;
                clearDrawing(true);
                // عند امتلاء الخانات نبقي آخر رقم كُتب (يسمح بتغيير الرأي)
                state.buffer = digits.length > maxLength ? digits.slice(-1) : digits;
                renderPad();
            });
        }

        ui.clearBtn.addEventListener('click', clearAnswer);
        ui.confirmBtn.addEventListener('click', checkAnswer);
        ui.retryBtn.addEventListener('click', retry);
        ui.successNextBtn.addEventListener('click', nextNumber);

        // تغيّر حجم الشاشة: نعيد ضبط دقة الـ canvas مع الحفاظ على الرسمة
        window.addEventListener('resize', function () {
            if (drawing && state.stage === 3) { drawing.resize(); }
        });

        // الكتابة بلوحة المفاتيح في المرحلة 3
        document.addEventListener('keydown', function (event) {
            if (state.stage !== 3) { return; }
            if (event.ctrlKey || event.metaKey || event.altKey) { return; }

            var target = event.target;

            // داخل الحقل المخفي: الكتابة تتم من الحقل نفسه، ونتولى Enter وEscape فقط
            if (ui.input && target === ui.input) {
                if (event.key === 'Enter') { event.preventDefault(); checkAnswer(); }
                if (event.key === 'Escape') { clearAnswer(); }
                return;
            }

            if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) { return; }

            var digit = keyToDigit(event.key);
            if (digit !== '') {
                event.preventDefault();
                addDigit(digit);
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                removeDigit();
            } else if (event.key === 'Escape') {
                clearAnswer();
            } else if (event.key === 'Enter') {
                // إذا كان زر أو رابط في focus نترك له الضغط الطبيعي
                if (target && target.closest && target.closest('button, a')) { return; }
                event.preventDefault();
                checkAnswer();
            }
        });

        /* ---------- إخفاء نصوص المعاينة التطويرية ---------- */
        if (HIDE_PREVIEW_LABELS) {
            setShown(ui.previewsNote, false);
            $$('.sample-tag', ui.card4).forEach(function (tag) { setShown(tag, false); });
        }

        /* ---------- البداية ---------- */
        renderNumber();
        renderJourney();
        renderStage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();