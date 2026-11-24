<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
start_registration_session();
no_cache_headers();

function delete_child_redirect(string $page = '../login.html'): void
{
    header('Location: ' . $page, true, 303);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit('Method Not Allowed');
}

// لا نقبل حذفًا من موقع آخر أو بدون رمز CSRF صحيح.
if (!origin_allowed() || !csrf_valid()) {
    http_response_code(403);
    exit('انتهت صلاحية الطلب. ارجع إلى صفحة تعديل الملف وحاول مرة أخرى.');
}

$parentId = session_parent_id();
if ($parentId === null) {
    delete_child_redirect();
}

$childId = filter_input(INPUT_POST, 'child_id', FILTER_VALIDATE_INT);
if (!$childId || $childId < 1) {
    http_response_code(400);
    exit('تعذر تحديد حساب الطفل المراد حذفه.');
}

try {
    // نتحقق أن الطفل تابع لولي الأمر المسجل دخوله، ولا نعتمد على child_id وحده.
    $owned = owned_child($pdo, $parentId, (int)$childId);
    if ($owned === null) {
        http_response_code(404);
        exit('حساب الطفل غير موجود أو لا تملك صلاحية حذفه.');
    }

    $pdo->beginTransaction();

    // حذف بيانات الطفل التابعة أولًا لضمان عدم بقاء تقدم أو إنجازات يتيمة.
    $deleteLesson = $pdo->prepare('DELETE FROM child_lesson_progress WHERE child_id = :child_id');
    $deleteLesson->execute([':child_id' => (int)$childId]);

    $deleteAchievements = $pdo->prepare('DELETE FROM child_achievements WHERE child_id = :child_id');
    $deleteAchievements->execute([':child_id' => (int)$childId]);

    $deleteProgress = $pdo->prepare('DELETE FROM child_progress WHERE child_id = :child_id');
    $deleteProgress->execute([':child_id' => (int)$childId]);

    $deleteChild = $pdo->prepare('DELETE FROM children WHERE child_id = :child_id AND parent_id = :parent_id');
    $deleteChild->execute([
        ':child_id' => (int)$childId,
        ':parent_id' => $parentId,
    ]);

    if ($deleteChild->rowCount() !== 1) {
        throw new RuntimeException('Child delete did not affect exactly one row.');
    }

    $pdo->commit();

    // حسب المطلوب: بعد حذف الطفل ننهي جلسة ولي الأمر ونعيده لتسجيل الدخول.
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
    delete_child_redirect();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[batboot delete-child] ' . $e->getMessage());
    http_response_code(500);
    exit('لم يتم حذف الحساب بسبب خطأ في الخادم. لم يتم اعتماد أي حذف جزئي؛ حاول مرة أخرى.');
}
