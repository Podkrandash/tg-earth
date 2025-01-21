import express from 'express';
import { Telegraf } from 'telegraf';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../../build')));

// Обработка команды старт
bot.command('start', (ctx) => {
  ctx.reply('Добро пожаловать в Earth Explorer!', {
    reply_markup: {
      inline_keyboard: [[
        { text: 'Открыть приложение', web_app: { url: process.env.WEBAPP_URL || '' } }
      ]]
    }
  });
});

// API эндпоинты
app.post('/api/saveProgress', (req, res) => {
  const { userId, tokens } = req.body;
  // TODO: Сохранение прогресса пользователя
  res.json({ success: true });
});

// Запуск бота и сервера
bot.launch();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 