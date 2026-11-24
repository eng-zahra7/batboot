<?php
/**
 * بطبوط - تسجيل الخروج
 * ----------------------------------------------------------------
 * يمسح بيانات الجلسة بالكامل (parent_id وبيانات التسجيل المؤقتة) ويحذف
 * كوكي الجلسة، ثم يعيد المستخدم إلى صفحة الدخول.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

start_registration_session();

// لا تُخزَّن هذه الاستجابة، فلا يعيد زر الرجوع عرض صفحات الجلسة السابقة
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// يمسح parent_id وchild_id وبيانات التسجيل المؤقتة ورمز CSRF (لا يمس قاعدة البيانات)
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $cookie = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $cookie['path'],
        'domain'   => $cookie['domain'],
        'secure'   => $cookie['secure'],
        'httponly' => $cookie['httponly'],
        'samesite' => $cookie['samesite'] ?? 'Lax',
    ]);
}

session_destroy();

if (is_ajax()) {
    json_out(['ok' => true, 'redirect' => REG_PAGES['login']]);
}
redirect_to(REG_PAGES['login']);
