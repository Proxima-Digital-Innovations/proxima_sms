const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('=== STARTING AUTOMATED MYSQL DATABASE BACKUP ===');
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `sms_db_backup_${timestamp}.sql`);
  const stream = fs.createWriteStream(backupFile, { flags: 'a', encoding: 'utf8' });

  stream.write(`-- ========================================================\n`);
  stream.write(`-- PROXIMA SMS / TIMS DATABASE BACKUP\n`);
  stream.write(`-- Timestamp: ${now.toISOString()}\n`);
  stream.write(`-- Target Database: sms_db\n`);
  stream.write(`-- ========================================================\n\n`);
  stream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

  try {
    // 1. Get all tables in sms_db
    const tables = await prisma.$queryRawUnsafe(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sms_db' AND TABLE_TYPE = 'BASE TABLE'"
    );

    console.log(`Discovered ${tables.length} tables in sms_db.`);

    for (const row of tables) {
      const tableName = row.TABLE_NAME || row.table_name;
      console.log(`Backing up table: ${tableName}`);

      // Get Create Table DDL
      const ddlResult = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = ddlResult[0]['Create Table'] || ddlResult[0]['create table'];

      stream.write(`-- --------------------------------------------------------\n`);
      stream.write(`-- Table structure for: ${tableName}\n`);
      stream.write(`-- --------------------------------------------------------\n`);
      stream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
      stream.write(`${createTableSql};\n\n`);

      // Export Rows
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        stream.write(`-- Dumping data for: ${tableName} (${rows.length} rows)\n`);
        for (const dataRow of rows) {
          const cols = Object.keys(dataRow).map((k) => `\`${k}\``).join(', ');
          const vals = Object.values(dataRow)
            .map((v) => {
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number' || typeof v === 'boolean') return v;
              if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            })
            .join(', ');

          stream.write(`INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals});\n`);
        }
        stream.write(`\n`);
      }
    }

    stream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
    stream.write(`-- ========================================================\n`);
    stream.write(`-- BACKUP COMPLETED: ${new Date().toISOString()}\n`);
    stream.write(`-- ========================================================\n`);
    stream.end();

    const stats = fs.statSync(backupFile);
    console.log(`\nBackup successfully written: ${backupFile} (${(stats.size / 1024).toFixed(1)} KB)`);

    // Prune backups older than 30 days
    const files = fs.readdirSync(backupDir);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const f of files) {
      if (f.endsWith('.sql')) {
        const filePath = path.join(backupDir, f);
        const fileStat = fs.statSync(filePath);
        if (fileStat.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`Pruned archived backup: ${f}`);
        }
      }
    }

    console.log('=== DATABASE BACKUP RUN FINISHED WITH ZERO ERRORS ===');
  } catch (err) {
    console.error('Database backup failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
