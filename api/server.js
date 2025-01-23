const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Обработчик для команды /start
bot.onText(/\/start/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, 'Welcome to Earth 3D! Click the button below to open the app:', {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🌍 Open Earth 3D',
                        web_app: { url: process.env.APP_URL || 'https://tg-earth-4dzw.vercel.app' }
                    }
                ]]
            }
        });
    } catch (error) {
        console.error('Error in /start command:', error);
    }
});

// Экспортируем функцию для обработки вебхуков
module.exports = async (request, response) => {
    try {
        const { body } = request;
        if (body.message || body.callback_query) {
            await bot.handleUpdate(body);
        }
        response.status(200).json({ ok: true });
    } catch (error) {
        console.error('Error handling update:', error);
        response.status(500).json({ ok: false, error: error.message });
    }
}; 