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

// Простой кэш в памяти
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 минута

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

// Функция для работы с кэшем
async function getCachedData(key, fetchFunction) {
    const now = Date.now();
    const cached = cache.get(key);
    
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    const data = await fetchFunction();
    cache.set(key, {
        data,
        timestamp: now
    });
    
    return data;
}

// Функция для получения пользователей с пагинацией
async function getUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const cacheKey = `users_${page}_${limit}`;
    
    return getCachedData(cacheKey, async () => {
        const { data, error, count } = await supabase
            .from('users')
            .select('*', { count: 'exact' })
            .order('score', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (error) throw error;
        
        return {
            users: data,
            total: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit)
        };
    });
}

// Функция для проверки сессии
async function validateSession(req) {
    const sessionToken = req.headers['x-session-token'];
    if (!sessionToken) {
        throw new Error('No session token');
    }

    const { data: session, error } = await supabase
        .from('sessions')
        .select('user_id, expires_at')
        .eq('token', sessionToken)
        .single();

    if (error || !session) {
        throw new Error('Invalid session');
    }

    if (new Date(session.expires_at) < new Date()) {
        throw new Error('Session expired');
    }

    return session.user_id;
}

// Функция для получения состояния вкладки
async function getTabState(userId, tabName) {
    const { data, error } = await supabase
        .from('tab_states')
        .select('state')
        .eq('user_id', userId)
        .eq('tab_name', tabName)
        .single();

    if (error) {
        console.error('Error getting tab state:', error);
        return null;
    }

    return data?.state;
}

// Функция для сохранения состояния вкладки
async function saveTabState(userId, tabName, state) {
    const { error } = await supabase
        .from('tab_states')
        .upsert({
            user_id: userId,
            tab_name: tabName,
            state: state,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,tab_name'
        });

    if (error) {
        console.error('Error saving tab state:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    try {
        // Добавляем CORS заголовки
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Session-Token');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Проверяем сессию для всех запросов кроме OPTIONS
        let userId;
        try {
            userId = await validateSession(req);
        } catch (error) {
            return res.status(401).json({
                error: 'Unauthorized',
                details: error.message
            });
        }

        if (req.method === 'POST') {
            const { action, data } = req.body;

            switch (action) {
                case 'save_tab_state':
                    if (!data.tabName || !data.state) {
                        return res.status(400).json({
                            error: 'Missing required fields',
                            details: 'tabName and state are required'
                        });
                    }

                    await saveTabState(userId, data.tabName, data.state);
                    return res.status(200).json({ success: true });

                case 'get_tab_state':
                    if (!data.tabName) {
                        return res.status(400).json({
                            error: 'Missing required fields',
                            details: 'tabName is required'
                        });
                    }

                    const state = await getTabState(userId, data.tabName);
                    return res.status(200).json({ state });

                case 'update_user':
                    if (!data.telegram_id || !data.username) {
                        return res.status(400).json({
                            error: 'Missing required fields',
                            details: 'telegram_id and username are required'
                        });
                    }

                    if (!validateTelegramData(data)) {
                        return res.status(401).json({ error: 'Invalid Telegram data' });
                    }

                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .upsert({
                            telegram_id: data.telegram_id,
                            username: data.username,
                            score: data.score || 0
                        }, {
                            onConflict: 'telegram_id'
                        });

                    if (userError) throw userError;

                    cache.clear();
                    return res.status(200).json({
                        success: true,
                        data: userData
                    });

                default:
                    return res.status(400).json({
                        error: 'Invalid action',
                        details: `Action ${action} not supported`
                    });
            }
        }

        if (req.method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const tabName = req.query.tab;

            if (tabName) {
                const state = await getTabState(userId, tabName);
                return res.status(200).json({ state });
            }

            const data = await getUsers(page, limit);
            return res.status(200).json(data);
        }

        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    } catch (error) {
        console.error('API Error:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Conflict',
                details: 'User already exists'
            });
        }

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Bad Request',
                details: 'Invalid reference'
            });
        }

        return res.status(500).json({
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
} 