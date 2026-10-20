// ============================================================
// МОДУЛЬ БОТА С ИИ (полная версия для MAX)
// ============================================================
const axios = require('axios');

// ============================================================
// ОСНОВНОЙ ЗАПРОС К YANDEX GPT
// ============================================================
async function askYandexGPT(prompt, context = '') {
  try {
    const contextPrompt = `
${context ? context + '\n\n' : ''}Вопрос пользователя: "${prompt}"`;

    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: { temperature: 0.6, maxTokens: 300 },
        messages: [{ role: 'user', text: contextPrompt }],
      },
      {
        headers: {
          'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.result.alternatives[0].message.text;
  } catch (err) {
    console.error('❌ Ошибка ИИ:', err.message);
    return '⚠️ ИИ временно недоступен. Попробуйте позже.';
  }
}

// ============================================================
// ОБЩИЙ АССИСТЕНТ (с контекстом про разработку)
// ============================================================
async function askDeveloper(prompt) {
  const context = `
Ты — опытный IT-консультант и помощник backend-разработчика.
Ты знаешь:
- Node.js, TypeScript
- Telegram-боты (Telegraf), MAX-боты
- PostgreSQL, Sequelize, pg
- Парсинг (Axios, Cheerio)
- Yandex GPT, GigaChat
- Docker, Redis, Bull
- Архитектуру, API, REST

Отвечай кратко, по делу, дружелюбно.
Если вопрос про разработку — дай практический совет.
Если вопрос не по теме — вежливо направь к IT.

`;

  return await askYandexGPT(prompt, context);
}

// ============================================================
// КОД-ПОМОЩНИК (разбор кода)
// ============================================================
async function askCodeHelper(code, question = 'Что делает этот код?') {
  const context = `
Ты — опытный разработчик. Помоги разобраться с кодом.
Отвечай понятно, разбирай по шагам.
Если видишь ошибку — укажи её.

Код:
\`\`\`
${code}
\`\`\`

`;

  return await askYandexGPT(question, context);
}

// ============================================================
// ГЕНЕРАЦИЯ ИДЕЙ ДЛЯ ЗАКАЗОВ
// ============================================================
async function generateIdea(topic = 'Telegram-бот для бизнеса') {
  const context = `
Ты — бизнес-аналитик для IT-фрилансера.
Придумай 3-5 идей по теме: "${topic}".
Для каждой идеи:
- Название
- Что делает
- Кому нужно
- Примерная цена

`;

  return await askYandexGPT('Предложи идеи.', context);
}

// ============================================================
// ЭКСПОРТ
// ============================================================
module.exports = {
  askYandexGPT,
  askDeveloper,
  askCodeHelper,
  generateIdea,
};