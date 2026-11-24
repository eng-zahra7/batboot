<?php
/**
 * بطبوط - بيانات الطفل الحالي لصفحات الملف الشخصي والرئيسية وتعديل الملف
 * ----------------------------------------------------------------
 * GET فقط. بدون جلسة صالحة => 401 + redirect إلى login.html.
 * يُرجع: الطفل الحالي (بعد التحقق من ملكيته)، قائمة أطفال ولي الأمر
 * (للتبديل بينهم)، وتقدم الطفل من child_progress. لا يُنشئ أي بيانات.
 */

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

start_registration_session();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

$parentId = require_parent_json($pdo);
$child = current_child($pdo, $parentId);

if ($child === null) {
    // لا يوجد ملف طفل مرتبط بالحساب: إنهاء الجلسة وإرجاع المستخدم لتسجيل الدخول.
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'],
            $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_out([
        'ok'       => false,
        'message'  => 'الحساب غير موجود أو لا يوجد طفل مرتبط به. سجّل الدخول مرة أخرى.',
        'redirect' => REG_PAGES['login'],
    ], 401);
}

$childId = (int)$child['id'];
$lessonStmt = $pdo->prepare(
    'SELECT subject_code, lesson_code, unit_key, correct_answers, attempts, stars_earned, is_completed, completed_at
     FROM child_lesson_progress WHERE child_id = :child ORDER BY completed_at ASC, lesson_progress_id ASC'
);
$lessonStmt->execute([':child' => $childId]);
$lessonRows = $lessonStmt->fetchAll();
$summary = [
    'totalStars' => 0, 'completedUnits' => 0, 'correctAnswers' => 0, 'attempts' => 0,
    'bySubject' => []
];
foreach ($lessonRows as $r) {
    $subjectCode = (string)$r['subject_code'];
    $summary['totalStars'] += (int)$r['stars_earned'];
    if ((int)$r['is_completed'] === 1) $summary['completedUnits']++;
    $summary['correctAnswers'] += (int)$r['correct_answers'];
    $summary['attempts'] += (int)$r['attempts'];
    if (!isset($summary['bySubject'][$subjectCode])) {
        $summary['bySubject'][$subjectCode] = ['stars' => 0, 'completedUnits' => 0, 'correctAnswers' => 0, 'attempts' => 0];
    }
    $summary['bySubject'][$subjectCode]['stars'] += (int)$r['stars_earned'];
    if ((int)$r['is_completed'] === 1) $summary['bySubject'][$subjectCode]['completedUnits']++;
    $summary['bySubject'][$subjectCode]['correctAnswers'] += (int)$r['correct_answers'];
    $summary['bySubject'][$subjectCode]['attempts'] += (int)$r['attempts'];
}
json_out([
    'ok' => true,
    'csrf' => csrf_token(),
    'child' => public_child($child),
    'children' => array_map('public_child', parent_children($pdo, $parentId)),
    'progress' => child_progress($pdo, $childId),
    'lessonProgress' => $lessonRows,
    'statistics' => $summary,
]);
