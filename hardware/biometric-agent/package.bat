@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Proxima Kiosk - Native Build ^& Package Script
echo ===================================================
echo.

set "DIST_DIR=publish"
if exist "%DIST_DIR%" rd /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

echo [1/4] Dependencies verified.

echo [2/4] Compiling Native C# Application...
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" (
    echo ERROR: C# Compiler not found!
    exit /b 1
)

"%CSC%" /target:winexe /out:"%DIST_DIR%\ProximaKiosk.exe" /win32icon:kiosk.ico /platform:x86 /lib:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF\ /r:System.dll,System.Data.dll,System.Xml.dll,System.Xaml.dll,WindowsBase.dll,PresentationCore.dll,PresentationFramework.dll,System.Web.Extensions.dll,System.Core.dll,"libs\DPFPShrNET.dll","libs\DPFPDevNET.dll","libs\DPFPEngNET.dll","libs\DPFPVerNET.dll","libs\System.Data.SQLite.dll" App.xaml.cs MainWindow.xaml.cs Config.cs ApiClient.cs LocalDb.cs AgentServer.cs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Compilation failed!
    exit /b %ERRORLEVEL%
)

echo [3/4] Copying Runtime Assets and Libraries...
copy /Y "libs\DPFPShrNET.dll" "%DIST_DIR%\" >nul
copy /Y "libs\DPFPDevNET.dll" "%DIST_DIR%\" >nul
copy /Y "libs\DPFPEngNET.dll" "%DIST_DIR%\" >nul
copy /Y "libs\DPFPVerNET.dll" "%DIST_DIR%\" >nul
copy /Y "libs\dpfj.dll" "%DIST_DIR%\" >nul
copy /Y "libs\dpfpdd.dll" "%DIST_DIR%\" >nul
copy /Y "libs\System.Data.SQLite.dll" "%DIST_DIR%\" >nul

:: SQLite Native Interop (Crucial for x86 distribution)
mkdir "%DIST_DIR%\x86" 2>nul
copy /Y "libs\SQLite.Interop.dll" "%DIST_DIR%\x86\" >nul
:: Also copy to root just in case
copy /Y "libs\SQLite.Interop.dll" "%DIST_DIR%\" >nul

:: DigitalPersona Native Dependencies
copy /Y "logo.png" "%DIST_DIR%\" >nul



echo [4/4] Finalizing Distribution Package...
echo.
echo SUCCESS! Your production-ready Kiosk application is located in the 'publish' folder.
echo To distribute the application, simply ZIP the 'publish' folder and run ProximaKiosk.exe on any Windows machine.
echo.


