export const environment = {
  production: false,
  // Sample data on the dashboard only (for screenshots). Set to false to see live dashboard numbers.
  mockDashboard: true,
  // Relative on purpose: `ng serve` proxies /api to the production backend (see proxy.conf.js).
  apiUrl: '/api'
};