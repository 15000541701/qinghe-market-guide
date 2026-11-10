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
  call npm.cmd install
  if errorlevel 1 exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo 已创建 .env。如需大模型，请填写 DEEPSEEK_API_KEY，或完整填写 GEMINI_BASE_URL 和 GEMINI_API_KEY，然后重启服务；不填写也能使用规则导购。
)
call npm.cmd run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo 浏览器打开 http://127.0.0.1:3001
call npm.cmd start
pause
