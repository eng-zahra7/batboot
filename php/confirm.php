<?php
/**
 * بطبوط - المرحلة 3 من التسجيل: تأكيد البيانات والحفظ النهائي
 * ----------------------------------------------------------------
 * GET  : يُرجع ملخص ولي الأمر والأطفال من الجلسة لعرضه في confirm.html.
 * POST : يحفظ كل شيء في MySQL داخل Transaction واحدة:
 *          1) parents   -> ولي الأمر
 *          2) children  -> كل طفل مرتبط بـ parent_id نفسه
 *          3) child_progress -> سجل مستقل لكل طفل (نجوم 0، مستوى 1 ...)
 *        أي خطأ = ROLLBACK، فلا يُحفظ ولي أمر بدون أطفاله ولا بعض الأطفال فقط.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

start_registration_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$reg = reg_state();
$parent = (isset($reg['parent']) && is_array($reg['parent'])) ? $reg['parent'] : null;
$children = (isset($reg['children']) && is_array($reg['children'])) ? array_values($reg['children']) : [];
$hasData = ($parent !== null && count($children) > 0);

/* ---------- GET: ملخص للعرض ---------- */
if ($method === 'GET') {
    if (!is_ajax()) {
        redirect_to(REG_PAGES['confirm']);
    }
    if (!$hasData) {
        json_out(['ok' => true, 'csrf' => csrf_token(), 'empty' => true]);
    }
    json_out([
        'ok'       => true,
        'csrf'     => csrf_token(),
        'empty'    => false,
        'parent'   => public_parent($parent),
        'children' => $children,
    ]);
}

if ($method !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}

/* ---------- POST: الحفظ النهائي ---------- */
verify_post_request();

// لا توجد بيانات تسجيل: إما انتهت الجلسة، أو أُرسل الطلب مرتين وتم الحفظ في المرة الأولى
if (!$hasData) {
    if (!empty($_SESSION['parent_id'])) {
        // التسجيل تم فعلًا، فلا ننشئ حسابًا ثانيًا ونكمل إلى الصفحة التالية
        reply(['ok' => true, 'already' => true, 'redirect' => REG_PAGES['placement']],
            200, REG_PAGES['placement'], REG_PAGES['confirm']);
    }
    reply([
        'ok'       => false,
        'message'  => 'لم نجد بيانات تسجيل، ابدأ من صفحة ولي الأمر.',
        'redirect' => REG_PAGES['parent'],
    ], 409, REG_PAGES['parent'], REG_PAGES['parent']);
}

// إعادة التحقق من بيانات الأطفال (مثلًا إذا تغيّر العمر بين الخطوتين)
[$validChildren, $childErrors] = validate_children(['children' => $children]);
$parentComplete = !empty($parent['name']) && !empty($parent['phone']) && !empty($parent['email'])
    && !empty($parent['password_hash']) && in_array($parent['relation'] ?? '', REG_RELATIONS, true);

if ($childErrors || $validChildren === null || !$parentComplete) {
    reply([
        'ok'       => false,
        'message'  => 'بيانات التسجيل غير مكتملة، راجع البيانات وعدّلها.',
        'redirect' => REG_PAGES['children'],
    ], 422, REG_PAGES['children'], REG_PAGES['children']);
}

$step = 'parent';

try {
    $pdo->beginTransaction();

    // أولًا: ولي الأمر (كلمة السر مشفّرة مسبقًا بـ password_hash في المرحلة الأولى)
    $insertParent = $pdo->prepare(
        'INSERT INTO parents (full_name, email, password, phone, relationship, relationship_other)
         VALUES (:full_name, :email, :password, :phone, :relationship, :relationship_other)'
    );
    $insertParent->execute([
        ':full_name'          => $parent['name'],
        ':email'              => $parent['email'],
        ':password'           => $parent['password_hash'],
        ':phone'              => $parent['phone'],
        ':relationship'       => $parent['relation'],
        ':relationship_other' => $parent['relation_other'] ?? null,
    ]);

    // ثانيًا: معرّف ولي الأمر الجديد
    $parentId = (int) $pdo->lastInsertId();
    if ($parentId <= 0) {
        throw new RuntimeException('parent_id was not generated');
    }

    $step = 'children';

    // ثالثًا ورابعًا: كل طفل بنفس parent_id + سجل تقدّم مستقل له
    $insertChild = $pdo->prepare(
        'INSERT INTO children (parent_id, child_name, birth_date, gender, preferred_language)
         VALUES (:parent_id, :child_name, :birth_date, :gender, :preferred_language)'
    );
    $insertProgress = $pdo->prepare(
        'INSERT INTO child_progress (child_id, total_stars, current_level, completed_lessons, streak_days, last_activity_date)
         VALUES (:child_id, 0, 1, 0, 0, NULL)'
    );

    foreach ($validChildren as $child) {
        $insertChild->execute([
            ':parent_id'          => $parentId,
            ':child_name'         => $child['name'],
            ':birth_date'         => $child['birthdate'],
            ':gender'             => $child['gender'],
            ':preferred_language' => $child['language'],
        ]);

        $childId = (int) $pdo->lastInsertId();
        if ($childId <= 0) {
            throw new RuntimeException('child_id was not generated');
        }

        $insertProgress->execute([':child_id' => $childId]);
    }

    // خامسًا: كل شيء نجح
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[batboot] registration failed at step "' . $step . '": ' . $e->getMessage());

    // 1062 = قيمة مكررة في MySQL؛ إذا حدث أثناء إدخال ولي الأمر فالبريد سُجّل للتو من حساب آخر
    $driverCode = ($e instanceof PDOException && isset($e->errorInfo[1])) ? (int) $e->errorInfo[1] : 0;
    if ($step === 'parent' && $driverCode === 1062) {
        reply([
            'ok'      => false,
            'message' => 'هذا البريد الإلكتروني مسجّل مسبقًا. عدّل بيانات ولي الأمر أو سجّل الدخول.',
            'errors'  => ['parent_email' => 'هذا البريد الإلكتروني مسجّل مسبقًا'],
        ], 409, REG_PAGES['parent'], REG_PAGES['confirm']);
    }

    // لا نعرض تفاصيل SQL للمستخدم أبدًا
    reply([
        'ok'      => false,
        'message' => 'تعذّر إتمام التسجيل، لم يُحفظ شيء. حاول مرة أخرى بعد قليل.',
    ], 500, REG_PAGES['confirm'], REG_PAGES['confirm']);
}

/* ---------- بعد النجاح: دخول ولي الأمر وتنظيف بيانات التسجيل ---------- */
session_regenerate_id(true);        // معرّف جلسة جديد بعد الدخول
unset($_SESSION['reg'], $_SESSION['csrf']);   // مسح البيانات المؤقتة ورمز CSRF القديم
$_SESSION['parent_id'] = $parentId;

reply([
    'ok'       => true,
    'redirect' => REG_PAGES['placement'],
    'names'    => array_column($validChildren, 'name'),
], 200, REG_PAGES['placement'], REG_PAGES['confirm']);
