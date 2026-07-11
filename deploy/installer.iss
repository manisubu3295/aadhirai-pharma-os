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
; Points at install-status.txt inside whichever folder was chosen on the
; "Select Destination Location" page — {app} always resolves correctly.
Name: "{group}\View Install Status";    Filename: "{app}\install-status.txt"
Name: "{group}\Open Install Folder";    Filename: "{app}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{userdesktop}\{#AppName}";       Filename: "{app}\open-app.url"; Tasks: desktopicon

[INI]
; Create a URL shortcut file that opens the browser
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "URL"; String: "http://localhost:{code:GetAppPort}"
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "IconFile"; String: "{app}\{#AppExeName}"
Filename: "{app}\open-app.url"; Section: "InternetShortcut"; Key: "IconIndex"; String: "0"

[Run]
; setup-after-install.bat is run directly from Pascal code in
; CurStepChanged via Exec() instead of a declarative [Run] entry here -
; see the comment there for why.

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
  ResultCode: Integer;
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
      // Self-relaunch with output redirected to a log file, rather than
      // having [Run] append "> log 2>&1" to the cmd.exe invocation - see
      // the comment on the [Run] entry for why that was unreliable.
      'if not "%~1"=="__LOGGED__" (' + #13#10 +
      '  call "%~f0" __LOGGED__ > "' + ExpandConstant('{app}') + '\setup-log.txt" 2>&1' + #13#10 +
      '  exit /b %errorlevel%' + #13#10 +
      ')' + #13#10 +
      'setlocal' + #13#10 +
      'set "PATH=' + PgPath + ';%PATH%"' + #13#10 +
      'set "PGPASSWORD=' + GetPgPass('') + '"' + #13#10 +
      'set DB=' + GetDbName('') + #13#10 +
      'set PORT=' + GetAppPort('') + #13#10 +
      '' + #13#10 +
      'echo [1/3] Creating database...' + #13#10 +
      'psql -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname=''' +
          GetDbName('') + '''" | find "1 row" >nul 2>&1' + #13#10 +
      'if errorlevel 1 (' + #13#10 +
      '  psql -U postgres -h localhost -c "CREATE DATABASE ' + GetDbName('') + ';"' + #13#10 +
      ')' + #13#10 +
      '' + #13#10 +
      'echo [2/3] Installing Windows service (WinSW)...' + #13#10 +
      'echo ^<service^> > "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<id^>{#ServiceName}^</id^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<name^>Aadhirai Pharma^</name^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<description^>Aadhirai Pharma Management System^</description^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<executable^>' + ExpandConstant('{app}') + '\aadhirai-pharma-server.exe^</executable^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<startmode^>Automatic^</startmode^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo   ^<log mode="roll"/^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'echo ^</service^> >> "' + ExpandConstant('{app}') + '\AadhiraiPharmaService.xml"' + #13#10 +
      'sc query {#ServiceName} >nul 2>&1 && (sc stop {#ServiceName} & sc delete {#ServiceName})' + #13#10 +
      '"' + ExpandConstant('{app}') + '\AadhiraiPharmaService.exe" install' + #13#10 +
      '"' + ExpandConstant('{app}') + '\AadhiraiPharmaService.exe" start' + #13#10 +
      '' + #13#10 +
      'echo [3/3] Waiting for the service to finish starting...' + #13#10 +
      // WinSW''s "start" command returns as soon as it asks Windows to start
      // the service - it does NOT wait for the wrapped server.exe to finish
      // connecting to the database, creating tables, and binding the port.
      // Without this wait loop the installer finishes (and "Open in browser"
      // fires) while the service is still mid-startup, which looks exactly
      // like a broken install even though it recovers on its own seconds
      // later.
      'set WAITED=0' + #13#10 +
      ':waitloop' + #13#10 +
      'sc query {#ServiceName} | find "RUNNING" >nul 2>&1' + #13#10 +
      'if not errorlevel 1 goto running' + #13#10 +
      'sc query {#ServiceName} | find "STOPPED" >nul 2>&1' + #13#10 +
      'if not errorlevel 1 goto failed' + #13#10 +
      'set /a WAITED=%WAITED%+2' + #13#10 +
      'if %WAITED% GEQ 60 goto timeout' + #13#10 +
      'timeout /t 2 /nobreak >nul' + #13#10 +
      'goto waitloop' + #13#10 +
      '' + #13#10 +
      ':running' + #13#10 +
      'echo Service is running.' + #13#10 +
      'goto end' + #13#10 +
      '' + #13#10 +
      ':failed' + #13#10 +
      'echo [WARNING] Service stopped unexpectedly during startup. Check install-status.txt and the AadhiraiPharmaService.err.log file in this folder.' + #13#10 +
      'goto end' + #13#10 +
      '' + #13#10 +
      ':timeout' + #13#10 +
      'echo [WARNING] Service did not report RUNNING within 60 seconds. It may still start on its own - check install-status.txt shortly, or check Windows Event Viewer if the app never becomes reachable.' + #13#10 +
      '' + #13#10 +
      ':end' + #13#10 +
      'echo Done.' + #13#10;

    SaveStringToFile(ExpandConstant('{app}\setup-after-install.bat'), SetupBat, False);

    // Run directly via Pascal's Exec() rather than a declarative [Run]
    // entry - both plain CreateProcess-style Exec (no shellexec flag) and
    // ShellExecute-style Exec (shellexec flag) failed instantly through
    // the [Run] section for this specific .bat file, in ways that
    // reproduced even for a trivial freshly-written 2-line diagnostic
    // .bat, and could not be reproduced when launching the exact same
    // command manually outside the installer. Exec() from [Code] is a
    // different, well-trodden code path and lets us set WorkingDir
    // explicitly, which the [Run] section does not.
    if not Exec(ExpandConstant('{sys}\cmd.exe'), '/c "' + ExpandConstant('{app}\setup-after-install.bat') + '"',
      ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then begin
      SaveStringToFile(ExpandConstant('{app}\setup-log.txt'),
        'Failed to launch setup-after-install.bat: ' + SysErrorMessage(ResultCode), False);
    end;
  end;
end;
