export default function middleware(req) {
    // Добавляем базовую обработку запросов
    return new Response();
}

export const config = {
    matcher: '/api/:path*',
} 