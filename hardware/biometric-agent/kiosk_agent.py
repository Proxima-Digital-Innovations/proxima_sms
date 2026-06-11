#!/usr/bin/env python3
"""School OS Hub — Biometric Bridge (DP 4500 / libfprint)"""

import http.server, json, sqlite3, urllib.request, threading, time, base64, os, ctypes, binascii
import sys
# Add current directory to path to ensure modules like 'scanner' are found
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Add 'libs' folder if it exists (for bundled libraries)
libs_dir = os.path.join(os.path.dirname(current_dir), 'bin', 'libs_win')
if os.path.exists(libs_dir) and libs_dir not in sys.path:
    sys.path.insert(0, libs_dir)

import scanner
scanner.set_logger(lambda m: print(f"[Agent-Scanner] {m}"))


# Global cooldowns to prevent double-tap (5 minutes)
COOLDOWNS = {} # {staff_id: last_action_time}

import socket
import threading
import sys
import subprocess
import requests # Added missing dependency

def cleanup_port(port):
    """Forcefully kill any process holding the port."""
    try:
        # Linux specific cleanup
        cmd = f"fuser -k {port}/tcp"
        subprocess.run(cmd, shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1)
        print(f"[*] Port {port} cleaned and ready.")
    except Exception as e:
        print(f"[!] Cleanup error: {e}")

# ── CONFIG LOAD ──────────────────────────────────────────
# On Windows, default to %APPDATA%/albabello-kiosk/ which is always writable.
# On Linux, default to the current directory (usually the project root).
# CLI args (--db, --config) from Electron override these defaults.
if sys.platform == 'win32':
    # Safe writable directory on Windows — never inside "Program Files"
    _appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
    _safe_dir = os.path.join(_appdata, 'schoolos-kiosk')
    os.makedirs(_safe_dir, exist_ok=True)
    CONFIG_FILE = os.path.join(_safe_dir, "kiosk_config.json")
    DB_PATH = os.path.join(_safe_dir, "kiosk_buffer.db")
else:
    CONFIG_FILE = "kiosk_config.json"
    DB_PATH = "kiosk_buffer.db"

# Handle CLI arguments for path redirection (Electron integration)
# These override the defaults above when Electron passes explicit paths
for i, arg in enumerate(sys.argv):
    if arg == "--config" and i + 1 < len(sys.argv):
        CONFIG_FILE = os.path.abspath(sys.argv[i+1])
    if arg == "--db" and i + 1 < len(sys.argv):
        DB_PATH = os.path.abspath(sys.argv[i+1])

# Ensure parent directories exist for both files
for p in [CONFIG_FILE, DB_PATH]:
    d = os.path.dirname(p)
    if d and not os.path.exists(d):
        try:
            os.makedirs(d, exist_ok=True)
        except Exception as e:
            print(f"[Agent] WARNING: Could not create directory {d}: {e}")

print(f"[Agent] Config Path: {CONFIG_FILE}")
print(f"[Agent] Database Path: {DB_PATH}")

def save_config(conf):
    with open(CONFIG_FILE, "w") as f:
        json.dump(conf, f, indent=4)

def load_config():
    default = {
        "ERP_ENDPOINTS": ["http://localhost:3000"],
        "TERMINAL_ID": "KB-" + binascii.hexlify(os.urandom(4)).decode().upper(),
        "ACCESS_TOKEN": None,
        "IS_ACTIVATED": False,
        "PORT": 5000,
        "COOLDOWN_SECONDS": 300,
    }
    
    conf = default
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                loaded = json.load(f)
                
                # Handle alignment between Frontend (ERP_URLS) and Agent (ERP_ENDPOINTS)
                if "ERP_URLS" in loaded:
                    loaded["ERP_ENDPOINTS"] = loaded["ERP_URLS"]
                
                # Legacy migration
                if "ERP_URL" in loaded and "ERP_ENDPOINTS" not in loaded:
                    loaded["ERP_ENDPOINTS"] = [loaded["ERP_URL"]]
                    
                conf = {**default, **loaded}
        except:
            pass
    return conf

CONF = load_config()
TID  = CONF["TERMINAL_ID"]
TOKEN = CONF["ACCESS_TOKEN"]
is_activated = CONF["IS_ACTIVATED"]

