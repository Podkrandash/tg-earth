import { Telegraf } from 'telegraf';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';

const app = express();
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const gameShortName = 'earth3d';

// Настраиваем Express для раздачи статических файлов
app.use(express.static('public'));

// Обработчик для /start команды
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    console.log('Received /start command from chat:', chatId);

    bot.sendMessage(chatId, 'Добро пожаловать! Нажмите кнопку ниже, чтобы начать игру:', {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '🌍 Играть',
                    callback_game: 'earth3d'
                }
            ]]
        }
    });
});

// Обработчик для callback_query
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    console.log('Received callback query from chat:', chatId);

    const gameUrl = process.env.GAME_URL || 'https://tg-earth.vercel.app/';
    console.log('Sending game URL:', gameUrl);
    
    bot.answerCallbackQuery({
        callback_query_id: callbackQuery.id,
        url: gameUrl
    });
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