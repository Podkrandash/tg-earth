import express from 'express';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Инициализация конфигурации
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверяем наличие необходимых переменных окружения
if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN must be provided!');
}

if (!process.env.GAME_URL) {
    throw new Error('GAME_URL must be provided!');
}

// Создаем Express приложение
const app = express();

// Настраиваем статические файлы
app.use(express.static('public'));

// Создаем экземпляр бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настраиваем команды бота
bot.command('start', async (ctx) => {
    try {
        await ctx.reply('Добро пожаловать в Earth 3D! Нажмите кнопку ниже, чтобы начать игру.', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌍 Play Earth 3D', callback_data: 'play_game' }]
                ]
            }
        });
        console.log('Start command processed for user:', ctx.from?.id);
    } catch (e) {
        console.error('Error in start command:', e);
    }
});

// Обработчик нажатия на кнопку
bot.action('play_game', async (ctx) => {
    try {
        await ctx.answerGameQuery(process.env.GAME_URL);
        console.log('Game query answered for user:', ctx.from?.id);
    } catch (e) {
        console.error('Error answering game query:', e);
        try {
            await ctx.reply('Извините, произошла ошибка при запуске игры. Попробуйте еще раз.');
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
});

// Эндпоинт для поддержания бота активным
app.get('/bot/keepalive', async (req, res) => {
    try {
        const botInfo = await bot.telegram.getMe();
        console.log('Bot is alive:', botInfo.username);
        res.status(200).json({ status: 'alive', bot: botInfo.username });
    } catch (e) {
        console.error('Error in keepalive:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// Запускаем бота
let botStarted = false;

const startBot = async () => {
    if (botStarted) return;
    try {
        await bot.launch({
            webhook: {
                domain: process.env.GAME_URL,
                port: process.env.PORT || 3000
            }
        });
        botStarted = true;
        console.log('Bot started successfully');
        const botInfo = await bot.telegram.getMe();
        console.log('Bot info:', botInfo);
    } catch (err) {
        console.error('Error starting bot:', err);
        botStarted = false;
        // Попытка перезапуска через 10 секунд
        setTimeout(startBot, 10000);
    }
};

// Запускаем сервер и бота
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startBot().catch(console.error);
});

// Включаем graceful shutdown
process.once('SIGINT', () => {
    console.log('SIGINT received');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('SIGTERM received');
    bot.stop('SIGTERM');
}); 