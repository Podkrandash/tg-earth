import express from 'express';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Инициализация конфигурации
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем экземпляр бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настраиваем команды бота
bot.command('start', (ctx) => {
    ctx.reply('Добро пожаловать в Earth 3D! Нажмите кнопку ниже, чтобы начать игру.', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌍 Play Earth 3D', callback_data: 'play_game' }]
            ]
        }
    });
});

// Обработчик нажатия на кнопку
bot.action('play_game', async (ctx) => {
    try {
        await ctx.answerGameQuery(process.env.GAME_URL);
    } catch (e) {
        console.error('Error answering game query:', e);
    }
});

// Создаем Express приложение
const app = express();

// Настраиваем статические файлы
app.use(express.static('public'));

// Эндпоинт для поддержания бота активным
app.get('/bot/keepalive', (req, res) => {
    console.log('Keepalive ping received');
    res.status(200).send('Bot is alive');
});

// Запускаем бота
bot.launch().then(() => {
    console.log('Bot started successfully');
}).catch((err) => {
    console.error('Error starting bot:', err);
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Включаем graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 