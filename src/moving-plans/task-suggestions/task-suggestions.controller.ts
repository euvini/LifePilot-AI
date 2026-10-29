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
  @UseGuards(ThrottlerGuard)
  generate(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: GenerateTaskSuggestionsDto,
  ): Promise<TaskSuggestionsResponse> {
    return this.taskSuggestionsService.generateSuggestions(planId, dto);
  }

  @Post('accept')
  @HttpCode(201)
  accept(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: AcceptTaskSuggestionsDto,
  ): Promise<TaskResponse[]> {
    return this.taskSuggestionsService.acceptSuggestions(planId, dto);
  }
}
