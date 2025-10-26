# 🚀 Инструкция по деплою Admin Panel

## Вариант 1: Vercel (Рекомендуется)

### Преимущества:
- ✅ Полная поддержка Next.js 15
- ✅ Автоматический деплой при push
- ✅ Бесплатный SSL сертификат
- ✅ CDN и оптимизация изображений
- ✅ Environment variables
- ✅ Serverless функции

### Пошаговая инструкция:

#### 1. Подготовка проекта

Убедитесь, что у вас есть `.gitignore` с правильными настройками:

```gitignore
# dependencies
node_modules/
.pnp
.pnp.js

# testing
coverage/

# next.js
.next/
out/
build/
dist/

# production
build/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

#### 2. Создайте файл окружения

Создайте `.env.example` для документации:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### 3. Деплой на Vercel

**Способ A: Через веб-интерфейс**

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "New Project"
4. Импортируйте ваш GitHub репозиторий
5. Настройте Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Нажмите "Deploy"

**Способ B: Через CLI**

```bash
# Установите Vercel CLI
npm install -g vercel

# Перейдите в директорию проекта
cd admin-panel

# Запустите деплой
vercel

# Для production деплоя
vercel --prod
```

#### 4. Настройка домена (опционально)

В настройках проекта на Vercel:
1. Domains → Add
2. Введите ваш домен
3. Настройте DNS записи

---

## Вариант 2: Netlify

### Инструкция:

#### 1. Создайте `netlify.toml` в корне admin-panel:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

#### 2. Деплой

**Через веб-интерфейс:**

1. Перейдите на [netlify.com](https://netlify.com)
2. Войдите через GitHub
3. "New site from Git" → выберите репозиторий
4. Настройте Environment Variables
5. Deploy

**Через CLI:**

```bash
npm install -g netlify-cli
cd admin-panel
netlify deploy --prod
```

---

## Вариант 3: GitHub Pages (Ограниченная поддержка)

⚠️ **Внимание**: GitHub Pages не поддерживает серверные компоненты Next.js!

Можно экспортировать только статический сайт (с ограничениями).

### Шаг 1: Измените `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Статический экспорт
  
  // Отключите функции, несовместимые со статическим экспортом
  images: {
    unoptimized: true,
  },
  
  // Если используете подпапку (например: username.github.io/admin-panel)
  basePath: process.env.NODE_ENV === 'production' ? '/admin-panel' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/admin-panel' : '',
};

export default nextConfig;
```

### Шаг 2: Обновите `package.json`

Добавьте скрипты для деплоя:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "export": "next build && next export",
    "deploy": "npm run export && gh-pages -d out"
  }
}
```

### Шаг 3: Установите gh-pages

```bash
cd admin-panel
npm install --save-dev gh-pages
```

### Шаг 4: Создайте GitHub Actions workflow

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./admin-panel
        run: npm ci
      
      - name: Build
        working-directory: ./admin-panel
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./admin-panel/out
```

### Шаг 5: Настройте GitHub Repository

1. Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Settings → Pages → Source: "gh-pages branch"

### Шаг 6: Push и деплой

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

Сайт будет доступен по адресу:
- `https://username.github.io/` (если репозиторий: username.github.io)
- `https://username.github.io/repo-name/` (для других репозиториев)

---

## ⚠️ Ограничения GitHub Pages для Next.js:

1. ❌ Нет серверного рендеринга (SSR)
2. ❌ Нет API routes
3. ❌ Нет Middleware
4. ❌ Нет Image Optimization
5. ❌ Нет ISR (Incremental Static Regeneration)
6. ❌ Только статические страницы

---

## 🎯 Рекомендация

Для вашего admin-panel используйте **Vercel**:

```bash
# 1. Установите Vercel CLI
npm install -g vercel

# 2. Перейдите в папку проекта
cd admin-panel

# 3. Залогиньтесь
vercel login

# 4. Деплой
vercel --prod
```

**Преимущества Vercel:**
- Создан специально для Next.js
- Нулевая конфигурация
- Автоматический HTTPS
- Edge Functions
- Мгновенный деплой

---

## 🔧 Настройка переменных окружения

### Для Vercel:

```bash
# Через CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Или через веб-интерфейс:
# Project Settings → Environment Variables
```

### Для Netlify:

```bash
# Через CLI
netlify env:set NEXT_PUBLIC_SUPABASE_URL "your-url"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-key"
```

---

## 📝 Проверка перед деплоем

```bash
# 1. Проверьте сборку локально
npm run build

# 2. Запустите production-версию локально
npm run start

# 3. Проверьте работоспособность
# Откройте http://localhost:3000
```

---

## 🆘 Решение проблем

### Ошибка: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Ошибка: "Environment variables not found"
Убедитесь, что переменные окружения настроены на платформе деплоя.

### Ошибка 404 на подстраницах (GitHub Pages)
Добавьте `404.html` с редиректом на `index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script>
      sessionStorage.redirect = location.href;
    </script>
    <meta http-equiv="refresh" content="0;URL='/'">
  </head>
</html>
```

---

## 📊 Сравнение платформ

| Функция | Vercel | Netlify | GitHub Pages |
|---------|--------|---------|--------------|
| Next.js SSR | ✅ | ✅ | ❌ |
| API Routes | ✅ | ✅ | ❌ |
| Edge Functions | ✅ | ✅ | ❌ |
| Бесплатный SSL | ✅ | ✅ | ✅ |
| Custom Domain | ✅ | ✅ | ✅ |
| Auto Deploy | ✅ | ✅ | ✅ |
| Цена (Hobby) | Бесплатно | Бесплатно | Бесплатно |

**Итоговая рекомендация: Vercel** 🏆

