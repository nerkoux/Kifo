import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional, validateSync, Min, Max } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  @IsOptional()
  API_PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_HOST: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsString()
  DISCORD_CLIENT_ID: string;

  @IsString()
  DISCORD_CLIENT_SECRET: string;

  @IsString()
  DISCORD_BOT_TOKEN: string;

  @IsString()
  @IsOptional()
  DISCORD_REDIRECT_URI: string;

  @IsString()
  ENCRYPTION_KEY: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY: string;

  @IsString()
  @IsOptional()
  S3_ENDPOINT: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  S3_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  S3_BUCKET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  
  return validatedConfig;
}
