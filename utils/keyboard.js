const { Keyboard } = require('@maxhub/max-bot-api');

// ============================================================
// ГЛАВНОЕ МЕНЮ (XvolkX Demo Bot)
// ============================================================
function mainMenu() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('🚀 CRM-бот', 'open_crm'),
      Keyboard.button.callback('📊 Парсер валют', 'open_parser'),
    ],
    [
      Keyboard.button.callback('🤖 Админ-бот с ИИ', 'open_ai'),
      Keyboard.button.callback('❓ Помощь', 'open_help'),
    ],
  ]);
}

// ============================================================
// МЕНЮ CRM
// ============================================================
function crmMenu() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📋 Клиенты', 'crm_clients'),
      Keyboard.button.callback('➕ Добавить клиента', 'crm_add_client'),
    ],
    [
      Keyboard.button.callback('📦 Заказы', 'crm_orders'),
      Keyboard.button.callback('➕ Добавить заказ', 'crm_add_order'),
    ],
    [
      Keyboard.button.callback('📊 Статистика', 'crm_stats'),
      Keyboard.button.callback('🔄 Сменить статус', 'crm_change_status'),
    ],
    [Keyboard.button.callback('⬅️ Назад', 'back_main')],
  ]);
}

// ============================================================
// МЕНЮ ПАРСЕРА ВАЛЮТ
// ============================================================
function parserMenu() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📊 Курсы ЦБ', 'parser_rates'),
      Keyboard.button.callback('📈 Топ-10 изменений', 'parser_top'),
    ],
    [
      Keyboard.button.callback('📉 График за неделю', 'parser_week'),
      Keyboard.button.callback('⚙️ Выбор валют', 'parser_select'),
    ],
    [
      Keyboard.button.callback('🤖 ИИ-анализ', 'parser_ai'),
    ],
    [Keyboard.button.callback('⬅️ Назад', 'back_main')],
  ]);
}

// ============================================================
// МЕНЮ АДМИН-БОТ С ИИ
// ============================================================
function aiMenu() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('💬 Задать вопрос', 'ai_ask'),
      Keyboard.button.callback('📖 О боте', 'ai_about'),
    ],
    [
      Keyboard.button.callback('💡 Примеры', 'ai_examples'),
    ],
    [Keyboard.button.callback('⬅️ Назад', 'back_main')],
  ]);
}

// ============================================================
// МЕНЮ ВЫБОРА ВАЛЮТ (динамическое)
// ============================================================
function selectCurrenciesKeyboard(currencies, selected, page = 0, perPage = 10) {
  const start = page * perPage;
  const end = start + perPage;
  const pageCurrencies = currencies.slice(start, end);

  const rows = [];
  for (let i = 0; i < pageCurrencies.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < pageCurrencies.length; j++) {
      const currency = pageCurrencies[j];
      const isSelected = selected.includes(currency.name);
      row.push(
        Keyboard.button.callback(
          `${isSelected ? '✅' : '⬜️'} ${currency.name}`,
          `toggle_currency_${start + j}`
        )
      );
    }
    rows.push(row);
  }

  // Кнопки навигации
  const navRow = [];
  const totalPages = Math.ceil(currencies.length / perPage);
  if (page > 0) navRow.push(Keyboard.button.callback('⬅️', `page_${page - 1}`));
  navRow.push(Keyboard.button.callback(`${page + 1}/${totalPages}`, 'noop'));
  if (page < totalPages - 1) navRow.push(Keyboard.button.callback('➡️', `page_${page + 1}`));
  rows.push(navRow);

  rows.push([Keyboard.button.callback('✅ Готово', 'currencies_done')]);

  return Keyboard.inlineKeyboard(rows);
}

// ============================================================
// ЭКСПОРТ
// ============================================================
module.exports = {
  mainMenu,
  crmMenu,
  parserMenu,
  aiMenu,
  selectCurrenciesKeyboard,
};