# <img src="images/bot.svg" width="32"> XvolkX Demo Bot — экосистема ботов в MAX

Демонстрационный бот в мессенджере MAX, который объединяет 3 проекта в одном: CRM-бот, Парсер валют и Админ-бот с ИИ.

[![Node.js](https://img.shields.io/badge/Node.js-18-green)](#)
[![MAX Bot API](https://img.shields.io/badge/MAX%20Bot%20API-4.x-blue)](#)
[![Yandex GPT](https://img.shields.io/badge/Yandex%20GPT-API-blueviolet)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

## <img src="images/link.svg" width="24"> Живой пример

[Перейти к боту](https://max.ru/se14259460_bot)

## <img src="images/features.svg" width="24"> Функции

- <img src="images/contacts.svg" width="18"> CRM: Управление клиентами — добавление, список
- <img src="images/orders.svg" width="20"> CRM: Управление заказами — создание, статусы
- <img src="images/analytics.svg" width="20"> CRM: Аналитика и статистика
- <img src="images/parser.svg" width="20"> Парсер валют — курсы ЦБ РФ
- <img src="images/chart.svg" width="20"> Парсер валют — графики и топ-10 изменений
- <img src="images/ai.svg" width="20"> ИИ-помощник — Yandex GPT (CRM и Парсер)
- <img src="images/database.svg" width="20"> База данных — PostgreSQL (клиенты, заказы, курсы)
- <img src="images/chat.svg" width="20"> Инлайн-меню — удобное управление через кнопки

## <img src="images/install.svg" width="24"> Как запустить локально

1. Клонируй репозиторий:
   ```bash
   git clone https://github.com/xVOLKx/xvolkx-demo-bot.git
   cd xvolkx-demo-bot
   ```
2. Установи зависимости:
   ```bash
   npm install
   ```
3. Создай файл .env и добавь:
   ```bash
   BOT_TOKEN=твой_токен_MAX
   DATABASE_URL=postgresql://postgres:твой_пароль@localhost:5432/xvolkx_demo_db
   YANDEX_API_KEY=твой_ключ
   YANDEX_FOLDER_ID=твой_folder_id
   ADMIN_CHAT_ID=твой_user_id
   ```
4. Запусти:
   ```bash
   node index.js
   ```
<img src="images/tech.svg" width="24" align="vertical-align: middle"> Технологии

- <img src="images/node.svg" width="24"> Node.js + @maxhub/max-bot-api
- <img src="images/database.svg" width="24"> PostgreSQL + pg
- <img src="images/ai.svg" width="24"> Yandex GPT
- <img src="images/chart.svg" width="24"> Chart.js (графики)
- <img src="images/parser.svg" width="24"> Axios + Cheerio (парсинг) 
- <img src="images/github.svg" width="24"> GitHub
 
## <img src="images/github.svg" width="24"> GitHub
[Перейти в репозиторий](https://github.com/xVOLKx/xvolkx-demo-bot)
 
## <img src="images/license.svg" width="28"> Лицензия

MIT © [xVOLKx](https://github.com/xVOLKx)
