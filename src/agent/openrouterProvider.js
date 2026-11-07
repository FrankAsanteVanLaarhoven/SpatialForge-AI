/**
 * SpatialForge AI — OpenRouter Sovereign Tactical Intelligence Provider
 * 
 * Supports multi-model cloud routing across Claude 3.5 Sonnet, DeepSeek R1,
 * GPT-4o, Llama 3.3, and Gemini 1.5 Pro while preserving local fallback.
 */

export const OPENROUTER_MODELS = [
  { id: 'local-sovereign', name: 'Local Sovereign 2B Q4 (Air-Gap WebGPU)', provider: 'Local Enclave', isLocal: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', provider: 'Anthropic', isLocal: false },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 Reasoning (OpenRouter)', provider: 'DeepSeek', isLocal: false },
  { id: 'openai/gpt-4o', name: 'GPT-4o Omnimodal (OpenRouter)', provider: 'OpenAI', isLocal: false },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct (OpenRouter)', provider: 'Meta', isLocal: false },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (OpenRouter)', provider: 'Google', isLocal: false },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large (OpenRouter)', provider: 'Mistral', isLocal: false }
];

const SYSTEM_TACTICAL_PROMPT = `You are SpatialForge Sovereign AI, an evidence-aware tactical intelligence and bi-temporal geospatial replay copilot.
You assist defense, maritime, aviation, and orbital operators.
When an operator issues a navigation or system command, analyze their intent and include one of the following exact ACTION tags in brackets at the end of your response:
[ACTION: NAVIGATE_ANTWERP] - For Port of Antwerp, maritime zone adjudication
[ACTION: NAVIGATE_AUSTIN] - For Texas Capitol, urban nadir recon
[ACTION: NAVIGATE_PAD39A] - For SpaceX Pad 39A, Cape Canaveral, orbital launch
[ACTION: NAVIGATE_HORMUZ] - For Strait of Hormuz, chokepoint, dark vessel analysis
[ACTION: NAVIGATE_SHINJUKU] - For Shinjuku, Tokyo cyber metropolis, urban transit
[ACTION: SET_CUTOFF_1] - For bi-temporal cutoff 1 (14:05:05Z early cutoff)
[ACTION: SET_CUTOFF_2] - For bi-temporal cutoff 2 (14:05:20Z late cutoff)
[ACTION: START_RECORDING] - For starting mission screen recording
[ACTION: TOGGLE_AIRGAP] - For toggling touchless hand/finger gesture control
[ACTION: EVALUATE_ANOMALY] - For kinematic teleportation and spoofing audit

Respond concisely with tactical military-grade clarity.`;

/**
 * Dispatches action events to the spatial cockpit based on parsed intent tag.
 */
export function dispatchTacticalAction(actionTag) {
  if (typeof window === 'undefined') return;

  switch (actionTag) {
    case 'NAVIGATE_ANTWERP':
      window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { targetId: 'antwerp-approach' } }));
      break;
    case 'NAVIGATE_AUSTIN':
      window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { targetId: 'austin-nadir' } }));
      break;
    case 'NAVIGATE_PAD39A':
      window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { targetId: 'cape-pad39a' } }));
      break;
    case 'NAVIGATE_HORMUZ':
      window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { targetId: 'hormuz-choke' } }));
      break;
    case 'NAVIGATE_SHINJUKU':
      window.dispatchEvent(new CustomEvent('gev:airgap-swipe', { detail: { targetId: 'shinjuku-cyber' } }));
      break;
    case 'SET_CUTOFF_1':
      window.dispatchEvent(new CustomEvent('gev:cutoff-changed', { detail: { cutoff: 'early' } }));
      break;
    case 'SET_CUTOFF_2':
      window.dispatchEvent(new CustomEvent('gev:cutoff-changed', { detail: { cutoff: 'late' } }));
      break;
    case 'START_RECORDING':
      window.dispatchEvent(new CustomEvent('gev:toggle-mission-recording'));
      break;
    case 'TOGGLE_AIRGAP':
      window.dispatchEvent(new CustomEvent('gev:toggle-airgap-gesture'));
      break;
    default:
      break;
  }
}

/**
 * Retrieves OpenRouter API key from environment or localStorage.
 */
export function getOpenRouterKey() {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage?.getItem('openrouter_api_key');
    if (stored) return stored;
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) ||
    ''
  );
}

/**
 * Queries OpenRouter API with multi-model support.
 * @param {string} prompt Operator natural language query
 * @param {string} model Model identifier (e.g. anthropic/claude-3.5-sonnet)
 * @param {string} [overrideKey] Optional user-provided API key
 * @returns {Promise<{ reply: string, intent: string, executed: boolean, model: string, usage?: object }>}
 */
export async function queryOpenRouter(prompt, model = 'anthropic/claude-3.5-sonnet', overrideKey = '') {
  const apiKey = overrideKey || getOpenRouterKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured. Please set in .env.local or enter in Cockpit Settings.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': 'https://spatialforge.ai',
      'X-Title': 'SpatialForge AI Sovereign Platform',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_TACTICAL_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawReply = data.choices?.[0]?.message?.content || 'No response from model.';

  // Extract tactical action tag if present: [ACTION: XYZ]
  const actionMatch = rawReply.match(/\[ACTION:\s*([A-Z0-9_]+)\]/i);
  let intent = 'TACTICAL_INFERENCE';
  let executed = false;

  if (actionMatch) {
    intent = actionMatch[1].toUpperCase();
    dispatchTacticalAction(intent);
    executed = true;
  }

  // Clean reply from bracketed action tag for presentation
  const cleanReply = rawReply.replace(/\[ACTION:\s*[A-Z0-9_]+\]/gi, '').trim();

  return {
    reply: cleanReply,
    intent,
    executed,
    model,
    usage: data.usage
  };
}

