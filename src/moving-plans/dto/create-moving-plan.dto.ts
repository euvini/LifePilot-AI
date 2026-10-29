import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMovingPlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  origin: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  destination: string;

  @IsDateString()
  movingDate: string;
}
