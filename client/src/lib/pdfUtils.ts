import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content, TableCell, StyleDictionary } from "pdfmake/interfaces";
import type { Sale, SaleItem } from "@shared/schema";

pdfMake.vfs = pdfFonts.vfs;

const styles: StyleDictionary = {
  header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
  subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
  tableHeader: { bold: true, fontSize: 10, fillColor: "#f5f5f5" },
  tableCell: { fontSize: 9 },
  total: { bold: true, fontSize: 10 },
  footer: { fontSize: 8, color: "#666666", margin: [0, 20, 0, 0] },
};

interface PurchaseReturnData {
  returnNumber: string;
  supplierName: string;
  returnDate: string;
  reason?: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  items: Array<{
    medicineName: string;
    batchNumber: string;
    expiryDate: string;
    quantityReturned: number;
    rate: string;
    gstRate: string;
    totalAmount: string;
  }>;
}

interface DayClosingData {
  businessDate: string;
  openingTime: string | null;
  closingTime: string | null;
  openingCash: string;
  expectedCash: string | null;
  actualCash: string | null;
  difference: string | null;
  status: string;
}

interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  dlNo: string;
}

interface InvoiceSettings {
  showMrp?: boolean;
  showGstBreakup?: boolean;
  showDoctor?: boolean;
  hideTaxDetails?: boolean;
  hideStoreGstin?: boolean;
}

