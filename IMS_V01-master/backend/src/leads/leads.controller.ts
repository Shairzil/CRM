import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadsService, SOURCE_LABELS } from './leads.service';
import { MetaLeadsService } from './meta-leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AddLeadActivityDto } from './dto/add-activity.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';
import { SOURCE_CHANNELS } from '../common/source-channel';
import { LEAD_STATUSES } from '../entities/lead.entity';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly meta: MetaLeadsService,
  ) {}

  /** Dropdown values for the frontend. */
  @Get('options')
  options() {
    return {
      statuses: LEAD_STATUSES,
      sources: SOURCE_CHANNELS.map((s) => ({ value: s, label: SOURCE_LABELS[s] || s })),
      meta: this.meta.status(),
    };
  }

  @Get('stats')
  stats() {
    return this.leadsService.stats();
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('source_channel') source_channel?: string,
    @Query('campaign_name') campaign_name?: string,
    @Query('assigned') assigned?: string,
    @Query('follow_up') follow_up?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('page_size') page_size?: string,
  ) {
    return this.leadsService.list(
      {
        status: status || undefined,
        source_channel: source_channel || undefined,
        campaign_name: campaign_name || undefined,
        assigned: assigned || undefined,
        follow_up: follow_up || undefined,
        search: search?.trim() || undefined,
        page: page ? Number(page) : undefined,
        page_size: page_size ? Number(page_size) : undefined,
      },
      user.id,
    );
  }

  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.create(dto, user.id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('source_channel') sourceChannel: string,
    @Query('assign_to') assignTo: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.importFile(file, sourceChannel || 'meta_ads', assignTo ? Number(assignTo) : null, user.id);
  }

  @Post('meta/sync')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  syncMeta(@Query('form_ids') formIds?: string) {
    return this.meta.syncForms(formIds);
  }

  @Post('bulk-assign')
  @HttpCode(200)
  bulkAssign(@Body() body: { ids?: number[]; assigned_to_user_id?: number | null }, @CurrentUser() user: AuthUser) {
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n)) : [];
    if (ids.length === 0) throw new BadRequestException('Select at least one lead.');
    const target = body?.assigned_to_user_id == null ? null : Number(body.assigned_to_user_id);
    return this.leadsService.bulkAssign(ids, target, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.update(id, dto, user.id);
  }

  @Post(':id/activities')
  addActivity(@Param('id', ParseIntPipe) id: number, @Body() dto: AddLeadActivityDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.addActivity(id, dto, user.id);
  }

  @Post(':id/convert')
  @HttpCode(200)
  convert(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.leadsService.convert(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.remove(id);
  }
}
