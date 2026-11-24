<?php
/**
 * بطبوط - حفظ تعديلات الملف الشخصي للطفل الحالي (edit-profile.html)
 * ----------------------------------------------------------------
 * POST: child_name, birth_date, gender (male/female أو boy/girl), preferred_language
 *       + csrf_token (+ child_id اختياري: يجب أن يطابق الطفل الحالي في الجلسة).
 * - الطفل المعدَّل يُحدَّد من الجلسة ويُتحقق من ملكيته (WHERE parent_id = ...).
 * - بعد التحديث نعيد قراءة السجل من MySQL ونقارنه للتأكد من نجاح الحفظ.
 * - لا يُعدَّل المستوى هنا (مصدره child_progress)، ولا تُحفظ الصورة (لا عمود لها في children).
 */

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

start_registration_session();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

$parentId = require_parent_json($pdo);
verify_post_request();

$child = current_child($pdo, $parentId);
if ($child === null) {
    json_out(['ok' => false, 'message' => 'لا يوجد طفل مسجّل لهذا الحساب.'], 404);
}
$childId = (int) $child['id'];

// الصفحة قد تكون قديمة (تغيّر الطفل الحالي من تبويب آخر): نرفض بدل تعديل طفل آخر
$posted = $_POST['child_id'] ?? '';
if (is_string($posted) && $posted !== '' && (!ctype_digit($posted) || (int) $posted !== $childId)) {
    json_out([
        'ok'      => false,
        'message' => 'تغيّر الطفل المحدد، أعد تحميل الصفحة ثم حاول مرة أخرى.',
    ], 409);
}

/* ---------- التحقق (نفس قواعد التسجيل) ---------- */
$errors = [];

$name = reg_text($_POST['child_name'] ?? '');
if ($message = person_name_error($name, 2, 30, 'اسم الطفل')) {
    $errors['child_name'] = $message;
}

$birth = reg_text($_POST['birth_date'] ?? '');
if ($birth !== substr((string) $child['birth_date'], 0, 10)) {   // لا نعيد فحص العمر إلا إذا تغيّر التاريخ
    if ($message = birthdate_error($birth)) {
        $errors['birth_date'] = $message;
    }
}

// قيم القائمة في edit-profile.html: male/female، وقاعدة البيانات: boy/girl
$genderMap = ['male' => 'boy', 'boy' => 'boy', 'female' => 'girl', 'girl' => 'girl'];
$genderIn = reg_text($_POST['gender'] ?? '');
$gender = $genderMap[$genderIn] ?? null;
if ($gender === null) {
    $errors['gender'] = 'اختر بنت أو ولد';
}

$language = reg_text($_POST['preferred_language'] ?? '');
if (!in_array($language, REG_LANGUAGES, true)) {
    $errors['preferred_language'] = 'اختر اللغة المفضلة';
}

if ($errors) {
    json_out([
        'ok'      => false,
        'message' => reset($errors),
        'errors'  => $errors,
    ], 422);
}

/* ---------- الحفظ ثم التأكد ---------- */
$pk = pk_column($pdo, 'children');
$update = $pdo->prepare(
    "UPDATE children
     SET child_name = :child_name, birth_date = :birth_date, gender = :gender, preferred_language = :language
     WHERE `{$pk}` = :id AND parent_id = :parent_id"
);
$update->execute([
    ':child_name' => $name,
    ':birth_date' => $birth,
    ':gender'     => $gender,
    ':language'   => $language,
    ':id'         => $childId,
    ':parent_id'  => $parentId,
]);

$saved = owned_child($pdo, $parentId, $childId);
if ($saved === null
    || $saved['child_name'] !== $name
    || substr((string) $saved['birth_date'], 0, 10) !== $birth
    || $saved['gender'] !== $gender
    || $saved['preferred_language'] !== $language
) {
    error_log('[batboot] update-profile verification failed for child ' . $childId);
    json_out(['ok' => false, 'message' => 'لم ينجح حفظ التغييرات. حاول مرة أخرى.'], 500);
}

json_out([
    'ok'       => true,
    'message'  => 'تم حفظ التغييرات بنجاح.',
    'child'    => public_child($saved),
    'redirect' => 'profile.html',
]);
