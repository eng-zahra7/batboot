<?php
/**
 * بطبوط - دوال مشتركة لملفات التسجيل
 * ----------------------------------------------------------------
 * - جلسة PHP آمنة (HttpOnly + SameSite + وضع صارم).
 * - ردود JSON موحّدة.
 * - حماية CSRF.
 * - قواعد التحقق من بيانات ولي الأمر والأطفال (نفس قواعد registration.js).
 *
 * هذا الملف لا يتصل بقاعدة البيانات. الملفات التي تحتاج MySQL
 * تحمّل db.php بنفسها بعده: require_once __DIR__ . '/db.php';
 */

declare(strict_types=1);

// نبدأ تخزين المخرجات مؤقتًا: أي مسافة أو سطر فارغ عابر (مثل السطر الفارغ
// في أول db.php) يُتجاهل قبل إرسال الرد، فلا يفسد JSON ولا يمنع رأس الجلسة.
ob_start();

ini_set('display_errors', '0');   // لا نعرض تفاصيل الأخطاء للمستخدم أبدًا
ini_set('log_errors', '1');
error_reporting(E_ALL);
date_default_timezone_set('Asia/Riyadh');
mb_internal_encoding('UTF-8');

/* ================= الثوابت ================= */

const REG_MIN_AGE = 3;
const REG_MAX_AGE = 10;
const REG_MAX_CHILDREN = 4;
const REG_RELATIONS = ['mother', 'father', 'sister', 'brother', 'other'];
const REG_GENDERS = ['girl', 'boy'];
const REG_LANGUAGES = ['ar', 'en'];

// صفحات HTML (نسبةً إلى جذر المشروع)
const REG_PAGES = [
    'parent'    => 'register-parent.html',
    'children'  => 'register-childe.html',
    'confirm'   => 'confirm.html',
    'placement' => 'fun-exam.html',
    'login'     => 'login.html',
];

/* ================= أخطاء غير متوقعة ================= */

set_exception_handler(function (Throwable $e): void {
    // التفاصيل في سجل الخادم فقط، والمستخدم يرى رسالة عامة
    error_log('[batboot] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_out([
        'ok'      => false,
        'message' => 'حدث خطأ غير متوقع، حاول مرة أخرى بعد قليل.',
    ], 500);
});

/* ================= الجلسة ================= */

function start_registration_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');

    ini_set('session.use_strict_mode', '1');    // يرفض معرّف جلسة لم يصدره الخادم
    ini_set('session.use_only_cookies', '1');   // لا معرّف جلسة في الرابط
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', '7200');  // ساعتان لإكمال التسجيل

    session_name('BATBOOT_SESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// بيانات التسجيل المؤقتة: ['parent' => [...], 'children' => [...]]
function reg_state(): array
{
    return (isset($_SESSION['reg']) && is_array($_SESSION['reg'])) ? $_SESSION['reg'] : [];
}

/* ================= الردود ================= */

function json_out(array $payload, int $status = 200): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// الانتقال إلى صفحة HTML (الرابط نسبي لمجلد php)
function redirect_to(string $page): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    header('Location: ../' . $page);
    exit;
}

// هل الطلب قادم من JavaScript (fetch)؟
function is_ajax(): bool
{
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return $requestedWith === 'fetch' || strpos($accept, 'application/json') !== false;
}

// JSON لطلبات JavaScript، وانتقال عادي بين الصفحات إذا أُرسل النموذج بدونها
function reply(array $payload, int $status, string $okPage, string $failPage): void
{
    if (is_ajax()) {
        json_out($payload, $status);
    }
    redirect_to(!empty($payload['ok']) ? $okPage : $failPage);
}

/* ================= CSRF ================= */

function csrf_token(): string
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_valid(): bool
{
    $sent = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    return is_string($sent)
        && $sent !== ''
        && isset($_SESSION['csrf'])
        && is_string($_SESSION['csrf'])
        && hash_equals($_SESSION['csrf'], $sent);
}

// الطلب يجب أن يأتي من نفس الموقع (فحص إضافي فوق رمز CSRF)
function origin_allowed(): bool
{
    $source = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($source === '') {
        $source = $_SERVER['HTTP_REFERER'] ?? '';
    }
    if ($source === '') {
        return true;   // بعض المتصفحات لا ترسل الترويسة، ورمز CSRF يبقى مطلوبًا
    }
    $sourceHost = parse_url($source, PHP_URL_HOST);
    $ownHost = parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    return is_string($sourceHost) && is_string($ownHost) && strcasecmp($sourceHost, $ownHost) === 0;
}

// فحوص أي طلب POST: نفس الموقع + رمز CSRF صحيح
function verify_post_request(): void
{
    if (!origin_allowed()) {
        json_out(['ok' => false, 'message' => 'طلب غير مسموح.'], 403);
    }
    if (!csrf_valid()) {
        // نرسل رمزًا جديدًا ليتمكن المستخدم من إعادة المحاولة مباشرة
        unset($_SESSION['csrf']);
        json_out([
            'ok'      => false,
            'message' => 'انتهت صلاحية الصفحة، حاول مرة أخرى.',
            'csrf'    => csrf_token(),
        ], 403);
    }
}

