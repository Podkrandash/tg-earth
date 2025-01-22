import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Bot commands
bot.command('start', (ctx) => {
    ctx.reply('Welcome to Earth! Click the button below to start:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🌍 Play Earth 3D', callback_data: 'play_game' }
            ]]
        }
    });
});

// Handle play button click
bot.action('play_game', (ctx) => {
    ctx.answerGameQuery(process.env.GAME_URL);
});

// Launch bot
bot.launch()
    .then(() => console.log('Bot is running'))
    .catch(err => console.error('Bot launch error:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 