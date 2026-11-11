import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { TaskResponse } from '../tasks/task.mapper.js';
import { AcceptTaskSuggestionsDto } from './dto/accept-task-suggestions.dto.js';
import { GenerateTaskSuggestionsDto } from './dto/generate-task-suggestions.dto.js';
import { TaskSuggestionsResponse } from './dto/task-suggestions-response.dto.js';
import { TaskSuggestionsService } from './task-suggestions.service.js';

@Controller('moving-plans/:planId/task-suggestions')
export class TaskSuggestionsController {
  constructor(
    private readonly taskSuggestionsService: TaskSuggestionsService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard, ThrottlerGuard)
  generate(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: GenerateTaskSuggestionsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TaskSuggestionsResponse> {
    return user?.id
      ? this.taskSuggestionsService.generateSuggestions(planId, dto, user.id)
      : this.taskSuggestionsService.generateSuggestions(planId, dto);
  }

  @Post('accept')
  @HttpCode(201)
  @UseGuards(AuthGuard)
  accept(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: AcceptTaskSuggestionsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TaskResponse[]> {
    return user?.id
      ? this.taskSuggestionsService.acceptSuggestions(planId, dto, user.id)
      : this.taskSuggestionsService.acceptSuggestions(planId, dto);
  }
}
