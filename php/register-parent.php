<?php
/**
 * بطبوط - المرحلة 1 من التسجيل: بيانات ولي الأمر
 * ----------------------------------------------------------------
 * GET  : يُرجع البيانات المحفوظة في الجلسة (لتعبئة الحقول عند العودة للتعديل) + رمز CSRF.
 * POST : يتحقق من البيانات، يشفّر كلمة السر، ويحفظ كل شيء في الجلسة فقط.
 *        لا يُحفظ ولي الأمر في MySQL قبل تأكيد التسجيل (confirm.php).
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

start_registration_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------- GET: حالة الصفحة ---------- */
if ($method === 'GET') {
    if (!is_ajax()) {
        redirect_to(REG_PAGES['parent']);   // فتح الرابط مباشرة من المتصفح
    }
    $parent = reg_state()['parent'] ?? null;
    json_out([
        'ok'     => true,
        'csrf'   => csrf_token(),
        'parent' => is_array($parent) ? public_parent($parent) : null,
    ]);
}

if ($method !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

/* ---------- POST: التحقق والحفظ المؤقت ---------- */
verify_post_request();

$existingHash = $_SESSION['reg']['parent']['password_hash'] ?? null;
[$data, $errors] = validate_parent($_POST, is_string($existingHash) ? $existingHash : null);

// البريد المسجّل مسبقًا (نفحصه فقط إذا كانت صيغته صحيحة)
if (!isset($errors['parent_email'])) {
    $email = mb_strtolower(reg_text($_POST['parent_email'] ?? ''), 'UTF-8');
    $stmt = $pdo->prepare('SELECT 1 FROM parents WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    if ($stmt->fetchColumn() !== false) {
        $errors['parent_email'] = 'هذا البريد الإلكتروني مسجّل مسبقًا، جرّب تسجيل الدخول أو استخدم بريدًا آخر';
    }
}

if ($errors || $data === null) {
    reply([
        'ok'      => false,
        'message' => 'تحقق من الحقول المحددة ثم حاول مرة أخرى.',
        'errors'  => $errors,
    ], 422, REG_PAGES['children'], REG_PAGES['parent']);
}

if (!isset($_SESSION['reg']) || !is_array($_SESSION['reg'])) {
    $_SESSION['reg'] = [];
}
$_SESSION['reg']['parent'] = $data;

reply([
    'ok'       => true,
    'redirect' => REG_PAGES['children'],
], 200, REG_PAGES['children'], REG_PAGES['parent']);
