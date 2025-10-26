# 🚀 Как разместить Admin Panel на хостинге

## 📋 Оглавление

1. [Vercel (Рекомендуется)](#vercel-рекомендуется-)
2. [Netlify](#netlify)
3. [GitHub Pages (Ограниченная поддержка)](#github-pages-ограниченная-поддержка)

---

## Vercel (Рекомендуется) ⭐

### Почему Vercel?
- ✅ Создан специально для Next.js
- ✅ Автоматический деплой при каждом push
- ✅ Бесплатный SSL сертификат
- ✅ Глобальный CDN
- ✅ Поддержка серверных компонентов

### Способ 1: Через веб-интерфейс (Самый простой)

#### Шаг 1: Подготовка репозитория
```bash
# Убедитесь, что код загружен на GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Шаг 2: Регистрация на Vercel
1. Откройте [vercel.com](https://vercel.com)
2. Нажмите **"Sign Up"**
3. Войдите через **GitHub**

#### Шаг 3: Импорт проекта
1. Нажмите **"Add New Project"**
2. Выберите ваш репозиторий **"bazar"**
3. В **"Root Directory"** выберите **"admin-panel"**
4. Нажмите **"Continue"**

#### Шаг 4: Настройка переменных окружения
Добавьте следующие переменные:

| Переменная | Значение |
|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ваш URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ваш Anon Key Supabase |

**Где найти эти значения?**
- Откройте [Supabase Dashboard](https://supabase.com/dashboard)
- Выберите ваш проект
- Settings → API
- Скопируйте **URL** и **anon public** ключ

#### Шаг 5: Деплой
1. Нажмите **"Deploy"**
2. Подождите 2-3 минуты
3. ✅ Готово! Ваш сайт живой!

**Ваш сайт будет доступен по адресу:**
```
https://your-project-name.vercel.app
```

---

### Способ 2: Через командную строку

#### Шаг 1: Установка Vercel CLI
```bash
npm install -g vercel
```

#### Шаг 2: Логин
```bash
vercel login
```

#### Шаг 3: Деплой
```bash
# Перейдите в папку admin-panel
cd admin-panel

# Запустите деплой
vercel

# Для продакшн деплоя
vercel --prod
```

#### Или используйте готовый скрипт:

**Linux/Mac:**
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

**Windows:**
```bash
deploy-vercel.bat
```

---

## Netlify

### Шаг 1: Регистрация
1. Откройте [netlify.com](https://netlify.com)
2. Войдите через GitHub

### Шаг 2: Создание сайта
1. Нажмите **"Add new site"** → **"Import an existing project"**
2. Выберите **GitHub**
3. Выберите репозиторий **"bazar"**
4. Настройте параметры:
   - **Base directory**: `admin-panel`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### Шаг 3: Environment Variables
Добавьте:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Шаг 4: Deploy
Нажмите **"Deploy site"**

---

## GitHub Pages (Ограниченная поддержка)

### ⚠️ Важно!
GitHub Pages **НЕ ПОДДЕРЖИВАЕТ**:
- ❌ Серверный рендеринг (SSR)
- ❌ API routes
- ❌ Middleware
- ❌ Оптимизацию изображений

**Для полной функциональности используйте Vercel или Netlify!**

---

### Если всё равно хотите использовать GitHub Pages:

#### Шаг 1: Измените `next.config.ts`

Замените содержимое файла:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  
  images: {
    unoptimized: true,
  },
  
  // Если репозиторий не username.github.io, укажите имя репозитория:
  basePath: '/bazar',
  assetPrefix: '/bazar/',
};

export default nextConfig;
```

#### Шаг 2: Обновите `package.json`

Добавьте в секцию `scripts`:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "export": "next build && next export"
  }
}
```

#### Шаг 3: Настройте GitHub Actions

Файл уже создан: `.github/workflows/deploy-github-pages.yml`

#### Шаг 4: Добавьте секреты в GitHub

1. Откройте ваш репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Нажмите **"New repository secret"**
4. Добавьте:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`, Value: ваш Supabase URL
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Value: ваш Supabase Key

#### Шаг 5: Включите GitHub Pages

1. Settings → Pages
2. Source: **"GitHub Actions"**
3. Сохраните

#### Шаг 6: Деплой

```bash
git add .
git commit -m "Configure GitHub Pages"
git push origin main
```

**Сайт будет доступен через 2-3 минуты:**
```
https://yourusername.github.io/bazar/
```

---

## 🔧 Настройка переменных окружения

### Локально (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### На Vercel:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Или через веб-интерфейс:
Project Settings → Environment Variables

---

## 🆘 Решение проблем

### Ошибка: "Module not found"
```bash
cd admin-panel
rm -rf node_modules package-lock.json
npm install
```

### Ошибка: "Build failed"
Проверьте, что все переменные окружения установлены:
```bash
npm run build
```

### Сайт показывает ошибку 404
- Для GitHub Pages: проверьте `basePath` в `next.config.ts`
- Для Vercel/Netlify: проверьте Root Directory

### Изображения не загружаются
- Проверьте домен в `next.config.ts` → `images.remotePatterns`
- Для GitHub Pages: используйте `unoptimized: true`

---

## 📊 Сравнение платформ

| Характеристика | Vercel | Netlify | GitHub Pages |
|---------------|--------|---------|--------------|
| Next.js SSR | ✅ Да | ✅ Да | ❌ Нет |
| API Routes | ✅ Да | ✅ Да | ❌ Нет |
| Бесплатно | ✅ Да | ✅ Да | ✅ Да |
| Свой домен | ✅ Да | ✅ Да | ✅ Да |
| SSL сертификат | ✅ Автоматически | ✅ Автоматически | ✅ Автоматически |
| Скорость деплоя | ⚡ 1-2 мин | ⚡ 2-3 мин | 🐌 3-5 мин |
| Edge Functions | ✅ Да | ✅ Да | ❌ Нет |

---

## 🎯 Итоговая рекомендация

### Для вашего Admin Panel:

**1️⃣ Vercel** - Лучший выбор! 🏆
- Полная поддержка Next.js 15
- Нулевая настройка
- Самый быстрый

**2️⃣ Netlify** - Отличная альтернатива
- Хорошая поддержка Next.js
- Удобный интерфейс

**3️⃣ GitHub Pages** - Не рекомендуется ❌
- Много ограничений
- Не будет работать полная функциональность

---

## 📞 Помощь

Если возникли проблемы:
1. Проверьте логи деплоя
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что `npm run build` работает локально

---

## ✅ Быстрый старт (Vercel)

```bash
# 1. Установите Vercel CLI
npm install -g vercel

# 2. Перейдите в папку проекта
cd admin-panel

# 3. Запустите деплой
vercel

# 4. Следуйте инструкциям в терминале

# 5. Готово! 🎉
```

**Время деплоя: 2-3 минуты**

---

## 🔗 Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

