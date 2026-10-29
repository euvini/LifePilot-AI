import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateMovingPlanDto } from './dto/create-moving-plan.dto.js';
import { MovingPlansService } from './moving-plans.service.js';

@Controller('moving-plans')
export class MovingPlansController {
  constructor(private readonly movingPlansService: MovingPlansService) {}

  @Post()
  create(@Body() dto: CreateMovingPlanDto) {
    return this.movingPlansService.create(dto);
  }

  @Get()
  findAll() {
    return this.movingPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.movingPlansService.findOne(id);
  }
}
