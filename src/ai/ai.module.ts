import { Module } from '@nestjs/common';
import { OpenAiLlmAdapter } from './adapters/openai/openai-llm.adapter.js';
import { LLM_PORT } from './ports/llm.port.js';

@Module({
  providers: [
    OpenAiLlmAdapter,
    {
      provide: LLM_PORT,
      useClass: OpenAiLlmAdapter,
    },
  ],
  exports: [LLM_PORT],
})
export class AiModule {}
