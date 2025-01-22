import express from 'express';
import { Telegraf } from 'telegraf';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Настройка статических файлов
app.use(express.static(join(__dirname, '../public')));

// Обработка команды /start
bot.command('start', (ctx) => {
    ctx.reply('🌍 Добро пожаловать в Earth 3D!', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌍 Play Earth 3D', callback_data: 'play_game' }]
            ]
        }
    });
});

// Обработка нажатия на кнопку
bot.action('play_game', (ctx) => {
    ctx.answerGameQuery(process.env.GAME_URL);
});

// Запуск бота
bot.launch().catch((err) => {
    console.error('Ошибка при запуске бота:', err);
});

// Запуск сервера
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
}); 