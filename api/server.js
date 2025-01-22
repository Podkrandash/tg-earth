import { Telegraf } from 'telegraf';
import 'dotenv/config';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Обработка команды /start
bot.command('start', (ctx) => {
    ctx.reply('🌍 Добро пожаловать на Earth!', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌍 Play Earth', callback_game: 'earth3d' }]
            ]
        }
    });
});

// Обработка game callback
bot.gameQuery((ctx) => {
    ctx.answerGameQuery(process.env.GAME_URL);
});

// Обработка вебхуков
export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            // Обработка вебхука от Telegram
            await bot.handleUpdate(req.body);
            res.status(200).json({ ok: true });
        } else if (req.method === 'GET') {
            // Проверка работоспособности
            res.status(200).json({ status: 'ok' });
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in webhook handler:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 