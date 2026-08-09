; Copyright (c) 2024-2026 Serhii I. Myshko
; https://github.com/sergeiown/Winget_Upgrade/blob/main/LICENSE

#define MyAppName "Winget Upgrade"
#define MyAppVersion "3.2.2"
#define MyAppPublisher "Serhii I. Myshko"
#define MyAppURL "https://github.com/sergeiown/Winget_Upgrade"
#define MyAppExeName "winget_upgrade.exe"
#define MyAppIcon "..\sagittarius_1x1.ico"

[Setup]
AppId={{2A6E7B1E-6C2E-4F3E-9C7B-3B7C6A9E2D41}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={userpf}\WingetUpgrade
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=WingetUpgradeSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#MyAppIcon}
UninstallDisplayIcon={app}\{#MyAppExeName}
SignTool=mysign

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "ukrainian"; MessagesFile: "compiler:Languages\Ukrainian.isl"

[CustomMessages]
english.AutoStartTaskDescription=Start Winget Upgrade automatically when I sign in
english.AdditionalTasksGroup=Additional tasks
ukrainian.AutoStartTaskDescription=Запускати Winget Upgrade автоматично при вході в систему
ukrainian.AdditionalTasksGroup=Додаткові завдання

[Tasks]
Name: "autostart"; Description: "{cm:AutoStartTaskDescription}"; GroupDescription: "{cm:AdditionalTasksGroup}"

[Files]
Source: "..\winget_upgrade.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\winget_ignore.txt"; DestDir: "{app}"; Flags: onlyifdoesntexist uninsneveruninstall
Source: "..\winget_upgrade.log"; DestDir: "{app}"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Ignore list"; Filename: "{app}\winget_ignore.txt"; WorkingDir: "{app}"
Name: "{group}\Log file"; Filename: "{app}\winget_upgrade.log"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; WorkingDir: "{app}"; Flags: nowait postinstall

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    Sleep(2000);
end;
