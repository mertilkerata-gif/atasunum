/**
 * LLM Service — Soyut katman
 * Şu an: OpenAI GPT-4o
 * Değiştirmek için: sadece bu dosyayı güncelle, API route'lar değişmez
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o'

export async function callLLM(
  messages: LLMMessage[],
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY eksik')

  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.3,
    messages,
  }
  if (options.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API hatası: ${res.status} — ${err}`)
  }

  const data = await res.json()
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
  }
}

// n8n veya harici sistemler için mock fallback (OPENAI_API_KEY yoksa)
export async function callLLMWithFallback(
  messages: LLMMessage[],
  fallback: string,
  options?: Parameters<typeof callLLM>[1]
): Promise<LLMResponse> {
  try {
    return await callLLM(messages, options)
  } catch {
    return { content: fallback, model: 'mock-fallback' }
  }
}
