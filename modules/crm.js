// ============================================================
// МОДУЛЬ CRM-БОТ (полная версия на pg для MAX)
// С обработкой ECONNRESET (retry + keepalive)
// ============================================================
const { Pool } = require('pg');
const axios = require('axios');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

// ============================================================
// ПОДКЛЮЧЕНИЕ К БД (через pg.Pool)
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  application_name: 'xvolkx-demo-bot',
});

// ============================================================
// QUERY С RETRY (для обработки ECONNRESET)
// ============================================================
async function query(text, params = [], retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (err.code === 'ECONNRESET' && i < retries - 1) {
        console.log(`⚠️ ECONNRESET, попытка ${i + 2}/${retries}...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// KEEPALIVE (чтобы Supabase не закрывал соединение)
// ============================================================
function startKeepAlive() {
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      console.error('⚠️ Keepalive ошибка:', err.message);
    }
  }, 30000); // каждые 30 секунд
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ БД (создание таблиц)
// ============================================================
async function initDatabase() {
  console.log('⏳ Подключение к БД...');

  const client = await pool.connect();
  console.log('✅ База подключена');

  console.log('⏳ Создание таблицы crm_users...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_users (
      id SERIAL PRIMARY KEY,
      user_id BIGINT UNIQUE NOT NULL,
      full_name VARCHAR(255),
      username VARCHAR(255),
      role VARCHAR(50) DEFAULT 'client',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ crm_users создана');

  console.log('⏳ Создание таблицы crm_clients...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ crm_clients создана');

  console.log('⏳ Создание таблицы crm_orders...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_orders (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES crm_clients(id) ON DELETE SET NULL,
      manager_id INTEGER,
      status VARCHAR(50) DEFAULT 'new',
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ crm_orders создана');

  console.log('⏳ Создание таблицы crm_order_history...');
  try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_order_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER,
      status_from VARCHAR(50),
      status_to VARCHAR(50),
      changed_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ crm_order_history создана');
} catch (err) {
  console.error('⚠️ crm_order_history:', err.message);
}
  client.release();
  console.log('✅ CRM: таблицы созданы');

  startKeepAlive();
  console.log('✅ Keepalive запущен (30 сек)');
}

// ============================================================
// ПОЛЬЗОВАТЕЛИ И РОЛИ
// ============================================================
async function getUser(userId) {
  const res = await query('SELECT * FROM crm_users WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

async function createUser(userId, fullName, username) {
  const existing = await getUser(userId);
  if (existing) return existing;

  const res = await query(
    'INSERT INTO crm_users (user_id, full_name, username) VALUES ($1, $2, $3) RETURNING *',
    [userId, fullName || '', username || '']
  );
  return res.rows[0];
}

async function isAdmin(userId) {
  const user = await getUser(userId);
  return user && user.role === 'admin';
}

async function setRole(userId, role) {
  const res = await query(
    'UPDATE crm_users SET role = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
    [role, userId]
  );
  return res.rows[0] || null;
}

// ============================================================
// КЛИЕНТЫ
// ============================================================
async function addClient(name, phone = '', email = '') {
  const res = await query(
    'INSERT INTO crm_clients (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
    [name, phone, email]
  );
  return res.rows[0];
}

async function getClients() {
  const res = await query('SELECT * FROM crm_clients ORDER BY created_at DESC');
  return res.rows;
}

async function findClient(id) {
  const res = await query('SELECT * FROM crm_clients WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function deleteClient(id) {
  const res = await query('DELETE FROM crm_clients WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
}

// ============================================================
// ЗАКАЗЫ
// ============================================================
async function addOrder(clientId, description) {
  const client = await findClient(clientId);
  if (!client) return null;

  const res = await query(
    'INSERT INTO crm_orders (client_id, description, status) VALUES ($1, $2, $3) RETURNING *',
    [clientId, description, 'new']
  );
  return res.rows[0];
}

async function getOrders() {
  const res = await query(`
    SELECT o.*, c.name AS client_name
    FROM crm_orders o
    LEFT JOIN crm_clients c ON o.client_id = c.id
    ORDER BY o.created_at DESC
  `);
  return res.rows;
}

async function findOrder(id) {
  const res = await query(`
    SELECT o.*, c.name AS client_name
    FROM crm_orders o
    LEFT JOIN crm_clients c ON o.client_id = c.id
    WHERE o.id = $1
  `, [id]);
  return res.rows[0] || null;
}

async function deleteOrder(id) {
  const res = await query('DELETE FROM crm_orders WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
}

async function changeOrderStatus(id, newStatus, changedBy = null) {
  const order = await findOrder(id);
  if (!order) return null;

  const oldStatus = order.status;

  await query(
    'UPDATE crm_orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [newStatus, id]
  );

  await query(
    'INSERT INTO crm_order_history (order_id, status_from, status_to, changed_by) VALUES ($1, $2, $3, $4)',
    [id, oldStatus, newStatus, changedBy]
  );

  return await findOrder(id);
}

// ============================================================
// СТАТИСТИКА
// ============================================================
async function getStats() {
  const clients = await query('SELECT COUNT(*) FROM crm_clients');
  const orders = await query('SELECT COUNT(*) FROM crm_orders');
  const newOrders = await query("SELECT COUNT(*) FROM crm_orders WHERE status = 'new'");
  const inProgress = await query("SELECT COUNT(*) FROM crm_orders WHERE status = 'in_progress'");
  const completed = await query("SELECT COUNT(*) FROM crm_orders WHERE status = 'completed'");

  return {
    clients: parseInt(clients.rows[0].count),
    orders: parseInt(orders.rows[0].count),
    new: parseInt(newOrders.rows[0].count),
    inProgress: parseInt(inProgress.rows[0].count),
    completed: parseInt(completed.rows[0].count),
  };
}

// ============================================================
// ФОРМАТИРОВАНИЕ
// ============================================================
function statusEmoji(status) {
  switch (status) {
    case 'new': return '🆕';
    case 'in_progress': return '⏳';
    case 'completed': return '✅';
    default: return '❓';
  }
}

function formatClients(clients) {
  if (clients.length === 0) return '📭 Список клиентов пуст.';

  let text = '📇 *Список клиентов:*\n\n';
  clients.forEach((c) => {
    text += `👤 *${c.name}*\n`;
    if (c.phone) text += `📞 ${c.phone}\n`;
    if (c.email) text += `✉️ ${c.email}\n`;
    text += `🆔 ID: ${c.id}\n\n`;
  });
  return text;
}

function formatOrders(orders) {
  if (orders.length === 0) return '📭 Заказов пока нет.';

  let text = '📦 *Список заказов:*\n\n';
  orders.slice(0, 10).forEach((o) => {
    const clientName = o.client_name || '❌ Клиент удалён';
    text += `🆔 Заказ #${o.id}\n`;
    text += `👤 ${clientName}\n`;
    text += `📝 ${o.description}\n`;
    text += `📊 Статус: ${statusEmoji(o.status)} ${o.status}\n\n`;
  });

  if (orders.length > 10) {
    text += `_... и ещё ${orders.length - 10} заказов_`;
  }

  return text;
}

