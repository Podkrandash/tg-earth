import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Обработчик для /start команды
bot.command('start', (ctx) => {
    console.log('Received /start command');
    return ctx.reply('Добро пожаловать! Нажмите кнопку ниже, чтобы начать игру:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🌍 Играть', url: 'https://tg-earth-4dzw.vercel.app' }
            ]]
        }
    });
});

bot.launch(); 