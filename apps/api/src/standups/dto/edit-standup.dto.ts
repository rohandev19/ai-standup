import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EditStandupDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  yesterdayText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  todayText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  blockerText?: string;
}
