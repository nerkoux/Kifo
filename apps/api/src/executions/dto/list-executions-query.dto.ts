import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { ExecutionStatus } from '@prisma/client';

export class ListExecutionsQueryDto {
  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsString()
  botId?: string;

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
