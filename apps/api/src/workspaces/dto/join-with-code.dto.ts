import { IsString, IsNotEmpty } from 'class-validator';

export class JoinWithCodeDto {
  @IsString()
  @IsNotEmpty()
  joinCode: string;

  @IsString()
  @IsNotEmpty()
  joinPassword: string;
}
