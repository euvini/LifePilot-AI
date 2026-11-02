import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OllamaLlmAdapter } from './adapters/ollama/ollama-llm.adapter.js';
import { OpenAiLlmAdapter } from './adapters/openai/openai-llm.adapter.js';
import { AiModule } from './ai.module.js';
import { LLM_PORT } from './ports/llm.port.js';

describe('AiModule provider selection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should provide OllamaLlmAdapter when LLM_PROVIDER is "ollama"', async () => {
    process.env.LLM_PROVIDER = 'ollama';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const adapter = module.get(LLM_PORT);
    expect(adapter).toBeInstanceOf(OllamaLlmAdapter);
    expect(adapter).not.toBeInstanceOf(OpenAiLlmAdapter);
  });

  it('should provide OpenAiLlmAdapter when LLM_PROVIDER is "openai"', async () => {
    process.env.LLM_PROVIDER = 'openai';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const adapter = module.get(LLM_PORT);
    expect(adapter).toBeInstanceOf(OpenAiLlmAdapter);
    expect(adapter).not.toBeInstanceOf(OllamaLlmAdapter);
  });

  it('should default to OpenAiLlmAdapter when LLM_PROVIDER is unset', async () => {
    delete process.env.LLM_PROVIDER;

    const module: TestingModule = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const adapter = module.get(LLM_PORT);
    expect(adapter).toBeInstanceOf(OpenAiLlmAdapter);
  });

  it('should throw an error and refuse to bootstrap when LLM_PROVIDER is unsupported', async () => {
    process.env.LLM_PROVIDER = 'unsupported_provider';

    await expect(
      Test.createTestingModule({
        imports: [AiModule],
      }).compile(),
    ).rejects.toThrow(/Provedor de IA desconhecido/);
  });
});
