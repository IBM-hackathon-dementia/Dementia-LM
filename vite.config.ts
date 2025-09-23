import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3001,
        proxy: {
            '/api': {
                target: 'https://18.223.212.100:8443',
                changeOrigin: true,
                secure: false,
                agent: new https.Agent({
                    rejectUnauthorized: false
                }),
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('Proxying:', req.method, req.url, 'to', options.target + req.url);
                        // Add required headers
                        proxyReq.setHeader('Host', '18.223.212.100:8443');
                        proxyReq.setHeader('Origin', 'https://18.223.212.100:8443');
                        proxyReq.setHeader('Referer', 'https://18.223.212.100:8443/');
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log('Response:', proxyRes.statusCode, req.url);
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
});
