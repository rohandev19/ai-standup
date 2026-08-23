import { IsArray, IsEmail, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class InviteBulkDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20) // Requirement 3.7
  emails!: string[];
}
