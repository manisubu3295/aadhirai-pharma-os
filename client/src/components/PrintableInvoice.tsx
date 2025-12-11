import { forwardRef } from "react";
import type { Sale, SaleItem } from "@shared/schema";

interface InvoiceSettings {
  showMrp?: boolean;
  showGstBreakup?: boolean;
  showDoctor?: boolean;
}

interface PrintableInvoiceProps {
  sale: Sale;
  items: SaleItem[];
  storeInfo?: {
    name: string;
    address: string;
    phone: string;
    gstin: string;
    dlNo: string;
  };
  invoiceSettings?: InvoiceSettings;
}

const defaultStoreInfo = {
  name: "Aadhirai Innovations Pharmacy",
  address: "123 Main Street, Chennai, Tamil Nadu - 600001",
  phone: "+91 98765 43210",
  gstin: "33AABCU9603R1ZM",
  dlNo: "TN-01-123456",
};

const defaultInvoiceSettings: InvoiceSettings = {
  showMrp: true,
  showGstBreakup: true,
  showDoctor: true,
};

export const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ sale, items, storeInfo = defaultStoreInfo, invoiceSettings = defaultInvoiceSettings }, ref) => {
    const settings = { ...defaultInvoiceSettings, ...invoiceSettings };
    
    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatTime = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-[800px] mx-auto text-black print:p-4"
        style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}
      >
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-xl font-bold mb-1">{storeInfo.name}</h1>
          <p className="text-sm">{storeInfo.address}</p>
          <p className="text-sm">Phone: {storeInfo.phone}</p>
          <div className="flex justify-center gap-8 mt-2 text-sm">
            <span>GSTIN: {storeInfo.gstin}</span>
            <span>D.L. No: {storeInfo.dlNo}</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">TAX INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Invoice No:</strong> {sale.invoiceNo || `INV-${sale.id}`}</p>
            <p><strong>Date:</strong> {formatDate(sale.createdAt)}</p>
            <p><strong>Time:</strong> {formatTime(sale.createdAt)}</p>
          </div>
          <div className="text-right">
            <p><strong>Customer:</strong> {sale.customerName}</p>
            {sale.customerPhone && <p><strong>Phone:</strong> {sale.customerPhone}</p>}
            {sale.customerGstin && <p><strong>GSTIN:</strong> {sale.customerGstin}</p>}
            {settings.showDoctor && sale.doctorName && <p><strong>Doctor:</strong> Dr. {sale.doctorName}</p>}
          </div>
        </div>

        <table className="w-full border-collapse mb-4" style={{ fontSize: "11px" }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">S.No</th>
              <th className="border border-black p-2 text-left">Description</th>
              <th className="border border-black p-2 text-center">HSN</th>
              <th className="border border-black p-2 text-center">Batch</th>
              <th className="border border-black p-2 text-center">Exp</th>
              {settings.showMrp && <th className="border border-black p-2 text-right">MRP</th>}
              <th className="border border-black p-2 text-center">Qty</th>
              <th className="border border-black p-2 text-right">Rate</th>
              <th className="border border-black p-2 text-center">GST%</th>
              <th className="border border-black p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black p-2">{index + 1}</td>
                <td className="border border-black p-2">{item.medicineName}</td>
                <td className="border border-black p-2 text-center">{item.hsnCode || "-"}</td>
                <td className="border border-black p-2 text-center">{item.batchNumber}</td>
                <td className="border border-black p-2 text-center">{item.expiryDate}</td>
                {settings.showMrp && (
                  <td className="border border-black p-2 text-right">
                    {item.mrp ? `₹${Number(item.mrp).toFixed(2)}` : "-"}
                  </td>
                )}
                <td className="border border-black p-2 text-center">{item.quantity}</td>
                <td className="border border-black p-2 text-right">₹{Number(item.price).toFixed(2)}</td>
                <td className="border border-black p-2 text-center">{item.gstRate}%</td>
                <td className="border border-black p-2 text-right">₹{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-4">
          <div className="w-64">
            <div className="flex justify-between py-1 border-b">
              <span>Subtotal:</span>
              <span>₹{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>Discount:</span>
                <span>-₹{Number(sale.discount).toFixed(2)}</span>
              </div>
            )}
            {settings.showGstBreakup ? (
              <>
                <div className="flex justify-between py-1 border-b">
                  <span>CGST:</span>
                  <span>₹{Number(sale.cgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>SGST:</span>
                  <span>₹{Number(sale.sgst).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 border-b">
                <span>GST:</span>
                <span>₹{(Number(sale.cgst) + Number(sale.sgst)).toFixed(2)}</span>
              </div>
            )}
            {Number(sale.roundOff) !== 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>Round Off:</span>
                <span>₹{Number(sale.roundOff).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold text-base border-t-2 border-black">
              <span>TOTAL:</span>
              <span>₹{Number(sale.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Payment Method:</strong> {sale.paymentMethod.toUpperCase()}</p>
            {Number(sale.receivedAmount) > 0 && (
              <p><strong>Received:</strong> ₹{Number(sale.receivedAmount).toFixed(2)}</p>
            )}
            {Number(sale.changeAmount) > 0 && (
              <p><strong>Change:</strong> ₹{Number(sale.changeAmount).toFixed(2)}</p>
            )}
          </div>
        </div>

        <div className="border-t-2 border-dashed pt-4 text-center text-sm">
          <p className="font-bold mb-2">Thank you for your purchase!</p>
          <p className="text-xs text-gray-600">
            This is a computer-generated invoice and does not require a signature.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            For any queries, please contact us at {storeInfo.phone}
          </p>
        </div>

        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 10mm; size: A4; }
          }
        `}</style>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";
