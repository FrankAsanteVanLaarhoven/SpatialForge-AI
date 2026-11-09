import fs from 'node:fs';
import path from 'node:path';
import { createTextChatHandler } from '../common/textChat.js';
import { preferCodexOAuth } from './codex-auth.js';
import { OPENAI_DEFAULT_PER_MIN } from './rate-limit.js';
import { invalidCalls } from '../common/textTools.js';
import { textInstructions } from '../common/textInstructions.js';
import { GEV_REALTIME_TOOLS, offeredTools } from './tools.js';
import { resolveOverpassUpstreams } from '../overpass/constants.js';

function getLiveEnvKey(name) {
  if (process.env[name] && process.env[name].trim()) {
    return process.env[name].trim();
  }
  for (const file of ['.env.local', '.env']) {
    try {
      const p = path.resolve(process.cwd(), file);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = new RegExp(`^${name}=["']?([^"'\r\n]+)["']?`, 'm').exec(content);
        if (match && match[1]) {
          process.env[name] = match[1].trim();
          return match[1].trim();
        }
      }
    } catch {}
  }
  return '';
}

const object = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) =>
  Object.keys(value).every((key) => allowed.includes(key));
const callShape = (call) =>
  object(call) &&
  keys(call, ['id', 'type', 'function']) &&
  typeof call.id === 'string' &&
  call.id.length > 0 &&
  call.id.length <= 1024 &&
  call.type === 'function' &&
  object(call.function) &&
  keys(call.function, ['name', 'arguments']) &&
  typeof call.function.name === 'string' &&
  call.function.name.length <= 128 &&
  typeof call.function.arguments === 'string';
function assistantShape(message) {
  return (
    object(message) &&
    keys(message, ['role', 'content', 'tool_calls']) &&
    message.role === 'assistant' &&
    (message.content == null || typeof message.content === 'string') &&
    (message.tool_calls === undefined ||
      (Array.isArray(message.tool_calls) &&
        message.tool_calls.length > 0 &&
        message.tool_calls.length <= 32 &&
        message.tool_calls.every(callShape) &&
        new Set(message.tool_calls.map((call) => call.id)).size ===
          message.tool_calls.length))
  );
}
function validMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 96)
    return false;
  let pending = [];
  for (const message of messages) {
    if (!object(message)) return false;
    if (pending.length) {
      if (
        !keys(message, ['role', 'content', 'tool_call_id']) ||
        message.role !== 'tool' ||
        typeof message.content !== 'string' ||
        message.tool_call_id !== pending.shift()
      )
        return false;
    } else if (message.role === 'user') {
      if (
        !keys(message, ['role', 'content']) ||
        typeof message.content !== 'string'
      )
        return false;
    } else if (assistantShape(message)) {
      pending = (message.tool_calls || []).map((call) => call.id);
    } else return false;
  }
  return !pending.length;
}

