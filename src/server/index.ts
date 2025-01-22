import express, { Request, Response } from 'express';
import { Telegraf, Context } from 'telegraf';
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

// Конфигурация игры
const GAME_SHORT_NAME = 'Earth';
const GAME_URL = process.env.GAME_URL || 'https://your-domain.com';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../../build')));

// Обработка команды старт
bot.command('start', async (ctx) => {
  try {
    await ctx.replyWithGame(GAME_SHORT_NAME);
  } catch (e) {
    console.error('Error sending game:', e);
    await ctx.reply('Произошла ошибка при запуске игры. Попробуйте позже.');
  }
});

// Команда для запуска игры
bot.command('play', async (ctx) => {
  try {
    await ctx.replyWithGame(GAME_SHORT_NAME);
  } catch (e) {
    console.error('Error sending game:', e);
    await ctx.reply('Произошла ошибка при запуске игры. Попробуйте позже.');
  }
});

// Обработка callback query для игры
bot.gameQuery(async (ctx) => {
  try {
    await ctx.answerGameQuery(GAME_URL);
  } catch (e) {
    console.error('Error answering game query:', e);
  }
});

// API эндпоинты
app.get('/game', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../../build/index.html'));
});

// Запуск бота и сервера
bot.launch();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 