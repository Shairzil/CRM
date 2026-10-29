import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Res } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateInternalInvoiceDto } from './dto/create-internal-invoice.dto';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Post('internal')
  async createInternal(@Body() createInternalInvoiceDto: CreateInternalInvoiceDto) {
    return this.invoicesService.createInternal(createInternalInvoiceDto);
  }

  @Get('balance')
  async getBalanceSheet() {
    return this.invoicesService.getBalanceSheet();
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
