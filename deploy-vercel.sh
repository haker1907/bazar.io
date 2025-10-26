#!/bin/bash

# Скрипт для деплоя на Vercel

echo "🚀 Deploying Admin Panel to Vercel..."
echo ""

# Проверка установки Vercel CLI
if ! command -v vercel &> /dev/null
then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Проверка .env файла
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "Please create .env.local with your Supabase credentials"
    echo ""
fi

# Переход в директорию проекта
cd "$(dirname "$0")"

# Установка зависимостей
echo "📦 Installing dependencies..."
npm install

# Сборка проекта для проверки
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Деплой
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "Your admin panel is now live on Vercel!"

