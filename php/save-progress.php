<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
start_registration_session();
no_cache_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'message' => 'طريقة الطلب غير مسموحة.'], 405);
}
$parentId = require_parent_json($pdo);
verify_post_request();
$child = current_child($pdo, $parentId);
if ($child === null) json_out(['ok' => false, 'message' => 'لا يوجد طفل محدد.'], 404);

$subject = reg_text($_POST['subject_code'] ?? '');
$lesson = reg_text($_POST['lesson_code'] ?? '');
$unit = reg_text($_POST['unit_key'] ?? '');
$completed = ($_POST['is_completed'] ?? '') === '1';
$correct = filter_var($_POST['correct_answers'] ?? null, FILTER_VALIDATE_INT);
$attempts = filter_var($_POST['attempts'] ?? null, FILTER_VALIDATE_INT);
$firstTry = filter_var($_POST['first_try_correct'] ?? null, FILTER_VALIDATE_INT);
$retry = filter_var($_POST['retry_correct'] ?? '0', FILTER_VALIDATE_INT);

$allowed = ['addition', 'subtraction', 'numbers', 'arabic-letters', 'arabic-words', 'arabic-sentences', 'english-letters', 'english-words', 'english-sentences'];
if (!in_array($subject, $allowed, true) || $lesson === '' || $unit === '' ||
    strlen($lesson) > 50 || strlen($unit) > 50 ||
    $correct === false || $attempts === false || $firstTry === false || $retry === false ||
    $correct < 0 || $attempts < $correct || $firstTry < 0 || $retry < 0 ||
    ($firstTry + $retry) > $correct || $correct > 100 || $attempts > 500) {
    json_out(['ok' => false, 'message' => 'بيانات نتيجة الدرس غير صحيحة.'], 422);
}
if (!$completed) json_out(['ok' => false, 'message' => 'لا يمكن حفظ وحدة غير مكتملة.'], 422);

$childId = (int) $child['id'];
// كل وحدة مكتملة = نجمة واحدة. الرياضيات تحفظ كل سؤال كوحدة مستقلة.
$stars = 1;

