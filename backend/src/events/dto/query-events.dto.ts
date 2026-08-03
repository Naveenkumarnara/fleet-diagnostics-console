import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsInt, Min, IsDateString, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryEventsDto {
  @ApiPropertyOptional({ description: 'Comma-separated vehicle IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value))
  vehicleIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: ['ERROR', 'WARN', 'INFO'] })
  @IsOptional()
  @IsIn(['ERROR', 'WARN', 'INFO', 'error', 'warn', 'info'])
  level?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 start time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
