import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'lifepilot-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ai')
  getAiConfig() {
    const provider = (process.env.LLM_PROVIDER || 'openai').trim().toLowerCase();
    const isOllama = provider === 'ollama';
    const model =
      process.env.LLM_MODEL?.trim() || (isOllama ? 'qwen2.5:3b' : 'gpt-4o-mini');
    const hasKey = Boolean(
      (process.env.OLLAMA_API_KEY || process.env.LLM_API_KEY)?.trim(),
    );
    const baseUrl =
      process.env.LLM_BASE_URL?.trim() ||
      (isOllama
        ? hasKey
          ? 'https://ollama.com'
          : 'http://localhost:11434'
        : 'https://api.openai.com/v1');
    const isCloud = baseUrl.includes('ollama.com') || provider === 'openai';

    return {
      status: 'ok',
      provider: isOllama ? 'Ollama' : 'OpenAI',
      model,
      baseUrl,
      isCloud,
      label: isOllama
        ? isCloud
          ? `Ollama Cloud · ${model}`
          : `Ollama Local · ${model}`
        : `OpenAI · ${model}`,
    };
  }
}
