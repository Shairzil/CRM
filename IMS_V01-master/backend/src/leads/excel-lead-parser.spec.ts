import ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { parseExcelLeadRows } from './excel-lead-parser';

describe('parseExcelLeadRows', () => {
  it('maps first-sheet headers and values to lead import rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');
    sheet.addRow(['Full Name', 'Phone Number', 'Email']);
    sheet.addRow(['Samira Rahman', '+8801712345678', 'samira@example.com']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(parseExcelLeadRows(buffer)).resolves.toEqual([
      {
        'Full Name': 'Samira Rahman',
        'Phone Number': '+8801712345678',
        Email: 'samira@example.com',
      },
    ]);
  });

  it('rejects invalid workbooks with a user-facing error', async () => {
    await expect(parseExcelLeadRows(Buffer.from('not an xlsx file'))).rejects.toBeInstanceOf(BadRequestException);
  });
});
