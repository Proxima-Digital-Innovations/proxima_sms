# proxima ERP ↔ Kiosk Communication Protocol

> **Purpose**: Complete reference for rebuilding the kiosk agent in C#.  
> Every endpoint, header, payload, response, and flow is documented below.

---

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐
│   KIOSK APP (C#)    │ ◄─────► │  LOCAL AGENT/BRIDGE  │
│   (Electron/WPF)    │  HTTP   │  http://127.0.0.1:5000│
│   Frontend UI       │ polling │  Python (old) / C#    │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                    HTTP calls over LAN/WAN
                                           │
                                ┌──────────▼───────────┐
                                │    ERP SERVER         │
                                │  http://192.168.1.13  │
                                │  :8000 (Laravel PHP)  │
                                └──────────────────────┘
```

### Key Concepts

1. **The Agent** is a local HTTP server on `127.0.0.1:5000`. It bridges the UI and the ERP.
2. **The Frontend** (Electron/WPF) polls the agent via `GET /status` and `GET /capture`.
3. **The Agent** polls the ERP server via `GET /api/v1/kiosk/heartbeat` and `GET /api/v1/kiosk/staff`.
4. **Terminal ID (`TID`)**: A unique hardware identifier string (e.g. `KB-A1B2C3D4`). Generated from MAC address on first boot. Sent as `X-Terminal-ID` header on ALL requests to ERP.
5. **Activation**: A terminal must be activated by an admin before it can scan. Until activated, the UI shows a blocker page.

---

## SECTION 1: AGENT → ERP SERVER (Outbound Calls)

These are the HTTP calls the kiosk agent makes TO the ERP server.  
**Base URL**: Configurable. Default: `http://192.168.1.13:8000`  
**All requests include header**: `X-Terminal-ID: <terminal_id_string>`

---

### 1.1 Heartbeat (Connection Check + Activation Status)

The agent calls this every **30 seconds** (or every **10 seconds** if offline).

```
GET {ERP_URL}/api/v1/kiosk/heartbeat
Headers:
  X-Terminal-ID: KB-A1B2C3D4
```

**Response 200**:
```json
{
  "success": true,
  "status": "ACTIVE",
  "branch_name": "Kano Branch",
  "time": "14:30:00"
}
```

**Agent behavior based on `status`**:
| Status | Agent Action |
|--------|-------------|
| `ACTIVE` | Sets `is_activated = true`, enables scanning |
| `PENDING` | Sets `is_activated = false`, shows activation blocker |
| `MAINTENANCE` | Sets `is_maintenance = true`, shows maintenance screen |
| `UNKNOWN` | Terminal not recognized, shows activation blocker |

**Auto-Registration**: If the ERP doesn't recognize the terminal ID, it automatically creates a new `kiosks` record with `is_active = false`. The admin then sees it in the management page and can activate it.

---

### 1.2 Staff Sync (Download Employee Gallery)

Called every **30 seconds** (only when `is_activated == true`).

```
GET {ERP_URL}/api/v1/kiosk/staff
Headers:
  X-Terminal-ID: KB-A1B2C3D4
```

**Response 200**:
```json
{
  "success": true,
  "branch": "Kano Branch",
  "data": [
    {
      "id": 42,
      "name": "John Doe",
      "personnel_number": "EMP-001",
      "photo_url": "https://erp.example.com/storage/passports/john.jpg",
      "template": "BASE64_ENCODED_FINGERPRINT_TEMPLATE_STRING...",
      "is_enrolled": true,
      "kiosk_pin": "$2y$12$HASHED_PIN...",
      "shift_start": "08:00:00",
      "shift_end": "17:00:00",
      "grace_period": 15
    }
  ]
}
```

**Important notes**:
- `template` is a **base64-encoded** fingerprint FMD (Feature Minutiae Data)
- If `template` is `null` or empty, the user has not enrolled yet
- The agent stores this data in a local SQLite DB for offline operation
- Staff are **branch-filtered** — only staff assigned to the kiosk's branch are returned

---

### 1.3 Verify (Clock-In/Clock-Out after Fingerprint Match)

Called when a fingerprint is matched locally against the gallery.

```
POST {ERP_URL}/api/v1/kiosk/verify
Headers:
  Content-Type: application/json
  X-Terminal-ID: KB-A1B2C3D4
Body:
{
  "staff_id": 42
}
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "name": "John Doe",
  "type": "Clock-In",
  "time": "08:15:00",
  "photo_url": "https://erp.example.com/storage/passports/john.jpg",
  "message": "Welcome! You clocked in on time.",
  "staff_id": 42
}
```

**Response 200 (Denied — Branch Restriction)**:
```json
{
  "success": false,
  "message": "Branch Restriction: You are assigned to [Lagos] but this terminal is for [Kano]."
}
```

**Response 200 (Denied — Not Activated)**:
```json
{
  "success": false,
  "message": "Terminal Not Activated. Please contact HR."
}
```

**Auto Clock-In/Out Logic (ERP side)**:
- No open attendance today → **Clock-In**
- Open record exists AND (>60 min OR near scheduled clock-out) → **Clock-Out**  
- Open record exists AND <60 min → **"Already Clocked-In"** (double-tap prevention)

**Offline behavior**: If ERP unreachable, agent saves log to local SQLite:
```sql
INSERT INTO attendance_logs (staff_id, time, type) VALUES (42, '2026-05-14 08:15:00', 'Clock-In')
```

---

### 1.4 PIN Verify (Fallback when Scanner Fails)

```
POST {ERP_URL}/api/kiosk/verify-pin
Headers:
  Content-Type: application/json
  X-Terminal-ID: KB-A1B2C3D4
Body:
{
  "personnel_number": "EMP-001",
  "pin": "1234"
}
```

**Response (Success)** — same shape as `/verify`:
```json
{
  "success": true,
  "name": "John Doe",
  "type": "Clock-In",
  "photo_url": "...",
  "message": "Welcome!",
  "staff_id": 42
}
```

**Response (Failure)**:
```json
{ "success": false, "message": "Invalid Employee ID or PIN." }
```

---

### 1.5 Enroll (Save Fingerprint Template to ERP)

Called after the 4-scan enrollment completes locally.

```
POST {ERP_URL}/api/v1/kiosk/enroll
Headers:
  Content-Type: application/json
  X-Terminal-ID: KB-A1B2C3D4
Body:
{
  "staff_id": 42,
  "template": "BASE64_ENCODED_FINGERPRINT_TEMPLATE...",
  "pin": "1234"
}
```

**Response 200**: `{"success": true}`

ERP stores template in `users.biometric_template` and `staff_fingerprints.fingerprint_template`. If `pin` provided, bcrypt-hashed into `users.kiosk_pin`.

---

### 1.6 Sync Offline Attendance Logs

Called every 30s sync cycle when buffered logs exist.

```
POST {ERP_URL}/api/v1/kiosk/sync-attendance
Headers:
  Content-Type: application/json
  X-Terminal-ID: KB-A1B2C3D4
Body:
{
  "logs": [
    {"id": 1, "staff_id": 42, "time": "2026-05-14 08:15:00", "type": "Clock-In"},
    {"id": 2, "staff_id": 43, "time": "2026-05-14 08:20:00", "type": "Clock-In"}
  ]
}
```

**Response 200**: `{"success": true, "synced": 2}`

After success, agent **deletes** all synced logs from local SQLite.

---

### 1.7 Activate (Code-Based Activation)

```
POST {ERP_URL}/api/kiosk/activate
Headers:
  Content-Type: application/json
Body:
{
  "activation_code": "ABC123",
  "device_name": "Kiosk Terminal",
  "terminal_id": "KB-A1B2C3D4"
}
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "message": "Terminal activated successfully.",
  "kiosk_id": 5,
  "branch_id": 1,
  "branch_name": "Kano Branch",
  "token": "3|abc123def456..."
}
```

Agent saves `token` to config. Activation codes are 6-char alphanumeric, valid 30 minutes, single-use.

---

## SECTION 2: FRONTEND → AGENT (Local Polling)

HTTP calls the UI makes to the local agent at `http://127.0.0.1:5000`.

---

### 2.1 GET /status — Agent + Scanner Health (polled every 3s)

```json
{
  "status": "ONLINE",
  "connection": "LAN",
  "active_endpoint": "http://192.168.1.13:8000",
  "terminal_id": "KB-A1B2C3D4",
  "is_activated": true,
  "erp_url": "http://192.168.1.13:8000",
  "branch_name": "Kano Branch",
  "scanner_connected": true
}
```

---

### 2.2 GET /capture — Latest Scan Result (polled every 1s)

**Waiting**: `{"status": "WAITING", "timestamp": 1715680000}`

**Match**:
```json
{
  "status": "MATCHED",
  "staff_id": 42,
  "name": "John Doe",
  "photo_url": "...",
  "personnel_number": "EMP-001",
  "department": "Engineering",
  "type": "Clock-In",
  "timestamp": 1715680100,
  "offline": false,
  "message": "Welcome! You clocked in on time."
}
```

**No match**: `{"status": "NO_MATCH", "timestamp": 1715680200}`

**Denied**: `{"status": "DENIED", "name": "John Doe", "message": "Action too frequent. Please wait 280s.", "timestamp": 1715680300}`

---

### 2.3 GET /staff — Local Staff List

```json
{
  "success": true,
  "data": [
    {
      "id": 42, "name": "John Doe", "photo_url": "...",
      "is_enrolled": true, "personnel_number": "EMP-001",
      "shift_start": "08:00:00", "shift_end": "17:00:00", "grace_period": 15
    }
  ]
}
```

---

### 2.4 POST /set_mode

```json
Body: {"mode": "attendance"}   // "attendance" | "kiosk" (enrollment)
Response: {"ok": true, "mode": "attendance"}
```

---

### 2.5 POST /enroll — Start Enrollment

```json
Body: {"staff_id": 42, "pin": "1234"}
Response: {"ok": true, "msg": "Enrollment started"}
```

Poll `GET /enroll_status`:
```json
{"status": "SCANNING", "stage": 2}   // stages 1-4
{"status": "COMPLETE", "stage": 4}
{"status": "FAILED", "stage": 0}
{"status": "IDLE", "stage": 0}
```

Reset: `GET /enroll_reset` → `{"ok": true}`

---

### 2.6 POST /verify-pin — PIN Auth (proxied to ERP)

```json
Body: {"personnel_number": "EMP-001", "pin": "1234"}
```

---

### 2.7 GET /reinit — Force Scanner Reset

```json
Response: {"ok": true, "msg": "Scanner reset requested."}
```

---

### 2.8 GET /scanner_status — Diagnostics

```json
{"connected": true, "needs_reinit": false, "backend": "DigitalPersona"}
```

---

## SECTION 3: ACTIVATION BLOCKER FLOW

```
STEP 1: FIRST BOOT
  → Agent generates Terminal ID from MAC: KB-A1B2C3D4
  → Agent sends GET /heartbeat to ERP
  → ERP auto-registers terminal (is_active=false)
  → ERP returns: {"status": "PENDING"}
  → UI shows ACTIVATION BLOCKER:
      "Terminal Registration"
      "HWID: KB-A1B2C3D4"
      "Waiting for administrator activation..." [spinner]
      [Settings button for ERP URL config]

STEP 2: ADMIN ACTIVATES (from ERP Dashboard)
  → Admin opens ERP → HR → Kiosk Management
  → Sees KB-A1B2C3D4 as "Pending"
  → Assigns branch + clicks "Activate"
  → ERP sets: kiosks.is_active = true, kiosks.branch_id = X

STEP 3: NEXT HEARTBEAT (within 30 seconds)
  → Agent heartbeat returns {"status": "ACTIVE"}
  → Agent sets is_activated = true
  → Frontend polls /status → sees is_activated = true
  → BLOCKER DISAPPEARS → Main UI loads
  → Staff sync + capture loop begins

STEP 4: OPERATIONAL
  → Staff gallery downloaded (branch-filtered)
  → Scanner captures + matches fingerprints
  → Matches → POST /verify → UI shows result
```

**The blocker CANNOT be bypassed.** It checks `if (!config.is_activated)`. The only way past it is for ERP heartbeat to return `"status": "ACTIVE"`.

---

## SECTION 4: BACKGROUND THREADS

| Thread | Purpose | Interval |
|--------|---------|----------|
| **Sync** | Heartbeat + Staff sync + Offline log upload | 30s (online) / 10s (offline) |
| **Capture** | Scanner: capture → identify → verify | Continuous (0.5s gap) |
| **HTTP Server** | Local API on port 5000 | Always running |

### Capture Loop Pseudocode:
```
while true:
    if not activated: sleep(5); continue
    if not scanner_initialized: try_init(); sleep(10); continue
    if mode != "attendance": sleep(1); continue
    
    gallery = load_templates_from_sqlite()  // WHERE tpl IS NOT NULL AND length(tpl) > 100
    if empty(gallery): sleep(5); continue
    
    matched = scanner.identify(gallery)  // blocks until finger or 15s timeout
    
    if matched:
        if cooldown_active(staff_id, 300s): show_denied(); continue
        set_cooldown(staff_id)
        try:
            result = POST /verify to ERP with staff_id
            if result.success: show_match(name, type, photo)
            else: show_denied(message)
        except offline:
            save_to_sqlite(staff_id, time, "Clock-In")
            show_match(name, type, offline=true)
    else:
        show_no_match()
    sleep(0.5)
```

---

## SECTION 5: COOLDOWN & OFFLINE

- **Cooldown**: 300s (5 min) per staff member after successful match. In-memory only.
- **Offline**: Logs saved to SQLite `attendance_logs`. Synced via `POST /sync-attendance` when ERP reconnects. Deleted after successful sync.

---

## SECTION 6: LOCAL DATABASE SCHEMA (SQLite)

```sql
CREATE TABLE staff (
    id INTEGER PRIMARY KEY,
    name TEXT,
    photo TEXT,
    tpl TEXT,                -- base64 fingerprint template
    personnel_number TEXT,
    shift_start TEXT,        -- "08:00:00"
    shift_end TEXT,          -- "17:00:00"
    grace_period INTEGER     -- minutes (default 15)
);

CREATE TABLE attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER,
    time TEXT,               -- "2026-05-14 08:15:00"
    type TEXT                -- "Clock-In" or "Clock-Out"
);
```

---

## SECTION 7: CONFIG FILE

`%APPDATA%/Proxima-Kiosk/kiosk_config.json`

```json
{
    "ERP_ENDPOINTS": ["http://192.168.1.13:8000"],
    "TERMINAL_ID": "KB-A1B2C3D4",
    "ACCESS_TOKEN": "3|abc123...",
    "IS_ACTIVATED": true,
    "PORT": 5000,
    "COOLDOWN_SECONDS": 300
}
```

---

## SECTION 8: ERP DATABASE TABLES

### `kiosks`
| Column | Type | Description |
|--------|------|-------------|
| terminal_id | string | Unique HWID |
| name | string | Display name |
| branch_id | int FK | Assigned branch |
| ip_address | string | Last known IP |
| is_active | boolean | Can scan |
| maintenance_mode | boolean | Shows maintenance screen |
| last_seen_at | datetime | Updated per heartbeat |
| operating_mode | string | "auto" / "in" / "out" |

### `kiosk_activations`
| Column | Type | Description |
|--------|------|-------------|
| code | string(6) | e.g. ABC123 |
| branch_id | int FK | Branch to assign |
| expires_at | datetime | 30-min validity |
| is_used | boolean | Single-use |

### `users` (relevant columns)
| Column | Description |
|--------|-------------|
| biometric_template | base64 FMD |
| is_biometric_enrolled | boolean |
| kiosk_pin | bcrypt hash |
| branch_id | For branch-lock |
| personnel_number | Employee ID |

---

## SECTION 9: COMPLETE URL REFERENCE

### Agent → ERP
| Method | URL | When |
|--------|-----|------|
| GET | `/api/v1/kiosk/heartbeat` | Every 30s |
| GET | `/api/v1/kiosk/staff` | Every 30s (activated) |
| POST | `/api/v1/kiosk/verify` | On match |
| POST | `/api/v1/kiosk/enroll` | After enrollment |
| POST | `/api/v1/kiosk/sync-attendance` | Offline logs exist |
| POST | `/api/kiosk/activate` | Activation code |
| POST | `/api/kiosk/verify-pin` | PIN auth |

### Frontend → Agent
| Method | URL | When |
|--------|-----|------|
| GET | `/status` | Every 3s |
| GET | `/capture` | Every 1s |
| GET | `/staff` | Every 10s (enrollment) |
| GET | `/enroll_status` | During enrollment |
| GET | `/enroll_reset` | Cancel enrollment |
| GET | `/reinit` | Manual reset |
| GET | `/scanner_status` | Diagnostics |
| POST | `/set_mode` | Mode switch |
| POST | `/enroll` | Start enrollment |
| POST | `/verify-pin` | PIN proxy |

---

*Proxima Digital Innovations — proxima ERP Biometric Access System*
