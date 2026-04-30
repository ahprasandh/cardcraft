import { fetch as undiciFetch, ProxyAgent } from "undici";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.6:35b";

const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export async function queryOllama(
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  const url = `${OLLAMA_BASE_URL}/api/chat`;
  console.log(`[ollama] POST ${url} model=${OLLAMA_MODEL} maxTokens=${opts?.maxTokens ?? 1024} proxy=${proxyUrl || "none"}`);

  try {
    const res = await undiciFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        think: false,
        options: {
          temperature: opts?.temperature ?? 0.7,
          num_predict: opts?.maxTokens ?? 1024,
        },
      }),
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[ollama] ERROR ${res.status}: ${errText.slice(0, 200)}`);
      throw new Error(`Ollama responded with ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    console.log(`[ollama] OK response:`, data.message.content);
    return data.message.content;
  } catch (e) {
    console.error(`[ollama] FETCH FAILED:`, e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
