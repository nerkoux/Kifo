import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CreateWorkflowDto, ManualExecutionDto, UpdateWorkflowDto } from './dto/workflow.dto';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflows for user' })
  async getWorkflows(@Request() req: AuthenticatedRequest) {
    return this.workflowsService.getWorkflows(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new workflow' })
  async createWorkflow(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.createWorkflow(req.user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  async getWorkflow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.getWorkflow(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  async updateWorkflow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.updateWorkflow(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  async deleteWorkflow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.deleteWorkflow(req.user.userId, id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish workflow' })
  async publishWorkflow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.publishWorkflow(req.user.userId, id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow manually' })
  async executeWorkflow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ManualExecutionDto,
  ) {
    return this.workflowsService.queueExecution(req.user.userId, id, dto.triggerData);
  }
}
