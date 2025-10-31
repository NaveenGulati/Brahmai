-- Drop all existing tables to start fresh
-- Run this with: mysql -u user -p database < drop_all_tables.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Drop old tables
DROP TABLE IF EXISTS `aiExplanationCache`;
DROP TABLE IF EXISTS `activityLog`;
DROP TABLE IF EXISTS `userAchievements`;
DROP TABLE IF EXISTS `achievements`;
DROP TABLE IF EXISTS `challenges`;
DROP TABLE IF EXISTS `quizResponses`;
DROP TABLE IF EXISTS `quizSessions`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `users`;

-- Drop any other tables that might exist
DROP TABLE IF EXISTS `parentProfiles`;
DROP TABLE IF EXISTS `childProfiles`;
DROP TABLE IF EXISTS `teacherProfiles`;
DROP TABLE IF EXISTS `gradeHistory`;
DROP TABLE IF EXISTS `teacherStudentAssignments`;
DROP TABLE IF EXISTS `studentGroups`;
DROP TABLE IF EXISTS `studentGroupMembers`;
DROP TABLE IF EXISTS `boards`;
DROP TABLE IF EXISTS `grades`;
DROP TABLE IF EXISTS `boardGradeSubjects`;
DROP TABLE IF EXISTS `questionReports`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `qbAdminAssignments`;
DROP TABLE IF EXISTS `auditLog`;
DROP TABLE IF EXISTS `platformSettings`;

SET FOREIGN_KEY_CHECKS = 1;

