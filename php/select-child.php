<?php
/**
 * بطبوط - اختيار الطفل الحالي (لولي الأمر الذي لديه أكثر من طفل)
 * ----------------------------------------------------------------
 * POST: child_id + رمز CSRF. لا يُقبل child_id إلا إذا كان الطفل تابعًا
 * لولي الأمر المسجّل دخوله (فحص من قاعدة البيانات)؛ ثم يُحفظ في الجلسة.
 */

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

start_registration_session();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

$parentId = require_parent_json($pdo);
verify_post_request();

$raw = $_POST['child_id'] ?? '';
$childId = (is_string($raw) && ctype_digit($raw)) ? (int) $raw : 0;

$child = owned_child($pdo, $parentId, $childId);
if ($child === null) {
    json_out(['ok' => false, 'message' => 'غير مسموح بالوصول إلى هذا الطفل.'], 403);
}

$_SESSION['child_id'] = (int) $child['id'];

json_out(['ok' => true, 'child' => public_child($child)]);
