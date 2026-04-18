const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

export type PerplexityResponse = {
  content: string;
  citations: string[];
};

export async function askPerplexity(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5,
  maxTokens = 4000,
): Promise<string> {
  const { content } = await askPerplexityWithCitations(apiKey, systemPrompt, userPrompt, temperature, maxTokens);
  return content;
}

export async function askPerplexityWithCitations(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5,
  maxTokens = 4000,
): Promise<PerplexityResponse> {
  return askOpenRouter(apiKey, 'perplexity/sonar', systemPrompt, userPrompt, temperature, maxTokens);
}

export async function askGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5,
  maxTokens = 8000,
): Promise<string> {
  const { content } = await askOpenRouter(apiKey, 'google/gemini-3-flash-preview', systemPrompt, userPrompt, temperature, maxTokens);
  return content;
}

async function askOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<PerplexityResponse> {
  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error (${model}): ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const citations: string[] = data.citations || data.choices[0].message.citations || [];
  return { content, citations };
}

export function parseJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