export function generateSaleInvoicePdfBlob(
  sale: Sale,
  items: SaleItem[],
  storeInfo: StoreInfo,
  invoiceSettings?: InvoiceSettings,
): Promise<Blob> {
  const settings: Required<InvoiceSettings> = {
    showMrp: invoiceSettings?.showMrp ?? true,
    showGstBreakup: invoiceSettings?.showGstBreakup ?? true,
    showDoctor: invoiceSettings?.showDoctor ?? true,
    hideTaxDetails: invoiceSettings?.hideTaxDetails ?? false,
    hideStoreGstin: invoiceSettings?.hideStoreGstin ?? false,
  };

  const tableHeader: TableCell[] = [
    { text: "S.No", style: "tableHeader" },
    { text: "Description", style: "tableHeader" },
    { text: "HSN", style: "tableHeader" },
    { text: "Batch", style: "tableHeader" },
    { text: "Exp", style: "tableHeader" },
    ...(settings.showMrp ? [{ text: "MRP", style: "tableHeader", alignment: "right" as const }] : []),
    { text: "Qty", style: "tableHeader", alignment: "right" },
    { text: "Rate", style: "tableHeader", alignment: "right" },
    ...(!settings.hideTaxDetails ? [{ text: "GST%", style: "tableHeader", alignment: "right" as const }] : []),
    { text: "Amount", style: "tableHeader", alignment: "right" },
  ];

  const tableRows: TableCell[][] = items.map((item, index) => {
    const lineTax = Number(item.cgst || 0) + Number(item.sgst || 0);
    const lineAmountExclTax = Number(item.total || 0) - lineTax;

    return [
      { text: String(index + 1), style: "tableCell" },
      { text: item.medicineName, style: "tableCell" },
      { text: item.hsnCode || "-", style: "tableCell" },
      { text: item.batchNumber, style: "tableCell" },
      { text: item.expiryDate, style: "tableCell" },
      ...(settings.showMrp
        ? [{ text: item.mrp ? `₹${Number(item.mrp).toFixed(2)}` : "-", style: "tableCell", alignment: "right" as const }]
        : []),
      { text: String(item.quantity), style: "tableCell", alignment: "right" as const },
      { text: `₹${Number(item.price).toFixed(2)}`, style: "tableCell", alignment: "right" as const },
      ...(!settings.hideTaxDetails
        ? [{ text: `${item.gstRate || 0}%`, style: "tableCell", alignment: "right" as const }]
        : []),
      { text: `₹${lineAmountExclTax.toFixed(2)}`, style: "tableCell", alignment: "right" as const },
    ];
  });

  const summaryRows: TableCell[][] = [
    [{ text: "Subtotal:", style: "tableCell" }, { text: `₹${Number(sale.subtotal || 0).toFixed(2)}`, style: "tableCell", alignment: "right" }],
    ...(Number(sale.discount || 0) > 0
      ? [[{ text: "Discount:", style: "tableCell" }, { text: `-₹${Number(sale.discount || 0).toFixed(2)}`, style: "tableCell", alignment: "right" as const }]]
      : []),
    ...(!settings.hideTaxDetails && settings.showGstBreakup
      ? [
          [{ text: "CGST:", style: "tableCell" }, { text: `₹${Number(sale.cgst || 0).toFixed(2)}`, style: "tableCell", alignment: "right" as const }],
          [{ text: "SGST:", style: "tableCell" }, { text: `₹${Number(sale.sgst || 0).toFixed(2)}`, style: "tableCell", alignment: "right" as const }],
        ]
      : []),
    ...(!settings.hideTaxDetails && !settings.showGstBreakup
      ? [[{ text: "GST:", style: "tableCell" }, { text: `₹${(Number(sale.cgst || 0) + Number(sale.sgst || 0)).toFixed(2)}`, style: "tableCell", alignment: "right" as const }]]
      : []),
    ...(Number(sale.roundOff || 0) !== 0
      ? [[{ text: "Round Off:", style: "tableCell" }, { text: `₹${Number(sale.roundOff || 0).toFixed(2)}`, style: "tableCell", alignment: "right" as const }]]
      : []),
    [{ text: "TOTAL:", style: "total" }, { text: `₹${Number(sale.total || 0).toFixed(2)}`, style: "total", alignment: "right" }],
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [30, 30, 30, 30],
    content: [
      { text: storeInfo.name, style: "header", alignment: "center" },
      { text: storeInfo.address, alignment: "center", margin: [0, 0, 0, 2] },
      { text: `Phone: ${storeInfo.phone}${settings.hideStoreGstin ? "" : `   GSTIN: ${storeInfo.gstin}`}`, alignment: "center" },
      { text: `D.L. No: ${storeInfo.dlNo}`, alignment: "center", margin: [0, 0, 0, 10] },
      { text: settings.hideTaxDetails ? "INVOICE" : "TAX INVOICE", style: "subheader", alignment: "center" },
      {
        columns: [
          {
            width: "*",
            text: [
              `Invoice No: ${sale.invoiceNo || `INV-${sale.id}`}\n`,
              `Date: ${new Date(sale.createdAt).toLocaleDateString("en-IN")}\n`,
              `Time: ${new Date(sale.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`,
            ],
          },
          {
            width: "*",
            alignment: "right",
            text: [
              `Customer: ${sale.customerName}\n`,
              ...(sale.customerPhone ? [`Phone: ${sale.customerPhone}\n`] : []),
              ...(sale.customerGstin ? [`GSTIN: ${sale.customerGstin}\n`] : []),
              ...(settings.showDoctor && sale.doctorName ? [`Doctor: Dr. ${sale.doctorName}`] : []),
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: settings.showMrp
            ? (!settings.hideTaxDetails ? [25, "*", 45, 45, 40, 50, 35, 45, 35, 55] : [25, "*", 45, 45, 40, 50, 35, 45, 55])
            : (!settings.hideTaxDetails ? [25, "*", 45, 45, 40, 35, 45, 35, 55] : [25, "*", 45, 45, 40, 35, 45, 55]),
          body: [tableHeader, ...tableRows],
        },
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          { width: "*", text: `Payment: ${(sale.paymentMethod || "").toUpperCase()}` },
          {
            width: 200,
            table: {
              widths: ["*", "auto"],
              body: summaryRows,
            },
            layout: "noBorders",
          },
        ],
      },
      { text: "Thank you for your purchase!", alignment: "center", margin: [0, 20, 0, 4] },
      { text: "This is a computer-generated invoice.", style: "footer", alignment: "center" },
    ],
    styles,
  };

  return new Promise<Blob>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
    } catch (error) {
      reject(error);
    }
  });
}

