import { IsOptional, IsString, IsUrl, IsEnum } from 'class-validator';

enum GlobalEmailPref {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_DIGEST = 'DAILY_DIGEST',
  OFF = 'OFF',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(GlobalEmailPref)
  globalEmailPref?: GlobalEmailPref;
}
