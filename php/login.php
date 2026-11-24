<?php
/**
 * بطبوط - تسجيل الدخول
 * ----------------------------------------------------------------
 * GET  : (من JavaScript) رمز CSRF + هل المستخدم مسجّل دخوله أصلًا.
 * POST : حقول login.html: parent_name + login_id (جوال أو بريد) + password.
 *        - البحث عن ولي الأمر بالبريد أو الجوال، ثم password_verify().
 *        - نجاح: session_regenerate_id(true) + حفظ parent_id + تحديد الطفل الحالي.
 *        - فشل: رسالة عامة واحدة (لا نكشف هل الحساب موجود أم لا).
 */

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

start_registration_session();
no_cache_headers();

const LOGIN_HOME = 'main-page.html';
const LOGIN_MAX_FAILS = 5;       // محاولات فاشلة متتالية داخل نفس الجلسة
const LOGIN_LOCK_SECONDS = 60;   // مدة الانتظار بعدها

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!is_ajax()) {
        redirect_to(REG_PAGES['login']);
    }
    json_out([
        'ok'       => true,
        'csrf'     => csrf_token(),
        'loggedIn' => session_parent_id() !== null,
        'redirect' => LOGIN_HOME,
    ]);
}

if ($method !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

verify_post_request();

/* ---------- قفل مؤقت بعد محاولات فاشلة كثيرة ---------- */
$lockUntil = (int) ($_SESSION['login_lock_until'] ?? 0);
if ($lockUntil > time()) {
    json_out([
        'ok'      => false,
        'message' => 'محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى.',
        'csrf'    => csrf_token(),
    ], 429);
}

$name     = mb_strtolower(reg_text($_POST['parent_name'] ?? ''), 'UTF-8');
$loginId  = mb_strtolower(reg_text($_POST['login_id'] ?? ''), 'UTF-8');
$password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

$fail = function (int $status = 401) {
    $_SESSION['login_fails'] = (int) ($_SESSION['login_fails'] ?? 0) + 1;
    if ($_SESSION['login_fails'] >= LOGIN_MAX_FAILS) {
        $_SESSION['login_lock_until'] = time() + LOGIN_LOCK_SECONDS;
        $_SESSION['login_fails'] = 0;
    }
    reply([
        'ok'      => false,
        'message' => 'بيانات الدخول غير صحيحة، تحقق منها وحاول مرة أخرى.',
        'csrf'    => csrf_token(),
    ], $status, LOGIN_HOME, REG_PAGES['login']);
};

if ($name === '' || $loginId === '' || $password === '' || strlen($password) > 72) {
    $fail(422);
}

/* ---------- البحث بالبريد (إن وُجدت @) أو برقم الجوال ---------- */
$pk = pk_column($pdo, 'parents');
$column = (strpos($loginId, '@') !== false) ? 'email' : 'phone';
$stmt = $pdo->prepare(
    "SELECT `{$pk}` AS id, full_name, password FROM parents WHERE {$column} = :login_id LIMIT 5"
);
$stmt->execute([':login_id' => $loginId]);

$matched = null;
foreach ($stmt->fetchAll() as $row) {
    $sameName = mb_strtolower(reg_text($row['full_name']), 'UTF-8') === $name;
    $goodPass = password_verify($password, (string) $row['password']);
    if ($sameName && $goodPass) {
        $matched = $row;
        break;
    }
}

if ($matched === null) {
    // وقت مشابه سواء وُجد الحساب أم لا
    password_verify($password, password_hash('batboot-dummy', PASSWORD_DEFAULT));
    $fail();
}

/* ---------- نجاح: جلسة جديدة ---------- */
session_regenerate_id(true);
unset($_SESSION['reg'], $_SESSION['csrf'], $_SESSION['login_fails'], $_SESSION['login_lock_until'], $_SESSION['child_id']);
$_SESSION['parent_id'] = (int) $matched['id'];

// تحديد الطفل الحالي (أول طفل) والتحقق من ارتباطه بولي الأمر
current_child($pdo, (int) $matched['id']);

// إعادة التجزئة تلقائيًا إذا تغيّرت خوارزمية PHP الافتراضية (دون تخزين كلمة السر نفسها)
if (password_needs_rehash((string) $matched['password'], PASSWORD_DEFAULT)) {
    $upd = $pdo->prepare("UPDATE parents SET password = :p WHERE `{$pk}` = :id");
    $upd->execute([':p' => password_hash($password, PASSWORD_DEFAULT), ':id' => (int) $matched['id']]);
}

reply(['ok' => true, 'redirect' => LOGIN_HOME], 200, LOGIN_HOME, REG_PAGES['login']);
