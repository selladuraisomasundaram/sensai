let cachedGeminiModel: string | null = null;

/**
 * Dynamically queries Google Gemini's ListModels endpoint to detect supported models for the user's API key.
 */
export async function getBestGeminiModel(apiKey: string): Promise<string> {
  if (cachedGeminiModel) return cachedGeminiModel;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.models || [])
        .filter((m: any) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map((m: any) => (m.name || '').replace(/^models\//, ''));

      console.log('Available Gemini models for this key:', availableModels);

      // Preferred order: prioritized by speed, availability, and stability
      const preferred = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-002',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      for (const model of preferred) {
        if (availableModels.includes(model)) {
          cachedGeminiModel = model;
          return model;
        }
      }

      // If no exact preference matched, find any active flash or gemini model
      const fallbackFlash = availableModels.find((m) => m.includes('flash'));
      if (fallbackFlash) {
        cachedGeminiModel = fallbackFlash;
        return fallbackFlash;
      }

      const anyGemini = availableModels.find((m) => m.includes('gemini'));
      if (anyGemini) {
        cachedGeminiModel = anyGemini;
        return anyGemini;
      }
    }
  } catch (err) {
    console.warn('Dynamic model resolution via ListModels encountered an issue:', err);
  }

  return 'gemini-1.5-flash-latest';
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
  const detectedModel = await getBestGeminiModel(apiKey);

  // Ordered fallback chain
  const candidateModels = Array.from(
    new Set([
      detectedModel,
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-pro',
    ])
  );

  const apiVersions = ['v1beta', 'v1'];
  let lastErrorText = '';

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
          lastErrorText = await res.text();
          // If 404 NOT_FOUND, continue trying next candidate model in the chain
          if (res.status !== 404) {
            // For quota exhaustion (429) or invalid key (400/403), throw immediately with clean explanation
            throw new Error(`Gemini API error (${res.status}): ${lastErrorText}`);
          }
        }
      } catch (err: any) {
        if (err.message?.includes('Gemini API error')) {
          throw err;
        }
        lastErrorText = err.message || 'Network fetch failure';
      }
    }
  }

  throw new Error(`Gemini call failed across all candidate models: ${lastErrorText}`);
}