if TID == "KB-DEFAULT":
    # Force generate a unique ID if it's the default
    import uuid
    mac = uuid.getnode()
    TID = f"KB-{hex(mac)[2:].upper()}"
    CONF["TERMINAL_ID"] = TID
    save_config(CONF)
    print(f"[*] Generated new unique HWID: {TID}")

PORT = CONF["PORT"]
DB   = DB_PATH
COOLDOWN_SECONDS = CONF["COOLDOWN_SECONDS"]

latest_capture = {"status": "WAITING"}
enroll_state   = {"status": "IDLE", "stage": 0}
kiosk_mode     = "attendance"  # 'attendance' or 'enrollment'
cancel_token   = None
is_activated   = CONF.get("IS_ACTIVATED", False)
is_maintenance = False
active_branch  = "UNREGISTERED"

def get_activation_state():
    """Check if the terminal is activated."""
    global is_activated
    return is_activated

def log(m): print(f"[{time.strftime('%H:%M:%S')}] {m}")

# ── CONNECTION MANAGER ────────────────────────────────────
class ConnectionManager:
    def __init__(self, endpoints):
        self.endpoints = endpoints if isinstance(endpoints, list) else [endpoints]
        self.active_endpoint = self.endpoints[0]
        self.status = "OFFLINE" 
        self.last_refresh = 0

    def get_url(self, path=""):
        return f"{self.active_endpoint.rstrip('/')}/{path.lstrip('/')}"

    def refresh_active_endpoint(self, force=False):
        """Aggressively test endpoints to recover from offline state quickly."""
        now = time.time()
        # If offline, check every 5 seconds. If online, check every 30 seconds.
        interval = 5 if self.status == "OFFLINE" else 30
        
        if not force and (now - self.last_refresh < interval):
            return self.status != "OFFLINE"

        self.last_refresh = now
        for url in self.endpoints:
            try:
                # Fast probe (3s timeout)
                path = "api/v1/kiosk/heartbeat"
                rq = urllib.request.Request(f"{url.rstrip('/')}/{path}")
                rq.add_header("X-Terminal-ID", TID)
                
                with urllib.request.urlopen(rq, timeout=3) as res:
                    # We accept 200 (Active) or 404 (New/Unregistered) as "Reachable"
                    if res.status in [200, 404]:
                        self.active_endpoint = url
                        is_lan = any(x in url for x in ["localhost", "127.0.0.1", "192.168.", "10."])
                        self.status = "LAN" if is_lan else "WAN"
                        return True
            except Exception as e:
                continue
        
        self.status = "OFFLINE"
        return False

conn = ConnectionManager(CONF.get("ERP_ENDPOINTS", []))

# ── DB ────────────────────────────────────────────────────
def init_db():
    c = sqlite3.connect(DB); c.execute(
        "CREATE TABLE IF NOT EXISTS staff"
        "(id INTEGER PRIMARY KEY, name TEXT, photo TEXT, tpl TEXT, personnel_number TEXT, shift_start TEXT, shift_end TEXT, grace_period INTEGER)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS attendance_logs"
        "(id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, time TEXT, type TEXT)"
    )
    c.commit(); c.close()

