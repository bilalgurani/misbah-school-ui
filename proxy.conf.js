// Dev server only: forwards /api to the production backend so `ng serve` works with real login and data.
// The backend rejects the localhost origin (CORS), so the Origin header is dropped. Requests then look
// like server-to-server calls and the browser never makes a cross-origin request.
module.exports = {
  '/api': {
    target: 'https://ms-school.up.railway.app',
    secure: true,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      });
    },
  },
};
