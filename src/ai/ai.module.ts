import { Module } from '@nestjs/common';
import { OllamaLlmAdapter } from './adapters/ollama/ollama-llm.adapter.js';
import { OpenAiLlmAdapter } from './adapters/openai/openai-llm.adapter.js';
import { LLM_PORT } from './ports/llm.port.js';

@Module({
  providers: [
    OpenAiLlmAdapter,
    OllamaLlmAdapter,
    {
      provide: LLM_PORT,
      useFactory: (
        openAiAdapter: OpenAiLlmAdapter,
        ollamaAdapter: OllamaLlmAdapter,
      ) => {
        const provider = (process.env.LLM_PROVIDER || 'openai')
          .trim()
          .toLowerCase();
        if (provider === 'ollama') {
          return ollamaAdapter;
        }
        if (provider === 'openai') {
          return openAiAdapter;
        }
        throw new Error(
          `Provedor de IA desconhecido: "${provider}". Provedores suportados são "openai" e "ollama".`,
        );
      },
      inject: [OpenAiLlmAdapter, OllamaLlmAdapter],
    },
  ],
  exports: [LLM_PORT],
})
export class AiModule {}
