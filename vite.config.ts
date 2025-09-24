import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [react()],
    server: {
        port: 3001,
        proxy: {
            '/api': {
                target: 'http://3.139.119.86:8080',
                changeOrigin: true,
                secure: false,
                agent: new http.Agent({
                    keepAlive: true
                }),
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('🚀 Proxying:', req.method, req.url, 'to', options.target + req.url);
                        console.log('🚀 Request headers:', req.headers);
                        // Add required headers for HTTP backend
                        proxyReq.setHeader('Host', '3.139.119.86:8080');
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log('✅ Response:', proxyRes.statusCode, req.url);
                        console.log('✅ Response headers:', proxyRes.headers);
                    });
                    proxy.on('error', (err, req, res) => {
                        console.error('Proxy error:', err);
                        res.writeHead(500, {
                            'Content-Type': 'text/plain'
                        });
                        res.end('Something went wrong. And we are reporting a custom error message.');
                    });
                }
            },
        },
    },
    build: {
        outDir: 'dist',
    },
    define: {
        'import.meta.env.VITE_API_BASE_URL': command === 'build' 
            ? JSON.stringify('https://18.223.212.100:8443')
            : JSON.stringify('http://3.139.119.86:8080')
    }
}));
