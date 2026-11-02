-- Proxima SMS Initial Seed Data
SET FOREIGN_KEY_CHECKS=0;

INSERT INTO `SystemProfile` (`id`, `name`, `primaryColor`, `secondaryColor`, `licenseStatus`, `createdAt`, `updatedAt`) VALUES ('default-system-profile', 'Proxima Academy', '#1e40af', '#10b981', 'ACTIVE', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Proxima Academy';

INSERT INTO `User` (`id`, `firstName`, `lastName`, `email`, `passwordHash`, `isSuperAdmin`, `role`, `status`, `createdAt`, `updatedAt`) VALUES ('usr-admin-01', 'System', 'Admin', 'admin@proximahub.com', '$argon2id$v=19$m=65536,t=3,p=4$EXztyAYaQYvSlkMo1BzC/A$cPSgboZJQ5t1Dsv58YUeRlmKEYEv7x+5ZuRNbWKasm8', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE `isSuperAdmin`=1;
INSERT INTO `User` (`id`, `firstName`, `lastName`, `email`, `passwordHash`, `isSuperAdmin`, `role`, `status`, `createdAt`, `updatedAt`) VALUES ('usr-abdulhamid-01', 'Abdulhamid', 'Amin', 'abdulhamidamin@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$EXztyAYaQYvSlkMo1BzC/A$cPSgboZJQ5t1Dsv58YUeRlmKEYEv7x+5ZuRNbWKasm8', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE `isSuperAdmin`=1;

INSERT INTO `Department` (`id`, `name`, `createdAt`) VALUES ('dept-science', 'Science', NOW()) ON DUPLICATE KEY UPDATE `name`='Science';
INSERT INTO `Department` (`id`, `name`, `createdAt`) VALUES ('dept-arts', 'Arts', NOW()) ON DUPLICATE KEY UPDATE `name`='Arts';

INSERT INTO `AcademicSession` (`id`, `name`, `startDate`, `endDate`, `isActive`, `createdAt`) VALUES ('sess-2024-2025', '2024/2025', '2024-09-01 00:00:00', '2025-07-31 00:00:00', 1, NOW()) ON DUPLICATE KEY UPDATE `isActive`=1;

INSERT INTO `Term` (`id`, `name`, `sessionId`, `startDate`, `endDate`, `isActive`) VALUES ('term-1', 'Term 1', 'sess-2024-2025', '2024-09-01 00:00:00', '2024-12-20 00:00:00', 1) ON DUPLICATE KEY UPDATE `isActive`=1;

INSERT INTO `Class` (`id`, `name`, `termId`, `createdAt`) VALUES ('cls-grade-10', 'Grade 10', 'term-1', NOW()) ON DUPLICATE KEY UPDATE `name`='Grade 10';

DELETE FROM `SystemLicense`;
INSERT INTO `SystemLicense` (`id`, `licenseKey`, `schoolName`, `tier`, `billingFrequency`, `discountPercent`, `expiresAt`, `maxStudents`, `status`, `lastValidatedAt`, `createdAt`, `updatedAt`) VALUES ('lic-proxima-ent', 'eyJzY2hvb2xOYW1lIjoiUHJveGltYSBJbnRlcm5hdGlvbmFsIEFjYWRlbXkiLCJtYXhTdHVkZW50cyI6MzAwMCwidGllciI6IkVOVEVSUFJJU0UiLCJiaWxsaW5nRnJlcXVlbmN5IjoiUEVSX1NFU1NJT04iLCJkaXNjb3VudFBlcmNlbnQiOjEwLCJleHBpcmVzQXQiOiIyMDI3LTExLTAyVDE2OjQ5OjA1LjM4MFoiLCJpc3N1ZWRBdCI6IjIwMjYtMTEtMDJUMTY6NDk6MDUuMzg3WiJ9.syDpEKJXi+KBnUnzzEnG6Ci5JlHwPV0TH+SFJfSR3170D8Pypuw0ZlIw0sPIYgWRzs8WyzXipiush0pvq4piMIWSIPS8D7vZxfteKcVGfM91vSMXdH+vYuU2+z/CFzNOuoU4K1k5mCJAeJwQMqbVALhF53yczJL360116WKfnvPe6QtUPPbt6TOGmz1SVoeQDxNLIdnc/O6qCRd9zMipZN2ZQz1NJWwArFwEJSTGlkfQDV2av3M3ch/ie59ntK45CoWKRSSkb4zvgZDYQMBwISHo1yhSzoQj7e8HZ/bIsIVWoGZWNRXHjJkub9I5vqgx73Lq9wmoShOVjQ3VXq6kew==', 'Proxima International Academy', 'ENTERPRISE', 'PER_SESSION', 10, '2027-11-02 16:49:05', 3000, 'ACTIVE', NOW(), NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;
