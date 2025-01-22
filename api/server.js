import { Telegraf } from 'telegraf';
import 'dotenv/config';
import express from 'express';
import path from 'path';

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const gameShortName = 'earth3d';

// Настраиваем Express для раздачи статических файлов
app.use(express.static('public'));

// Обработчик для /start команды
bot.command('start', async (ctx) => {
    try {
        console.log('Received /start command');
        await ctx.reply('Добро пожаловать! Нажмите кнопку ниже, чтобы начать игру:', {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🌍 Играть',
                        callback_game: 'earth3d'
                    }
                ]]
            }
        });
    } catch (error) {
        console.error('Error in start command:', error);
    }
});

// Обработчик для game callback
bot.on('callback_query', async (ctx) => {
    try {
        console.log('Received callback query:', ctx.callbackQuery);
        if (ctx.callbackQuery.game_short_name === 'earth3d') {
            const gameUrl = process.env.GAME_URL || 'https://tg-earth.vercel.app/app';
            console.log('Answering game query with URL:', gameUrl);
            await ctx.answerGameQuery(gameUrl);
        }
    } catch (error) {
        console.error('Error in game callback:', error);
    }
});

// Маршрут для игры
app.get('/app/:game/:chatId', (req, res) => {
    console.log('Game request received:', req.params);
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Обработка вебхуков
export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).json({ ok: true });
        } else {
            res.status(200).json({ status: 'ok' });
        }
    } catch (error) {
        console.error('Error in webhook handler:', error);
        res.status(500).json({ error: error.message });
    }
} 