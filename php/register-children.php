<?php
/**
 * بطبوط - المرحلة 2 من التسجيل: بيانات الطفل أو الأطفال (من 1 إلى 4)
 * ----------------------------------------------------------------
 * GET  : يُرجع الأطفال المحفوظين في الجلسة + رمز CSRF، أو رابط الرجوع لصفحة
 *        ولي الأمر إذا لم تُدخَل بياناته بعد.
 * POST : يتحقق من كل طفل بشكل مستقل ويحفظهم في الجلسة مع بيانات ولي الأمر.
 *
 * لا حاجة لقاعدة البيانات في هذه المرحلة، فلا نحمّل db.php هنا.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

start_registration_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$reg = reg_state();
$hasParent = isset($reg['parent']) && is_array($reg['parent']);

/* ---------- GET: حالة الصفحة ---------- */
if ($method === 'GET') {
    if (!is_ajax()) {
        redirect_to(REG_PAGES['children']);
    }
    $payload = [
        'ok'        => true,
        'csrf'      => csrf_token(),
        'hasParent' => $hasParent,
        'children'  => (isset($reg['children']) && is_array($reg['children'])) ? array_values($reg['children']) : [],
    ];
    if (!$hasParent) {
        $payload['redirect'] = REG_PAGES['parent'];   // الخطوة الأولى لم تكتمل
    }
    json_out($payload);
}

if ($method !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

/* ---------- POST: التحقق والحفظ المؤقت ---------- */
verify_post_request();

if (!$hasParent) {
    reply([
        'ok'       => false,
        'message'  => 'ابدأ بإدخال بيانات ولي الأمر أولًا.',
        'redirect' => REG_PAGES['parent'],
    ], 409, REG_PAGES['children'], REG_PAGES['parent']);
}

[$children, $errors] = validate_children($_POST);

if ($errors || $children === null) {
    reply([
        'ok'      => false,
        'message' => 'تحقق من بيانات الأطفال ثم حاول مرة أخرى.',
        'errors'  => $errors,
    ], 422, REG_PAGES['confirm'], REG_PAGES['children']);
}

$_SESSION['reg']['children'] = $children;

reply([
    'ok'       => true,
    'redirect' => REG_PAGES['confirm'],
], 200, REG_PAGES['confirm'], REG_PAGES['children']);
