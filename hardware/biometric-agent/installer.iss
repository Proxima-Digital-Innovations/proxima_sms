; Albabello Kiosk Installer Script
; Requires Inno Setup (https://jrsoftware.org/)

[Setup]
AppName=Albabello Kiosk
AppVersion=1.0.0
DefaultDirName={autopf}\Albabello\Kiosk
DefaultGroupName=Albabello
OutputDir=.\dist
OutputBaseFilename=Albabello-Kiosk-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: ".\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Add native DP libraries to system32 if needed, but keeping them in app folder is safer
Source: ".\libs\dpfj.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\libs\dpfpdd.dll"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Albabello Kiosk"; Filename: "{app}\AlbabelloKiosk.exe"
Name: "{autodesktop}\Albabello Kiosk"; Filename: "{app}\AlbabelloKiosk.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\AlbabelloKiosk.exe"; Description: "{cm:LaunchProgram,Albabello Kiosk}"; Flags: nowait postinstall skipifsilent
