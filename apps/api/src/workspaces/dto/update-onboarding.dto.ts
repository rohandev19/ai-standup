import {
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  Matches,
  IsOptional,
} from 'class-validator';

export class UpdateOnboardingDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Must be HH:mm format',
  })
  @IsOptional()
  standupWindowStart?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Must be HH:mm format',
  })
  @IsOptional()
  standupWindowEnd?: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  workingDays?: number[];
}
