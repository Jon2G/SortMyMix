/**
 * GetSongBPM API configuration.
 * Register at https://getsongbpm.com/api to get an API key.
 * Set VITE_GETSONGBPM_API_KEY in .env to enable BPM lookup.
 * Backlink to GetSongBPM.com is required (see footer).
 */
export const GETSONGBPM_CONFIG = {
  apiKey: import.meta.env.VITE_GETSONGBPM_API_KEY || '',
  baseUrl: 'https://api.getsongbpm.com'
}
