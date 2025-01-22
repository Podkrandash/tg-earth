import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Устанавливаем вебхук при запуске
const WEBHOOK_URL = 'https://tg-earth-4dzw.vercel.app/api/server';
const GAME_URL = 'https://tg-earth-4dzw.vercel.app';

bot.telegram.setWebhook(WEBHOOK_URL).then(() => {
    console.log('Webhook set to:', WEBHOOK_URL);
}).catch(error => {
    console.error('Failed to set webhook:', error);
});

// Обработчик для /start команды
bot.command('start', (ctx) => {
    console.log('Received /start command');
    return ctx.reply('Добро пожаловать! Нажмите кнопку ниже, чтобы начать игру:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🌍 Играть', callback_game: 'Earth' }
            ]]
        }
    });
});

// Обработчик для callback query
bot.on('callback_query', (ctx) => {
    if (ctx.callbackQuery.game_short_name === 'Earth') {
        console.log('Game callback received');
        return ctx.answerGameQuery(GAME_URL);
    }
});

// Обработчик для вебхуков
export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            const update = req.body;
            console.log('Received update:', update);
            await bot.handleUpdate(update);
        }
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Error handling update:', error);
        res.status(500).json({ error: error.message });
    }
} 