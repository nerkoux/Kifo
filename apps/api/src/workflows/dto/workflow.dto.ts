import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { WorkflowStatus } from '@prisma/client';
import { NodeType } from '../workflow-engine.service';

class WorkflowNodePositionDto {
  @IsNumber()
  @Type(() => Number)
  x: number;

  @IsNumber()
  @Type(() => Number)
  y: number;
}

class WorkflowNodeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(NodeType)
  type: NodeType;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowNodePositionDto)
  position?: WorkflowNodePositionDto;
}

class WorkflowEdgeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsNotEmpty()
  target: string;

  @IsOptional()
  @IsString()
  condition?: string;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsString()
  @IsNotEmpty()
  botId: string;

  @IsOptional()
  @IsString()
  guildId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[];
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdgeDto[];

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class ManualExecutionDto {
  @IsObject()
  triggerData: Record<string, unknown>;
}
