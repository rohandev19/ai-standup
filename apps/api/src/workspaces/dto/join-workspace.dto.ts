import { IsString, IsNotEmpty } from 'class-validator';

export class JoinWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
