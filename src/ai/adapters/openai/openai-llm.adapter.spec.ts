import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenAiLlmAdapter } from './openai-llm.adapter.js';

describe('OpenAiLlmAdapter', () => {
  let adapter: OpenAiLlmAdapter;
  const originalEnv = process.env;

  const sampleInput = {
    planTitle: 'Mudança para Lisboa',
    origin: 'Porto',
    destination: 'Lisboa',
    movingDate: '2026-12-01',
    maxSuggestions: 5,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      LLM_API_KEY: 'test-api-key',
      LLM_MODEL: 'gpt-4o-mini',
      LLM_TIMEOUT_MS: '5000',
    };
    adapter = new OpenAiLlmAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw ServiceUnavailableException when LLM_API_KEY is not configured', async () => {
    delete process.env.LLM_API_KEY;

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should call OpenAI endpoint with structured outputs and return suggestions', async () => {
    const rawSuggestions = [
      {
        title: 'Contratar transportadora',
        description: 'Pedir 3 orçamentos',
        dueDate: '2026-11-15',
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ suggestions: rawSuggestions }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await adapter.generateTaskSuggestions(sampleInput);

    expect(result).toEqual(rawSuggestions);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-api-key',
    });

    const parsedBody = JSON.parse(options.body as string);
    expect(parsedBody.model).toBe('gpt-4o-mini');
    expect(parsedBody.response_format.type).toBe('json_schema');
    expect(parsedBody.messages[0].role).toBe('system');
    expect(parsedBody.messages[0].content).toContain('Security Policy');
    expect(parsedBody.messages[1].role).toBe('user');
    expect(parsedBody.messages[1].content).toContain(sampleInput.planTitle);
  });

  it('should throw GatewayTimeoutException on fetch timeout', async () => {
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'TimeoutError';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('should throw 429 HttpException on provider rate limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('should throw BadGatewayException on provider 401 authentication failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('should throw BadGatewayException when model issues a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: null,
                refusal: 'I cannot fulfill this request.',
              },
            },
          ],
        }),
      }),
    );

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('should throw BadGatewayException when response content is malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'not valid json',
              },
            },
          ],
        }),
      }),
    );

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('should throw BadGatewayException when suggestions field is not an array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({ suggestions: 'not-an-array' }),
              },
            },
          ],
        }),
      }),
    );

    await expect(
      adapter.generateTaskSuggestions(sampleInput),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
