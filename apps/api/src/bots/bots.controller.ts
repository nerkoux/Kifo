import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BotsService } from './bots.service';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('Bots')
@Controller('bots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bots for user' })
  async getBots(@Request() req: AuthenticatedRequest) {
    return this.botsService.getBots(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new bot' })
  async createBot(
    @Request() req: AuthenticatedRequest,
    @Body() dto: any,
  ) {
    return this.botsService.createBot(req.user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bot by ID' })
  async getBot(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.botsService.getBot(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bot' })
  async updateBot(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.botsService.updateBot(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bot' })
  async deleteBot(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.botsService.deleteBot(req.user.userId, id);
  }
}
