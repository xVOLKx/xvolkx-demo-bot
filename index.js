// ============================================================
// XvolkX Demo Bot — главный файл (CRM + Parser)
// ============================================================
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const { Bot, Keyboard } = require('@maxhub/max-bot-api');
const { mainMenu, crmMenu, parserMenu, aiMenu } = require('./utils/keyboard');

// Модули
const crm = require('./modules/crm');
const parser = require('./modules/parser');
const ai = require('./modules/ai');

// ============================================================
// СОЗДАНИЕ БОТА
// ============================================================
const bot = new Bot(process.env.BOT_TOKEN);

// Состояния пользователей (для диалогов)
const userStates = {};
const userSelections = {};

// ============================================================
// ГЛАВНОЕ МЕНЮ
// ============================================================
async function showMainMenu(ctx) {
  await ctx.reply(
    '👋 *XvolkX Demo Bot*\n\n' +
    '🚀 Демонстрация моих проектов:\n\n' +
    '• *CRM-бот* — управление клиентами\n' +
    '• *Парсер валют* — курсы ЦБ с графиками\n' +
    '• *Админ-бот с ИИ* — умный помощник\n\n' +
    '👇 *Выберите проект:*',
    { format: 'markdown', attachments: [mainMenu()] }
  );
}

// ============================================================
// /start
// ============================================================
bot.command('start', async (ctx) => {
  const userId = ctx.user?.user_id;
  const fullName = ctx.user?.name;
  const username = ctx.user?.username;

  try {
    await crm.createUser(userId, fullName, username);
  } catch (err) {
    console.error('Ошибка создания пользователя:', err.message);
  }

  await showMainMenu(ctx);
});

// ============================================================
// ГЛАВНОЕ МЕНЮ — ОБРАБОТЧИКИ
// ============================================================
bot.action('open_crm', async (ctx) => {
  await ctx.reply(
    '🚀 *CRM-бот*\n\nУправление клиентами, заказами и статистикой.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [crmMenu()] }
  );
});

bot.action('open_parser', async (ctx) => {
  await ctx.reply(
    '📊 *Парсер валют*\n\nКурсы валют с ЦБ РФ, графики и ИИ-анализ.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [parserMenu()] }
  );
});

bot.action('open_ai', async (ctx) => {
  await ctx.reply(
    '🤖 *Админ-бот с ИИ*\n\nУмный помощник на базе Yandex GPT.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [aiMenu()] }
  );
});

// === ИИ: Задать вопрос ===
bot.action('ai_ask', async (ctx) => {
  const userId = ctx.user?.user_id;
  userStates[userId] = { action: 'ai_ask_question' };
  await ctx.reply(
    '💬 *Введите ваш вопрос:*\n\nЯ отвечу на любые темы про разработку, IT, карьеру.',
    { format: 'markdown' }
  );
});

// === ИИ: О боте ===
bot.action('ai_about', async (ctx) => {
  await ctx.reply(
    '📖 *О боте с ИИ*\n\n' +
    'Этот бот использует **Yandex GPT** — российскую языковую модель.\n\n' +
    '🤖 Что умеет:\n' +
    '• Отвечать на вопросы про IT\n' +
    '• Помогать с кодом\n' +
    '• Генерировать идеи для заказов\n' +
    '• Консультировать по разработке\n\n' +
    '💡 Попробуйте: спросите про Node.js, Telegram-ботов, парсинг или архитектуру.',
    { format: 'markdown', attachments: [aiMenu()] }
  );
});

// === ИИ: Примеры ===
bot.action('ai_examples', async (ctx) => {
  await ctx.reply(
    '💡 *Примеры вопросов:*\n\n' +
    '• Что такое async/await в Node.js?\n' +
    '• Как работает PostgreSQL?\n' +
    '• Какую БД выбрать для Telegram-бота?\n' +
    '• Как защитить API от спама?\n' +
    '• Что такое Docker и зачем он нужен?\n' +
    '• Идеи для простых Telegram-ботов\n\n' +
    '👇 Просто напишите вопрос.',
    { format: 'markdown', attachments: [aiMenu()] }
  );
});

bot.action('open_help', async (ctx) => {
  await ctx.reply(
    '❓ *Помощь*\n\n' +
    'Это демонстрационный бот *XvolkX Demo Bot*.\n\n' +
    'Стек: Node.js, TypeScript, PostgreSQL, Yandex GPT.\n\n' +
    'GitHub: github.com/xVOLKx',
    { format: 'markdown', attachments: [mainMenu()] }
  );
});

bot.action('back_main', async (ctx) => {
  await showMainMenu(ctx);
});

