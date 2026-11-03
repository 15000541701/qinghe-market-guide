@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22.13 或更新版本。
  pause
  exit /b 1
)
if not exist node_modules (
  echo 请先在项目目录执行 npm install。
  pause
  exit /b 1
)
call npm.cmd run demo -- --direct %*
set "DEMO_EXIT=%ERRORLEVEL%"
pause
exit /b %DEMO_EXIT%
