import { Telegraf } from 'telegraf';
import 'dotenv/config';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Обработка команды /start
bot.command('start', async (ctx) => {
    try {
        console.log('Received /start command');
        const botInfo = await bot.telegram.getMe();
        const gameUrl = `https://t.me/notEarthBot?game=Earth`;
        
        await ctx.reply('🌍 Добро пожаловать в Earth 3D!\nНажмите на кнопку ниже, чтобы начать игру:', {
            reply_markup: {
                inline_keyboard: [
                    [{ 
                        text: '🌍 Играть в Earth 3D',
                        url: gameUrl
                    }]
                ]
            },
            disable_web_page_preview: true
        });
        console.log('Start message sent with game URL:', gameUrl);
    } catch (error) {
        console.error('Error in start command:', error);
    }
});

// Обработка game callback
bot.on('callback_query', async (ctx) => {
    try {
        console.log('Received callback query:', ctx.callbackQuery);
        if (ctx.callbackQuery.game_short_name === 'earth3d') {
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