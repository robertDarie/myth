; Optional installer: compile with Inno Setup 6 or later after the Unity build.
#ifndef PackageSource
  #error Pass /DPackageSource=<absolute package folder>
#endif
#ifndef InstallerOutput
  #error Pass /DInstallerOutput=<absolute output folder>
#endif
[Setup]
AppId=ThronesOfMythLocalPlaytest
AppName=Thrones of Myth Playtest
AppVersion=0.3.0
DefaultDirName={localappdata}\Programs\ThronesOfMythPlaytest
DefaultGroupName=Thrones of Myth Playtest
PrivilegesRequired=lowest
OutputDir={#InstallerOutput}
OutputBaseFilename=Thrones-of-Myth-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Thrones of Myth Playtest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
[Files]
Source: "{#PackageSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked
[Icons]
Name: "{group}\Thrones of Myth Playtest"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Launcher.ps1"""; WorkingDir: "{app}"
Name: "{autodesktop}\Thrones of Myth Playtest"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Launcher.ps1"""; WorkingDir: "{app}"; Tasks: desktopicon
[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Launcher.ps1"""; Description: "Launch Thrones of Myth"; Flags: nowait postinstall skipifsilent
