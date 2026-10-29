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
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

@Controller('moving-plans/:planId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(planId, dto);
  }

  @Get()
  findAll(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.tasksService.findAll(planId);
  }

  @Get(':taskId')
  findOne(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.findOne(planId, taskId);
  }

  @Patch(':taskId')
  update(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(planId, taskId, dto);
  }

  @Delete(':taskId')
  @HttpCode(204)
  remove(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.remove(planId, taskId);
  }
}
