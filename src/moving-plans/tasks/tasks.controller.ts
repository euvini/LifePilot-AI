import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

@UseGuards(AuthGuard)
@Controller('moving-plans/:planId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.tasksService.create(planId, dto, user.id)
      : this.tasksService.create(planId, dto);
  }

  @Get()
  findAll(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.tasksService.findAll(planId, user.id)
      : this.tasksService.findAll(planId);
  }

  @Get(':taskId')
  findOne(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.tasksService.findOne(planId, taskId, user.id)
      : this.tasksService.findOne(planId, taskId);
  }

  @Patch(':taskId')
  update(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.tasksService.update(planId, taskId, dto, user.id)
      : this.tasksService.update(planId, taskId, dto);
  }

  @Delete(':taskId')
  @HttpCode(204)
  remove(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.tasksService.remove(planId, taskId, user.id)
      : this.tasksService.remove(planId, taskId);
  }
}
