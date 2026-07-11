; ============================================================
; Aadhirai Pharma Management System — Inno Setup Script
; Requirements : Inno Setup 6.3+ (https://jrsoftware.org/isinfo.php)
; How to build : Run build-installer.bat (or open this file in
;                the Inno Setup IDE and press F9)
; ============================================================

#define AppName      "Aadhirai Pharma"
#define AppVersion   "1.0.0"
#define AppPublisher "Aadhirai Pharma"
#define AppURL       "http://localhost:3000"
#define AppExeName   "aadhirai-pharma-server.exe"
#define ServiceName  "AadhiraiPharma"

[Setup]
AppId={{F3C7A2D1-84BE-4E90-BC34-12A5678901BC}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\AadhiraiPharma
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=..\release
OutputBaseFilename=AadhiraiPharma-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
MinVersion=10.0
UninstallDisplayName={#AppName}
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
PgPromptTitle=PostgreSQL Configuration
PgPromptDesc=Enter your PostgreSQL connection details.
PgPasswordLabel=PostgreSQL postgres password:
AppPortLabel=Application port (default 3000):
DbNameLabel=Database name (default medora_shivalaya):

[Tasks]
Name: "desktopicon"; Description: "Create a Desktop shortcut to open the app"; GroupDescription: "Additional icons:"

[Files]
; ── Core server executable (built by build-installer.bat via pkg) ──────────
Source: "..\release\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; ── Static web assets served by the express server ────────────────────────
Source: "..\dist\public\*"; DestDir: "{app}\dist\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; ── WinSW — wraps server.exe as a proper Windows service ────────────────
Source: ".\..\node_modules\node-windows\bin\winsw\winsw.exe"; DestDir: "{app}"; DestName: "AadhiraiPharmaService.exe"; Flags: ignoreversion

; ── Database bootstrap SQL ────────────────────────────────────────────────
Source: "..\deploy\create-database.sql"; DestDir: "{app}\deploy"; Flags: ignoreversion


[Icons]
; Start Menu
Name: "{group}\Open {#AppName}";        Filename: "{app}\open-app.url"
Name: "{group}\Start Service";          Filename: "{sys}\sc.exe"; Parameters: "start {#ServiceName}"; IconFilename: "{app}\{#AppExeName}"
Name: "{group}\Stop Service";           Filename: "{sys}\sc.exe"; Parameters: "stop {#ServiceName}";  IconFilename: "{app}\{#AppExeName}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{userdesktop}\{#AppName}";       Filename: "{app}\open-app.url"; Tasks: desktopicon

[INI]
; Create a URL shortcut file that opens the browser
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "URL"; String: "http://localhost:{code:GetAppPort}"
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "IconFile"; String: "{app}\{#AppExeName}"
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "IconIndex"; String: "0"

[Run]
; Write .env, init DB, install service — all after files are copied
Filename: "{sys}\cmd.exe"; \
  Parameters: "/c ""{app}\setup-after-install.bat"" > ""{app}\setup-log.txt"" 2>&1"; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Configuring database and Windows service..."; \
  Description: "Finalising installation"

; Open in browser when user clicks Finish
Filename: "{app}\open-app.url"; \
  Flags: shellexec nowait postinstall skipifsilent; \
  Description: "Open {#AppName} in browser"

[UninstallRun]
Filename: "{app}\AadhiraiPharmaService.exe"; Parameters: "stop"; Flags: runhidden waituntilterminated; RunOnceId: "StopSvc"
Filename: "{app}\AadhiraiPharmaService.exe"; Parameters: "uninstall"; Flags: runhidden waituntilterminated; RunOnceId: "RemoveSvc"

[Code]
function GetTickCount: LongWord; external 'GetTickCount@kernel32.dll stdcall';

var
  PgPassPage: TInputQueryWizardPage;
  AppPortPage: TInputQueryWizardPage;
  DbNamePage: TInputQueryWizardPage;

procedure InitializeWizard();
begin
  DbNamePage := CreateInputQueryPage(wpSelectDir,
    'Database Name',
    'Enter the database name to create or use.',
    '');
  DbNamePage.Add('Database name:', False);
  DbNamePage.Values[0] := 'medora_shivalaya';

  AppPortPage := CreateInputQueryPage(DbNamePage.ID,
    'Application Port',
    'Which port should the app listen on?',
    '');
  AppPortPage.Add('Port number:', False);
  AppPortPage.Values[0] := '3000';

  PgPassPage := CreateInputQueryPage(AppPortPage.ID,
    'PostgreSQL Password',
    'Enter the password for the PostgreSQL "postgres" user.',
    '');
  PgPassPage.Add('Password:', True);
  PgPassPage.Values[0] := '';
end;

function GetPgPass(Param: String): String;
begin
  Result := PgPassPage.Values[0];
end;

function GetAppPort(Param: String): String;
begin
  Result := AppPortPage.Values[0];
  if Result = '' then Result := '3000';
end;

function GetDbName(Param: String): String;
begin
  Result := DbNamePage.Values[0];
  if Result = '' then Result := 'medora_shivalaya';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = PgPassPage.ID then begin
    if PgPassPage.Values[0] = '' then begin
      MsgBox('Please enter your PostgreSQL password.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent, SetupBat, PgPath: String;
  F: Integer;
begin
  if CurStep = ssPostInstall then begin

    // ── Find psql.exe ────────────────────────────────────────────
    PgPath := '';
    if FileExists('C:\Program Files\PostgreSQL\18\bin\psql.exe') then PgPath := 'C:\Program Files\PostgreSQL\18\bin'
    else if FileExists('C:\Program Files\PostgreSQL\17\bin\psql.exe') then PgPath := 'C:\Program Files\PostgreSQL\17\bin'
    else if FileExists('C:\Program Files\PostgreSQL\16\bin\psql.exe') then PgPath := 'C:\Program Files\PostgreSQL\16\bin'
    else if FileExists('C:\Program Files\PostgreSQL\15\bin\psql.exe') then PgPath := 'C:\Program Files\PostgreSQL\15\bin';

    if PgPath = '' then begin
      MsgBox('PostgreSQL not found. Please install PostgreSQL first from https://www.postgresql.org/download/windows/ then re-run this installer.', mbError, MB_OK);
      exit;
    end;

    // ── Write .env ───────────────────────────────────────────────
    EnvContent :=
      'DATABASE_URL=postgresql://postgres:' + GetPgPass('') +
      '@localhost:5432/' + GetDbName('') + #13#10 +
      'NODE_ENV=production' + #13#10 +
      'PORT=' + GetAppPort('') + #13#10 +
      'SESSION_SECRET=' + IntToStr(GetTickCount()) + IntToStr(Random(999999)) + #13#10 +
      // This app is served over plain HTTP on the pharmacy's local network
      // (no TLS). A "Secure" cookie is silently dropped by browsers on any
      // non-HTTPS origin other than literally "localhost", which would
      // break login for every other till/counter machine on the LAN.
      'SESSION_COOKIE_SECURE=false' + #13#10 +
      'AI_ASSISTANT_PROVIDER=none' + #13#10 +
      'GEMINI_API_KEY=' + #13#10 +
      'AI_ASSISTANT_MODEL=' + #13#10;

    SaveStringToFile(ExpandConstant('{app}\.env'), EnvContent, False);

    // ── Write setup-after-install.bat ────────────────────────────
    SetupBat :=
      '@echo off' + #13#10 +
      'setlocal' + #13#10 +
      'set "PATH=' + PgPath + ';%PATH%"' + #13#10 +
      'set "PGPASSWORD=' + GetPgPass('') + '"' + #13#10 +
      'set DB=' + GetDbName('') + #13#10 +
      'set PORT=' + GetAppPort('') + #13#10 +
      '' + #13#10 +
      'echo [1/4] Creating database...' + #13#10 +
      'psql -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname=''' +
          GetDbName('') + '''" | find "1 row" >nul 2>&1' + #13#10 +
      'if errorlevel 1 (' + #13#10 +
      '  psql -U postgres -h localhost -c "CREATE DATABASE ' + GetDbName('') + ';"' + #13#10 +
      ')' + #13#10 +
      '' + #13#10 +
      'echo [2/3] Creating database...' + #13#10 +
      'psql -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname=''' +
          GetDbName('') + '''" | find "1 row" >nul 2>&1' + #13#10 +
      'if errorlevel 1 (' + #13#10 +
      '  psql -U postgres -h localhost -c "CREATE DATABASE ' + GetDbName('') + ';"' + #13#10 +
      ')' + #13#10 +
      '' + #13#10 +
      'echo [3/3] Installing Windows service (WinSW)...' + #13#10 +
      'echo ^<service^> > "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<id^>AadhiraiPharma^</id^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<name^>Aadhirai Pharma^</name^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<description^>Aadhirai Pharma Management System^</description^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<executable^>' + ExpandConstant('{app}') + '\aadhirai-pharma-server.exe^</executable^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<startmode^>Automatic^</startmode^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<log mode="roll"/^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo ^</service^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'sc query AadhiraiPharma >nul 2>&1 && (sc stop AadhiraiPharma & sc delete AadhiraiPharma)' + #13#10 +
      '"' + ExpandConstant('{app}') + '\AadhiraiPharmaService.exe" install' + #13#10 +
      '"' + ExpandConstant('{app}') + '\AadhiraiPharmaService.exe" start' + #13#10 +
      '' + #13#10 +
      'echo Done.' + #13#10;

    SaveStringToFile(ExpandConstant('{app}\setup-after-install.bat'), SetupBat, False);
  end;
end;
