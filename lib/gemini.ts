let cachedGeminiModel: string | null = null;

const MODERN_DEFAULT_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-pro-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-2.0-flash',
];

/**
 * Dynamically queries Google Gemini's ListModels endpoint to detect supported models for the user's API key.
 */
export async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.models || [])
        .filter(
          (m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes('generateContent')
        )
        .map((m: any) => (m.name || '').replace(/^models\//, ''));

      if (availableModels.length > 0) {
        console.log('Available Gemini models for this key:', availableModels);

        // Preferred order: prioritized by speed, availability, and stability
        const priorityOrder = [
          'gemini-2.5-flash',
          'gemini-flash-latest',
          'gemini-2.5-flash-lite',
          'gemini-2.5-pro',
          'gemini-pro-latest',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
          'gemini-3.7-flash',
          'gemini-3.8-flash',
          'gemini-4-argon',
          'gemini-2.0-flash',
        ];

        const prioritized: string[] = [];
        for (const p of priorityOrder) {
          if (availableModels.includes(p) && !prioritized.includes(p)) {
            prioritized.push(p);
          }
        }

        // Include any remaining flash or gemini generation models returned by Google
        for (const m of availableModels) {
          if (
            !prioritized.includes(m) &&
            (m.includes('flash') || m.includes('pro') || m.includes('gemini'))
          ) {
            prioritized.push(m);
          }
        }

        return prioritized.length > 0 ? prioritized : availableModels;
      }
    }
  } catch (err) {
    console.warn('Dynamic model resolution via ListModels encountered an issue:', err);
  }

  return MODERN_DEFAULT_FALLBACKS;
}

/**
 * Returns the best candidate model string (or cached working model).
 */
export async function getBestGeminiModel(apiKey: string): Promise<string> {
  if (cachedGeminiModel) return cachedGeminiModel;
  const models = await getAvailableGeminiModels(apiKey);
  return models[0] || 'gemini-2.5-flash';
}

/**
 * Dispatches a content generation call to Gemini with automated fallback retry across model tiers and API versions.
 */
export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  jsonMode: boolean = false
): Promise<string> {
  const dynamicModels = await getAvailableGeminiModels(apiKey);

  // If a previously cached model exists and is still in dynamicModels, test it first
  const candidateModels = Array.from(
    new Set([
      ...(cachedGeminiModel && dynamicModels.includes(cachedGeminiModel)
        ? [cachedGeminiModel]
        : []),
      ...dynamicModels,
      ...MODERN_DEFAULT_FALLBACKS,
    ])
  );

  const apiVersions = ['v1beta', 'v1'];
  let lastErrorText = '';
  let lastStatusCode = 0;

  for (const model of candidateModels) {
    for (const ver of apiVersions) {
      const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;

      try {
        const generationConfig: Record<string, any> = {
          temperature: 0.1,
          maxOutputTokens: jsonMode ? 8192 : 30,
        };

        if (jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
              },
            ],
            generationConfig,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) {
            cachedGeminiModel = model;
            return rawText;
          }
        } else {
          lastStatusCode = res.status;
          lastErrorText = await res.text();

          // Invalid API Key (400) or Forbidden (403) is a terminal authentication issue
          if (res.status === 400 || res.status === 403) {
            cachedGeminiModel = null;
            throw new Error(`Gemini API authorization failure (${res.status}): ${lastErrorText}`);
          }

          // If the model had high demand (503), quota limits (429), or 404 (not supported on this endpoint),
          // invalidate cached model and smoothly continue to the next model in the candidate list
          cachedGeminiModel = null;
          console.warn(
            `[Gemini Fallback] Model ${model} on ${ver} returned ${res.status}. Falling back to next candidate...`
          );
        }
      } catch (err: any) {
        if (err.message?.includes('authorization failure')) {
          throw err;
        }
        lastErrorText = err.message || 'Network fetch failure';
        cachedGeminiModel = null;
      }
    }
  }

  throw new Error(
    `Gemini call failed across candidate models (${lastStatusCode || 'ERR'}): ${lastErrorText}`
  );
}
