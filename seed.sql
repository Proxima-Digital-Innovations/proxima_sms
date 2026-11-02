-- Proxima SMS Initial Seed Data
SET FOREIGN_KEY_CHECKS=0;

INSERT INTO `SystemProfile` (`id`, `name`, `primaryColor`, `secondaryColor`, `licenseStatus`, `createdAt`, `updatedAt`) VALUES ('default-system-profile', 'Proxima Academy', '#1e40af', '#10b981', 'ACTIVE', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Proxima Academy';

INSERT INTO `User` (`id`, `firstName`, `lastName`, `email`, `passwordHash`, `isSuperAdmin`, `role`, `status`, `createdAt`, `updatedAt`) VALUES ('usr-admin-01', 'System', 'Admin', 'admin@proximahub.com', '$argon2id$v=19$m=65536,t=3,p=4$FhENcW3TcU55NVBCjdWHiQ$VqQuMIREpdBmFCPrr7N5NN3y00LKtggdsZ1m2VItqKg', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE `isSuperAdmin`=1;
INSERT INTO `User` (`id`, `firstName`, `lastName`, `email`, `passwordHash`, `isSuperAdmin`, `role`, `status`, `createdAt`, `updatedAt`) VALUES ('usr-abdulhamid-01', 'Abdulhamid', 'Amin', 'abdulhamidamin@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$FhENcW3TcU55NVBCjdWHiQ$VqQuMIREpdBmFCPrr7N5NN3y00LKtggdsZ1m2VItqKg', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE `isSuperAdmin`=1;

INSERT INTO `Department` (`id`, `name`, `createdAt`, `updatedAt`) VALUES ('dept-science', 'Science', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Science';
INSERT INTO `Department` (`id`, `name`, `createdAt`, `updatedAt`) VALUES ('dept-arts', 'Arts', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Arts';

INSERT INTO `AcademicSession` (`id`, `name`, `startDate`, `endDate`, `isActive`, `createdAt`, `updatedAt`) VALUES ('sess-2024-2025', '2024/2025', '2024-09-01 00:00:00', '2025-07-31 00:00:00', 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `isActive`=1;

INSERT INTO `Term` (`id`, `name`, `sessionId`, `startDate`, `endDate`, `isActive`, `createdAt`, `updatedAt`) VALUES ('term-1', 'Term 1', 'sess-2024-2025', '2024-09-01 00:00:00', '2024-12-20 00:00:00', 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `isActive`=1;

INSERT INTO `Class` (`id`, `name`, `termId`, `createdAt`, `updatedAt`) VALUES ('cls-grade-10', 'Grade 10', 'term-1', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Grade 10';

DELETE FROM `SystemLicense`;
INSERT INTO `SystemLicense` (`id`, `licenseKey`, `schoolName`, `tier`, `billingFrequency`, `discountPercent`, `expiresAt`, `maxStudents`, `status`, `lastValidatedAt`, `createdAt`, `updatedAt`) VALUES ('lic-proxima-ent', 'eyJzY2hvb2xOYW1lIjoiUHJveGltYSBJbnRlcm5hdGlvbmFsIEFjYWRlbXkiLCJtYXhTdHVkZW50cyI6MzAwMCwidGllciI6IkVOVEVSUFJJU0UiLCJiaWxsaW5nRnJlcXVlbmN5IjoiUEVSX1NFU1NJT04iLCJkaXNjb3VudFBlcmNlbnQiOjEwLCJleHBpcmVzQXQiOiIyMDI3LTExLTAyVDE0OjUyOjE4Ljk0M1oiLCJpc3N1ZWRBdCI6IjIwMjYtMTEtMDJUMTQ6NTI6MTguOTQ5WiJ9.qUNAXKE/wwLLiPPhzSdTaztOAbq0zBU8LGfSpZgTPh0W2/1PjBBFypo6B6S4qnSyi4kMAhmp9FlF6jqqonoPBHJ86WiC6nxP5nxY737yvcVYbE8EYSdW0dswIVkQkNvy/ODZAs/40F+Gw6//WsGi9sPid/wBBDCYEQHYsCsJ3ksfG1sayCSieSTssndJJdF0zrovurnOFahOqWiU0QpqiAKo2c9OPKeR6ijyZDEWmFPC37maRtSoy+pom5/IpcXcxIgLNFxPeiWZpt0xju0/BIsS94kARYFo70ZqA/lGxZEKM9iv+dzbLnLV7qjTDGGlTQUcgEiM9TnMFfc4AywF8g==', 'Proxima International Academy', 'ENTERPRISE', 'PER_SESSION', 10, '2027-11-02 14:52:18', 3000, 'ACTIVE', NOW(), NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;
