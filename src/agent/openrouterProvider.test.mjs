import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENROUTER_MODELS, getOpenRouterKey, queryOpenRouter } from './openrouterProvider.js';

test('OpenRouter provider defines supported multi-model matrix', () => {
  assert.equal(OPENROUTER_MODELS.length, 7);
  const ids = OPENROUTER_MODELS.map(m => m.id);
  assert.ok(ids.includes('local-sovereign'));
  assert.ok(ids.includes('anthropic/claude-3.5-sonnet'));
  assert.ok(ids.includes('deepseek/deepseek-r1'));
  assert.ok(ids.includes('openai/gpt-4o'));
  assert.ok(ids.includes('meta-llama/llama-3.3-70b-instruct'));
  assert.ok(ids.includes('google/gemini-pro-1.5'));
  assert.ok(ids.includes('mistralai/mistral-large-2407'));
});

test('queryOpenRouter throws clear configuration error when API key is missing', async () => {
  await assert.rejects(
    async () => {
      await queryOpenRouter('Test prompt', 'anthropic/claude-3.5-sonnet', '');
    },
    /OPENROUTER_API_KEY not configured/
  );
});