export function generatePurchaseReturnPDF(data: PurchaseReturnData): void {
  const tableBody: TableCell[][] = [
    [
      { text: "Medicine", style: "tableHeader" },
      { text: "Batch", style: "tableHeader" },
      { text: "Expiry", style: "tableHeader" },
      { text: "Qty", style: "tableHeader", alignment: "right" },
      { text: "Rate", style: "tableHeader", alignment: "right" },
      { text: "GST %", style: "tableHeader", alignment: "right" },
      { text: "Total", style: "tableHeader", alignment: "right" },
    ],
    ...data.items.map((item) => [
      { text: item.medicineName, style: "tableCell" },
      { text: item.batchNumber, style: "tableCell" },
      { text: item.expiryDate, style: "tableCell" },
      { text: String(item.quantityReturned), style: "tableCell", alignment: "right" as const },
      { text: `₹${item.rate}`, style: "tableCell", alignment: "right" as const },
      { text: `${item.gstRate}%`, style: "tableCell", alignment: "right" as const },
      { text: `₹${item.totalAmount}`, style: "tableCell", alignment: "right" as const },
    ]),
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "PURCHASE RETURN", style: "header", alignment: "center" },
      { text: `Return No: ${data.returnNumber}`, alignment: "center", margin: [0, 0, 0, 20] },
      {
        columns: [
          { text: `Supplier: ${data.supplierName}`, width: "*" },
          { text: `Date: ${data.returnDate}`, width: "auto" },
        ],
        margin: [0, 0, 0, 10],
      },
      ...(data.reason ? [{ text: `Reason: ${data.reason}`, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 50, 35, 50, 40, 60],
          body: tableBody,
        },
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          { text: "", width: "*" },
          {
            width: 150,
            table: {
              widths: ["*", "auto"],
              body: [
                [{ text: "Subtotal:", style: "tableCell" }, { text: `₹${data.subtotal}`, style: "tableCell", alignment: "right" }],
                [{ text: "Tax:", style: "tableCell" }, { text: `₹${data.taxAmount}`, style: "tableCell", alignment: "right" }],
                [{ text: "Total:", style: "total" }, { text: `₹${data.totalAmount}`, style: "total", alignment: "right" }],
              ],
            },
            layout: "noBorders",
          },
        ],
      },
      {
        columns: [
          { text: "Authorized Signature", alignment: "center", margin: [0, 50, 0, 0] },
          { text: "Received By", alignment: "center", margin: [0, 50, 0, 0] },
        ],
      },
      { text: `Generated on ${new Date().toLocaleString()}`, style: "footer", alignment: "center" },
    ],
    styles,
  };

  pdfMake.createPdf(docDefinition).download(`PurchaseReturn_${data.returnNumber}.pdf`);
}

export function generatePurchaseReturnsListPDF(
  returns: Array<{
    returnNumber: string;
    supplierName: string;
    returnDate: string;
    totalAmount: string;
    status: string;
  }>,
  dateRange: { from: string; to: string }
): void {
  const tableBody: TableCell[][] = [
    [
      { text: "Return No", style: "tableHeader" },
      { text: "Supplier", style: "tableHeader" },
      { text: "Date", style: "tableHeader" },
      { text: "Amount", style: "tableHeader", alignment: "right" },
      { text: "Status", style: "tableHeader" },
    ],
    ...returns.map((r) => [
      { text: r.returnNumber, style: "tableCell" },
      { text: r.supplierName, style: "tableCell" },
      { text: r.returnDate, style: "tableCell" },
      { text: `₹${r.totalAmount}`, style: "tableCell", alignment: "right" as const },
      { text: r.status, style: "tableCell" },
    ]),
    [
      { text: "Total", style: "total", colSpan: 3 },
      {},
      {},
      { text: `₹${returns.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0).toFixed(2)}`, style: "total", alignment: "right" as const },
      {},
    ],
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "PURCHASE RETURNS REPORT", style: "header", alignment: "center" },
      { text: `Period: ${dateRange.from} to ${dateRange.to}`, alignment: "center", margin: [0, 0, 0, 20] },
      {
        table: {
          headerRows: 1,
          widths: [80, "*", 70, 70, 60],
          body: tableBody,
        },
      },
      { text: `Generated on ${new Date().toLocaleString()}`, style: "footer", alignment: "center" },
    ],
    styles,
  };

  pdfMake.createPdf(docDefinition).download(`PurchaseReturns_${dateRange.from}_to_${dateRange.to}.pdf`);
}

