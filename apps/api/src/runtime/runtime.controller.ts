import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RuntimeService } from './runtime.service';

@ApiTags('Runtime')
@Controller('runtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Get('workers')
  @ApiOperation({ summary: 'List runtime workers and assigned bots' })
  async getWorkers() {
    return this.runtimeService.getWorkers();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get runtime status summary' })
  async getSummary() {
    return this.runtimeService.getRuntimeSummary();
  }
}
