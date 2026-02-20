/**
 * NVIDIA AI API client using Kimi via integrate.api.nvidia.com
 * Compatible with OpenAI-style chat completion interface.
 * Uses Vite dev proxy to avoid CORS when running locally.
 */

const NVIDIA_BASE = "https://integrate.api.nvidia.com";
const MODEL = import.meta.env.VITE_NVIDIA_MODEL || "moonshotai/kimi-k2.5";
const VISION_MODEL = import.meta.env.VITE_NVIDIA_VISION_MODEL || MODEL;
const DEFAULT_CHAT_TEMPLATE_KWARGS = { thinking: false } as const;
const MODEL_FALLBACKS = [
  "moonshotai/kimi-k2.5",
  "moonshotai/kimi-k2-instruct-0905",
  "moonshotai/kimi-k2-instruct",
] as const;

function getInvokeUrls(): { chat: string; completion: string } {
  if (import.meta.env.DEV) {
    return {
      chat: "/api/nvidia/chat/completions",
      completion: "/api/nvidia/completions",
    };
  }
  return {
    chat: `${NVIDIA_BASE}/v1/chat/completions`,
    completion: `${NVIDIA_BASE}/v1/completions`,
  };
}

function getApiKey(): string {
  const key = import.meta.env.VITE_NVIDIA_API_KEY;
  if (!key || key === "nvapi-your-key-here") {
    throw new Error(
      "VITE_NVIDIA_API_KEY is not set or invalid. Add your key to .env: VITE_NVIDIA_API_KEY=nvapi-xxx (get key at https://build.nvidia.com)"
    );
  }
  return key;
}

