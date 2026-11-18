// ============================================================
// XvolkX Demo Bot — главный файл (CRM + Parser + AI)
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
// СОЗДАНИЕ БОТА И ХРАНИЛИЩ
// ============================================================
const bot = new Bot(process.env.BOT_TOKEN);

// Состояния пользователей
const userStates = {};
const userSelections = {}; 

// Хранилище заявок (для Админ-бота)
const orders = [];
let stats = { orders: 0, users: new Set() };
const userCooldown = {};
const spamWords = ['тест', 'спам', 'проверка', '123', 'test', 'spam'];

// ID админа для уведомлений
const ADMIN_MAX_ID = Number(process.env.ADMIN_CHAT_ID);

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
// КОМАНДЫ АДМИН-БОТА (работают только в режиме ИИ)
// ============================================================

// Команда /order
bot.command('order', async (ctx) => {
  const userId = ctx.user?.user_id;
  
  // Проверка режима
  if (userSelections[userId] !== 'ai_mode') {
    return ctx.reply('🤔 Пожалуйста, сначала зайдите в раздел «Админ-бот с ИИ» в главном меню.', { attachments: [mainMenu()] });
  }

  const text = ctx.message?.body?.text?.replace('/order', '').trim() || '';

  if (!text) return ctx.reply('📝 Напишите заявку после команды, например: /order Нужен бот');
  if (text.length < 10) return ctx.reply('📝 Опишите заявку подробнее (минимум 10 символов)');
  
  if (spamWords.some(word => text.toLowerCase().includes(word))) {
    return ctx.reply('🚫 Ваша заявка похожа на спам.');
  }

  const now = Date.now();
  if (userCooldown[userId] && now - userCooldown[userId] < 60000) {
    return ctx.reply('⏳ Подождите 1 минуту между заявками.');
  }
  userCooldown[userId] = now;

  const order = {
    id: orders.length + 1,
    username: ctx.user?.username || 'без логина',
    userId: userId,
    text,
    time: new Date().toLocaleString('ru-RU'),
  };
  orders.push(order);

  if (ADMIN_MAX_ID) {
    try {
      await bot.api.sendMessage({
        chat_id: ADMIN_MAX_ID,
        text: `📩 *Новая заявка #${order.id}*\n👤 От: @${order.username}\n🆔 ID: ${order.userId}\n📅 Время: ${order.time}\n\n📝 Текст:\n${text}`,
        format: 'markdown'
      });
    } catch (e) {
      console.log('⚠️ Не удалось отправить уведомление админу:', e.message);
    }
  }

  stats.orders++;
  stats.users.add(userId);

  await ctx.reply(
    `✅ *Заявка #${order.id} принята!*\n\n` +
    `Администратор свяжется с вами в ближайшее время.`,
    { format: 'markdown', attachments: [aiMenu()] }
  );

// Команда /list (список заявок)
bot.command('list', async (ctx) => {
  const userId = ctx.user?.user_id;
  
  if (userSelections[userId] !== 'ai_mode') {
    return ctx.reply('🤔 Эта команда доступна только в разделе «Админ-бот с ИИ».');
  }
  
  if (userId !== ADMIN_MAX_ID) return; 

  if (orders.length === 0) return ctx.reply('📭 Заявок пока нет.');

  let text = '📋 *Список заявок:*\n\n';
  orders.forEach(o => {
    text += `📩 Заявка #${o.id} — @${o.username}\n`;
  });

  await ctx.reply(text, { format: 'markdown' });
});

// Команда /stats (статистика)
bot.command('stats', async (ctx) => {
  const userId = ctx.user?.user_id;
  
  if (userSelections[userId] !== 'ai_mode') {
    return ctx.reply('🤔 Эта команда доступна только в разделе «Админ-бот с ИИ».');
  }

  if (userId !== ADMIN_MAX_ID) return;

  await ctx.reply(
    `📊 *Статистика*\n\n📩 Заявок: ${stats.orders}\n👥 Пользователей: ${stats.users.size}`,
    { format: 'markdown' }
  );
});

// ============================================================
// ГЛАВНОЕ МЕНЮ — ОБРАБОТЧИКИ
// ============================================================
bot.action('open_crm', async (ctx) => {
  const userId = ctx.user?.user_id;
  userSelections[userId] = 'crm_mode'; 
  
  await ctx.reply(
    '🚀 *CRM-бот*\n\nУправление клиентами, заказами и статистикой.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [crmMenu()] }
  );
});

bot.action('open_parser', async (ctx) => {
  const userId = ctx.user?.user_id;
  userSelections[userId] = 'parser_mode'; 
  
  await ctx.reply(
    '📊 *Парсер валют*\n\nКурсы валют с ЦБ РФ, графики и ИИ-анализ.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [parserMenu()] }
  );
});

bot.action('open_ai', async (ctx) => {
  const userId = ctx.user?.user_id;
  userSelections[userId] = 'ai_mode'; 
  
  await ctx.reply(
    '🤖 *Админ-бот с ИИ*\n\nУмный помощник на базе Yandex GPT.\n\n👇 *Выберите действие:*',
    { format: 'markdown', attachments: [aiMenu()] }
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

// === ИИ: Задать вопрос ===
bot.action('ai_ask', async (ctx) => {
  const userId = ctx.user?.user_id;
  userStates[userId] = { action: 'ai_ask_question' };
  userSelections[userId] = 'ai_mode'; 
  
  await ctx.reply(
    '💬 *Задайте ваш вопрос:*\n\nПросто напишите его в чат, и я отвечу с помощью Yandex GPT.\n\n_(Также вы можете оставить заявку командой /order)_',
    { format: 'markdown', attachments: [aiMenu()] }
  );
  await ctx.answerOnCallback({ notification: '' });
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

// === Команды ===
bot.action('open_commands', async (ctx) => {
  await ctx.reply(
    '📚 *Доступные команды:*\n\n' +
    '🤖 *Админ-бот с ИИ:*\n' +
    '• /order — оставить заявку\n' +
    '• /list — список заявок (админ)\n' +
    '• /stats — статистика заявок (админ)\n\n' +
    '📊 *CRM-бот:*\n' +
    '• Напиши в чат слово *статистика* — общая статистика\n' +
    '• Напиши *топ клиентов* — топ-5 клиентов\n' +
    '• Напиши *отчёт за 3 дня* — последние заказы\n' +
    '• Напиши *прогноз* — прогноз заказов\n\n' +
    '📈 *Парсер валют:*\n' +
    '• Используй кнопки в меню Парсера.\n\n' +
    '👇 Выберите раздел, чтобы начать!',
    { format: 'markdown', attachments: [mainMenu()] }
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
    const userId = ctx.user?.user_id;
    
    let selected = userSelections[userId];
    if (!Array.isArray(selected)) selected = [];

    let rates = await parser.getLatestRates();
    if (selected.length > 0) {
      rates = rates.filter(r => selected.includes(r.name));
    }

    const uniqueRates = [];
    const seen = new Set();
    for (const rate of rates) {
      if (!seen.has(rate.name)) {
        seen.add(rate.name);
        uniqueRates.push(rate);
      }
    }

    if (uniqueRates.length === 0) {
      await ctx.reply('❌ Вы не выбрали ни одной валюты. Используйте "Выбор валют".');
      return;
    }

    const chart = await parser.createChart(uniqueRates.slice(0, 10));

    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    const tmpPath = path.join(__dirname, 'tmp-chart.png');
    fs.writeFileSync(tmpPath, chart);

    const uploadData = await ctx.api.raw.post('uploads', { query: { type: 'image' } });
    const form = new FormData();
    form.append('data', fs.createReadStream(tmpPath));
    const axios = require('axios');
    const response = await axios.post(uploadData.url, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const keys = Object.keys(response.data.photos);
    const token = response.data.photos[keys[0]].token;

    fs.unlinkSync(tmpPath);

    await ctx.reply('📊 Ваш график курсов', {
      attachments: [{ type: 'image', payload: { token } }],
    });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при построении графика');
  }
});

// Выбор валют
bot.action('parser_select', async (ctx) => {
  try {
    const rates = await parser.parseCBR();
    const userId = ctx.user?.user_id;
    
    if (!Array.isArray(userSelections[userId])) {
      userSelections[userId] = [];
    }
    
    const { selectCurrenciesKeyboard } = require('./utils/keyboard');
    
    await ctx.reply(
      '🔧 *Выберите валюты для отслеживания (нажмите на валюту, чтобы включить/отключить):*',
      { format: 'markdown', attachments: [selectCurrenciesKeyboard(rates, userSelections[userId], 0)] }
    );
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при загрузке списка валют');
  }
});

// ============================================================
// ОБРАБОТКА КНОПОК ВЫБОРА ВАЛЮТ (TOGGLE)
// ============================================================
bot.action(/toggle_currency_(\d+)/, async (ctx) => {
  const index = parseInt(ctx.match[1]);
  const userId = ctx.user?.user_id;
  
  try {
    const rates = await parser.parseCBR();
    
    if (index >= rates.length) {
       await ctx.answerOnCallback({ notification: 'Ошибка: валюта не найдена' });
       return;
    }
    
    if (!Array.isArray(userSelections[userId])) {
      userSelections[userId] = [];
    }

    const currencyName = rates[index].name;
    
    const idx = userSelections[userId].indexOf(currencyName);
    if (idx > -1) {
      userSelections[userId].splice(idx, 1);
    } else {
      userSelections[userId].push(currencyName);
    }
    
    const { selectCurrenciesKeyboard } = require('./utils/keyboard');
    const keyboard = selectCurrenciesKeyboard(rates, userSelections[userId], 0);
    
    try {
      await ctx.editMessage({
        text: '🔧 *Выберите валюты для отслеживания:*',
        format: 'markdown',
        attachments: [keyboard]
      });
    } catch (e) {
      console.log('⚠️ Ошибка редактирования, пробуем отправить новое:', e.message);
      await ctx.reply('🔧 *Выберите валюты для отслеживания:*', { format: 'markdown', attachments: [keyboard] });
    }

    await ctx.answerOnCallback({ notification: '' });
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в toggle_currency_:', error);
    await ctx.answerOnCallback({ notification: 'Ошибка' }).catch(() => {});
  }
});

// ============================================================
// ПАГИНАЦИЯ (СТРЕЛОЧКИ)
// ============================================================
bot.action(/page_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const userId = ctx.user?.user_id;
  
  try {
    const rates = await parser.parseCBR();
    
    if (!Array.isArray(userSelections[userId])) {
      userSelections[userId] = [];
    }

    const { selectCurrenciesKeyboard } = require('./utils/keyboard');
    const keyboard = selectCurrenciesKeyboard(rates, userSelections[userId], page);

    try {
      await ctx.editMessage({
        text: '🔧 *Выберите валюты для отслеживания:*',
        format: 'markdown',
        attachments: [keyboard]
      });
    } catch (e) {
      console.log('⚠️ Ошибка редактирования при пагинации, отправляем новое');
      await ctx.reply('🔧 *Выберите валюты для отслеживания:*', { format: 'markdown', attachments: [keyboard] });
    }

    await ctx.answerOnCallback({ notification: '' });
    
  } catch (error) {
    console.error('❌ Ошибка в пагинации:', error);
    await ctx.answerOnCallback({ notification: 'Ошибка' }).catch(() => {});
  }
});

// Кнопка "Готово"
bot.action('currencies_done', async (ctx) => {
  const userId = ctx.user?.user_id;
  const selected = userSelections[userId] || [];
  
  if (!Array.isArray(selected) || selected.length === 0) {
    await ctx.answerOnCallback({ notification: 'Вы не выбрали ни одной валюты' });
    return;
  }
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}

  await ctx.reply(
    `✅ *Вы выбрали:* ${selected.length} валют. Теперь графики будут строиться только по ним.`
  );
  await ctx.answerOnCallback({ notification: '' });
});

bot.action('noop', async (ctx) => {
  await ctx.answerOnCallback({ notification: '' });
});

// Полный отчёт (График + ИИ в одном сообщении)
bot.action('parser_report', async (ctx) => {
  try {
    await ctx.reply('⏳ Собираю данные, строю график и анализирую...');
    const userId = ctx.user?.user_id;
    
    let selected = userSelections[userId];
    if (!Array.isArray(selected)) selected = [];

    let rates = await parser.getLatestRates();
    if (selected.length > 0) {
      rates = rates.filter(r => selected.includes(r.name));
    }

    const uniqueRates = [];
    const seen = new Set();
    for (const rate of rates) {
      if (!seen.has(rate.name)) {
        seen.add(rate.name);
        uniqueRates.push(rate);
      }
    }

    if (uniqueRates.length === 0) {
      await ctx.reply('📭 Вы не выбрали валюты. Используйте "Выбор валют".');
      return;
    }

    const chart = await parser.createChart(uniqueRates.slice(0, 10));

    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    const tmpPath = path.join(__dirname, 'tmp-chart.png');
    fs.writeFileSync(tmpPath, chart);

    const uploadData = await ctx.api.raw.post('uploads', { query: { type: 'image' } });
    const form = new FormData();
    form.append('data', fs.createReadStream(tmpPath));
    const axios = require('axios');
    const response = await axios.post(uploadData.url, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    const keys = Object.keys(response.data.photos);
    const token = response.data.photos[keys[0]].token;
    fs.unlinkSync(tmpPath);

    let text = '📊 *Курсы валют (ЦБ РФ)*\n\n';
    uniqueRates.slice(0, 7).forEach(item => {
      text += `• ${item.name}: ${parseFloat(item.value).toFixed(2)} ₽\n`;
    });
    if (uniqueRates.length > 7) text += `\n_... и ещё ${uniqueRates.length - 7} валют_`;

    const analysis = await parser.analyzeRates(uniqueRates.slice(0, 10));
    text += `\n\n🤖 *Анализ и прогноз:*\n${analysis}`;

    await ctx.reply(text, {
      format: 'markdown',
      attachments: [{ type: 'image', payload: { token } }],
    });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при формировании отчёта');
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
    const mode = userSelections[userId]; 

    if (mode === 'ai_mode') {
      try {
        const answer = await ai.askDeveloper(text);
        await ctx.reply(`🤖 ${answer}`, { format: 'markdown' });
      } catch (err) {
        console.error(err);
        await ctx.reply('❌ Ошибка при запросе к ИИ.');
      }
    } else if (mode === 'crm_mode') {
      try {
        const answer = await crm.smartAskYandexGPT(text);
        await ctx.reply(`🤖 ${answer}`, { format: 'markdown' });
      } catch (err) {
        console.error(err);
        await ctx.reply('❌ Ошибка при запросе к CRM.');
      }
    } else {
      await ctx.reply(
        '🤔 Пожалуйста, сначала выберите нужный раздел в меню (CRM, Парсер или ИИ).',
        { attachments: [mainMenu()] }
      );
    }
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
    await crm.initDatabase();
    await parser.initParserDatabase();
    
    parser.startCron(bot, process.env.ADMIN_CHAT_ID);

    bot.start();
    console.log('🚀 XvolkX Demo Bot запущен!');
  } catch (err) {
    console.error('❌ Ошибка запуска:', err);
  }
}
start();