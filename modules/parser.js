// ============================================================
// МОДУЛЬ ПАРСЕРА ВАЛЮТ (полная версия для MAX)
// ============================================================
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const cron = require('node-cron');
const crm = require('./crm'); // используем pool из CRM

const pool = crm.pool;

// ============================================================
// С ПРАВИЛЬНЫМ RETRY
// ============================================================
async function query(text, params = [], retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (err.code === 'ECONNRESET' && i < retries - 1) {
        console.log(`⚠️ Parser ECONNRESET, попытка ${i + 2}/${retries}...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ БД (таблица для курсов)
// ============================================================
async function initParserDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS parser_rates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      value NUMERIC(15, 4) NOT NULL,
      fetched_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Parser: таблица создана');
}

// ============================================================
// ПАРСИНГ КУРСОВ ЦБ РФ
// ============================================================
async function parseCBR() {
  const url = 'https://www.cbr.ru/scripts/XML_daily.asp';
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const decoded = iconv.decode(response.data, 'win1251');
  const $ = cheerio.load(decoded, { xmlMode: true });

  const rates = [];
  $('Valute').each((i, el) => {
    const name = $(el).find('Name').text().trim();
    const value = parseFloat($(el).find('Value').text().replace(',', '.'));
    rates.push({ name, value });
  });

  return rates;
}

// ============================================================
// СОХРАНЕНИЕ КУРСОВ В БД
// ============================================================
async function saveRates(rates) {
  for (const rate of rates) {
    await query(
      'INSERT INTO parser_rates (name, value) VALUES ($1, $2)',
      [rate.name, rate.value]
    );
  }
  console.log(`✅ Сохранено ${rates.length} курсов`);
}

// ============================================================
// ПОЛУЧЕНИЕ ПОСЛЕДНИХ КУРСОВ
// ============================================================
async function getLatestRates() {
  const res = await query(`
    SELECT name, value, MAX(fetched_at) AS fetched_at
    FROM parser_rates
    GROUP BY name, value
    ORDER BY fetched_at DESC
  `);
  return res.rows;
}

// ============================================================
// ТОП-10 ИЗМЕНЕНИЙ
// ============================================================
async function getTopChanges() {
  // Получаем курсы за последние 2 дня
  const res = await query(`
    SELECT name, value, fetched_at
    FROM parser_rates
    ORDER BY fetched_at DESC
    LIMIT 100
  `);

  if (res.rows.length < 2) return [];

  const latest = {};
  const previous = {};

  res.rows.forEach((row) => {
    const date = new Date(row.fetched_at).toDateString();
    if (!latest[date]) latest[date] = {};
    latest[date][row.name] = row.value;
  });

  const dates = Object.keys(latest).sort().reverse();
  if (dates.length < 2) return [];

  const today = latest[dates[0]];
  const yesterday = latest[dates[1]];

  const changes = [];
  for (const name in today) {
    if (yesterday[name]) {
      const change = ((today[name] - yesterday[name]) / yesterday[name]) * 100;
      changes.push({ name, value: today[name], change });
    }
  }

  return changes
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 10);
}

// ============================================================
// ГРАФИК
// ============================================================
async function createChart(rates) {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, '#4F8CF7');
  gradient.addColorStop(1, '#A855F7');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rates.map(r => r.name),
      datasets: [{
        label: 'Курс (₽)',
        data: rates.map(r => r.value),
        backgroundColor: gradient,
        borderColor: '#4F8CF7',
        borderWidth: 2,
        borderRadius: 4,
      }],
    },
    options: {
      plugins: {
        legend: { labels: { color: '#ffffff' } },
      },
      scales: {
        x: { ticks: { color: '#ffffff' } },
        y: { ticks: { color: '#ffffff' } },
      },
    },
  });

  return canvas.toBuffer('image/png');
}

// ============================================================
// ИИ-АНАЛИЗ
// ============================================================
async function analyzeRates(rates) {
  try {
    const prompt = `Проанализируй кратко курсы валют: ${rates.map(r => `${r.name}: ${r.value} ₽`).join(', ')}. Напиши 1-2 предложения анализа и 1 прогноз.`;
    
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: { temperature: 0.6, maxTokens: 200 },
        messages: [{ role: 'user', text: prompt }],
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
    return '⚠️ ИИ временно недоступен.';
  }
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function formatRates(rates) {
  let text = '📊 *Курсы валют (ЦБ РФ):*\n\n';
  rates.slice(0, 7).forEach((r) => {
    text += `• ${r.name}: ${parseFloat(r.value).toFixed(2)} ₽\n`;
  });
  if (rates.length > 7) {
    text += `\n_... и ещё ${rates.length - 7} валют_`;
  }
  return text;
}

function formatTop(changes) {
  if (changes.length === 0) return '📭 Нет данных для сравнения.';
  
  let text = '📈 *Топ-10 изменений:*\n\n';
  changes.forEach((item, i) => {
    const sign = item.change > 0 ? '+' : '';
    text += `${i + 1}. ${item.name}: ${parseFloat(item.value).toFixed(2)} ₽ (${sign}${item.change.toFixed(2)}%)\n`;
  });
  return text;
}

// ============================================================
// CRON (ежедневный отчёт)
// ============================================================
function startCron(bot, ADMIN_ID) {
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('⏳ Cron: парсинг курсов...');
      const rates = await parseCBR();
      await saveRates(rates);
      
      const chart = await createChart(rates.slice(0, 10));
      console.log('✅ Cron: график создан');

      // Тут можно было бы отправить в MAX, но для простоты просто лог
      console.log('✅ Cron: отчёт готов');
    } catch (err) {
      console.error('❌ Cron ошибка:', err.message);
    }
  });
  console.log('✅ Parser Cron запущен (9:00)');
}

// ============================================================
// ЭКСПОРТ
// ============================================================
module.exports = {
  initParserDatabase,
  parseCBR,
  saveRates,
  getLatestRates,
  getTopChanges,
  createChart,
  analyzeRates,
  formatRates,
  formatTop,
  startCron,
};