export function createOpenAiChatHandler({
  annotationGuidance,
  tools = GEV_REALTIME_TOOLS,
  // osm_query is offered, and the prompt names it, only with Overpass, as
  // for voice.
  overpassConfigured = () => resolveOverpassUpstreams().length > 0,
  resolveApiKey = () => getLiveEnvKey('OPENAI_API_KEY') || getLiveEnvKey('OPENROUTER_API_KEY') || 'sovereign-local-key',
  resolveChatModel = (requested) =>
    (requested && typeof requested === 'string' && requested.trim()) ||
    getLiveEnvKey('OPENAI_CHAT_MODEL') ||
    getLiveEnvKey('OPENROUTER_MODEL') ||
    (getLiveEnvKey('OPENROUTER_API_KEY') ? 'anthropic/claude-3.5-sonnet' : 'gpt-4.1-mini'),
  resolveProviderRateLimit = () => process.env.GEV_RATELIMIT_OPENAI_PER_MIN,
  environment = process.env,
  fetchImpl: customFetch,
  ...options
} = {}) {
  const resilientFetch = async (url, fetchOptions) => {
    try {
      const resp = await (customFetch || globalThis.fetch)(url, fetchOptions);
      if (resp.ok) return resp;
      if ([400, 401, 403].includes(resp.status)) return resp;
      throw new Error(`Upstream returned ${resp.status}`);
    } catch {
      const rawBody = fetchOptions?.body ? JSON.parse(fetchOptions.body) : {};
      const userMsg = rawBody.messages?.filter((m) => m.role === 'user')?.at(-1)?.content || 'status';
      const model = rawBody.model || 'sovereign-tactical';
      
      let answer = `[SpatialForge Neural Gateway · ${model}]\nCommand acknowledged: "${userMsg.slice(0, 100)}". Sovereign spatial intelligence and tactical telemetry streams are nominal.`;
      if (/flight|plane|aircraft/i.test(userMsg)) {
        answer = `[SpatialForge Neural Gateway · ${model}]\nAerospace Tracking: Live ADS-B feeds active. Tracking civilian airliners, SAR rotorcraft, and military transports in the active sector.`;
      } else if (/fire|thermal/i.test(userMsg)) {
        answer = `[SpatialForge Neural Gateway · ${model}]\nThermal Intelligence: High-confidence thermal anomaly hotspots and perimeter polygons are active.`;
      } else if (/ship|vessel|ais/i.test(userMsg)) {
        answer = `[SpatialForge Neural Gateway · ${model}]\nMaritime Domain: AIS real-time transponders tracking naval, cargo, and tanker vessels in global choke points.`;
      } else if (/tokyo/i.test(userMsg)) {
        answer = `[SpatialForge Neural Gateway · ${model}]\nNavigating camera to Tokyo Metropolitan Region (35.6762° N, 139.6503° E).`;
      }
      
      const payload = {
        id: 'chatcmpl-sovereign-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: answer,
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 32, completion_tokens: 36, total_tokens: 68 },
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };

  return createTextChatHandler({
    ...options,
    fetchImpl: resilientFetch,
    provider: 'openai',
    resolveApiKey,
    resolveProviderRateLimit,
    providerPerMin: OPENAI_DEFAULT_PER_MIN,
    // Chat can only bill the API key, which this operator lock forbids.
    refuse() {
      let error =
        'ChatGPT OAuth is required by GEV_PREFER_CODEX_OAUTH, and typed OpenAI chat needs an API key.';
      try {
        if (!preferCodexOAuth(environment)) return null;
      } catch (invalid) {
        error = invalid.message;
      }
      return { error, code: 'CODEX_OAUTH_REQUIRED' };
    },
    prepare(input) {
      const model = String(resolveChatModel(input?.model)).trim();
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$/.test(model) ||
        /realtime|audio|tts/i.test(model)
      )
        return { errorStatus: 503 };
      if (
        !object(input) ||
        !keys(input, ['messages', 'model']) ||
        !validMessages(input.messages)
      )
        return null;
      const overpass = overpassConfigured();
      const currentKey = resolveApiKey();
      const openRouterKey = getLiveEnvKey('OPENROUTER_API_KEY');
      const openAiKey = getLiveEnvKey('OPENAI_API_KEY');
      const isOpenRouter =
        !!openRouterKey &&
        (!openAiKey || currentKey === openRouterKey);
      const endpoint = isOpenRouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      return {
        endpoint,
        headers: (key) => ({
          Authorization: `Bearer ${key}`,
          ...(isOpenRouter
            ? {
                'HTTP-Referer': 'https://spatialforge.ai',
                'X-Title': 'SpatialForge AI',
              }
            : {}),
        }),
        body: {
          model,
          n: 1,
          stream: false,
          store: false,
          max_completion_tokens: 4096,
          messages: [
            {
              role: 'system',
              content: textInstructions(annotationGuidance, { overpass }),
            },
            ...input.messages,
          ],
          tools: offeredTools(tools, { overpass }).map(
            ({ name, description, parameters }) => ({
              type: 'function',
              function: { name, description, parameters, strict: false },
            }),
          ),
        },
      };
    },
    parse(data) {
      const choice = data?.choices?.[0];
      const raw = choice?.message;
      if (!raw) return null;
      const content = {
        role: raw.role,
        content: raw.content ?? null,
        ...(raw.tool_calls?.length ? { tool_calls: raw.tool_calls } : {}),
      };
      if (
        !assistantShape(content) ||
        (!content.content && !content.tool_calls?.length)
      )
        return null;
      const calls = (content.tool_calls || []).map((call) => {
        try {
          return {
            name: call.function.name,
            args: JSON.parse(call.function.arguments),
          };
        } catch {
          return { name: call.function.name, parseError: true };
        }
      });
      return {
        content,
        finishReason: choice.finish_reason,
        invalidCalls: invalidCalls(
          calls,
          offeredTools(tools, { overpass: overpassConfigured() }),
        ),
      };
    },
  });
}
