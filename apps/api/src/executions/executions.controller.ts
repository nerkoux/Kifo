import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ExecutionsService } from './executions.service';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';

@ApiTags('Executions')
@Controller('executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({ summary: 'List workflow executions' })
  async listExecutions(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListExecutionsQueryDto,
  ) {
    return this.executionsService.listExecutions(req.user.userId, {
      workflowId: query.workflowId,
      botId: query.botId,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution details' })
  async getExecution(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.executionsService.getExecution(req.user.userId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get execution logs' })
  async getExecutionLogs(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.executionsService.getExecutionLogs(req.user.userId, id);
  }
}
