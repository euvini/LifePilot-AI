import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { MovingPlansController } from './moving-plans.controller.js';
import { MovingPlansService } from './moving-plans.service.js';
import { TaskSuggestionsController } from './task-suggestions/task-suggestions.controller.js';
import { TaskSuggestionsService } from './task-suggestions/task-suggestions.service.js';
import { TaskSuggestionsValidator } from './task-suggestions/task-suggestions.validator.js';
import { TasksController } from './tasks/tasks.controller.js';
import { TasksService } from './tasks/tasks.service.js';

@Module({
  imports: [AiModule],
  controllers: [
    MovingPlansController,
    TasksController,
    TaskSuggestionsController,
  ],
  providers: [
    MovingPlansService,
    TasksService,
    TaskSuggestionsService,
    TaskSuggestionsValidator,
  ],
})
export class MovingPlansModule {}
