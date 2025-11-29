# ===========================================
# ТРЕНЕР+ | Пошаговая инструкция по запуску
# ===========================================

## Требования
- Go 1.21+
- Node.js 18+
- Docker (для PostgreSQL)
- Git

---

## ШАГ 1: Клонирование и настройка

```bash
# Перейти в папку проекта
cd Dimash/trainer-plus

# Создать файл переменных окружения
cp .env.example .env
```

Отредактируйте `.env` — минимально нужны:
- DATABASE_URL (оставить как есть для локального запуска)
- JWT_SECRET (можно оставить тестовый)

---

## ШАГ 2: Запуск базы данных

```bash
# Запустить PostgreSQL в Docker
make docker-up

# ИЛИ вручную:
docker run -d \
  --name trainer-postgres \
  -e POSTGRES_USER=trainer \
  -e POSTGRES_PASSWORD=trainer \
  -e POSTGRES_DB=trainerplus \
  -p 5432:5432 \
  postgres:15-alpine
```

Проверить что PostgreSQL запущен:
```bash
docker ps | grep postgres
```

---

## ШАГ 3: Применить миграции базы данных

```bash
# Установить migrate tool (если нет)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Применить миграции
make migrate-up

# ИЛИ вручную:
migrate -path migrations -database "postgres://trainer:trainer@localhost:5432/trainerplus?sslmode=disable" up
```

---

## ШАГ 4: Запуск Backend (API)

```bash
# Запуск сервера
make run

# ИЛИ вручную:
go run cmd/api/main.go
```

Сервер запустится на http://localhost:8080

Проверить:
```bash
curl http://localhost:8080/health
# Должен вернуть: {"status":"ok"}
```

---

## ШАГ 5: Запуск Frontend

В НОВОМ терминале:

```bash
# Перейти в папку frontend
cd Dimash/trainer-plus/web

# Установить зависимости (первый раз)
npm install

# Запустить dev сервер
npm run dev
```

Frontend запустится на http://localhost:5173

---

## ШАГ 6: Открыть приложение

1. Открыть браузер: http://localhost:5173
2. Нажать "Регистрация"
3. Создать аккаунт
4. После входа — создать клуб через Onboarding

---

## БЫСТРЫЙ СТАРТ (все команды)

```bash
# Терминал 1 - Backend
cd Dimash/trainer-plus
make docker-up
sleep 5  # подождать старт PostgreSQL
make migrate-up
make run

# Терминал 2 - Frontend
cd Dimash/trainer-plus/web
npm install
npm run dev
```

---

## Полезные команды

```bash
# Остановить PostgreSQL
make docker-down

# Сбросить базу данных
make migrate-down
make migrate-up

# Пересобрать frontend
cd web && npm run build

# Проверить логи PostgreSQL
docker logs trainer-postgres

# Посмотреть таблицы в базе
docker exec -it trainer-postgres psql -U trainer -d trainerplus -c "\dt"
```

---

## Тестовые данные

После запуска:
1. Зарегистрировать пользователя
2. Создать клуб (автоматически через onboarding)
3. Добавить группу
4. Добавить учеников
5. Создать абонементы
6. Отметить посещаемость

---

## Возможные проблемы

### PostgreSQL не запускается
```bash
# Проверить занят ли порт
lsof -i :5432
# Если занят — остановить или изменить порт в docker-compose
```

### Frontend не видит Backend
Убедитесь что:
- Backend запущен на :8080
- В vite.config.ts настроен proxy на localhost:8080

### Ошибка миграций
```bash
# Проверить подключение к БД
psql "postgres://trainer:trainer@localhost:5432/trainerplus"
```

---

## Stripe (опционально)

Для тестирования платежей:
1. Создать аккаунт на stripe.com
2. Получить тестовые ключи (sk_test_*, pk_test_*)
3. Добавить в .env:
   - STRIPE_SECRET_KEY=sk_test_xxx
   - STRIPE_WEBHOOK_SECRET=whsec_xxx

Для локального тестирования webhook:
```bash
# Установить Stripe CLI
brew install stripe/stripe-cli/stripe

# Слушать webhook
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```
