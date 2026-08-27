/**
 * Config Store — browser localStorage'da API token'ları saklar
 * Supabase hazır olunca server-side config tablosuna taşınır
 */

export interface AppConfig {
  openai_api_key: string
  n8n_webhook_secret: string
  mutfak_nabzi_api_key: string
  supabase_url: string
  supabase_anon_key: string
  whatsapp_token: string
  pulse_threshold_yogun: number
  pulse_threshold_riskli: number
  pulse_threshold_kritik: number
  alert_interval_minutes: number
  alerts_dashboard: boolean
  alerts_whatsapp: boolean
  alerts_email: boolean
  demo_mode: boolean
}

const STORAGE_KEY = 'mutfak_nabzi_config'

const DEFAULTS: AppConfig = {
  openai_api_key: '',
  n8n_webhook_secret: '',
  mutfak_nabzi_api_key: '',
  supabase_url: '',
  supabase_anon_key: '',
  whatsapp_token: '',
  pulse_threshold_yogun: 40,
  pulse_threshold_riskli: 60,
  pulse_threshold_kritik: 80,
  alert_interval_minutes: 5,
  alerts_dashboard: true,
  alerts_whatsapp: false,
  alerts_email: true,
  demo_mode: true,
}

export function getConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch { return DEFAULTS }
}

export function saveConfig(config: Partial<AppConfig>): void {
  if (typeof window === 'undefined') return
  const current = getConfig()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...config }))
}

export function getOpenAIKey(): string {
  return getConfig().openai_api_key || process.env.OPENAI_API_KEY || ''
}

export function hasRequiredConfig(): { ok: boolean; missing: string[] } {
  const c = getConfig()
  const missing: string[] = []
  if (!c.openai_api_key && !process.env.OPENAI_API_KEY) missing.push('OpenAI API Key')
  return { ok: missing.length === 0, missing }
}

export function maskSecret(value: string): string {
  if (!value || value.length < 8) return value ? '••••••••' : ''
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
}
