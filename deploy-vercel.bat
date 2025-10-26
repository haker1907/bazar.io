@echo off
REM Скрипт для деплоя на Vercel (Windows)

echo 🚀 Deploying Admin Panel to Vercel...
echo.

REM Проверка установки Vercel CLI
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Vercel CLI not found. Installing...
    call npm install -g vercel
)

REM Проверка .env файла
if not exist .env.local (
    echo ⚠️  Warning: .env.local not found
    echo Please create .env.local with your Supabase credentials
    echo.
)

REM Установка зависимостей
echo 📦 Installing dependencies...
call npm install

REM Сборка проекта
echo 🔨 Building project...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed. Please fix errors before deploying.
    exit /b 1
)

echo ✅ Build successful!
echo.

REM Деплой
echo 🚀 Deploying to Vercel...
call vercel --prod

echo.
echo ✅ Deployment complete!
echo Your admin panel is now live on Vercel!
pause

