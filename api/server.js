import { Telegraf } from 'telegraf';
import 'dotenv/config';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Обработка команды /start
bot.command('start', async (ctx) => {
    try {
        console.log('Received /start command');
        await ctx.reply('🌍 Добро пожаловать в Earth!\nНажмите на кнопку ниже, чтобы начать игру:', {
            reply_markup: {
                inline_keyboard: [
                    [{ 
                        text: '🌍 Earth',
                        callback_game: 'Earth'  // Используем callback_game вместо url
                    }]
                ]
            }
        });
        console.log('Start message sent');
    } catch (error) {
        console.error('Error in start command:', error);
    }
});

// Обработка game callback
bot.on('callback_query', async (ctx) => {
    try {
        console.log('Received callback query:', ctx.callbackQuery);
        if (ctx.callbackQuery.game_short_name === 'Earth') {
            console.log('Answering game query with URL:', process.env.GAME_URL);
            await ctx.answerGameQuery(process.env.GAME_URL);
        }
    } catch (error) {
        console.error('Error in game callback:', error);
    }
});

// Обработка вебхуков
export default async function handler(req, res) {
    try {
        console.log('Received webhook request:', req.method);
        
        if (req.method === 'POST') {
            console.log('Webhook body:', JSON.stringify(req.body));
            // Обработка вебхука от Telegram
            await bot.handleUpdate(req.body);
            res.status(200).json({ ok: true });
        } else if (req.method === 'GET') {
            // Проверка работоспособности
            res.status(200).json({ 
                status: 'ok',
                timestamp: new Date().toISOString(),
                bot_info: await bot.telegram.getMe()
            });
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in webhook handler:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
} 