try {
    $pdo->beginTransaction();

    $find = $pdo->prepare('SELECT stars_earned, is_completed FROM child_lesson_progress
        WHERE child_id = :child AND subject_code = :subject AND lesson_code = :lesson AND unit_key = :unit FOR UPDATE');
    $find->execute([':child' => $childId, ':subject' => $subject, ':lesson' => $lesson, ':unit' => $unit]);
    $existing = $find->fetch();

    $savedNew = false;
    if (!$existing || (int) $existing['is_completed'] !== 1) {
        $upsert = $pdo->prepare('INSERT INTO child_lesson_progress
            (child_id, subject_code, lesson_code, unit_key, correct_answers, attempts, stars_earned, is_completed, completed_at)
            VALUES (:child, :subject, :lesson, :unit, :correct, :attempts, :stars, 1, NOW())
            ON DUPLICATE KEY UPDATE
              correct_answers = GREATEST(correct_answers, VALUES(correct_answers)),
              attempts = GREATEST(attempts, VALUES(attempts)),
              stars_earned = GREATEST(stars_earned, VALUES(stars_earned)),
              is_completed = 1,
              completed_at = COALESCE(completed_at, NOW())');
        $upsert->execute([
            ':child' => $childId, ':subject' => $subject, ':lesson' => $lesson, ':unit' => $unit,
            ':correct' => $correct, ':attempts' => $attempts, ':stars' => $stars
        ]);
        $savedNew = true;
    }

    // إعادة بناء الإجماليات من سجلات الوحدات نفسها؛ لا نجمع القيمة القادمة من المتصفح.
    $sum = $pdo->prepare('SELECT COALESCE(SUM(stars_earned),0) AS stars,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed
        FROM child_lesson_progress WHERE child_id = :child');
    $sum->execute([':child' => $childId]);
    $totals = $sum->fetch();
    $totalStars = max(0, (int) ($totals['stars'] ?? 0));
    $completedLessons = max(0, (int) ($totals['completed'] ?? 0));
    $level = intdiv($totalStars, STARS_PER_LEVEL) + 1;

    $progressCols = table_columns($pdo, 'child_progress');
    $insertCols = ['child_id', 'total_stars', 'current_level', 'completed_lessons'];
    $insertVals = [':child', ':stars', ':level', ':completed'];
    $updates = ['total_stars = VALUES(total_stars)', 'current_level = VALUES(current_level)', 'completed_lessons = VALUES(completed_lessons)'];
    $params = [':child' => $childId, ':stars' => $totalStars, ':level' => $level, ':completed' => $completedLessons];

    if (isset($progressCols['streak_days'])) {
        $insertCols[] = 'streak_days'; $insertVals[] = '0';
        // streaks are not fabricated; without a reliable activity history, keep existing value.
        $updates[] = 'streak_days = streak_days';
    }
    if (isset($progressCols['last_activity_date'])) {
        $insertCols[] = 'last_activity_date'; $insertVals[] = 'CURDATE()';
        $updates[] = 'last_activity_date = CURDATE()';
    }
    $sql = 'INSERT INTO child_progress (' . implode(',', $insertCols) . ') VALUES (' . implode(',', $insertVals) . ')
        ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);
    $pdo->prepare($sql)->execute($params);

    // منح الشارات من السجلات المخزنة فقط.
    $countsStmt = $pdo->prepare("SELECT
        (SELECT COUNT(*) FROM (
            SELECT lesson_code FROM child_lesson_progress
            WHERE child_id = :child_add AND subject_code = 'addition' AND is_completed = 1
            GROUP BY lesson_code HAVING COUNT(DISTINCT unit_key) >= 3 OR MAX(unit_key LIKE 'level-%') = 1
        ) completed_add) AS add_done,
        (SELECT COUNT(*) FROM (
            SELECT lesson_code FROM child_lesson_progress
            WHERE child_id = :child_sub AND subject_code = 'subtraction' AND is_completed = 1
            GROUP BY lesson_code HAVING COUNT(DISTINCT unit_key) >= 3 OR MAX(unit_key LIKE 'level-%') = 1
        ) completed_sub) AS sub_done,
        SUM(subject_code = 'numbers' AND is_completed = 1) AS numbers_done,
        SUM(subject_code IN ('arabic-letters','arabic-words','arabic-sentences') AND is_completed = 1) AS arabic_done,
        SUM(subject_code IN ('english-letters','english-words','english-sentences') AND is_completed = 1) AS english_done,
        SUM(subject_code IN ('addition','subtraction','numbers') AND is_completed = 1) AS math_done,
        SUM(is_completed = 1) AS all_done
        FROM child_lesson_progress WHERE child_id = :child_all");
    $countsStmt->execute([':child_add' => $childId, ':child_sub' => $childId, ':child_all' => $childId]);
    $counts = $countsStmt->fetch() ?: [];
    $addDone = (int) ($counts['add_done'] ?? 0);
    $subDone = (int) ($counts['sub_done'] ?? 0);
    $numbersDone = (int) ($counts['numbers_done'] ?? 0);
    $arabicDone = (int) ($counts['arabic_done'] ?? 0);
    $englishDone = (int) ($counts['english_done'] ?? 0);
    $mathDone = (int) ($counts['math_done'] ?? 0);
    $allDone = (int) ($counts['all_done'] ?? 0);

    $badgeConditions = [
        'first-step' => $allDone >= 1,
        'number-lover' => $numbersDone >= 10,
        'addition-hero' => $addDone >= 5,
        'subtraction-hero' => $subDone >= 5,
        'master-learner' => $addDone >= 5 && $subDone >= 5 && $numbersDone >= 10,
        'star-collector' => $totalStars >= 30,
        'active-learner' => ($addDone + $subDone) >= 5,
        'arabic' => $arabicDone >= 1,
        'english' => $englishDone >= 1,
        'math' => $mathDone >= 1,
        'all-rounder' => $arabicDone >= 1 && $englishDone >= 1 && $mathDone >= 1,
    ];
    $badgeStmt = $pdo->prepare('SELECT achievement_id, achievement_code FROM achievements');
    $badgeStmt->execute();
    $badgeRows = $badgeStmt->fetchAll();
    $grant = $pdo->prepare('INSERT IGNORE INTO child_achievements (child_id, achievement_id) VALUES (:child, :achievement)');
    $newBadges = [];
    foreach ($badgeRows as $badge) {
        $code = (string) $badge['achievement_code'];
        if (!empty($badgeConditions[$code])) {
            $grant->execute([':child' => $childId, ':achievement' => (int) $badge['achievement_id']]);
            if ($grant->rowCount() > 0) $newBadges[] = $code;
        }
    }

    $pdo->commit();
    json_out([
        'ok' => true,
        'saved' => $savedNew,
        'starsAwarded' => $savedNew ? $stars : 0,
        'progress' => child_progress($pdo, $childId),
        'newAchievements' => $newBadges,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('[batboot] save-progress failed: ' . $e->getMessage());
    json_out(['ok' => false, 'message' => 'تعذّر حفظ تقدم الدرس. حاول مرة أخرى.'], 500);
}
