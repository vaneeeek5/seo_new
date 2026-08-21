# SEO Content Factory OS — Полное руководство по запуску

## Структура проекта

```
SEO SAAS/
├── apps/
│   ├── api/          # NestJS Backend (порт 4000)
│   └── web/          # Next.js Frontend (порт 3000)
├── packages/shared/  # Общие типы/команды
├── docker-compose.prod.yml  # Продакшн с Docker
├── docker-compose.yml       # Локальная разработка
└── nginx.conf        # Nginx конфиг
```

---

## Вариант 1: Запуск на VPS (рекомендуемый)

### Требования к серверу
- Ubuntu 22.04+
- Docker + Docker Compose v2
- 2+ GB RAM
- Открытые порты: 80, 443, 22

### Шаг 1: Установка Docker на сервер

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Шаг 2: Загрузить код на сервер

```bash
# Вариант A: через Git
git clone https://github.com/vaneeeek5/seo_saas.git /var/www/seo_saas
cd /var/www/seo_saas

# Вариант B: распаковать архив
unzip SEO_SAAS_full_backup.zip -d /var/www/seo_saas
cd /var/www/seo_saas
```

### Шаг 3: Собрать и запустить контейнеры

```bash
cd /var/www/seo_saas

# Собрать образы локально (не нужен GitHub)
docker compose -f docker-compose.prod.local.yml build

# Запустить
docker compose -f docker-compose.prod.local.yml up -d

# Проверить статус
docker compose -f docker-compose.prod.local.yml ps
```

### Шаг 4: Применить схему базы данных

```bash
docker exec seo_saas_api npx prisma db push --schema=apps/api/prisma/schema.prisma
```

### Шаг 5: Открыть сайт

Откройте в браузере: `http://ВАШ_IP`

---

## Вариант 2: Через GitHub Actions (автодеплой)

### Шаг 1: Форкнуть/загрузить репозиторий на GitHub

### Шаг 2: Добавить секреты в GitHub (Settings → Secrets):

| Секрет | Описание |
|--------|----------|
| `SSH_KEY` | Приватный SSH ключ для доступа к серверу |
| `SSH_PASSWORD` | Или пароль root от VPS |

### Шаг 3: Сделать любой коммит в ветку `main`

GitHub автоматически соберёт образы, загрузит на сервер и запустит.

---

## Вариант 3: Локальная разработка (без Docker)

### Требования
- Node.js 22+
- PostgreSQL 15
- Redis 7

### Запуск

```bash
# Установить зависимости
npm install

# Создать .env для API
cp apps/api/.env.example apps/api/.env
# Отредактировать apps/api/.env — вписать DATABASE_URL, REDIS_HOST

# Сгенерировать Prisma клиент и применить схему
cd apps/api && npx prisma db push

# Запустить API (порт 4000)
npm run dev --workspace=apps/api

# В другом терминале — запустить Frontend (порт 3000)
npm run dev --workspace=apps/web
```

Открыть: `http://localhost:3000`

---

## Добавление XMLStock ключа

1. Откройте сайт → вкладка **«Подключения & API Ключи»**
2. Выберите провайдер: **XmlStock Enterprise API**
3. Заполните:
   - **User ID**: ваш ID из xmlstock.com (например: `14576`)
   - **Pass / Key**: ваш ключ (например: `5a505f11d2b6d6f9bec30c8fd074cc42`)
4. Включите нужные тумблеры: Wordstat, Яндекс XML, Яндекс Live, Google XML
5. Нажмите **«Зашифровать и Сохранить»**

### URL эндпоинтов XMLStock:
- Яндекс XML: `https://xmlstock.com/yandex/xml/?user=ID&key=KEY&query=...`
- Яндекс Live: `https://xmlstock.com/yandexlive/json/?user=ID&key=KEY&query=...`
- Google XML: `https://xmlstock.com/google/xml/?user=ID&key=KEY&query=...`
- Wordstat: `https://xmlstock.com/wordstat/json/?user=ID&key=KEY&query=...`

---

## Переменные окружения (apps/api/.env)

```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/seo_saas?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=4000
NODE_ENV=production
ENCRYPTION_KEY=любая_случайная_строка_32_символа
```

---

## Полезные команды

```bash
# Посмотреть логи API
docker logs seo_saas_api --tail 100 -f

# Перезапустить контейнеры
docker compose -f docker-compose.prod.local.yml restart

# Полная остановка и очистка
docker compose -f docker-compose.prod.local.yml down -v

# Зайти внутрь API контейнера
docker exec -it seo_saas_api sh
```