def sync():
    log("[Sync] Multi-path bridge loop starting...")
    while True:
        try:
            init_db()
            
            # Refresh connection status
            was_offline = (conn.status == "OFFLINE")
            connected = conn.refresh_active_endpoint(force=True)
            
            if connected:
                if was_offline:
                    log(f"[Bridge] Connection RESTORED via {conn.status} ({conn.active_endpoint})")
                
                # 1. Sync Offline Attendance Logs
                try:
                    if TOKEN:
                        c = sqlite3.connect(DB, timeout=10)
                        logs = c.execute("SELECT id, staff_id, time, type FROM attendance_logs").fetchall()
                        if logs:
                            payload = {"logs": [{"id": l[0], "staff_id": l[1], "time": l[2], "type": l[3]} for l in logs]}
                            r = urllib.request.Request(conn.get_url("api/v1/kiosk/sync-attendance"), 
                                                     data=json.dumps(payload).encode(), method="POST")
                            r.add_header("Content-Type", "application/json")
                            r.add_header("X-Terminal-ID", TID)
                            with urllib.request.urlopen(r, timeout=10) as res:
                                sd = json.loads(res.read())
                                if sd.get("success"):
                                    c.execute("DELETE FROM attendance_logs")
                                    c.commit()
                                    log(f"[Sync] {len(logs)} offline logs uploaded")
                        c.close()
                except Exception as e:
                    log(f"[Sync] Attendance upload failed: {e}")

                # 2. Heartbeat & Activation
                global is_activated, is_maintenance, active_branch
                try:
                    rq = urllib.request.Request(conn.get_url("api/v1/kiosk/heartbeat"))
                    rq.add_header("X-Terminal-ID", TID)

                    with urllib.request.urlopen(rq, timeout=10) as res:
                        ad = json.loads(res.read())
                        is_activated = (ad.get("status") == "ACTIVE")
                        is_maintenance = (ad.get("status") == "MAINTENANCE")
                        active_branch = ad.get("branch_name", "UNREGISTERED")
                except Exception as e:
                    log(f"[Sync] Heartbeat failed: {e}")

                # 3. Staff Sync
                if is_activated and not is_maintenance:
                    try:
                        r = urllib.request.Request(conn.get_url("api/v1/kiosk/staff"))
                        r.add_header("X-Terminal-ID", TID)
                        with urllib.request.urlopen(r, timeout=10) as res:
                            d = json.loads(res.read())
                        if d.get("success"):
                            c = sqlite3.connect(DB, timeout=10)
                            local_templates = {row[0]: row[1] for row in c.execute("SELECT id, tpl FROM staff WHERE length(tpl) > 100").fetchall()}
                            c.execute("DELETE FROM staff")
                            for s in d["data"]:
                                # Migration: keep local template if server template is empty
                                tpl = s.get("template") or local_templates.get(s["id"])
                                shift = s.get("shift", {})
                                c.execute("INSERT INTO staff VALUES(?,?,?,?,?,?,?,?)",
                                    (s["id"], s["name"],
                                     s.get("photo_url",""), tpl, s.get("personnel_number", ""),
                                     shift.get("start", "08:00:00"), shift.get("end", "17:00:00"),
                                     shift.get("grace", 15)))
                            c.commit(); c.close()
                            log(f"[Sync] Profiles updated — {len(d['data'])} staff")
                    except Exception as e:
                        log(f"[Sync] Staff update failed: {e}")
            else:
                log("[Bridge] All paths unreachable. Operating in OFFLINE mode.")
                
        except Exception as e:
            log(f"[Sync] Global loop error: {e}")
        
        time.sleep(30 if conn.status != "OFFLINE" else 10)


