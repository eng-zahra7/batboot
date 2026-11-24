<?php
/**
 * بطبوط - بوابة الصفحات المحمية (profile / main-page / edit-profile)
 * ----------------------------------------------------------------
 * يستدعيها ملف .htaccess في جذر المشروع عند فتح هذه الصفحات، فلا يُرسَل
 * HTML الصفحة أصلًا إلا إذا كانت هناك جلسة دخول صحيحة، وتُرسل بترويسات
 * no-store حتى لا يعرضها زر الرجوع من ذاكرة المتصفح بعد تسجيل الخروج.
 * الرابط الظاهر في المتصفح لا يتغيّر، فتعمل مسارات css/js/rec النسبية كما هي.
 */

declare(strict_types=1);

require_once __DIR__ . '/auth.php';     // يتحقق من وجود الحساب فعليًا في قاعدة البيانات

const PROTECTED_PAGES = [
    'profile'      => 'profile.html',
    'main-page'    => 'main-page.html',
    'edit-profile' => 'edit-profile.html',
];

start_registration_session();

// نفس ترويسات منع التخزين المؤقت في auth.php (بدون تحميل قاعدة البيانات هنا)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$key = $_GET['page'] ?? '';
if (!is_string($key) || !isset(PROTECTED_PAGES[$key])) {
    http_response_code(404);
    exit('Not found');
}

// لا يكفي وجود parent_id داخل الجلسة؛ يجب أن يبقى الحساب موجودًا في MySQL.
$parentId = session_parent_id();
$accountExists = false;
if ($parentId !== null) {
    $pk = pk_column($pdo, 'parents');
    $check = $pdo->prepare("SELECT 1 FROM parents WHERE `{$pk}` = :id LIMIT 1");
    $check->execute([':id' => $parentId]);
    $accountExists = $check->fetchColumn() !== false;
}
if (!$accountExists) {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'],
            $params['secure'], $params['httponly']);
    }
    session_destroy();
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    // عبر .htaccess الرابط الظاهر /profile.html => login.html؛ وعند فتح php/page.php مباشرة => ../login.html
    $direct = basename((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH)) === 'page.php';
    header('Location: ' . ($direct ? '../' : '') . REG_PAGES['login']);
    exit;
}

while (ob_get_level() > 0) {
    ob_end_clean();
}
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/../' . PROTECTED_PAGES[$key]);