type ChatCompletionResponse = {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type CompletionResponse = {
  id?: string;
  choices?: Array<{
    index?: number;
    text?: string;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

function normalizeMessages(
  messages: Array<{ role: string; content: unknown }>
): Array<{ role: string; content: unknown }> {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function messageContentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const typed = item as
          | { type?: string; text?: string; image_url?: { url?: string } }
          | undefined;
        if (typed?.type === "text") return typed.text || "";
        if (typed?.type === "image_url") {
          return `[image:${typed.image_url?.url || "url"}]`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(content ?? "");
}

function toCompletionPrompt(
  messages: Array<{ role: string; content: unknown }>
): string {
  const lines = messages.map((m) => {
    const role = m.role?.toUpperCase() || "USER";
    return `${role}: ${messageContentToText(m.content)}`;
  });
  lines.push("ASSISTANT:");
  return lines.join("\n");
}

function createRequestDescriptor(invokeUrl: string): Request {
  return new Request(invokeUrl, { method: "POST" });
}

function dedupeModels(models: string[]): string[] {
  return Array.from(new Set(models.filter(Boolean)));
}

function extractErrorText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }
  return String(raw ?? "");
}

function shouldRetryWithAnotherModel(status: number, errorText: string): boolean {
  const text = errorText.toLowerCase();
  return (
    status === 400 ||
    status === 404 ||
    text.includes("model") ||
    text.includes("unknown model") ||
    text.includes("invalid model")
  );
}

function shouldRetryWithoutTemplateKwargs(status: number, errorText: string): boolean {
  const text = errorText.toLowerCase();
  return (
    status === 400 &&
    (text.includes("chat_template_kwargs") ||
      text.includes("thinking") ||
      text.includes("unexpected field"))
  );
}

function isChatCompletionResponse(payload: unknown): payload is ChatCompletionResponse {
  if (!payload || typeof payload !== "object") return false;
  const typed = payload as { choices?: unknown[] };
  const first = typed.choices?.[0] as { message?: unknown } | undefined;
  return !!first && typeof first === "object" && !!first.message;
}

function completionToChatResponse(data: CompletionResponse): ChatCompletionResponse {
  const firstChoice = data.choices?.[0];
  return {
    id: data.id || `completion_${Date.now()}`,
    choices: [
      {
        index: firstChoice?.index ?? 0,
        message: {
          role: "assistant",
          content: firstChoice?.text ?? "",
        },
        finish_reason: firstChoice?.finish_reason ?? "stop",
      },
    ],
    usage: data.usage,
  };
}

async function readSseDataLines(response: Response): Promise<string[]> {
  if (!response.body) {
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const rawLines = buffer.split("\n");
    buffer = rawLines.pop() ?? "";

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      lines.push(line.replace(/^data:\s*/, ""));
    }
  }

  const flushed = decoder.decode();
  if (flushed) {
    buffer += flushed;
  }
  if (buffer.trim().startsWith("data:")) {
    lines.push(buffer.trim().replace(/^data:\s*/, ""));
  }

  return lines;
}

/**
 * Text chat completion
 */
export async function requestNvidiaChat(opts: {
  body: {
    model?: string;
    messages: Array<{
      role: "system" | "user" | "assistant";
      content:
      | string
      | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    }>;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    chat_template_kwargs?: { thinking?: boolean };
  };
}): Promise<{
  data?: ChatCompletionResponse;
  streamEvents?: string[];
  error?: unknown;
  request?: Request;
  response?: Response;
}> {
  const { body } = opts;
  const messages = normalizeMessages(body.messages);
  const modelsToTry = dedupeModels([body.model ?? MODEL, ...MODEL_FALLBACKS]);
  const invokeUrls = getInvokeUrls();

  const payloadBaseCommon = {
    max_tokens: body.max_tokens ?? 4096,
    temperature: body.temperature ?? 1.0,
    top_p: body.top_p ?? 1.0,
    stream: body.stream ?? false,
  };

  const request = createRequestDescriptor(invokeUrls.chat);
  let lastError: unknown;

  try {
    for (const modelName of modelsToTry) {
      const templateKwargs = body.chat_template_kwargs ?? DEFAULT_CHAT_TEMPLATE_KWARGS;
      const completionPrompt = toCompletionPrompt(messages);

      const requestCandidates: Array<{
        mode: "chat" | "completion";
        url: string;
        payload: Record<string, unknown>;
      }> = [
          {
            mode: "chat",
            url: invokeUrls.chat,
            payload: {
              ...payloadBaseCommon,
              model: modelName,
              messages,
              chat_template_kwargs: templateKwargs,
            },
          },
          {
            mode: "chat",
            url: invokeUrls.chat,
            payload: {
              ...payloadBaseCommon,
              model: modelName,
              messages,
            },
          },
          {
            mode: "completion",
            url: invokeUrls.completion,
            payload: {
              ...payloadBaseCommon,
              model: modelName,
              prompt: completionPrompt,
            },
          },
        ];

      for (let i = 0; i < requestCandidates.length; i++) {
        const candidate = requestCandidates[i];
        const response = await fetch(candidate.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getApiKey()}`,
            "Content-Type": "application/json",
            Accept: body.stream ? "text/event-stream" : "application/json",
          },
          body: JSON.stringify(candidate.payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(
            `NVIDIA API error ${response.status} [model=${modelName} url=${candidate.url}]: ${errText}`
          );
          lastError = err;

          if (response.status === 401 || response.status === 403) {
            console.error("[NVIDIA AI]", err.message);
            return { error: err, response, request };
          }

          const canRetryTemplate =
            candidate.mode === "chat" &&
            i === 0 &&
            shouldRetryWithoutTemplateKwargs(response.status, errText);
          if (canRetryTemplate) {
            continue;
          }

          const canRetryModel =
            shouldRetryWithAnotherModel(response.status, errText) &&
            modelName !== modelsToTry[modelsToTry.length - 1];

          if (canRetryModel) {
            break;
          }

          continue;
        }

        if (body.stream) {
          const streamEvents = await readSseDataLines(response);
          return { streamEvents, response, request };
        }

        const raw = await response.json();
        const data =
          candidate.mode === "chat"
            ? isChatCompletionResponse(raw)
              ? raw
              : completionToChatResponse(raw as CompletionResponse)
            : completionToChatResponse(raw as CompletionResponse);

        return { data, response, request };
      }
    }

    const noSuccessError =
      lastError instanceof Error
        ? lastError
        : new Error("NVIDIA API request failed for all model candidates.");

    return {
      error: noSuccessError,
      response: undefined,
      request,
    };
  } catch (err) {
    console.error("[NVIDIA AI] Request failed:", err);
    return {
      error: extractErrorText(err),
      response: undefined,
      request,
    };
  }
}

/**
 * Vision chat completion with image support
 */
export async function requestNvidiaVision(opts: {
  body: {
    messages: Array<{
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    }>;
    stream?: boolean;
  };
}): Promise<{
  data?: ChatCompletionResponse;
  error?: unknown;
  request?: Request;
  response?: Response;
}> {
  return requestNvidiaChat({
    body: {
      model: VISION_MODEL,
      messages: opts.body.messages,
      max_tokens: 4096,
      stream: opts.body.stream ?? false,
    },
  });
}
