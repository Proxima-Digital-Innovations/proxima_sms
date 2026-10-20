using System;
using System.Collections.Generic;
using System.IO;
using System.Data;
using System.Data.SQLite;

namespace KioskNative
{
    public class StaffRecord
    {
        public string id { get; set; }
        public string name { get; set; }
        public string template_b64 { get; set; }
        public string personnel_number { get; set; }
        public string role { get; set; }
        public string department { get; set; }
        public string photo_url { get; set; }
        public string working_days { get; set; }
        public string shift_start { get; set; }
        public string shift_end { get; set; }
        public int grace_period { get; set; }
    }

    public class AttendanceRecord
    {
        public string staff_id { get; set; }
        public string time { get; set; }
        public bool synced { get; set; }
        public string type { get; set; }
    }

    public class PendingEnrollment
    {
        public string staff_id { get; set; }
        public string template_b64 { get; set; }
        public string pin { get; set; }
    }

    public class LocalDb
    {
        private string _dbPath;
        private string _connectionString;

        public LocalDb()
        {
            try {
                _dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk", "kiosk.db");
                _connectionString = string.Format("Data Source={0};Version=3;Journal Mode=WAL;BusyTimeout=5000;", _dbPath);
                InitializeDatabase();
            } catch (Exception ex) {
                // Last resort logging
                try {
                    string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk");
                    File.AppendAllText(Path.Combine(dir, "kiosk_debug.log"), "[FATAL DB INIT] " + ex.ToString() + "\n");
                } catch { }
            }
        }

        private void InitializeDatabase()
        {
            string dir = Path.GetDirectoryName(_dbPath);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

            if (!File.Exists(_dbPath))
            {
                SQLiteConnection.CreateFile(_dbPath);
            }

            using (var conn = new SQLiteConnection(_connectionString))
            {
                conn.Open();
                string sql = @"
                    CREATE TABLE IF NOT EXISTS staff (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        template_b64 TEXT,
                        personnel_number TEXT,
                        role TEXT,
                        department TEXT,
                        photo_url TEXT,
                        working_days TEXT,
                        shift_start TEXT,
                        shift_end TEXT,
                        grace_period INTEGER
                    );
                    CREATE TABLE IF NOT EXISTS attendance_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        staff_id TEXT,
                        time TEXT,
                        type TEXT,
                        synced INTEGER DEFAULT 0
                    );
                    CREATE TABLE IF NOT EXISTS pending_enrollments (
                        staff_id TEXT PRIMARY KEY,
                        template_b64 TEXT,
                        pin TEXT
                    );";
                using (var cmd = new SQLiteCommand(sql, conn))
                {
                    cmd.ExecuteNonQuery();
                }

                // Migrations: Add missing columns if they don't exist
                string[] newCols = { "role", "department", "photo_url", "working_days", "shift_start", "shift_end", "grace_period" };
                foreach (var col in newCols)
                {
                    try
                    {
                        string typeStr = (col == "grace_period") ? "INTEGER" : "TEXT";
                        using (var cmd = new SQLiteCommand(string.Format("ALTER TABLE staff ADD COLUMN {0} {1}", col, typeStr), conn))
                        {
                            cmd.ExecuteNonQuery();
                        }
                    }
                    catch { /* Column already exists */ }
                }
            }
        }

        public List<StaffRecord> LoadStaff()
        {
            var list = new List<StaffRecord>();
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "SELECT * FROM staff";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new StaffRecord
                                {
                                    id = reader["id"].ToString(),
                                    name = reader["name"].ToString(),
                                    template_b64 = reader["template_b64"].ToString(),
                                    personnel_number = reader["personnel_number"].ToString(),
                                    role = GetSafeString(reader, "role"),
                                    department = GetSafeString(reader, "department"),
                                    photo_url = GetSafeString(reader, "photo_url"),
                                    working_days = GetSafeString(reader, "working_days"),
                                    shift_start = GetSafeString(reader, "shift_start"),
                                    shift_end = GetSafeString(reader, "shift_end"),
                                    grace_period = GetSafeInt(reader, "grace_period")
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log("LoadStaff Error: " + ex.Message);
            }
            Log("LoadStaff: Loaded " + list.Count + " records");
            return list;
        }

