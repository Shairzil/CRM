import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Res } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateInternalInvoiceDto } from './dto/create-internal-invoice.dto';
import * as fs from 'fs';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() createInvoiceDto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.create(createInvoiceDto, user.id);
  }

  @Post('internal')
  async createInternal(@Body() createInternalInvoiceDto: CreateInternalInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.createInternal(createInternalInvoiceDto, user.id);
  }

  /** Confidential: admin + accounts only (enforced on the server, not just the UI). */
  @Get('balance')
  @Roles(Role.ACCOUNTS)
  async getBalanceSheet() {
    return this.invoicesService.getBalanceSheet();
  }

  /** Money collected per employee — admin + accounts. */
  @Get('collections')
  @Roles(Role.ACCOUNTS)
  async getCollections(@Query('month') month?: string) {
    return this.invoicesService.getCollectionsByEmployee(month);
  }

  @Get()
  async findAll(@Query('invoice_id') invoiceId?: string) {
    return this.invoicesService.findAll(invoiceId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const pdfPath = await this.invoicesService.getPdfPath(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="invoice.pdf"',
    });
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  }
}
