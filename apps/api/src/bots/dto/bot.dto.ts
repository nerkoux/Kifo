import { BotType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateBotDto {
  @IsEnum(BotType)
  type: BotType;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ValidateIf((o: CreateBotDto) => o.type === BotType.CUSTOM)
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(300)
  token?: string;
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(300)
  token?: string;
}
