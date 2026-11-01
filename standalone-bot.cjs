/**
 * Tewedaj Online Lottery - Standalone 24/7 Telegram Bot & Keep-Alive Runner
 * ይህ ፋይል ለብቻው በ Render, Railway, Glitch ወይም VPS ላይ 24/7 ያለእንቅልፍ ለማስኬድ የተዘጋጀ ነው።
 */

const express = require('express');
const https = require('https');
const http = require('http');

// የቦቱን ቶከን እና መረጃዎች
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8577097699:AAEwbW_yXyU1q0RgRi7J0GXAEnKboY6wFzM';
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'https://tewedaj-online-lottery.vercel.app';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// 1. መነሻ ሩት (ለ Keep-Alive ፒንግ የሚደረግበት)
app.get('/', (req, res) => {
  res.status(200).send('✅ Tewedaj Online Lottery Bot is active and running 24/7!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    bot: 'Tewedaj_Online_Lottery_bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Helper for Telegram API requests without requiring external heavy libraries
function telegramApi(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 2. ቦቱ የሚሰጣቸው መልዕክቶች (Message Handler)
async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';

    if (text.startsWith('/start')) {
      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: '👋 <b>ሰላም እንኳን ወደ ተወዳጅ ኦንላይን ሎተሪ በሰላም መጡ!</b>\n\nቦቱ አሁን ሙሉ በሙሉ ነቅቶ (Active 24/7) እየሰራ ይገኛል።\n\nየሎተሪ ዕድልዎን ለመሞከር ከታች ያለውን ሊንክ ይጫኑ፦',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎟 አፑን ክፈት (Open Mini App)', web_app: { url: APP_URL } }],
            [{ text: '📞 ድጋፍ / አድሚን (@lij_makbel)', url: 'https://t.me/lij_makbel' }]
          ]
        }
      });
    } else {
      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: `📩 መልዕክትዎ ደርሶናል፦ "${text}"\n\nሎተሪ ለመቁረጥ ወይም ሂሳብዎን ለመሙላት ከታች አፑን ይክፈቱ፦`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎟 አፑን ክፈት (Open Mini App)', web_app: { url: APP_URL } }]
          ]
        }
      });
    }
  }
}

// 3. Auto Conflict Recovery እና Polling ማስጀመር
let isPolling = true;
let offset = 0;

async function startPolling() {
  console.log('[Bot] የነበረውን Webhook ማጽዳት (409 Conflict ለመከላከል)...');
  await telegramApi('deleteWebhook', { drop_pending_updates: false });
  console.log('✅ Webhook ተሰርዟል! ወደ Long-Polling ተቀይሯል።');

  while (isPolling) {
    try {
      const res = await telegramApi('getUpdates', {
        offset: offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query']
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          await handleUpdate(update).catch(err => console.error('[Update Error]', err));
        }
      } else if (res && res.error_code === 409) {
        console.warn('⚠️ 409 Conflict ተፈጥሯል፤ Webhook እንደገና እየተሰረዘ ነው...');
        await telegramApi('deleteWebhook', { drop_pending_updates: false });
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('[Polling Error]', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

// 4. Express ሰርቨር ማስጀመር
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  startPolling();
});

// 5. የእንቅልፍ መከላከያ (Keep-Alive Ping)
// ሰርቨሩ እንዳይተኛ በየ 5 ደቂቃው ራሱን ፒንግ ያደርጋል
const PING_TARGET = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;

setInterval(() => {
  const client = PING_TARGET.startsWith('https') ? https : http;
  client.get(PING_TARGET, (res) => {
    console.log(`⏰ Keep-Alive: Pinged successfully (Status: ${res.statusCode})`);
  }).on('error', (err) => {
    console.error('Keep-Alive Error:', err.message);
  });
}, 5 * 60 * 1000); // በየ 5 ደቂቃው

// ሂደቱን በሰላም ለመዝጋት (Graceful Shutdown)
process.once('SIGINT', () => {
  isPolling = false;
  server.close();
});
process.once('SIGTERM', () => {
  isPolling = false;
  server.close();
});
