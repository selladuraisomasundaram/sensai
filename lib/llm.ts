import { callGemini } from '@/lib/gemini';

/**
 * Dispatches an LLM generation request with enforced JSON output across Gemini, Anthropic, and OpenAI.
 */
export async function dispatchLLMJson(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const cleanKey = apiKey.trim();

  // Branch 1: Google Gemini (AIza...)
  if (cleanKey.startsWith('AIza')) {
    return await callGemini(cleanKey, systemPrompt, userPrompt, true);
  }

  // Branch 2: Anthropic Claude (sk-ant...)
  if (cleanKey.startsWith('sk-ant')) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${userPrompt}\n\nIMPORTANT: Return ONLY valid, parseable RFC 8259 JSON without markdown fences.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API call failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // Branch 3: OpenAI & Compatible (default)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API call failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Robustly strips markdown code fences and parses JSON output.
 */
export function parseSanitizedJson<T = any>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(text);
}

