-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- مضيف: 127.0.0.1
-- وقت الجيل: 24 نوفمبر 2026 الساعة 19:32
-- إصدار الخادم: 10.11.16-MariaDB
-- نسخة PHP: 8.3.36

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- قاعدة بيانات: `batboot_db`
--

-- --------------------------------------------------------

--
-- بنية الجدول `achievements`
--

CREATE TABLE `achievements` (
  `achievement_id` int(11) NOT NULL,
  `achievement_code` varchar(50) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `achievements`
--

INSERT INTO `achievements` (`achievement_id`, `achievement_code`, `title`, `description`, `icon`) VALUES
(1, 'first-step', 'أول خطوة', 'أكمل أول درس لك في بطبوط', '🌟'),
(2, 'number-lover', 'محب الأرقام', 'أكمل تعلم الأرقام', '🔢'),
(3, 'addition-hero', 'بطل الجمع', 'أكمل دروس الجمع', '➕'),
(4, 'subtraction-hero', 'بطل الطرح', 'أكمل دروس الطرح', '➖'),
(5, 'master-learner', 'المتعلم المتميز', 'أكمل جميع المواد التعليمية', '🏆'),
(6, 'star-collector', 'جامع النجوم', 'اجمع 30 نجمة', '⭐'),
(7, 'active-learner', 'المتعلم النشيط', 'أكمل 5 مستويات تعليمية', '🎓');

-- --------------------------------------------------------

--
-- بنية الجدول `children`
--

CREATE TABLE `children` (
  `child_id` int(11) NOT NULL,
  `parent_id` int(11) NOT NULL,
  `child_name` varchar(100) NOT NULL,
  `birth_date` date NOT NULL,
  `gender` varchar(10) NOT NULL,
  `preferred_language` varchar(20) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- إرجاع أو استيراد بيانات الجدول `children`
--

INSERT INTO `children` (`child_id`, `parent_id`, `child_name`, `birth_date`, `gender`, `preferred_language`, `profile_image`, `created_at`, `updated_at`) VALUES
(2, 2, 'لولو', '2023-11-01', 'girl', 'ar', NULL, '2026-11-24 14:21:26', '2026-11-24 14:21:26');

-- --------------------------------------------------------

--
-- بنية الجدول `child_achievements`
--

CREATE TABLE `child_achievements` (
  `child_achievement_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `achievement_id` int(11) NOT NULL,
  `earned_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `child_achievements`
--

INSERT INTO `child_achievements` (`child_achievement_id`, `child_id`, `achievement_id`, `earned_at`) VALUES
(12, 2, 1, '2026-11-24 15:21:32'),
(29, 2, 6, '2026-11-24 15:37:48');

-- --------------------------------------------------------

--
-- بنية الجدول `child_lesson_progress`
--

CREATE TABLE `child_lesson_progress` (
  `lesson_progress_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `subject_code` varchar(30) NOT NULL,
  `lesson_code` varchar(50) NOT NULL,
  `unit_key` varchar(50) NOT NULL,
  `correct_answers` int(11) NOT NULL DEFAULT 0,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `stars_earned` int(11) NOT NULL DEFAULT 0,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `child_lesson_progress`
--

INSERT INTO `child_lesson_progress` (`lesson_progress_id`, `child_id`, `subject_code`, `lesson_code`, `unit_key`, `correct_answers`, `attempts`, `stars_earned`, `is_completed`, `completed_at`, `updated_at`) VALUES
(21, 2, 'english-letters', 'english-letters-1', '1', 1, 1, 1, 1, '2026-11-24 18:21:32', '2026-11-24 15:21:32'),
(22, 2, 'english-letters', 'english-letters-1', '2', 1, 1, 1, 1, '2026-11-24 18:21:38', '2026-11-24 15:21:38'),
(23, 2, 'english-letters', 'english-letters-1', '3', 1, 1, 1, 1, '2026-11-24 18:21:42', '2026-11-24 15:21:42'),
(24, 2, 'english-letters', 'english-letters-1', '4', 1, 1, 1, 1, '2026-11-24 18:21:45', '2026-11-24 15:21:45'),
(25, 2, 'arabic-letters', 'arabic-letters-1', '1', 1, 1, 1, 1, '2026-11-24 18:22:02', '2026-11-24 15:22:02'),
(26, 2, 'arabic-letters', 'arabic-letters-1', '2', 1, 1, 1, 1, '2026-11-24 18:22:05', '2026-11-24 15:22:05'),
(27, 2, 'arabic-letters', 'arabic-letters-1', '3', 1, 1, 1, 1, '2026-11-24 18:22:08', '2026-11-24 15:22:08'),
(28, 2, 'arabic-letters', 'arabic-letters-1', '4', 1, 1, 1, 1, '2026-11-24 18:22:11', '2026-11-24 15:22:11'),
(29, 2, 'numbers', 'numbers', '1', 1, 1, 1, 1, '2026-11-24 18:32:21', '2026-11-24 15:32:21'),
(30, 2, 'arabic-words', 'arabic-words-1', '1', 1, 1, 1, 1, '2026-11-24 18:33:51', '2026-11-24 15:33:51'),
(31, 2, 'arabic-words', 'arabic-words-1', '2', 1, 1, 1, 1, '2026-11-24 18:33:55', '2026-11-24 15:33:55'),
(32, 2, 'arabic-sentences', 'arabic-sentences-1', '1', 1, 1, 1, 1, '2026-11-24 18:34:20', '2026-11-24 15:34:20'),
(33, 2, 'subtraction', 'subtraction', 'level-1', 3, 3, 9, 1, '2026-11-24 18:34:57', '2026-11-24 15:34:57'),
(34, 2, 'subtraction', 'subtraction-level-1', 'level-1', 3, 3, 9, 1, '2026-11-24 18:37:48', '2026-11-24 15:37:48'),
(35, 2, 'addition', 'addition-level-1', 'level-1', 3, 3, 9, 1, '2026-11-24 18:38:54', '2026-11-24 15:38:54'),
(36, 2, 'numbers', 'numbers', '2', 1, 2, 1, 1, '2026-11-24 18:51:09', '2026-11-24 15:51:09'),
(37, 2, 'addition', 'addition-level-2', 'question-4+4', 1, 1, 1, 1, '2026-11-24 18:51:19', '2026-11-24 15:51:19'),
(38, 2, 'subtraction', 'subtraction-level-2', 'question-7-2', 1, 2, 1, 1, '2026-11-24 18:51:29', '2026-11-24 15:51:29');

-- --------------------------------------------------------

--
-- بنية الجدول `child_progress`
--

CREATE TABLE `child_progress` (
  `progress_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `total_stars` int(11) NOT NULL DEFAULT 0,
  `current_level` int(11) NOT NULL DEFAULT 1,
  `completed_lessons` int(11) NOT NULL DEFAULT 0,
  `streak_days` int(11) NOT NULL DEFAULT 0,
  `last_activity_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `child_progress`
--

INSERT INTO `child_progress` (`progress_id`, `child_id`, `total_stars`, `current_level`, `completed_lessons`, `streak_days`, `last_activity_date`, `created_at`, `updated_at`) VALUES
(12, 2, 42, 1, 18, 0, '2026-11-24', '2026-11-24 14:21:26', '2026-11-24 15:51:29');

-- --------------------------------------------------------

--
-- بنية الجدول `parents`
--

CREATE TABLE `parents` (
  `parent_id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `relationship` varchar(20) NOT NULL,
  `relationship_other` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- إرجاع أو استيراد بيانات الجدول `parents`
--

INSERT INTO `parents` (`parent_id`, `full_name`, `email`, `password`, `phone`, `created_at`, `relationship`, `relationship_other`) VALUES
(1, 'محمد', 'mohammed@gmail.com', '$2y$10$gHyLd2jhQIR4OZjxubWZGePl/fbR/fF7yUkWuaH4V2pzhdysRcWgy', '0512345678', '2026-11-24 11:44:10', 'father', NULL),
(2, 'فاطمه', 'f@gmail.com', '$2y$10$b0Q8SGCKSfBu2yEWYE.ED.00oeEe6iFEmxSvgWNwTLsluNlRqsliG', '0511223344', '2026-11-24 14:21:26', 'mother', NULL);

--
-- Indexes for dumped tables
--

--
-- فهارس للجدول `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`achievement_id`),
  ADD UNIQUE KEY `uq_achievement_code` (`achievement_code`);

--
-- فهارس للجدول `children`
--
ALTER TABLE `children`
  ADD PRIMARY KEY (`child_id`),
  ADD KEY `fk_children_parents` (`parent_id`);

--
-- فهارس للجدول `child_achievements`
--
ALTER TABLE `child_achievements`
  ADD PRIMARY KEY (`child_achievement_id`),
  ADD UNIQUE KEY `uq_child_achievement` (`child_id`,`achievement_id`),
  ADD KEY `fk_child_achievements_achievement` (`achievement_id`);

--
-- فهارس للجدول `child_lesson_progress`
--
ALTER TABLE `child_lesson_progress`
  ADD PRIMARY KEY (`lesson_progress_id`),
  ADD UNIQUE KEY `uq_child_lesson_unit` (`child_id`,`subject_code`,`lesson_code`,`unit_key`);

--
-- فهارس للجدول `child_progress`
--
ALTER TABLE `child_progress`
  ADD PRIMARY KEY (`progress_id`),
  ADD UNIQUE KEY `uq_child_progress` (`child_id`);

--
-- فهارس للجدول `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`parent_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `achievements`
--
ALTER TABLE `achievements`
  MODIFY `achievement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `children`
--
ALTER TABLE `children`
  MODIFY `child_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `child_achievements`
--
ALTER TABLE `child_achievements`
  MODIFY `child_achievement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `child_lesson_progress`
--
ALTER TABLE `child_lesson_progress`
  MODIFY `lesson_progress_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `child_progress`
--
ALTER TABLE `child_progress`
  MODIFY `progress_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `parents`
--
ALTER TABLE `parents`
  MODIFY `parent_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- القيود المفروضة على الجداول الملقاة
--

--
-- قيود الجداول `children`
--
ALTER TABLE `children`
  ADD CONSTRAINT `fk_children_parents` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`parent_id`) ON DELETE CASCADE;

--
-- قيود الجداول `child_achievements`
--
ALTER TABLE `child_achievements`
  ADD CONSTRAINT `fk_child_achievements_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`achievement_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_child_achievements_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`child_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- قيود الجداول `child_lesson_progress`
--
ALTER TABLE `child_lesson_progress`
  ADD CONSTRAINT `fk_lesson_progress_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`child_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- قيود الجداول `child_progress`
--
ALTER TABLE `child_progress`
  ADD CONSTRAINT `fk_progress_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`child_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
