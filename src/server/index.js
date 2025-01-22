import express from 'express';
import { Telegraf } from 'telegraf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, '../../build')));

// Bot commands
bot.command('start', (ctx) => {
    ctx.reply('Welcome to Earth 3D! Click the button below to start:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🌍 Launch Earth 3D', url: process.env.GAME_URL }
            ]]
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Launch bot
    bot.launch()
        .then(() => console.log('Bot is running'))
        .catch(err => console.error('Bot launch error:', err));
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 