        private int GetSafeInt(SQLiteDataReader reader, string colName)
        {
            try {
                int index = reader.GetOrdinal(colName);
                if (reader.IsDBNull(index)) return 0;
                return Convert.ToInt32(reader[colName]);
            } catch { return 0; }
        }

        private string GetSafeString(SQLiteDataReader reader, string colName)
        {
            try {
                int index = reader.GetOrdinal(colName);
                if (reader.IsDBNull(index)) return "";
                return reader.GetString(index);
            } catch { return ""; }
        }

        private void Log(string msg)
        {
            try {
                string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.AppendAllText(Path.Combine(dir, "kiosk_debug.log"), "[DB] " + msg + "\n");
            } catch { }
        }

        public void SaveStaff(List<StaffRecord> staff)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    using (var trans = conn.BeginTransaction())
                    {
                        using (var delCmd = new SQLiteCommand("DELETE FROM staff", conn))
                        {
                            delCmd.ExecuteNonQuery();
                        }

                        foreach (var s in staff)
                        {
                            string sql = "INSERT INTO staff (id, name, template_b64, personnel_number, role, department, photo_url, working_days, shift_start, shift_end, grace_period) VALUES (@id, @name, @tpl, @pno, @role, @dept, @photo, @wdays, @sstart, @send, @gperiod)";
                            using (var cmd = new SQLiteCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@id", s.id);
                                cmd.Parameters.AddWithValue("@name", s.name);
                                cmd.Parameters.AddWithValue("@tpl", s.template_b64);
                                cmd.Parameters.AddWithValue("@pno", s.personnel_number);
                                cmd.Parameters.AddWithValue("@role", s.role);
                                cmd.Parameters.AddWithValue("@dept", s.department);
                                cmd.Parameters.AddWithValue("@photo", s.photo_url);
                                cmd.Parameters.AddWithValue("@wdays", s.working_days);
                                cmd.Parameters.AddWithValue("@sstart", s.shift_start);
                                cmd.Parameters.AddWithValue("@send", s.shift_end);
                                cmd.Parameters.AddWithValue("@gperiod", s.grace_period);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        trans.Commit();
                    }
                }
            }
            catch { }
        }

        public void UpdateStaffTemplate(string id, string templateB64)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "UPDATE staff SET template_b64 = @tpl WHERE id = @id";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@tpl", templateB64);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch { }
        }

        public List<AttendanceRecord> LoadPendingAttendance()
        {
            var list = new List<AttendanceRecord>();
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "SELECT * FROM attendance_logs WHERE synced = 0";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new AttendanceRecord
                                {
                                    staff_id = reader["staff_id"].ToString(),
                                    time = reader["time"].ToString(),
                                    type = reader["type"].ToString(),
                                    synced = false
                                });
                            }
                        }
                    }
                }
            }
            catch { }
            return list;
        }

        public bool HasCheckedInToday(string staffId)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string todayStart = DateTime.Now.ToString("yyyy-MM-dd 00:00:00", System.Globalization.CultureInfo.InvariantCulture);
                    string todayEnd = DateTime.Now.ToString("yyyy-MM-dd 23:59:59", System.Globalization.CultureInfo.InvariantCulture);
                    string sql = "SELECT COUNT(*) FROM attendance_logs WHERE staff_id = @sid AND time >= @start AND time <= @end";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        cmd.Parameters.AddWithValue("@start", todayStart);
                        cmd.Parameters.AddWithValue("@end", todayEnd);
                        int count = Convert.ToInt32(cmd.ExecuteScalar());
                        Log(string.Format("HasCheckedInToday: staffId={0}, start={1}, end={2}, count={3}", staffId, todayStart, todayEnd, count));
                        return count > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("HasCheckedInToday Error: " + ex.Message + "\n" + ex.StackTrace);
                return false;
            }
        }

        public bool HasCheckedOutToday(string staffId)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string todayStart = DateTime.Now.ToString("yyyy-MM-dd 00:00:00", System.Globalization.CultureInfo.InvariantCulture);
                    string todayEnd = DateTime.Now.ToString("yyyy-MM-dd 23:59:59", System.Globalization.CultureInfo.InvariantCulture);
                    string sql = "SELECT COUNT(*) FROM attendance_logs WHERE staff_id = @sid AND time >= @start AND time <= @end AND type = 'Clock-Out'";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        cmd.Parameters.AddWithValue("@start", todayStart);
                        cmd.Parameters.AddWithValue("@end", todayEnd);
                        int count = Convert.ToInt32(cmd.ExecuteScalar());
                        Log(string.Format("HasCheckedOutToday: staffId={0}, count={1}", staffId, count));
                        return count > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("HasCheckedOutToday Error: " + ex.Message + "\n" + ex.StackTrace);
                return false;
            }
        }

        public void AddAttendance(string staffId, string type = "Clock-In")
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "INSERT INTO attendance_logs (staff_id, time, type, synced) VALUES (@sid, @time, @type, 0)";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        cmd.Parameters.AddWithValue("@time", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture));
                        cmd.Parameters.AddWithValue("@type", type);
                        cmd.ExecuteNonQuery();
                        Log(string.Format("AddAttendance: staffId={0}, type={1}", staffId, type));
                    }
                }
            }
            catch (Exception ex)
            {
                Log("AddAttendance Error: " + ex.Message);
            }
        }

        public void MarkAsSynced(List<AttendanceRecord> records)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    using (var trans = conn.BeginTransaction())
                    {
                        foreach (var r in records)
                        {
                            string sql = "UPDATE attendance_logs SET synced = 1 WHERE staff_id = @sid AND time = @time";
                            using (var cmd = new SQLiteCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@sid", r.staff_id);
                                cmd.Parameters.AddWithValue("@time", r.time);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        trans.Commit();
                    }
                }
            }
            catch { }
        }

        public void QueuePendingEnrollment(string staffId, string templateB64, string pin)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "INSERT OR REPLACE INTO pending_enrollments (staff_id, template_b64, pin) VALUES (@sid, @tpl, @pin)";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        cmd.Parameters.AddWithValue("@tpl", templateB64);
                        cmd.Parameters.AddWithValue("@pin", pin ?? "");
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex) { Log("QueuePendingEnrollment Error: " + ex.Message); }
        }

        public List<PendingEnrollment> LoadPendingEnrollments()
        {
            var list = new List<PendingEnrollment>();
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "SELECT * FROM pending_enrollments";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new PendingEnrollment
                                {
                                    staff_id = reader["staff_id"].ToString(),
                                    template_b64 = reader["template_b64"].ToString(),
                                    pin = reader["pin"].ToString()
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex) { Log("LoadPendingEnrollments Error: " + ex.Message); }
            return list;
        }

        public void RemovePendingEnrollment(string staffId)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "DELETE FROM pending_enrollments WHERE staff_id = @sid";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch { }
        }

        public bool IsEnrollmentPending(string staffId)
        {
            try
            {
                using (var conn = new SQLiteConnection(_connectionString))
                {
                    conn.Open();
                    string sql = "SELECT COUNT(*) FROM pending_enrollments WHERE staff_id = @sid";
                    using (var cmd = new SQLiteCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@sid", staffId);
                        return Convert.ToInt32(cmd.ExecuteScalar()) > 0;
                    }
                }
            }
            catch { return false; }
        }
    }
}
