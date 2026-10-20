; Proxima Kiosk - Robust NSIS Installer Script
!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "Proxima Kiosk"
OutFile "Proxima_One_Kiosk_Setup.exe"
InstallDir "$PROGRAMFILES\proxima\Kiosk"
RequestExecutionLevel admin

; UI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "kiosk.ico"
!define MUI_UNICON "kiosk.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\ProximaKiosk.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Proxima Kiosk"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ; Check if already running
  System::Call 'kernel32::OpenEvent(i 0x100000, i 0, t "ProximaKiosk_Mutex") i .r0'
  IntCmp $0 0 not_running
    MessageBox MB_OK|MB_ICONEXCLAMATION "Proxima Kiosk is already running. Please close it before installing."
    Abort
  not_running:
FunctionEnd

Section "Main Section" SEC01
  SetOutPath "$INSTDIR"
  
  ExecWait 'taskkill /F /IM ProximaKiosk.exe /T'
  
  File /r "publish\*"
  File "kiosk.ico"
  
  ; Create Shortcut
  Delete "$DESKTOP\Proxima Kiosk.lnk"
  CreateShortCut "$DESKTOP\Proxima Kiosk.lnk" "$INSTDIR\ProximaKiosk.exe" "" "$INSTDIR\kiosk.ico" 0
  
  ; Write Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Registry keys for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProximaKiosk" "DisplayName" "Proxima Kiosk"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProximaKiosk" "UninstallString" '"$INSTDIR\Uninstall.exe"'
SectionEnd

Section "Uninstall"
  ExecWait 'taskkill /F /IM ProximaKiosk.exe /T'
  Delete "$DESKTOP\Proxima Kiosk.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProximaKiosk"
SectionEnd
