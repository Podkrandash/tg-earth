import { Telegraf } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Настраиваем Express для раздачи статических файлов
app.use(express.static('public'));

// Обработчик для /start команды
bot.command('start', (ctx) => {
    console.log('Received /start command');
    return ctx.reply('Добро пожаловать! Нажмите кнопку ниже, чтобы начать игру:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🌍 Играть', callback_game: {} }
            ]]
        }
    });
});

// Обработчик для callback query
bot.on('callback_query', (ctx) => {
    console.log('Received callback query');
    return ctx.answerGameQuery(process.env.GAME_URL || 'https://tg-earth.vercel.app');
});

// Обработчик для вебхуков
export default async function handler(req, res) {
    try {
        console.log('Webhook request:', req.method, req.body);
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
        }
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
} 