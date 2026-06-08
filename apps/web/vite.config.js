import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'utf8-headers',
            configureServer: function (server) {
                server.middlewares.use(function (req, res, next) {
                    var url = req.url || '';
                    if (url.endsWith('.html') || url === '/' || url.startsWith('/?')) {
                        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
                    }
                    else if (url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.ts') || url.endsWith('.tsx')) {
                        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
                    }
                    else if (url.endsWith('.css')) {
                        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
                    }
                    next();
                });
            },
        },
    ],
    server: {
        port: 5173,
    },
});
