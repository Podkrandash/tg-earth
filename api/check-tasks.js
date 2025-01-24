import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    'https://qfnvnbqjzlsagemyagyn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmbnZuYnFqemxzYWdlbXlhZ3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MjMwMTgsImV4cCI6MjA1MzI5OTAxOH0.xUTWif6OlnkMcI3KII0VPokWrRLKjBVpiVsrm2Ub59Y',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

function validateTelegramData(data) {
    const { hash, ...rest } = data;
    const dataCheckString = Object.keys(rest)
        .sort()
        .map(key => `${key}=${rest[key]}`)
        .join('\n');
    
    const secretKey = crypto.createHash('sha256')
        .update(process.env.BOT_TOKEN)
        .digest();
    
    const hmac = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    
    return hmac === hash;
}

async function checkChannelSubscription(userId) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember`, {
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

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { userId, auth_date, hash } = req.body;
            
            // Проверяем данные от Telegram
            if (!validateTelegramData({ userId, auth_date, hash })) {
                return res.status(401).json({ error: 'Invalid Telegram data' });
            }
            
            // Проверяем подписку на канал
            const isSubscribed = await checkChannelSubscription(userId);
            
            if (isSubscribed) {
                // Проверяем и обновляем статус задания
                const { data, error } = await supabase
                    .rpc('check_and_update_task', { user_id: userId });
                
                if (error) throw error;
                
                // Получаем обновленный ранг пользователя
                const { data: rankData, error: rankError } = await supabase
                    .rpc('get_user_rank', { user_id: userId });
                    
                if (rankError) throw rankError;
                
                res.json({ 
                    ...data,
                    rank: rankData
                });
            } else {
                res.json({ 
                    success: false,
                    message: 'Not subscribed',
                    score: 0
                });
            }
        } catch (error) {
            console.error('Error checking tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
} 