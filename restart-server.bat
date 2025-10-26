@echo off
REM Script to restart Next.js dev server with cache clearing (Windows)

echo 🛑 Stopping any running dev servers...
REM Kill any running node processes on port 3000
FOR /F "tokens=5" %%T IN ('netstat -ano ^| findstr ":3000"') DO (
    taskkill /F /PID %%T 2>nul
)

echo 🧹 Cleaning Next.js cache...
REM Remove .next folder
if exist .next (
    rmdir /s /q .next
    echo ✅ Removed .next folder
)

echo 🗑️  Cleaning node_modules cache...
REM Remove .turbo folder if exists
if exist .turbo (
    rmdir /s /q .turbo
    echo ✅ Removed .turbo folder
)

echo ✨ Starting fresh dev server...
echo.
echo 📝 Starting in 2 seconds...
timeout /t 2 /nobreak >nul

REM Start dev server
npm run dev

echo.
echo ✅ Done! Server should be running on http://localhost:3000
pause

