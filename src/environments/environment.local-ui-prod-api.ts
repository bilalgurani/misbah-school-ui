// Same as environment.ts: the dev server proxies /api to the production backend (see proxy.conf.js).
export const environment = {
  production: false,
  mockDashboard: true,
  apiUrl: '/api'
};