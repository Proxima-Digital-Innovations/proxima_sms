@echo off
echo ===================================================
echo   Proxima Kiosk - One Click Build ^& Package
echo ===================================================
echo.

:: 1. Clean up
if exist publish rd /s /q publish
if exist dist rd /s /q dist
mkdir publish
mkdir dist

:: 2. Build the C# Project
echo [1/3] Compiling C# Project...
dotnet publish KioskNative.csproj -c Release -o publish --self-contained false
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed! Please ensure .NET SDK is installed.
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Copy extra libs and native SQLite folders
echo [2/3] Finalizing assets...
xcopy /y /e /i bin\Release\net48\x86 publish\x86
xcopy /y /e /i bin\Release\net48\x64 publish\x64
xcopy /y libs\* publish\

:: 4. Build the Installer (Inno Setup)
echo [3/3] Generating Installer (Setup.exe)...
:: Check if Inno Setup is in Path, otherwise check default location
set "ISCC=iscc.exe"
where %ISCC% >nul 2>nul
if %ERRORLEVEL% EQU 0 goto iscc_found
set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
:iscc_found

if not exist "%ISCC%" goto no_iscc
"%ISCC%" installer.iss
echo.
echo SUCCESS: Installer created in .\dist\ folder.
goto iscc_done

:no_iscc
echo.
echo WARNING: Inno Setup (ISCC.exe) not found.
echo Application compiled in .\publish\ folder.
echo Please install Inno Setup to generate the Setup.exe.

:iscc_done

echo.
echo All Done!
pause
