const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

// Telegram Bot Token для проверки подписки
const BOT_TOKEN = process.env.BOT_TOKEN;

// Функция для проверки Telegram данных
function validateTelegramData(data) {
    const { hash, ...rest } = data;
    const dataCheckString = Object.keys(rest)
        .sort()
        .map(key => `${key}=${rest[key]}`)
        .join('\n');
    
    const secretKey = crypto.createHash('sha256')
        .update(BOT_TOKEN)
        .digest();
    
    const hmac = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    
    return hmac === hash;
}

// Проверка подписки на канал
async function checkChannelSubscription(userId) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: '@NotEarthCommunity',
                user_id: userId
            })
        });
        
        const data = await response.json();
        return data.ok && ['member', 'administrator', 'creator'].includes(data.result.status);
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// API Routes
app.post('/users', async (req, res) => {
    try {
        const userData = req.body;
        
        // Проверяем данные от Telegram
        if (!validateTelegramData(userData)) {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }
        
        const collection = db.collection('users');
        
        // Обновляем или создаем пользователя
        await collection.updateOne(
            { id: userData.id },
            { 
                $set: {
                    ...userData,
                    lastSeen: new Date(),
                    score: userData.score || 0
                }
            },
            { upsert: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/users', async (req, res) => {
    try {
        const collection = db.collection('users');
        
        // Получаем пользователей, отсортированных по очкам
        const users = await collection.find({
            lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // За последние 24 часа
        })
        .sort({ score: -1 })
        .toArray();
        
        // Добавляем позиции
        const usersWithPosition = users.map((user, index) => ({
            ...user,
            position: index + 1
        }));
        
        res.json(usersWithPosition);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/check-tasks', async (req, res) => {
    try {
        const { userId, auth_date, hash } = req.body;
        
        // Проверяем данные от Telegram
        if (!validateTelegramData({ userId, auth_date, hash })) {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }
        
        // Проверяем подписку на канал
        const isSubscribed = await checkChannelSubscription(userId);
        
        if (isSubscribed) {
            // Обновляем очки пользователя
            const collection = db.collection('users');
            await collection.updateOne(
                { id: userId },
                { 
                    $set: { 
                        hasCompletedTasks: true,
                        score: 1000 // Начальные очки за выполнение задания
                    }
                }
            );
        }
        
        res.json({ 
            isSubscribed,
            score: isSubscribed ? 1000 : 0
        });
    } catch (error) {
        console.error('Error checking tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
async function startServer() {
    try {
        await client.connect();
        db = client.db('earth_app');
        console.log('Connected to MongoDB');
        
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

startServer(); 