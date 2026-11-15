@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0dist\Mod_Table.html"
  echo Opened the offline HTML. Node.js is only needed for the optional local server.
  exit /b 0
)
node scripts\serve.mjs
pause
