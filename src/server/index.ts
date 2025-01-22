import express from 'express';
import { Telegraf } from 'telegraf';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Инициализация бота и сервера
const bot = new Telegraf(process.env.BOT_TOKEN || '');
const app = express();
const port = process.env.PORT || 3001;

// Конфигурация игры
const GAME_SHORT_NAME = 'Earth';
const GAME_URL = process.env.GAME_URL || 'https://your-domain.com';

// Настройка статических файлов
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

// Обработка callback query для игры
bot.gameQuery(async (ctx) => {
    try {
        await ctx.answerGameQuery(GAME_URL);
    } catch (e) {
        console.error('Error answering game query:', e);
    }
});

// Запуск сервера и бота
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    bot.launch().then(() => {
        console.log('Bot is running');
    }).catch(error => {
        console.error('Error starting bot:', error);
    });
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 