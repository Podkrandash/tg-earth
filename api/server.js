const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN);

const webAppUrl = process.env.GAME_URL || 'https://tg-earth-4dzw.vercel.app';

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, 'Welcome to Earth 3D! Click the button below to open the app:', {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🌍 Open Earth 3D',
            web_app: { url: webAppUrl }
          }
        ]]
      }
    });
  } catch (error) {
    console.error('Error in /start command:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, something went wrong. Please try again later.');
  }
});

// Handle game callback query
bot.on('callback_query', async (query) => {
  try {
    if (query.game_short_name === 'Earth') {
      await bot.answerCallbackQuery(query.id, {
        url: webAppUrl
      });
    }
  } catch (error) {
    console.error('Error in callback query:', error);
    await bot.answerCallbackQuery(query.id, {
      text: 'Sorry, something went wrong. Please try again.'
    });
  }
});

// Export the webhook handler
module.exports = async (req, res) => {
  try {
    const { body } = req;
    if (body.message || body.callback_query) {
      await bot.handleUpdate(body);
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Failed to process update' });
  }
}; 