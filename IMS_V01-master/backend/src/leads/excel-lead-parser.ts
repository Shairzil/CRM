import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export async function parseExcelLeadRows(buffer: Buffer): Promise<Record<string, string>[]> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new BadRequestException('Could not read the Excel workbook. Make sure it is a valid .xlsx file.');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  if (worksheet.rowCount > 5001) {
    throw new BadRequestException('Please import at most 5000 data rows at a time.');
  }

  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: headerRow.cellCount }, (_, index) =>
    headerRow.getCell(index + 1).text.trim(),
  );
  if (headers.every((header) => !header)) return [];

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const excelRow = worksheet.getRow(rowNumber);
    const values: string[] = [];
    let hasValues = false;
    for (let column = 1; column <= headers.length; column++) {
      const cell = excelRow.getCell(column);
      const value = cell.value;
      const text = value instanceof Date
        ? value.toISOString()
        : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : cell.text;
      values.push(text.trim());
      if (text.trim()) hasValues = true;
    }

    if (!hasValues) continue;
    const mappedRow: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) mappedRow[header] = values[index] ?? '';
    });
    rows.push(mappedRow);
  }
  return rows;
}
