export default async function middleware(req) {
    try {
        const start = Date.now();
        
        // Добавляем CORS заголовки
        const headers = new Headers({
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        });

        // Для OPTIONS запросов сразу возвращаем ответ
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers, status: 200 });
        }

        // Добавляем тайм-аут для запросов
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.method !== 'GET' ? req.body : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Добавляем метрики в заголовки
            const duration = Date.now() - start;
            headers.set('X-Response-Time', `${duration}ms`);

            // Копируем заголовки из ответа
            response.headers.forEach((value, key) => {
                headers.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                headers
            });
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return new Response('Request timeout', { 
                status: 504,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        console.error('Middleware error:', error);
        return new Response('Internal Server Error', { 
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

export const config = {
    matcher: '/api/:path*',
} 