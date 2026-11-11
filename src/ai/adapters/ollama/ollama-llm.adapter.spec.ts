import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaLlmAdapter } from './ollama-llm.adapter.js';

describe('OllamaLlmAdapter', () => {
  let adapter: OllamaLlmAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    adapter = new OllamaLlmAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const sampleInput = {
    planTitle: 'Mudança para Coimbra',
    origin: 'Porto',
    destination: 'Coimbra',
    movingDate: '2026-11-30',
    referenceDate: '2026-10-31',
    maxSuggestions: 3,
  };

  const sampleOllamaResponse = {
    model: 'qwen2.5:3b',
    created_at: '2026-10-29T18:00:00Z',
    message: {
      role: 'assistant',
      content: JSON.stringify({
        suggestions: [
          {
            title: 'Contratar transporte',
            description: 'Cotar com 3 empresas locais',
            dueDate: '2026-11-15',
          },
          {
            title: 'Comprar caixas e fita',
            description: null,
            dueDate: null,
          },
        ],
      }),
    },
    total_duration: 1200000000,
    eval_count: 55,
    eval_duration: 900000000,
  };

  it('should generate suggestions when Ollama responds with structured JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(sampleOllamaResponse),
    } as unknown as Response);

    const result = await adapter.generateTaskSuggestions(sampleInput);

    expect(result).toEqual([
      {
        title: 'Contratar transporte',
        description: 'Cotar com 3 empresas locais',
        dueDate: '2026-11-15',
      },
      {
        title: 'Comprar caixas e fita',
        description: null,
        dueDate: null,
      },
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
    });
    // Verifies no Authorization header is sent
    expect(
      (options?.headers as Record<string, string>)?.Authorization,
    ).toBeUndefined();

    const parsedBody = JSON.parse(options?.body as string);
    expect(parsedBody.model).toBe('qwen2.5:3b');
    expect(parsedBody.format).toBeDefined();
    expect(parsedBody.format.type).toBe('object');
    expect(parsedBody.format.required).toContain('suggestions');

    // Prompt contains referenceDate and both temporal limits
    const systemPrompt = parsedBody.messages.find(
      (m: { role: string }) => m.role === 'system',
    )?.content;
    const userPrompt = parsedBody.messages.find(
      (m: { role: string }) => m.role === 'user',
    )?.content;

    expect(systemPrompt).toContain('referenceDate <= dueDate <= movingDate');
    expect(systemPrompt).toContain('referenceDate (current date, start of planning)');
    expect(systemPrompt).toContain('movingDate (final deadline)');
    expect(userPrompt).toContain('"referenceDate": "2026-10-31"');
    expect(userPrompt).toContain('"movingDate": "2026-11-30"');
  });

  it('should instruct the model to use natural Brazilian Portuguese (PT-BR) with Brazilian moving terminology', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(sampleOllamaResponse),
    } as unknown as Response);

    await adapter.generateTaskSuggestions(sampleInput);

    const [, options] = fetchSpy.mock.calls[0];
    const parsedBody = JSON.parse(options?.body as string);
    const systemPrompt = parsedBody.messages.find(
      (m: { role: string }) => m.role === 'system',
    )?.content;

    expect(systemPrompt).toContain('Brazilian Portuguese - PT-BR');
    expect(systemPrompt).toContain('Never use European Portuguese');
    expect(systemPrompt).toContain('caminhão de mudança');
    expect(systemPrompt).toContain('frete');
    expect(systemPrompt).toContain('transportadora');
    expect(systemPrompt).toContain('caixas de papelão');
    expect(systemPrompt).toContain('fita adesiva');
    expect(systemPrompt).toContain('desapegar de itens');
    expect(systemPrompt).toContain('separar itens para doação');
    expect(systemPrompt).toContain('contas de água, luz e internet');
    expect(systemPrompt).toContain('condomínio');
    expect(systemPrompt).toContain('embalar os pertences');
    expect(systemPrompt).toContain('carrinha');
    expect(systemPrompt).toContain('declutar');
  });

  it('should use custom LLM_BASE_URL and LLM_MODEL when configured in env', async () => {
    process.env.LLM_BASE_URL = 'http://127.0.0.1:11435';
    process.env.LLM_MODEL = 'llama3.2:3b';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(sampleOllamaResponse),
    } as unknown as Response);

    await adapter.generateTaskSuggestions(sampleInput);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11435/api/chat');
    const parsedBody = JSON.parse(options?.body as string);
    expect(parsedBody.model).toBe('llama3.2:3b');
  });

  it('should include Authorization header and default to https://ollama.com when OLLAMA_API_KEY is configured', async () => {
    delete process.env.LLM_BASE_URL;
    process.env.OLLAMA_API_KEY = 'ollama-cloud-test-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(sampleOllamaResponse),
    } as unknown as Response);

    await adapter.generateTaskSuggestions(sampleInput);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://ollama.com/api/chat');
    expect((options?.headers as Record<string, string>)?.Authorization).toBe(
      'Bearer ollama-cloud-test-key',
    );
  });

  it('should include Authorization header when LLM_API_KEY is configured', async () => {
    delete process.env.LLM_BASE_URL;
    process.env.LLM_API_KEY = 'ollama-cloud-test-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(sampleOllamaResponse),
    } as unknown as Response);

    await adapter.generateTaskSuggestions(sampleInput);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://ollama.com/api/chat');
    expect((options?.headers as Record<string, string>)?.Authorization).toBe(
      'Bearer ollama-cloud-test-key',
    );
  });

  it('should handle 401 authentication error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      'Falha de autenticação com o provedor Ollama (verifique seu LLM_API_KEY).',
    );
  });

  it('should handle 429 rate limit error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      'Limite de requisições do provedor Ollama atingido. Tente novamente em alguns instantes.',
    );
  });

  it('should map TimeoutError to GatewayTimeoutException (504)', async () => {
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'TimeoutError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutError);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  it('should map network error to BadGatewayException (502) with accessible message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:11434'),
    );

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      BadGatewayException,
    );
    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      /Serviço local Ollama não está acessível/,
    );
  });

  it('should throw BadGatewayException when Ollama returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should throw BadGatewayException when Ollama message content is missing or empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        message: { content: '' },
      }),
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should throw BadGatewayException when Ollama response is not valid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        message: { content: 'not valid json' },
      }),
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should throw BadGatewayException when suggestions array is missing in JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        message: { content: JSON.stringify({ otherField: [] }) },
      }),
    } as unknown as Response);

    await expect(adapter.generateTaskSuggestions(sampleInput)).rejects.toThrow(
      BadGatewayException,
    );
  });
});
