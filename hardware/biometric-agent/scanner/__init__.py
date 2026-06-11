import platform

# Detect OS
current_os = platform.system()

if current_os == "Windows":
    from .backend_windows import ScannerBackend, set_logger
else:
    try:
        from .backend_linux import ScannerBackend, set_logger
    except ImportError:
        # Fallback for environments without libfprint installed
        from .backend_windows import ScannerBackend, set_logger

def get_backend():
    return ScannerBackend()
