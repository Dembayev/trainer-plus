# Тренер+ | Trainer Plus

Система управления спортивными клубами и секциями.

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Backend
cd trainer-plus
cp .env.example .env  # Настроить переменные
make docker-up        # Запуск PostgreSQL
make migrate-up       # Миграции
make run              # Сервер на :8080

# Frontend
cd web
npm install
npm run dev           # Сервер на :5173
```

### Переменные окружения

**Backend (.env)**
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trainer_plus?sslmode=disable
JWT_SECRET=your-super-secret-key-here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h
SERVER_PORT=8080
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8080
```

## 📦 Деплой

### Railway (Backend)

1. Создать проект на [Railway](https://railway.app)
2. Подключить GitHub репозиторий
3. Добавить PostgreSQL
4. Настроить переменные окружения:
   - `DATABASE_URL` (автоматически от Railway)
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_URL`

### Vercel (Frontend)

1. Создать проект на [Vercel](https://vercel.com)
2. Подключить репозиторий (папка `web/`)
3. Настроить переменные:
   - `VITE_API_URL` = URL бекенда на Railway

### Stripe Webhooks

После деплоя настроить webhook в Stripe Dashboard:
- URL: `https://your-api.railway.app/api/v1/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`

## 📱 PWA

Приложение работает как PWA:
- Установка на телефон
- Offline режим
- Push уведомления (TODO)

## 🔧 API Endpoints

### Auth
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### Clubs
- `GET/POST /api/v1/clubs`
- `GET/PUT/DELETE /api/v1/clubs/:id`
- `GET /api/v1/clubs/:id/dashboard`
- `GET /api/v1/clubs/:id/reports/*`

### Groups
- `GET /api/v1/clubs/:id/groups`
- `POST /api/v1/groups`
- `GET/PUT/DELETE /api/v1/groups/:id`

### Students
- `GET /api/v1/clubs/:id/students`
- `POST /api/v1/students`
- `GET/PUT/DELETE /api/v1/students/:id`

### Subscriptions
- `GET /api/v1/clubs/:id/subscriptions`
- `POST /api/v1/subscriptions`
- `PUT /api/v1/subscriptions/:id/cancel`

### Attendance
- `POST /api/v1/attendance`
- `POST /api/v1/attendance/bulk`
- `GET /api/v1/sessions/:id/attendance`

### Payments
- `POST /api/v1/payments/create-checkout-session`
- `POST /api/v1/payments/manual`
- `POST /api/v1/webhooks/stripe`

### Public
- `GET /public/club/:id/schedule`
- `GET /public/club/:id/groups`

## 🛠 Технологии

**Backend:**
- Go 1.22
- Chi Router
- PostgreSQL
- Stripe API

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router

## 📄 Лицензия

MIT
