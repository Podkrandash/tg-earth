import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    'https://qfnvnbqjzlsagemyagyn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmbnZuYnFqemxzYWdlbXlhZ3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MjMwMTgsImV4cCI6MjA1MzI5OTAxOH0.xUTWif6OlnkMcI3KII0VPokWrRLKjBVpiVsrm2Ub59Y'
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
    console.log('API Request received:', {
        method: req.method,
        url: req.url,
        body: req.body,
        headers: req.headers
    });

    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Обрабатываем OPTIONS запрос для CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const userData = req.body;
            console.log('Processing user data:', userData);
            
            if (!userData.telegram_id || !userData.username) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            // Обновляем или создаем пользователя
            const { error } = await supabase
                .from('users')
                .upsert({
                    telegram_id: userData.telegram_id,
                    username: userData.username,
                    score: userData.score || 0
                }, {
                    onConflict: 'telegram_id'
                });
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Получаем созданного пользователя
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', userData.telegram_id)
                .single();

            if (fetchError) {
                console.error('Error fetching user:', fetchError);
                throw fetchError;
            }
            
            console.log('User saved successfully:', user);
            res.status(200).json({ 
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Error saving user:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    } else if (req.method === 'GET') {
        try {
            console.log('Fetching users');
            // Получаем топ пользователей
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('score', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            console.log('Users fetched successfully:', users?.length || 0, 'users');
            res.status(200).json(users);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
} 