import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { minutes, normalizeIp, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module.js';
import { HealthModule } from './health/health.module.js';
import { MovingPlansModule } from './moving-plans/moving-plans.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

export const throttlerTracker = (req: Record<string, any>): string => {
  const rawIp =
    typeof req.ip === 'string' && req.ip.length > 0
      ? req.ip
      : typeof req.socket?.remoteAddress === 'string' &&
          req.socket.remoteAddress.length > 0
        ? req.socket.remoteAddress
        : '127.0.0.1';
  return normalizeIp(rawIp);
};

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: minutes(1),
          limit: 5,
        },
      ],
      errorMessage:
        'Limite de requisições excedido. Tente novamente em instantes.',
      getTracker: throttlerTracker,
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'LifePilot-AI',
    }),
    PrismaModule,
    AiModule,
    HealthModule,
    MovingPlansModule,
  ],
})
export class AppModule {}