// ============================================================
// CRM — ОБРАБОТЧИКИ
// ============================================================
bot.action('crm_clients', async (ctx) => {
  try {
    const clients = await crm.getClients();
    const text = crm.formatClients(clients);
    await ctx.reply(text, { format: 'markdown', attachments: [crmMenu()] });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при получении клиентов');
  }
});

bot.action('crm_add_client', async (ctx) => {
  const userId = ctx.user?.user_id;
  userStates[userId] = { action: 'add_client_name' };
  await ctx.reply('📝 *Введите имя клиента:*', { format: 'markdown' });
});

bot.action('crm_orders', async (ctx) => {
  try {
    const orders = await crm.getOrders();
    const text = crm.formatOrders(orders);
    await ctx.reply(text, { format: 'markdown', attachments: [crmMenu()] });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при получении заказов');
  }
});

bot.action('crm_add_order', async (ctx) => {
  const userId = ctx.user?.user_id;
  const clients = await crm.getClients();

  if (clients.length === 0) {
    await ctx.reply('❌ Сначала добавьте клиента.');
    return;
  }

  let text = '📝 *Выберите клиента для заказа:*\n\n';
  clients.forEach((c) => {
    text += `🆔 ${c.id} — ${c.name}\n`;
  });

  userStates[userId] = { action: 'add_order_client' };
  await ctx.reply(text, { format: 'markdown' });
});

bot.action('crm_stats', async (ctx) => {
  try {
    const stats = await crm.getStats();
    const text = crm.formatStats(stats);
    await ctx.reply(text, { format: 'markdown', attachments: [crmMenu()] });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при получении статистики');
  }
});

bot.action('crm_change_status', async (ctx) => {
  const userId = ctx.user?.user_id;
  userStates[userId] = { action: 'change_status_order' };
  await ctx.reply('🔄 *Введите ID заказа для смены статуса:*', { format: 'markdown' });
});

// ============================================================
// ПАРСЕР ВАЛЮТ — ОБРАБОТЧИКИ
// ============================================================

// Получить курсы
bot.action('parser_rates', async (ctx) => {
  try {
    await ctx.reply('⏳ Собираю данные с ЦБ РФ...');
    const rates = await parser.parseCBR();
    await parser.saveRates(rates);

    const text = parser.formatRates(rates);
    await ctx.reply(text, { format: 'markdown', attachments: [parserMenu()] });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при парсинге курсов');
  }
});

// Топ-10 изменений
bot.action('parser_top', async (ctx) => {
  try {
    const top = await parser.getTopChanges();
    const text = parser.formatTop(top);
    await ctx.reply(text, { format: 'markdown', attachments: [parserMenu()] });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при получении топа');
  }
});

