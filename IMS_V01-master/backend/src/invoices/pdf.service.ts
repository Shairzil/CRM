import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateInvoicePdf(
    invoice: any,
    studentName: string,
    phoneCountryCode: string,
    phoneNumber: string,
    fileOpeningFeeBdt: number,
    outputPath: string,
    studentDisplayId?: string,
    isSpendTransaction?: boolean,
    remainingAmount?: number,
  ): Promise<void> {
    const createdAt = invoice.created_at ? new Date(invoice.created_at) : new Date();
    
    // Format: "06 Jun 2026"
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const dayStr = createdAt.getDate().toString().padStart(2, '0');
    const dateStr = `${dayStr} ${months[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

    // Format: "Current Time" e.g., "09:27 AM"
    let hours = createdAt.getHours();
    const minutes = createdAt.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    const formatAmount = (value: number) =>
      parseFloat(String(value || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const isInternal = !!(invoice.invoice_id && invoice.invoice_id.startsWith('Next/Int/'));

    if (isInternal) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Internal Invoice</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; -webkit-print-color-adjust: exact; }
            .invoice-page { width: 794px; min-height: 1123px; padding: 118px 52px 48px; background: #fff; }
            .topbar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #24428e; padding-bottom: 2px; }
            .invoice-title { color: #34547e; font-size: 36px; font-weight: 700; line-height: 1; letter-spacing: 0; }
            .tagline { color: #34547e; font-size: 14px; line-height: 0.95; text-align: center; margin-bottom: 3px; }
            .logo { color: #000; font-size: 35px; font-weight: 800; line-height: 0.95; letter-spacing: 0; }
            .logo .accent { color: #e51c23; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; margin-top: 9px; color: #34547e; }
            .meta-block { font-size: 16px; line-height: 1.45; }
            .meta-block.center { text-align: center; }
            .meta-block.right { text-align: right; }
            .label { font-weight: 700; text-transform: uppercase; }
            .value-strong { font-weight: 700; color: #2d3f63; }
            .muted { color: #4b5d7e; }
            .items-table { width: 100%; margin-top: 10px; border-collapse: collapse; table-layout: fixed; }
            .items-table th, .items-table td { border: 1px solid #9aabc7; padding: 9px 10px; vertical-align: top; }
            .items-table th { background: #eef2f7; color: #000; font-size: 20px; font-weight: 700; line-height: 1; }
            .items-table td { height: 72px; font-size: 20px; }
            .description { text-align: left; }
            .amount { text-align: right; }
            .summary-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
            .summary-table { width: 276px; border-collapse: collapse; table-layout: fixed; font-size: 20px; }
            .summary-table td { border: 1px solid #9aabc7; padding: 10px 13px; }
            .summary-table .amount-cell { text-align: right; }
            .summary-table .due td { background: #254293; color: #fff; font-weight: 700; }
            .footer { margin-top: 58px; border-top: 1px solid #d8d8d8; padding-top: 13px; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; column-gap: 18px; }
            .tax-note { color: #3f4f69; font-size: 15px; }
            .thank-you { color: #4b4b4b; text-align: center; font-size: 23px; font-weight: 700; }
            .signature { text-align: right; color: #000; font-size: 16px; }
            .signature-line { margin-left: auto; margin-bottom: 5px; width: 132px; height: 22px; border-bottom: 1px dotted #333; }
          </style>
        </head>
        <body>
          <main class="invoice-page">
            <div class="topbar">
              <div class="invoice-title">INTERNAL INVOICE</div>
              <div class="tagline">Educational &amp; Corporate<br>Solutions</div>
              <div class="logo">nextED<span class="accent">.</span></div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <div class="label">Payer:</div>
                <div><span class="value-strong">Name:</span> <span class="value-strong">${invoice.payer_name}</span></div>
              </div>

              <div class="meta-block center">
                <div class="label">Invoice Type:</div>
                <div class="muted">Internal Cost</div>
              </div>

              <div class="meta-block right">
                <div><span class="label">Inv.No:</span> <span class="value-strong">#${invoice.invoice_id}</span></div>
                <div><span class="label">Date:</span> <span class="value-strong">${dateStr}</span></div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="description" style="width: 68%;">Description / Purpose</th>
                  <th class="amount" style="width: 32%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="description">${invoice.comment || 'Internal Expense'}</td>
                  <td class="amount">BDT ${formatAmount(invoice.total_amount_bdt)}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-wrap">
              <table class="summary-table">
                <tbody>
                  <tr class="due">
                    <td>Total Amount:</td>
                    <td class="amount-cell">BDT ${formatAmount(invoice.total_amount_bdt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <footer class="footer">
              <div class="tax-note">*Internal record for company expense.</div>
              <div class="thank-you">PAID</div>
              <div class="signature">
                <div class="signature-line"></div>
                <div>Authorized Signature</div>
              </div>
            </footer>
          </main>
        </body>
        </html>
      `;

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' } });
        fs.writeFileSync(outputPath, pdfBuffer);
      } finally {
        await browser.close();
      }
      return;
    }

    const fileOpeningAmount = Number(fileOpeningFeeBdt || 0);
    const applicationAmount = Number(invoice.application_fee_bdt || 0);
    const otherAmount = Number(invoice.other_fee_bdt || 0);
    const payableAmount = fileOpeningAmount + applicationAmount + otherAmount;
    const dueAmount = Number(invoice.due_amount_bdt || 0);
    const receivedAmount = payableAmount - dueAmount;

    const itemRows = [
      {
        description: 'File Opening Fee',
        amount: fileOpeningAmount,
      },
      {
        description: 'Application Fee',
        amount: applicationAmount,
      },
      {
        description: 'Other Fee',
        amount: otherAmount,
      },
    ];

    const paymentReferenceLines = [
      invoice.bank_name ? `Bank: ${invoice.bank_name}` : '',
      invoice.payment_detail ? `Ref: ${invoice.payment_detail}` : '',
    ].filter(Boolean);

    // ── Spend/Disbursement Voucher HTML ───────────────────────────────────────
    if (isSpendTransaction) {
      const disbursedAmount = Number(invoice.paid_amount_bdt || 0);
      const feeCategory = (invoice.comment || '').includes('Application') ? 'Application Fee' : 'Other Fee';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Disbursement Invoice</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; -webkit-print-color-adjust: exact; }
            .invoice-page { width: 794px; min-height: 1123px; padding: 118px 52px 48px; background: #fff; }
            .topbar-wrapper { border-bottom: 1.5px solid #24428e; padding-bottom: 2px; }
            .topbar-tagline { text-align: center; color: #34547e; font-size: 13px; line-height: 1; padding-bottom: 6px; letter-spacing: 0.3px; }
            .topbar { display: flex; justify-content: space-between; align-items: flex-end; }
            .invoice-title { color: #34547e; font-size: 32px; font-weight: 700; line-height: 1; letter-spacing: 0; }
            .logo { color: #000; font-size: 35px; font-weight: 800; line-height: 0.95; letter-spacing: 0; }
            .logo .accent { color: #e51c23; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; margin-top: 9px; color: #34547e; }
            .meta-block { font-size: 16px; line-height: 1.45; }
            .meta-block.center { text-align: center; }
            .meta-block.right { text-align: right; }
            .label { font-weight: 700; text-transform: uppercase; }
            .value-strong { font-weight: 700; color: #2d3f63; }
            .muted { color: #4b5d7e; }
            .items-table { width: 100%; margin-top: 10px; border-collapse: collapse; table-layout: fixed; }
            .items-table th, .items-table td { border: 1px solid #9aabc7; padding: 9px 10px; vertical-align: top; }
            .items-table th { background: #eef2f7; color: #000; font-size: 20px; font-weight: 700; line-height: 1; }
            .items-table td { height: 72px; font-size: 20px; }
            .description { text-align: left; }
            .amount { text-align: right; }
            .summary-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
            .summary-table { width: 276px; border-collapse: collapse; table-layout: fixed; font-size: 20px; }
            .summary-table td { border: 1px solid #9aabc7; padding: 10px 13px; }
            .summary-table .amount-cell { text-align: right; }
            .summary-table .due td { background: #254293; color: #fff; font-weight: 700; }
            .footer { margin-top: 58px; border-top: 1px solid #d8d8d8; padding-top: 13px; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; column-gap: 18px; }
            .tax-note { color: #3f4f69; font-size: 15px; }
            .thank-you { color: #4b4b4b; text-align: center; font-size: 23px; font-weight: 700; }
            .signature { text-align: right; color: #000; font-size: 16px; }
            .signature-line { margin-left: auto; margin-bottom: 5px; width: 132px; height: 22px; border-bottom: 1px dotted #333; }
          </style>
        </head>
        <body>
          <main class="invoice-page">
            <div class="topbar-wrapper">
              <div class="topbar-tagline">Educational &amp; Corporate Solutions</div>
              <div class="topbar">
                <div class="invoice-title">DISBURSEMENT INVOICE</div>
                <div class="logo">nextED<span class="accent">.</span></div>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <div class="label">Student:</div>
                <div><span class="value-strong">Name:</span> <span class="value-strong">${studentName}</span></div>
                <div><span class="muted">Phone:</span> <span class="muted">${phoneCountryCode ? phoneCountryCode + ' ' : ''}${phoneNumber || 'N/A'}</span></div>
              </div>
              <div class="meta-block center">
                <div class="label">Payment</div>
                <div class="label">Method:</div>
                <div class="muted" style="text-transform: capitalize;">${invoice.payment_method}</div>
                ${paymentReferenceLines.length ? `<div style="margin-top:4px;color:#4b5d7e;font-size:12px;line-height:1.35;">${paymentReferenceLines.join('<br>')}</div>` : ''}
              </div>
              <div class="meta-block right">
                <div><span class="label">Invoice No:</span> <span class="value-strong">#${invoice.invoice_id}</span></div>
                <div><span class="label">Date:</span> <span class="value-strong">${dateStr}</span></div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="description" style="width: 68%;">Description</th>
                  <th class="amount" style="width: 32%;">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="description">Fee Category</td>
                  <td class="amount" style="font-weight: bold; color: #2d3f63;">${feeCategory}</td>
                </tr>
                <tr>
                  <td class="description">Information</td>
                  <td class="amount" style="font-weight: bold; color: #2d3f63;">${invoice.information || 'N/A'}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-wrap">
              <table class="summary-table">
                <tbody>
                  <tr>
                    <td>Disbursed:</td>
                    <td class="amount-cell">BDT ${formatAmount(disbursedAmount)}</td>
                  </tr>
                  <tr class="due">
                    <td>Remaining:</td>
                    <td class="amount-cell">BDT ${formatAmount(remainingAmount || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <footer class="footer">
              <div class="tax-note">*This is an internal disbursement record.</div>
              <div class="thank-you">RECORDED</div>
              <div class="signature">
                <div class="signature-line"></div>
                <div>Authorized Signature</div>
              </div>
            </footer>
          </main>
        </body>
        </html>
      `;

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' } });
        fs.writeFileSync(outputPath, pdfBuffer);
      } finally {
        await browser.close();
      }
      return;
    }

    // ── Standard Invoice HTML ─────────────────────────────────────────────────
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            background-color: #fff;
            -webkit-print-color-adjust: exact;
          }

          .invoice-page {
            width: 794px;
            min-height: 1123px;
            padding: 118px 52px 48px;
            background: #fff;
          }

          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1.5px solid #24428e;
            padding-bottom: 2px;
          }

          .invoice-title {
            color: #34547e;
            font-size: 36px;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0;
          }

          .invoice-title .asterisk {
            margin-left: 8px;
            color: #34547e;
          }

          .tagline {
            color: #34547e;
            font-size: 14px;
            line-height: 0.95;
            text-align: center;
            margin-bottom: 3px;
          }

          .logo {
            color: #000;
            font-size: 35px;
            font-weight: 800;
            line-height: 0.95;
            letter-spacing: 0;
          }

          .logo .accent {
            color: #e51c23;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 28px;
            margin-top: 9px;
            color: #34547e;
          }

          .meta-block {
            font-size: 16px;
            line-height: 1.45;
          }

          .meta-block.center {
            text-align: center;
          }

          .meta-block.right {
            text-align: right;
          }

          .label {
            font-weight: 700;
            text-transform: uppercase;
          }

          .value-strong {
            font-weight: 700;
            color: #2d3f63;
          }

          .muted {
            color: #4b5d7e;
          }

          .items-table {
            width: 100%;
            margin-top: 10px;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #9aabc7;
            padding: 9px 10px;
            vertical-align: top;
          }

          .items-table th {
            background: #eef2f7;
            color: #000;
            font-size: 20px;
            font-weight: 700;
            line-height: 1;
          }

          .items-table td {
            height: 72px;
            font-size: 20px;
          }

          .description {
            text-align: left;
          }

          .amount {
            text-align: right;
          }

          .summary-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
          }

          .summary-table {
            width: 276px;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 20px;
          }

          .summary-table td {
            border: 1px solid #9aabc7;
            padding: 10px 13px;
          }

          .summary-table .amount-cell {
            text-align: right;
          }

          .summary-table .due td {
            background: #254293;
            color: #fff;
            font-weight: 700;
          }

          .footer {
            margin-top: 58px;
            border-top: 1px solid #d8d8d8;
            padding-top: 13px;
          }

          .footer-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .thank-you {
            color: #4b4b4b;
            text-align: center;
            font-size: 23px;
            font-weight: 700;
          }

          .signature {
            text-align: right;
            color: #000;
            font-size: 16px;
          }

          .signature-line {
            margin-left: auto;
            margin-bottom: 5px;
            width: 132px;
            height: 22px;
            border-bottom: 1px dotted #333;
          }

          .disclaimer-notes {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px dashed #c0c8d8;
            color: #3f4f69;
            font-size: 12px;
            line-height: 1.6;
          }

          .disclaimer-notes p {
            margin: 0 0 4px 0;
          }

          .payment-reference {
            margin-top: 8px;
            color: #4b5d7e;
            font-size: 12px;
            line-height: 1.35;
          }
        </style>
      </head>
      <body>
        <main class="invoice-page">
          <div class="topbar">
            <div class="invoice-title">INVOICE <span class="asterisk">*</span></div>
            <div class="tagline">Educational &amp; Corporate<br>Solutions</div>
            <div class="logo">nextED<span class="accent">.</span></div>
          </div>

          <div class="meta-grid">
            <div class="meta-block">
              <div class="label">Invoice To:</div>
              <div><span class="value-strong">Name:</span> <span class="value-strong">${studentName}</span></div>
              <div><span class="muted">Phone:</span> <span class="muted">${phoneCountryCode ? phoneCountryCode + ' ' : ''}${phoneNumber || 'N/A'}</span></div>
            </div>

            <div class="meta-block center">
              <div class="label">Payment</div>
              <div class="label">Method:</div>
              <div class="muted" style="text-transform: capitalize;">${invoice.payment_method}</div>
              ${paymentReferenceLines.length ? `<div class="payment-reference">${paymentReferenceLines.join('<br>')}</div>` : ''}
            </div>

            <div class="meta-block right">
              <div><span class="label">Inv.No:</span> <span class="value-strong">#${invoice.invoice_id}</span></div>
              <div><span class="label">Date:</span> <span class="value-strong">${dateStr}</span></div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="description" style="width: 68%;">Description</th>
                <th class="amount" style="width: 32%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows.map(item => `
                <tr>
                  <td class="description">${item.description}</td>
                  <td class="amount">${formatAmount(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-wrap">
            <table class="summary-table">
              <tbody>
                <tr>
                  <td>Payable:</td>
                  <td class="amount-cell">${formatAmount(payableAmount)}</td>
                </tr>
                <tr>
                  <td>Received:</td>
                  <td class="amount-cell">${formatAmount(receivedAmount)}</td>
                </tr>
                <tr class="due">
                  <td>Due:</td>
                  <td class="amount-cell">${formatAmount(dueAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="footer">
            <div class="footer-top">
              <div></div>
              <div class="thank-you">THANK YOU</div>
              <div class="signature">
                <div class="signature-line"></div>
                <div>Authorized Signature</div>
              </div>
            </div>
            <div class="disclaimer-notes">
              <p>*The student is entirely responsible for the validity of all academic and financial documents provided. The company holds no liability for rejections due to incorrect or fraudulent data.</p>
              <p>*All university application fees, embassy visa fees, courier charges, and document notarization costs are the sole responsibility of the student.</p>
              <p>*The File Opening Fee is strictly non-refundable, as NextED provides consultancy and processing support only &mdash; admission and visa decisions rest solely with universities and embassies, and cannot be guaranteed.</p>
            </div>
          </footer>
        </main>
      </body>
      </html>
    `;

    // Ensure target output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' },
      });
      fs.writeFileSync(outputPath, pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
