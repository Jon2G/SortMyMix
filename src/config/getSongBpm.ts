/**
 * GetSongBPM API configuration.
 * Register at https://getsongbpm.com/api to get an API key.
 * Set VITE_GETSONGBPM_API_KEY in .env to enable BPM lookup.
 * Backlink to GetSongBPM.com is required (see footer).
 *
 * CORS proxy: GetSongBPM blocks browser CORS from GitHub Pages.
 * Set VITE_CORSPROXY_API_KEY for production (get key at https://corsproxy.io/docs/get-api-key/).
 */
export const GETSONGBPM_CONFIG = {
  apiKey: import.meta.env.VITE_GETSONGBPM_API_KEY || '',
  baseUrl: 'https://api.getsongbpm.com',
  corsproxyApiKey: import.meta.env.VITE_CORSPROXY_API_KEY || ''
}