function formatStats(s) {
  return (
    `📊 *Статистика CRM:*\n\n` +
    `👥 Клиентов: ${s.clients}\n` +
    `📦 Всего заказов: ${s.orders}\n` +
    `🆕 Новых: ${s.new}\n` +
    `⏳ В работе: ${s.inProgress}\n` +
    `✅ Выполнено: ${s.completed}`
  );
}

// ============================================================
// ГРАФИК ЗАКАЗОВ
// ============================================================
async function createOrdersChart() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const res = await query(
    'SELECT created_at FROM crm_orders WHERE created_at >= $1 ORDER BY created_at ASC',
    [weekAgo]
  );

  const byDay = {};
  res.rows.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const labels = Object.keys(byDay);
  const data = Object.values(byDay);

  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 800, 400);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Заказы по дням',
        data: data,
        backgroundColor: 'rgba(79, 140, 247, 0.7)',
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
// УМНЫЙ ИИ
// ============================================================
async function smartAskYandexGPT(prompt) {
  const text = prompt.toLowerCase();

  if (text.includes('отчёт') || text.includes('отчет')) {
    const orders = await getOrders();
    if (orders.length === 0) return '📭 Заказов пока нет.';

    let report = `📋 *Последние ${Math.min(orders.length, 5)} заказов:*\n\n`;
    orders.slice(0, 5).forEach((o) => {
      const clientName = o.client_name || '❌';
      report += `#${o.id} | ${clientName} | ${statusEmoji(o.status)} ${o.status}\n`;
    });
    return report;
  }

  if (text.includes('статистик') || text.includes('сколько')) {
    const s = await getStats();
    return formatStats(s);
  }

  if (text.includes('прогноз')) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const res = await query(
      'SELECT COUNT(*) FROM crm_orders WHERE created_at >= $1',
      [weekAgo]
    );
    const lastWeek = parseInt(res.rows[0].count);
    return `🔮 *Прогноз:*\n\nЗа последнюю неделю: ${lastWeek} заказов.\nОжидаем: ~${Math.round(lastWeek * 1.1)}.`;
  }

  try {
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: { temperature: 0.6, maxTokens: 250 },
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
// ЭКСПОРТ
// ============================================================
module.exports = {
  pool,
  initDatabase,
  getUser,
  createUser,
  isAdmin,
  setRole,
  addClient,
  getClients,
  findClient,
  deleteClient,
  addOrder,
  getOrders,
  findOrder,
  deleteOrder,
  changeOrderStatus,
  getStats,
  statusEmoji,
  formatClients,
  formatOrders,
  formatStats,
  createOrdersChart,
  smartAskYandexGPT,
};