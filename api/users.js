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

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const userData = req.body;
            
            // Проверяем данные от Telegram
            if (!validateTelegramData(userData)) {
                return res.status(401).json({ error: 'Invalid Telegram data' });
            }
            
            // Обновляем или создаем пользователя
            const { data, error } = await supabase
                .from('users')
                .upsert({
                    id: userData.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    username: userData.username,
                    photo_url: userData.photo_url
                }, {
                    onConflict: 'id'
                });
            
            if (error) throw error;
            
            // Получаем ранг пользователя
            const { data: rankData, error: rankError } = await supabase
                .rpc('get_user_rank', { user_id: userData.id });
                
            if (rankError) throw rankError;
            
            res.json({ 
                success: true,
                rank: rankData
            });
        } catch (error) {
            console.error('Error saving user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'GET') {
        try {
            // Получаем топ пользователей
            const { data: users, error } = await supabase
                .rpc('get_top_users', { limit_count: 100 });
            
            if (error) throw error;
            
            res.json(users);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
} 