// График за неделю
bot.action('parser_week', async (ctx) => {
  try {
    await ctx.reply('⏳ Строю график...');
    const rates = await parser.getLatestRates();
    const chart = await parser.createChart(rates.slice(0, 10));

    // Используем uploadImage из MAX (через ctx.api.raw + axios)
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');

    // Сохраняем временно
    const tmpPath = path.join(__dirname, 'tmp-chart.png');
    fs.writeFileSync(tmpPath, chart);

    // Получаем URL для загрузки
    const uploadData = await ctx.api.raw.post('uploads', { query: { type: 'image' } });

    // Загружаем
    const form = new FormData();
    form.append('data', fs.createReadStream(tmpPath));
    const axios = require('axios');
    const response = await axios.post(uploadData.url, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Извлекаем токен
    const keys = Object.keys(response.data.photos);
    const token = response.data.photos[keys[0]].token;

    // Удаляем временный файл
    fs.unlinkSync(tmpPath);

    // Отправляем
    await ctx.reply('📊 График курсов (топ-10)', {
      attachments: [{ type: 'image', payload: { token } }],
    });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при построении графика');
  }
});

// Выбор валют
bot.action('parser_select', async (ctx) => {
  const userId = ctx.user?.user_id;
  if (!userSelections[userId]) userSelections[userId] = [];

  await ctx.reply(
    '🔧 *Выберите валюты (пока заглушка — выбранные в будущем)*',
    { format: 'markdown', attachments: [parserMenu()] }
  );
});

// ИИ-анализ
bot.action('parser_ai', async (ctx) => {
  try {
    await ctx.reply('🤖 Анализирую курсы...');
    const rates = await parser.getLatestRates();

    if (rates.length === 0) {
      await ctx.reply('📭 Нет данных. Сначала нажмите "Курсы ЦБ".');
      return;
    }

    const analysis = await parser.analyzeRates(rates);
    await ctx.reply(`🤖 *Анализ курсов:*\n\n${analysis}`, { format: 'markdown' });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка ИИ-анализа');
  }
});

// ============================================================
// ОБРАБОТКА ТЕКСТА (диалоги)
// ============================================================
bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text;
  if (!text || text.startsWith('/')) return;

  const userId = ctx.user?.user_id;
  const state = userStates[userId];

  if (!state) {
    // Если не диалог — просто заглушка
    await ctx.reply(
      '🤔 Я понимаю только кнопки. Используйте /start, чтобы открыть главное меню.',
      { attachments: [mainMenu()] }
    );
    return;
  }

  // === CRM: добавление клиента ===
  if (state.action === 'add_client_name') {
    state.name = text;
    state.action = 'add_client_phone';
    await ctx.reply('📞 *Введите телефон (или напишите «нет»):*', { format: 'markdown' });
    return;
  }

  if (state.action === 'add_client_phone') {
    state.phone = text.toLowerCase() === 'нет' ? '' : text;
    state.action = 'add_client_email';
    await ctx.reply('✉️ *Введите email (или напишите «нет»):*', { format: 'markdown' });
    return;
  }

  if (state.action === 'add_client_email') {
    state.email = text.toLowerCase() === 'нет' ? '' : text;
    try {
      await crm.addClient(state.name, state.phone, state.email);
      delete userStates[userId];
      await ctx.reply(
        `✅ Клиент *${state.name}* добавлен!`,
        { format: 'markdown', attachments: [crmMenu()] }
      );
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при добавлении клиента');
    }
    return;
  }

  // === CRM: добавление заказа ===
  if (state.action === 'add_order_client') {
    const clientId = parseInt(text);
    if (isNaN(clientId)) {
      await ctx.reply('❌ Введите числовой ID клиента.');
      return;
    }
    state.clientId = clientId;
    state.action = 'add_order_description';
    await ctx.reply('📝 *Введите описание заказа:*', { format: 'markdown' });
    return;
  }

  if (state.action === 'add_order_description') {
    try {
      const order = await crm.addOrder(state.clientId, text);
      if (!order) {
        await ctx.reply('❌ Клиент не найден.');
        delete userStates[userId];
        return;
      }
      delete userStates[userId];
      await ctx.reply(
        `✅ Заказ *#${order.id}* добавлен!`,
        { format: 'markdown', attachments: [crmMenu()] }
      );
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при добавлении заказа');
    }
    return;
  }

  // === CRM: смена статуса ===
  if (state.action === 'change_status_order') {
    const orderId = parseInt(text);
    if (isNaN(orderId)) {
      await ctx.reply('❌ Введите числовой ID заказа.');
      return;
    }
    state.orderId = orderId;
    state.action = 'change_status_value';
    await ctx.reply(
      '📊 *Введите новый статус:*\n\n• new\n• in_progress\n• completed',
      { format: 'markdown' }
    );
    return;
  }

  if (state.action === 'change_status_value') {
    const valid = ['new', 'in_progress', 'completed'];
    if (!valid.includes(text)) {
      await ctx.reply('❌ Используйте: new, in_progress, completed');
      return;
    }
    try {
      const order = await crm.changeOrderStatus(state.orderId, text, userId);
      delete userStates[userId];
      if (!order) {
        await ctx.reply('❌ Заказ не найден.');
        return;
      }
      await ctx.reply(
        `✅ Статус заказа *#${order.id}* изменён на *${text}*`,
        { format: 'markdown', attachments: [crmMenu()] }
      );
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при смене статуса');
    }
    return;
  }

  // === ИИ: обработка вопроса ===
  if (state.action === 'ai_ask_question') {
    delete userStates[userId];

    await ctx.reply('🤔 Думаю...');

    try {
      const answer = await ai.askDeveloper(text);
      await ctx.reply(`🤖 ${answer}`, {
        format: 'markdown',
        attachments: [aiMenu()],
      });
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при запросе к ИИ.');
    }
    return;
  }
});

// ============================================================
// ЗАПУСК
// ============================================================
async function start() {
  try {
    // Инициализация БД (ВРЕМЕННО ОТКЛЮЧЕНО ДО VPS)
    // await crm.initDatabase();
    // await parser.initParserDatabase();
    // parser.startCron(bot, process.env.ADMIN_CHAT_ID);

    bot.start();
    console.log('🚀 XvolkX Demo Bot запущен (БД отключена — ждём VPS)!');
  } catch (err) {
    console.error('❌ Ошибка запуска:', err);
  }
}

start();