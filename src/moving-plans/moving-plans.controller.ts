import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CreateMovingPlanDto } from './dto/create-moving-plan.dto.js';
import { MovingPlansService } from './moving-plans.service.js';

@UseGuards(AuthGuard)
@Controller('moving-plans')
export class MovingPlansController {
  constructor(private readonly movingPlansService: MovingPlansService) {}

  @Post()
  create(
    @Body() dto: CreateMovingPlanDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.movingPlansService.create(dto, user.id)
      : this.movingPlansService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return user?.id
      ? this.movingPlansService.findAll(user.id)
      : this.movingPlansService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.movingPlansService.findOne(id, user.id)
      : this.movingPlansService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return user?.id
      ? this.movingPlansService.remove(id, user.id)
      : this.movingPlansService.remove(id);
  }
}
