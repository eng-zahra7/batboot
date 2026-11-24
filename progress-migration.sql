-- Batboot progress integrity migration
-- Back up batboot_db before running.
-- Inspect duplicates first. If this query returns rows, merge them manually before adding the key:
-- SELECT child_id, subject_code, lesson_code, unit_key, COUNT(*) AS duplicate_count
-- FROM child_lesson_progress
-- GROUP BY child_id, subject_code, lesson_code, unit_key
-- HAVING COUNT(*) > 1;
--
-- Required idempotency key: one completion record per child + subject + lesson + unit.
-- Skip this ALTER if SHOW INDEX FROM child_lesson_progress already shows an equivalent UNIQUE index.
ALTER TABLE child_lesson_progress
  ADD UNIQUE KEY uq_child_lesson_unit (child_id, subject_code, lesson_code, unit_key);

-- The project rule is one star per completed unit. This normalizes legacy records
-- without deleting child data or completion history. Math questions completed
-- after this update are saved as individual unit_key records.
UPDATE child_lesson_progress
SET stars_earned = 1
WHERE is_completed = 1;

-- Rebuild cached aggregate values from the authoritative lesson rows.
UPDATE child_progress cp
JOIN (
  SELECT child_id,
         SUM(stars_earned) AS total_stars,
         SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed_lessons
  FROM child_lesson_progress
  GROUP BY child_id
) p ON p.child_id = cp.child_id
SET cp.total_stars = p.total_stars,
    cp.current_level = FLOOR(p.total_stars / 15) + 1,
    cp.completed_lessons = p.completed_lessons;