# ── SCANNER ───────────────────────────────────────────────
class HW:
    def __init__(self):
        self.backend = scanner.get_backend()
        self.needs_reinit = False
        log("HW Manager Initialized (Multi-Backend Mode)")

    def _initialize_hardware(self):
        return self.backend.initialize()

    def _open(self):
        return self.backend.open()

    def _close(self):
        self.backend.close()

    def _reinit(self):
        self.backend.reinit()
        self.needs_reinit = self.backend.needs_reinit

    # ── /enroll: 4-sample loop ────────────────────────────
    def enroll_worker(self):
        global enroll_state, cancel_token
        enroll_state = {"status":"SCANNING","stage":0,"message":"Preparing scanner..."}
        log("Enrollment requested — interrupting capture loop")
        if cancel_token and hasattr(cancel_token, 'is_cancelled') and not cancel_token.is_cancelled():
            cancel_token.cancel()
        time.sleep(2)

        scan_count = [0]
        def prog(dev, rem, p, err, ud):
            global enroll_state
            if not err:
                scan_count[0] += 1
                enroll_state = {"status":"SCANNING","stage":scan_count[0],
                                "message":f"Scan {scan_count[0]}/5 captured"}
                log(f"Enroll stage {scan_count[0]}/5 (remaining={rem})")
        
        cancel_token = self.backend.create_cancellable()
        try:
            b64 = self.backend.enroll(cancel_token, prog)
            if b64:
                enroll_state = {"status":"SUCCESS","stage":5,"template":b64}
                log("Enroll SUCCESS")
                return b64
            enroll_state = {"status":"FAILED","stage":0,"message":"Serialize failed"}
        except Exception as e:
            m = str(e)
            log(f"Enroll err: {m}")
            if "overheating" in m.lower():
                log("Enrollment Aborted: Device Overheating. Entering cooldown...")
                self.needs_reinit = True 
            enroll_state = {"status":"FAILED","stage":scan_count[0],"message":f"Enrollment Failed: {m}"}
        finally:
            self._close()
        return None

    # ── /capture: continuous 1:N identify ─────────────────
    def capture_loop(self):
        global latest_capture, enroll_state, cancel_token
        while True: # Outer safety loop
            try:
                self._capture_worker()
            except Exception as e:
                log(f"CRITICAL THREAD ERROR: {e}")
                time.sleep(5)

    def _capture_worker(self):
        global latest_capture, enroll_state, cancel_token
        log("Capture loop started")
        while True:
            if not get_activation_state():
                time.sleep(5); continue

            if self.needs_reinit:
                self._reinit()
                continue

            if not self.backend.initialize():
                time.sleep(10); continue

            if kiosk_mode != "attendance":
                time.sleep(1); continue

            try:
                c = sqlite3.connect(DB, timeout=10)
                rows = c.execute(
                    "SELECT id,name,photo,tpl FROM staff "
                    "WHERE tpl IS NOT NULL AND length(tpl)>100"
                ).fetchall(); c.close()
            except: time.sleep(3); continue

            if not rows: time.sleep(5); continue

            gallery, smap = [], {}
            for r in rows:
                try:
                    p = self.backend.deserialize(r[3])
                    if p:
                        gallery.append(p)
                        smap[p] = {"id":r[0],"name":r[1],"photo":r[2]}
                except: continue
            if not gallery: time.sleep(5); continue

            try:
                # Only set WAITING if the previous result is old ( > 5s)
                if latest_capture.get("status") != "WAITING":
                    if time.time() - latest_capture.get("timestamp", 0) > 5:
                        latest_capture = {"status":"WAITING", "timestamp": time.time()}
                
                log("Waiting for finger...")
                cancel_token = self.backend.create_cancellable()
                matched = self.backend.identify(gallery, cancel_token)


                if matched and matched in smap:
                    s = smap[matched]
                    
                    # ── COOLDOWN CHECK ──
                    sid = s["id"]
                    now_ts = time.time()
                    if sid in COOLDOWNS:
                        elapsed = now_ts - COOLDOWNS[sid]
                        if elapsed < COOLDOWN_SECONDS:
                            rem = int(COOLDOWN_SECONDS - elapsed)
                            latest_capture = {
                                "status": "DENIED",
                                "name": s["name"],
                                "message": f"Action too frequent. Please wait {rem}s.",
                                "timestamp": now_ts
                            }
                            log(f"COOLDOWN → {s['name']} (blocked for {rem}s)")
                            time.sleep(3)
                            continue
                    
                    COOLDOWNS[sid] = now_ts

                    att_type = "Clock-In"; offline = False
                    try:
                        rq = urllib.request.Request(conn.get_url("api/v1/kiosk/verify"),
                            data=json.dumps({"staff_id":s["id"]}).encode(), method="POST")
                        rq.add_header("Content-Type","application/json")
                        rq.add_header("X-Terminal-ID", TID)
                        with urllib.request.urlopen(rq, timeout=5) as res:
                            vd = json.loads(res.read())
                            if vd.get("success"):
                                att_type = vd.get("type", "Clock-In")
                                s["message"] = vd.get("message", "Clock-in successful")
                                s["name"] = vd.get("name", s["name"])
                                s["photo"] = vd.get("photo_url", s["photo"])
                                s["personnel_number"] = vd.get("personnel_number", "")
                                s["department"] = vd.get("department", "")
                                
                                latest_capture = {
                                    "status":"MATCHED","staff_id":s["id"],
                                    "name":s["name"],"photo_url":s["photo"],
                                    "personnel_number": s.get("personnel_number", ""),
                                    "department": s.get("department", ""),
                                    "type":att_type,"timestamp":time.time(),
                                    "offline": False, "message": s["message"]
                                }
                                log(f"MATCH → {s['name']} ({att_type})")
                            else:
                                # REJECTED BY ERP (Branch Mismatch, etc)
                                latest_capture = {
                                    "status":"DENIED",
                                    "name":vd.get("name", s["name"]),
                                    "message": vd.get("message", "Unauthorized Terminal"),
                                    "timestamp":time.time()
                                }
                                log(f"DENIED → {s['name']}: {latest_capture['message']}")
                    except Exception as e:
                        log(f"Offline Mode — Buffered log locally (Error: {e})")
                        try:
                            c = sqlite3.connect(DB, timeout=5)
                            c.execute("INSERT INTO attendance_logs (staff_id, time, type) VALUES (?,?,?)",
                                      (s["id"], time.strftime("%Y-%m-%d %H:%M:%S"), att_type))
                            c.commit(); c.close()
                        except: pass

                        latest_capture = {
                            "status":"MATCHED","staff_id":s["id"],
                            "name":s["name"],"photo_url":s["photo"],
                            "personnel_number": s.get("personnel_number", ""),
                            "department": s.get("department", ""),
                            "type":att_type,"timestamp":time.time(),
                            "offline": True, "message": "Offline: Saved Locally"
                        }
                        log(f"OFFLINE MATCH → {s['name']} ({att_type})")
                    time.sleep(3)
                else:
                    latest_capture = {"status":"NO_MATCH","timestamp":time.time()}
                    log("No match found in local gallery")
            except Exception as e:
                m = str(e)
                if "cancelled" in m.lower(): continue
                log(f"Scan err: {m}")
                
                # Handle Overheating specifically
                if "overheating" in m.lower():
                    log("HARDWARE ALERT: Device overheating. Forced cooldown...")
                    try: self._close()
                    except: pass
                    time.sleep(15)
                    try: self._reinit()
                    except: pass
                    continue

                try:
                    self._reinit() # Attempt recovery
                except Exception as re:
                    log(f"Recovery failed: {re}. Retrying in 5s...")
                    time.sleep(5)
            finally:
                try: self._close()
                except: pass
            time.sleep(0.5)

