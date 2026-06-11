import gi
gi.require_version('FPrint', '2.0')
from gi.repository import FPrint, Gio
import base64
import time
import gc

# Simple logging proxy (to be set by the main agent)
_logger = print

def set_logger(logger_func):
    global _logger
    _logger = logger_func

def log(msg):
    _logger(f"[Scanner-Linux] {msg}")

class ScannerBackend:
    def __init__(self):
        self.ctx = None
        self.dev = None
        self.needs_reinit = False

    def initialize(self):
        if self.ctx: return True
        try:
            log("Attempting Hardware Initialization...")
            self.ctx = FPrint.Context()
            devs = self.ctx.get_devices()
            if devs:
                self.dev = devs[0]
                log(f"HW: {self.dev.get_name()}")
                return True
            log("HW: NONE FOUND")
            return False
        except Exception as e:
            log(f"HW Init Error: {e}")
            return False

    def open(self):
        if not self.dev: return False
        try:
            self.dev.open_sync()
            return True
        except:
            return False

    def close(self):
        if not self.dev: return
        try:
            self.dev.close_sync()
        except:
            pass

    def reinit(self):
        log("Performing AGGRESSIVE re-initialization...")
        try:
            self.close()
            self.dev = None
            self.ctx = None
            gc.collect()
            time.sleep(2)
            
            self.ctx = FPrint.Context()
            devs = self.ctx.get_devices()
            if devs:
                self.dev = devs[0]
                log(f"Scanner RECOVERED: {self.dev.get_name()}")
            else:
                log("RECOVERY FAILED: No devices found.")
        except Exception as e:
            log(f"Re-init critical failure: {e}")
        self.needs_reinit = False

    def enroll(self, cancel_token, progress_callback):
        if not self.open():
            return None
        
        tpl = FPrint.Print.new(self.dev)
        try:
            res = self.dev.enroll_sync(tpl, cancel_token, progress_callback, None)
            raw = res.serialize()
            blob = None
            if isinstance(raw, tuple):
                for i in raw:
                    if isinstance(i, (bytes, bytearray)): blob = i; break
            elif isinstance(raw, (bytes, bytearray)): blob = raw
            
            if blob:
                return base64.b64encode(blob).decode()
        except Exception as e:
            log(f"Enroll err: {e}")
            if "overheating" in str(e).lower():
                self.needs_reinit = True
            raise e
        finally:
            self.close()
        return None

    def identify(self, gallery, cancel_token):
        if not self.open():
            return None
        try:
            result = self.dev.identify_sync(gallery, cancel_token, None, None)
            if isinstance(result, tuple):
                return result[0]
            return result
        except Exception as e:
            log(f"Identify err: {e}")
            if "overheating" in str(e).lower():
                self.needs_reinit = True
            raise e
        finally:
            self.close()

    def deserialize(self, b64_tpl):
        try:
            return FPrint.Print.deserialize(base64.b64decode(b64_tpl))
        except:
            return None

    def create_cancellable(self):
        return Gio.Cancellable.new()