export function generateBulkPurchaseReturnsPDF(returns: PurchaseReturnData[]): void {
  const content: Content[] = [];

  returns.forEach((data, index) => {
    if (index > 0) {
      content.push({ text: "", pageBreak: "before" });
    }

    const tableBody: TableCell[][] = [
      [
        { text: "Medicine", style: "tableHeader" },
        { text: "Batch", style: "tableHeader" },
        { text: "Expiry", style: "tableHeader" },
        { text: "Qty", style: "tableHeader", alignment: "right" },
        { text: "Rate", style: "tableHeader", alignment: "right" },
        { text: "Total", style: "tableHeader", alignment: "right" },
      ],
      ...data.items.map((item) => [
        { text: item.medicineName, style: "tableCell" },
        { text: item.batchNumber, style: "tableCell" },
        { text: item.expiryDate, style: "tableCell" },
        { text: String(item.quantityReturned), style: "tableCell", alignment: "right" as const },
        { text: `₹${item.rate}`, style: "tableCell", alignment: "right" as const },
        { text: `₹${item.totalAmount}`, style: "tableCell", alignment: "right" as const },
      ]),
    ];

    content.push(
      { text: "PURCHASE RETURN", style: "header", alignment: "center" },
      { text: `Return No: ${data.returnNumber}`, alignment: "center", margin: [0, 0, 0, 15] },
      {
        columns: [
          { text: `Supplier: ${data.supplierName}`, width: "*" },
          { text: `Date: ${data.returnDate}`, width: "auto" },
        ],
        margin: [0, 0, 0, 10],
      },
      ...(data.reason ? [{ text: `Reason: ${data.reason}`, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 50, 40, 50, 60],
          body: tableBody,
        },
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          { text: "", width: "*" },
          {
            width: 120,
            table: {
              widths: ["*", "auto"],
              body: [
                [{ text: "Subtotal:", style: "tableCell" }, { text: `₹${data.subtotal}`, alignment: "right" }],
                [{ text: "Tax:", style: "tableCell" }, { text: `₹${data.taxAmount}`, alignment: "right" }],
                [{ text: "Total:", style: "total" }, { text: `₹${data.totalAmount}`, style: "total", alignment: "right" }],
              ],
            },
            layout: "noBorders",
          },
        ],
      }
    );
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content,
    styles,
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
      alignment: "center",
      style: "footer",
      margin: [0, 10, 0, 0],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`PurchaseReturns_Bulk_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function generateDayClosingsPDF(
  closings: DayClosingData[],
  dateRange: { from: string; to: string }
): void {
  const tableBody: TableCell[][] = [
    [
      { text: "Date", style: "tableHeader" },
      { text: "Opening Time", style: "tableHeader" },
      { text: "Opening Cash", style: "tableHeader", alignment: "right" },
      { text: "Closing Time", style: "tableHeader" },
      { text: "Expected", style: "tableHeader", alignment: "right" },
      { text: "Actual", style: "tableHeader", alignment: "right" },
      { text: "Difference", style: "tableHeader", alignment: "right" },
      { text: "Status", style: "tableHeader" },
    ],
    ...closings.map((dc) => [
      { text: dc.businessDate, style: "tableCell" },
      { text: dc.openingTime || "-", style: "tableCell" },
      { text: `₹${parseFloat(dc.openingCash || "0").toLocaleString()}`, style: "tableCell", alignment: "right" as const },
      { text: dc.closingTime || "-", style: "tableCell" },
      { text: dc.expectedCash ? `₹${parseFloat(dc.expectedCash).toLocaleString()}` : "-", style: "tableCell", alignment: "right" as const },
      { text: dc.actualCash ? `₹${parseFloat(dc.actualCash).toLocaleString()}` : "-", style: "tableCell", alignment: "right" as const },
      { text: dc.difference ? `₹${parseFloat(dc.difference).toLocaleString()}` : "-", style: "tableCell", alignment: "right" as const },
      { text: dc.status, style: "tableCell" },
    ]),
  ];

  const totalDifference = closings.reduce((sum, dc) => sum + parseFloat(dc.difference || "0"), 0);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "DAY CLOSING REPORT", style: "header", alignment: "center" },
      { text: `Period: ${dateRange.from} to ${dateRange.to}`, alignment: "center", margin: [0, 0, 0, 20] },
      {
        table: {
          headerRows: 1,
          widths: [65, 65, 70, 65, 70, 70, 70, 50],
          body: tableBody,
        },
      },
      {
        text: `Total Difference: ₹${totalDifference.toLocaleString()}`,
        style: "total",
        alignment: "right",
        margin: [0, 10, 0, 0],
      },
      { text: `Generated on ${new Date().toLocaleString()}`, style: "footer", alignment: "center" },
    ],
    styles,
  };

  pdfMake.createPdf(docDefinition).download(`DayClosings_${dateRange.from}_to_${dateRange.to}.pdf`);
}