hw = HW()

# ── HTTP ──────────────────────────────────────────────────
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def _h(self):
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
    def _j(self,o,c=200):
        self.send_response(c);self._h()
        self.send_header("Content-Type","application/json");self.end_headers()
        self.wfile.write(json.dumps(o).encode())
    def do_OPTIONS(self):
        self.send_response(200);self._h();self.end_headers()

    def do_GET(self):
        global enroll_state, latest_capture
        p = self.path
        if p in ("/","/index.html"):
            try:
                with open("kiosk_ui.html","rb") as f:
                    self.send_response(200)
                    self.send_header("Content-Type","text/html");self.end_headers()
                    self.wfile.write(f.read())
            except: self.send_error(404)
            return
        if p == "/status":
            self._j({
                "status": "MAINTENANCE" if is_maintenance else "ONLINE",
                "connection": conn.status,
                "active_endpoint": conn.active_endpoint,
                "terminal_id": TID,
                "is_activated": is_activated,
                "erp_url": conn.active_endpoint,
                "branch_name": active_branch
            })
        elif p == "/capture":     self._j(latest_capture)
        elif p == "/enroll_status": self._j(enroll_state)
        elif p == "/enroll_reset":
            enroll_state = {"status":"IDLE","stage":0}; self._j({"ok":True})
        elif p == "/reinit":
            hw.needs_reinit = True
            if cancel_token:
                log("Cancelling active operations for re-init...")
                cancel_token.cancel()
            self._j({"ok":True,"msg":"Scanner reset requested. Will re-init in background."})
        elif p == "/staff":
            try:
                c = sqlite3.connect(DB)
                # Fetch shift data too
                res = c.execute("SELECT id, name, photo, tpl, personnel_number, shift_start, shift_end, grace_period FROM staff").fetchall()
                data = []
                for r in res:
                    data.append({
                        "id": r[0], "name": r[1], "photo_url": r[2], 
                        "is_enrolled": bool(r[3] and len(r[3]) > 100),
                        "personnel_number": r[4],
                        "shift_start": r[5], "shift_end": r[6], "grace_period": r[7]
                    })
                c.close()
                self._j({"success":True, "data":data})
            except Exception as e:
                self._j({"success":False, "message":str(e)}, 500)
        else: self._j({"err":"404"},404)

    def do_POST(self):
        global enroll_state, kiosk_mode, latest_capture
        n = int(self.headers.get("Content-Length",0))
        b = json.loads(self.rfile.read(n)) if n else {}

        if self.path == "/set_mode":
            new_mode = b.get("mode", "attendance")
            old_mode = kiosk_mode
            kiosk_mode = new_mode
            log(f"Mode: {old_mode} → {new_mode}")
            self._j({"ok": True, "mode": kiosk_mode})

        elif self.path == "/activate":
            code = b.get("code")
            name = b.get("device_name", "Kiosk Terminal")
            if not code: return self._j({"success":False, "message":"Missing code"}, 400)
            
            try:
                payload = {"activation_code": code, "device_name": name, "terminal_id": TID}
                rq = urllib.request.Request(conn.get_url("api/v1/kiosk/activate"), 
                    data=json.dumps(payload).encode(), method="POST")
                rq.add_header("Content-Type", "application/json")
                with urllib.request.urlopen(rq, timeout=15) as res:
                    data = json.loads(res.read())
                    if data.get("success"):
                        global TOKEN, is_activated, active_branch
                        TOKEN = data.get("token")
                        is_activated = True
                        active_branch = data.get("branch_name")
                        
                        # Persist to config
                        CONF["ACCESS_TOKEN"] = TOKEN
                        CONF["IS_ACTIVATED"] = True
                        save_config(CONF)
                        log(f"Terminal Activated: {active_branch}")
                        self._j(data)
                    else:
                        self._j(data, 400)
            except Exception as e:
                self._j({"success":False, "message": str(e)}, 500)

        elif self.path == "/verify-pin":
            pn = b.get("personnel_number")
            pin = b.get("pin")
            if not pn or not pin: return self._j({"success":False, "message":"Missing data"}, 400)
            log(f"PIN VERIFY → {pn}")
            try:
                # In School OS, we send this to the unified verify endpoint
                rq = urllib.request.Request(conn.get_url("api/v1/kiosk/verify-pin"),
                    data=json.dumps({"personnel_number": pn, "pin": pin}).encode(), method="POST")
                rq.add_header("Content-Type","application/json")
                if TOKEN: rq.add_header("Authorization", f"Bearer {TOKEN}")
                else: rq.add_header("X-Terminal-ID", TID)
                with urllib.request.urlopen(rq, timeout=10) as res:
                    vd = json.loads(res.read())
                    if vd.get("success"):
                        sid = vd.get("staff_id")
                        if sid: COOLDOWNS[sid] = 0 # Manual override clears cooldown
                        
                        latest_capture = {
                            "status":"MATCHED","staff_id":vd.get("staff_id"),
                            "name":vd.get("name"),"photo_url":vd.get("photo_url"),
                            "personnel_number": pn, "type": vd.get("type"),
                            "timestamp":time.time(), "offline": False, "message": vd.get("message")
                        }
                        self._j(vd)
                    else:
                        self._j(vd)
            except Exception as e:
                self._j({"success":False, "message": f"Server error: {e}"}, 500)

        elif self.path == "/enroll":
            sid = b.get("staff_id")
            pin = b.get("pin")
            if not sid: self._j({"ok":False},400); return
            def run():
                tpl = hw.enroll_worker()
                if tpl:
                    try:
                        payload = {"staff_id":sid,"template":tpl}
                        if pin: payload["pin"] = pin
                        rq = urllib.request.Request(conn.get_url("api/v1/kiosk/enroll"),
                            data=json.dumps(payload).encode(),
                            method="POST")
                        rq.add_header("Content-Type","application/json")
                        rq.add_header("X-Terminal-ID", TID)
                        urllib.request.urlopen(rq,timeout=10)
                        log(f"Template + PIN saved → staff {sid}")
                    except Exception as e: log(f"Save err: {e}")
            threading.Thread(target=run, daemon=True).start()
            self._j({"ok":True,"msg":"Enrollment started"})
        else: self._j({"err":"404"},404)

if __name__ == "__main__":
    cleanup_port(PORT)
    init_db()
    threading.Thread(target=sync, daemon=True).start()
    threading.Thread(target=hw.capture_loop, daemon=True).start()
    log(f"Bridge :{PORT}")
    while True:
        try:
            http.server.HTTPServer(("127.0.0.1",PORT),H).serve_forever()
        except Exception as e:
            log(f"API Server Error: {e}. Restarting...")
            time.sleep(2)
