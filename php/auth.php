<?php
/**
 * بطبوط - أدوات تسجيل الدخول والطفل الحالي (مشتركة بين ملفات php/)
 * ----------------------------------------------------------------
 * تعتمد على helpers.php (الجلسة، JSON، CSRF) وdb.php ($pdo).
 * - parent_id يُحفظ في الجلسة بعد الدخول فقط.
 * - الطفل الحالي ($_SESSION['child_id']) لا يُصدَّق أبدًا قبل التحقق من
 *   ملكيته لولي الأمر من قاعدة البيانات (WHERE parent_id = :parent_id).
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

// عدد النجوم اللازمة لإكمال مستوى واحد (قيمة العرض في شريط تقدم المستوى بصفحة الملف الشخصي).
// القيمة 200 مأخوذة من تصميم الصفحة (… / 200)، وليست محفوظة في قاعدة البيانات.
const STARS_PER_LEVEL = 200;

/* قراءة أعمدة الجدول للتحقق من توافق مخطط قاعدة البيانات. */
function table_columns(PDO $pdo, string $table): array
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new InvalidArgumentException('Invalid table name');
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
    $columns = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $column) {
        if (isset($column['Field'])) {
            $columns[(string) $column['Field']] = true;
        }
    }
    return $columns;
}

/* ---------- ترويسات منع التخزين المؤقت (زر الرجوع بعد الخروج) ---------- */
function no_cache_headers(): void
{
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

/* ---------- اسم عمود المفتاح الأساسي (يُقرأ من قاعدة البيانات ولا يُفترض) ---------- */
function pk_column(PDO $pdo, string $table): string
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $stmt = $pdo->prepare(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_KEY = 'PRI'
         ORDER BY ORDINAL_POSITION LIMIT 1"
    );
    $stmt->execute([':t' => $table]);
    $col = $stmt->fetchColumn();
    if (!is_string($col) || !preg_match('/^[A-Za-z0-9_]+$/', $col)) {
        throw new RuntimeException("primary key of {$table} not found");
    }
    return $cache[$table] = $col;
}

/* ---------- الجلسة ---------- */

// ولي الأمر المسجّل دخوله (parent_id) أو null
function session_parent_id(): ?int
{
    $id = $_SESSION['parent_id'] ?? null;
    return (is_int($id) && $id > 0) ? $id : null;
}

// للملفات التي تُرجع JSON: بدون جلسة صالحة => 401 + رابط صفحة الدخول
function require_parent_json(PDO $pdo): int
{
    no_cache_headers();
    $parentId = session_parent_id();
    if ($parentId !== null) {
        $pk = pk_column($pdo, 'parents');
        $stmt = $pdo->prepare("SELECT 1 FROM parents WHERE `{$pk}` = :id LIMIT 1");
        $stmt->execute([':id' => $parentId]);
        if ($stmt->fetchColumn() === false) {
            $parentId = null;   // الحساب لم يعد موجودًا
        }
    }
    if ($parentId === null) {
        $_SESSION = [];
        json_out([
            'ok'       => false,
            'message'  => 'يجب تسجيل الدخول أولًا.',
            'redirect' => REG_PAGES['login'],
        ], 401);
    }
    return $parentId;
}

/* ---------- الأطفال ---------- */

// أطفال ولي الأمر فقط
function parent_children(PDO $pdo, int $parentId): array
{
    $pk = pk_column($pdo, 'children');
    $stmt = $pdo->prepare(
        "SELECT `{$pk}` AS id, child_name, birth_date, gender, preferred_language
         FROM children WHERE parent_id = :parent_id ORDER BY `{$pk}` ASC"
    );
    $stmt->execute([':parent_id' => $parentId]);
    return $stmt->fetchAll();
}

// طفل واحد بشرط أن يتبع ولي الأمر المحدد
function owned_child(PDO $pdo, int $parentId, int $childId): ?array
{
    if ($childId <= 0) {
        return null;
    }
    $pk = pk_column($pdo, 'children');
    $stmt = $pdo->prepare(
        "SELECT `{$pk}` AS id, child_name, birth_date, gender, preferred_language
         FROM children WHERE `{$pk}` = :id AND parent_id = :parent_id LIMIT 1"
    );
    $stmt->execute([':id' => $childId, ':parent_id' => $parentId]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

// الطفل الحالي: من الجلسة بعد التحقق من الملكية، وإلا أول طفل لولي الأمر
function current_child(PDO $pdo, int $parentId): ?array
{
    $wanted = $_SESSION['child_id'] ?? null;
    if (is_int($wanted)) {
        $child = owned_child($pdo, $parentId, $wanted);
        if ($child !== null) {
            return $child;
        }
    }
    $all = parent_children($pdo, $parentId);
    if (!$all) {
        unset($_SESSION['child_id']);
        return null;
    }
    $_SESSION['child_id'] = (int) $all[0]['id'];
    return $all[0];
}

/* ---------- التقدّم (child_progress) ---------- */

// لا نُنشئ تقدّمًا وهميًا: إن لم يوجد سجل نرجع القيم الافتراضية (نفس قيم confirm.php عند التسجيل)
function child_progress(PDO $pdo, int $childId): array
{
    // المصدر الأساسي هو سجل الوحدات المكتملة، وليس الملخص المخزن أو المتصفح.
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(stars_earned),0) AS total_stars,
                COALESCE(SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END),0) AS completed_lessons
         FROM child_lesson_progress WHERE child_id = :child_id'
    );
    $stmt->execute([':child_id' => $childId]);
    $totals = $stmt->fetch() ?: [];
    $stars = max(0, (int)($totals['total_stars'] ?? 0));
    $completed = max(0, (int)($totals['completed_lessons'] ?? 0));
    $level = intdiv($stars, STARS_PER_LEVEL) + 1;
    $levelXp = $stars % STARS_PER_LEVEL;

    $cols = table_columns($pdo, 'child_progress');
    $optional = [];
    foreach (['streak_days', 'last_activity_date'] as $col) {
        if (isset($cols[$col])) $optional[] = $col;
    }
    $row = [];
    if ($optional) {
        $q = $pdo->prepare('SELECT ' . implode(',', $optional) . ' FROM child_progress WHERE child_id = :id LIMIT 1');
        $q->execute([':id' => $childId]);
        $row = $q->fetch() ?: [];
    }
    return [
        'totalStars' => $stars, 'currentLevel' => $level,
        'streakDays' => max(0, (int)($row['streak_days'] ?? 0)),
        'completedLessons' => $completed,
        'lastActivityDate' => $row['last_activity_date'] ?? null,
        'levelXp' => $levelXp, 'levelXpMax' => STARS_PER_LEVEL,
        'levelPercent' => (int)round($levelXp / STARS_PER_LEVEL * 100),
    ];
}

// الصيغة المرسلة إلى JavaScript (أسماء الجنس تبقى بصيغة التسجيل: girl / boy)
function public_child(array $child): array
{
    return [
        'id'        => (int) $child['id'],
        'name'      => (string) $child['child_name'],
        'birthDate' => substr((string) $child['birth_date'], 0, 10),   // YYYY-MM-DD
        'gender'    => (string) $child['gender'],
        'language'  => (string) $child['preferred_language'],
    ];
}
