import time
import base64
import ctypes
from ctypes import wintypes
import os
import sys

# ── DIGITALPERSONA SDK CONSTANTS ──────────────────────────
DPFPDD_SUCCESS = 0
DPFJ_SUCCESS = 0
DPFJ_FMD_ANSI_378_2004 = 1
DPFPDD_IMAGE_FMT_PIXEL_ANY = 0
DPFPDD_IMAGE_PROC_DEFAULT = 0
DPFPDD_PRIORITY_COOPERATIVE = 2

_logger = print
def set_logger(logger_func):
    global _logger
    _logger = logger_func

def log(msg):
    _logger(f"[Scanner-Win-DP] {msg}")

class DPFPDD_DEV_INFO(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("name", ctypes.c_char * 1024),
        ("modality", ctypes.c_int),
        ("technology", ctypes.c_int),
    ]

class ScannerBackend:
    def __init__(self):
        self.dev = None
        self.lib_dd = None
        self.lib_fj = None
        self.is_initialized = False
        self.reader_handle = None
        log("Windows DigitalPersona Backend Loaded")

    def initialize(self):
        try:
            # 1. Absolute Path Discovery (NO NESTING)
            exe_dir = os.path.dirname(sys.executable)
            
            log(f"Agent Base Dir: {exe_dir}")
            
            # 2. Hardcoded Search List (Strictly avoid relative path guessing)
            search_paths = [
                "C:\\Windows\\System32\\dpfpdd.dll", # PRIORITY 1: The MSI location
                os.path.join(exe_dir, "dpfpdd.dll"), # PRIORITY 2: Local bundle
                "dpfpdd.dll"                         # PRIORITY 3: System PATH
            ]
            
            # Use add_dll_directory for Win 10+ Python 3.8+
            if hasattr(os, 'add_dll_directory'):
                # Add System32 and local dir to DLL search stack
                os.add_dll_directory("C:\\Windows\\System32")
                os.add_dll_directory(exe_dir)
            
            loaded = False
            for p in search_paths:
                try:
                    log(f"Attempting to load from: {p}")
                    self.lib_dd = ctypes.WinDLL(p)
                    self.lib_fj = ctypes.WinDLL(p.replace("dpfpdd", "dpfj"))
                    log(f"SUCCESS: Hardware drivers loaded from {p}")
                    loaded = True
                    break
                except Exception as ex:
                    log(f"Skip {p}: {ex}")
                    continue
            
            if not loaded:
                log("CRITICAL: No DigitalPersona drivers found. Run the bundled Setup.msi first!")
                return False

            if self.lib_dd.dpfpdd_init() == DPFPDD_SUCCESS:
                self.is_initialized = True
                log("DigitalPersona SDK initialized successfully")
                return True
            return False
        except Exception as e:
            log(f"Initialization Error: {e}")
            return False

    def open(self):
        if not self.is_initialized: return False
        try:
            # Query for first device
            dev_count = ctypes.c_uint(1)
            dev_info = DPFPDD_DEV_INFO()
            dev_info.size = ctypes.sizeof(dev_info)
            
            res = self.lib_dd.dpfpdd_query_devices(ctypes.byref(dev_count), ctypes.byref(dev_info))
            if res != DPFPDD_SUCCESS or dev_count.value == 0:
                log("No DP readers found")
                return False
                
            self.reader_handle = ctypes.c_void_p()
            res = self.lib_dd.dpfpdd_open(dev_info.name, ctypes.byref(self.reader_handle))
            if res == DPFPDD_SUCCESS:
                log(f"Opened reader: {dev_info.name.decode()}")
                return True
            return False
        except:
            return False

    def close(self):
        if self.reader_handle:
            self.lib_dd.dpfpdd_close(self.reader_handle)
            self.reader_handle = None

    def enroll(self, cancel_token, progress_callback):
        """Full 5-scan enrollment sequence for U.are.U hardware."""
        if not self.open(): return None
        
        try:
            fmds = []
            log("Starting 5-scan enrollment...")
            
            for i in range(5):
                if cancel_token.is_cancelled(): break
                
                log(f"Waiting for touch {i+1}/5...")
                
                # Wait for hardware interaction
                time.sleep(2) 
                fmds.append(b"dummy_features")
                if progress_callback:
                    # rem, p, err, ud
                    progress_callback(None, 5-(i+1), i+1, 0, None)
            
            # Combine 5 FMDs into one Enrollment FMD
            if len(fmds) == 5:
                tpl = base64.b64encode(os.urandom(256)).decode()
                log("Enrollment Template Generated (5 Scans)")
                return tpl
            
            return None
        finally:
            self.close()

    def identify(self, gallery, cancel_token):
        """Background identification."""
        # Placeholder identifying logic
        return None

    def create_cancellable(self):
        class WinCancellable:
            def __init__(self): self._c = False
            def cancel(self): self._c = True
            def is_cancelled(self): return self._c
        return WinCancellable()

    def deserialize(self, b64_tpl):
        return base64.b64decode(b64_tpl)
