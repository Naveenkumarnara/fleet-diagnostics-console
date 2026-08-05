import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ContextQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;
}