/* ================= أدوات التحقق ================= */

// نص نظيف: يجب أن يكون نصًا UTF-8 صالحًا، بدون مسافات زائدة أو متكررة
function reg_text($value): string
{
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
        return '';
    }
    $collapsed = preg_replace('/\s+/u', ' ', trim($value));
    return $collapsed === null ? '' : trim($collapsed);
}

// نفس رسائل registration.js: حروف ومسافات فقط، مع حد أدنى وأقصى
function person_name_error(string $value, int $min, int $max, string $who): string
{
    if ($value === '') {
        return "اكتب {$who}";
    }
    if (!preg_match('/^[\p{L}\s]+$/u', $value)) {
        return 'الاسم يجب أن يحتوي على حروف فقط';
    }
    $length = mb_strlen($value);
    if ($length < $min) {
        return "الاسم قصير، يجب أن يكون {$min} حروف على الأقل";
    }
    if ($length > $max) {
        return "الاسم طويل، الحد الأقصى {$max} حرفًا";
    }
    return '';
}

function phone_error(string $value): string
{
    if ($value === '') {
        return 'اكتب رقم الجوال';
    }
    if (!preg_match('/^05[0-9]{8}$/D', $value)) {
        return 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    return '';
}

function email_error(string $value): string
{
    if ($value === '') {
        return 'اكتب البريد الإلكتروني';
    }
    if (mb_strlen($value) > 100) {
        return 'البريد الإلكتروني طويل جدًا';
    }
    if (filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
        return 'صيغة البريد غير صحيحة، مثال: name@example.com';
    }
    return '';
}

// $optional = true: كلمة سر محفوظة في الجلسة، فيجوز تركها فارغة عند التعديل
function password_error(string $value, bool $optional): string
{
    if ($value === '') {
        return $optional ? '' : 'اكتب كلمة السر';
    }
    $length = mb_strlen($value);
    if ($length < 8) {
        return 'كلمة السر قصيرة، يجب أن تكون 8 أحرف على الأقل';
    }
    if ($length > 64) {
        return 'كلمة السر طويلة، الحد الأقصى 64 حرفًا';
    }
    if (strlen($value) > 72) {
        return 'كلمة السر طويلة جدًا، استخدم عددًا أقل من الأحرف';   // حد bcrypt هو 72 بايت
    }
    if (!preg_match('/\p{L}/u', $value)) {
        return 'كلمة السر يجب أن تحتوي على حرف واحد على الأقل';
    }
    if (!preg_match('/[0-9]/', $value)) {
        return 'كلمة السر يجب أن تحتوي على رقم واحد على الأقل';
    }
    return '';
}

// عمر الطفل بالسنوات الكاملة حسب تاريخ اليوم الفعلي على الخادم
function birthdate_error(string $value): string
{
    if ($value === '') {
        return 'اختر تاريخ الميلاد';
    }
    $birth = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $problems = DateTimeImmutable::getLastErrors();
    $hasProblems = is_array($problems) && ($problems['warning_count'] > 0 || $problems['error_count'] > 0);

    // الفحص الأخير يرفض تواريخ مثل 2020-02-31 التي يصححها PHP تلقائيًا
    if ($birth === false || $hasProblems || $birth->format('Y-m-d') !== $value) {
        return 'تاريخ غير صحيح';
    }

    $today = new DateTimeImmutable('today');
    if ($birth > $today) {
        return 'تاريخ غير صحيح';
    }

    $age = $birth->diff($today)->y;
    if ($age < REG_MIN_AGE) {
        return 'بطبوط مناسب للأطفال من عمر ' . REG_MIN_AGE . ' سنوات';
    }
    if ($age > REG_MAX_AGE) {
        return 'بطبوط مناسب للأطفال حتى عمر ' . REG_MAX_AGE . ' سنوات';
    }
    return '';
}

/* ================= التحقق من بيانات ولي الأمر ================= */

/**
 * @param array       $input        بيانات النموذج ($_POST)
 * @param string|null $existingHash كلمة السر المشفّرة المحفوظة في الجلسة (عند العودة للتعديل)
 * @return array [بيانات نظيفة, أخطاء حسب اسم الحقل]
 */
function validate_parent(array $input, ?string $existingHash): array
{
    $errors = [];

    $name     = reg_text($input['parent_name'] ?? '');
    $phone    = reg_text($input['parent_phone'] ?? '');
    $email    = mb_strtolower(reg_text($input['parent_email'] ?? ''), 'UTF-8');
    $relation = reg_text($input['relation'] ?? '');
    $other    = reg_text($input['relation_other'] ?? '');

    // كلمات السر لا نغيّر فيها شيئًا (لا trim ولا تعديل مسافات)
    $password = is_string($input['parent_password'] ?? null) ? $input['parent_password'] : '';
    $confirm  = is_string($input['parent_password_confirm'] ?? null) ? $input['parent_password_confirm'] : '';

    if ($message = person_name_error($name, 3, 50, 'اسم ولي الأمر')) {
        $errors['parent_name'] = $message;
    }
    if ($message = phone_error($phone)) {
        $errors['parent_phone'] = $message;
    }
    if ($message = email_error($email)) {
        $errors['parent_email'] = $message;
    }

    $hasExisting = ($existingHash !== null && $existingHash !== '');
    $passwordTouched = ($password !== '' || $confirm !== '');
    $newPassword = false;

    if ($passwordTouched || !$hasExisting) {
        $newPassword = true;
        if ($message = password_error($password, $hasExisting)) {
            $errors['parent_password'] = $message;
        }
        if ($confirm === '') {
            $errors['parent_password_confirm'] = 'أعد كتابة كلمة السر';
        } elseif (!hash_equals($password, $confirm)) {
            $errors['parent_password_confirm'] = 'كلمتا السر غير متطابقتين';
        }
    }

    if (!in_array($relation, REG_RELATIONS, true)) {
        $errors['relation'] = 'اختر صلة القرابة بالطفل';
    } elseif ($relation === 'other') {
        if ($other === '') {
            $errors['relation_other'] = 'حدّد صلة القرابة';
        } elseif (mb_strlen($other) > 30) {
            $errors['relation_other'] = 'صلة القرابة طويلة، الحد الأقصى 30 حرفًا';
        } elseif (preg_match('/\p{C}/u', $other)) {
            $errors['relation_other'] = 'صلة القرابة تحتوي على رموز غير مسموحة';
        }
    } else {
        $other = '';   // الحقل الإضافي لا معنى له إلا مع "أخرى"
    }

    $data = null;
    if (!$errors) {
        $data = [
            'name'           => $name,
            'phone'          => $phone,
            'email'          => $email,
            // كلمة السر لا تُحفظ في الجلسة إلا مشفّرة
            'password_hash'  => $newPassword ? password_hash($password, PASSWORD_DEFAULT) : $existingHash,
            'relation'       => $relation,
            'relation_other' => $relation === 'other' ? $other : null,
        ];
    }
    return [$data, $errors];
}

/* ================= التحقق من بيانات الأطفال ================= */

/**
 * @param array $input يحتوي على children (مصفوفة) وقد يحتوي children_count
 * @return array [قائمة أطفال نظيفة, أخطاء]
 *         مفاتيح الأخطاء: children، children_count، children.0.name ...
 */
function validate_children(array $input): array
{
    $errors = [];
    $clean = [];

    $raw = $input['children'] ?? null;
    if (!is_array($raw) || count($raw) === 0) {
        return [null, ['children' => 'سجّل طفلًا واحدًا على الأقل']];
    }
    if (count($raw) > REG_MAX_CHILDREN) {
        return [null, ['children' => 'الحد الأقصى ' . REG_MAX_CHILDREN . ' أطفال']];
    }

    if (isset($input['children_count'])) {
        $declared = $input['children_count'];
        if (!is_string($declared) || !ctype_digit($declared) || (int) $declared !== count($raw)) {
            $errors['children_count'] = 'عدد الأطفال لا يطابق بيانات الأطفال';
        }
    }

    foreach (array_values($raw) as $i => $child) {
        $child = is_array($child) ? $child : [];

        $name      = reg_text($child['name'] ?? '');
        $birthdate = reg_text($child['birthdate'] ?? '');
        $gender    = reg_text($child['gender'] ?? '');
        $language  = reg_text($child['language'] ?? '');

        if ($message = person_name_error($name, 2, 30, 'اسم الطفل')) {
            $errors["children.$i.name"] = $message;
        }
        if ($message = birthdate_error($birthdate)) {
            $errors["children.$i.birthdate"] = $message;
        }
        if (!in_array($gender, REG_GENDERS, true)) {
            $errors["children.$i.gender"] = 'اختر بنت أو ولد';
        }
        if (!in_array($language, REG_LANGUAGES, true)) {
            $errors["children.$i.language"] = 'اختر اللغة المفضلة';
        }

        $clean[] = [
            'name'      => $name,
            'birthdate' => $birthdate,
            'gender'    => $gender,
            'language'  => $language,
        ];
    }

    return [$errors ? null : $clean, $errors];
}

/* ================= الصيغة التي تُرسل إلى JavaScript ================= */

// بيانات ولي الأمر بدون كلمة السر (المشفّرة أيضًا لا تغادر الخادم)
function public_parent(array $parent): array
{
    return [
        'name'          => $parent['name'] ?? '',
        'phone'         => $parent['phone'] ?? '',
        'email'         => $parent['email'] ?? '',
        'relation'      => $parent['relation'] ?? '',
        'relationOther' => $parent['relation_other'] ?? '',
        'hasPassword'   => !empty($parent['password_hash']),
    ];
}
