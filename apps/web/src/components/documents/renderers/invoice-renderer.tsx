import { format } from 'date-fns';

import type { DocumentWithChunks } from '@/types';

interface InvoiceRendererProps {
  document: DocumentWithChunks;
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

interface InvoiceMetadata {
  invoice_number?: string;
  vendor_name?: string;
  vendor_address?: string;
  bill_to?: string;
  line_items?: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  due_date?: string;
  payment_terms?: string;
  bank_details?: {
    bank?: string;
    iban?: string;
    swift?: string;
  };
}

export function InvoiceRenderer({ document }: InvoiceRendererProps) {
  const metadata = document.metadata_json as InvoiceMetadata;
  const hasStructuredData = metadata.invoice_number ?? metadata.line_items;

  if (!hasStructuredData) {
    // Fallback to plain text
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm">{document.body}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">INVOICE</h2>
          {metadata.invoice_number && (
            <p className="text-muted-foreground text-sm">#{metadata.invoice_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm">
            <span className="text-muted-foreground">Date: </span>
            {format(new Date(document.ts), 'MMM d, yyyy')}
          </p>
          {metadata.due_date && (
            <p className="text-sm">
              <span className="text-muted-foreground">Due: </span>
              {metadata.due_date}
            </p>
          )}
        </div>
      </div>

      {/* Vendor & Bill To */}
      <div className="grid grid-cols-2 gap-6">
        {metadata.vendor_name && (
          <div>
            <h3 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">From</h3>
            <p className="font-medium">{metadata.vendor_name}</p>
            {metadata.vendor_address && (
              <p className="text-muted-foreground text-sm">{metadata.vendor_address}</p>
            )}
          </div>
        )}
        {metadata.bill_to && (
          <div>
            <h3 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Bill To</h3>
            <p className="text-sm">{metadata.bill_to}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      {metadata.line_items && metadata.line_items.length > 0 && (
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {metadata.line_items.map((item, index) => (
                <tr key={index} className="border-border border-t">
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-right">{item.quantity ?? '-'}</td>
                  <td className="px-4 py-2 text-right">
                    {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          {metadata.subtotal !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${metadata.subtotal.toFixed(2)}</span>
            </div>
          )}
          {metadata.tax !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${metadata.tax.toFixed(2)}</span>
            </div>
          )}
          {metadata.total !== undefined && (
            <div className="border-border flex justify-between border-t pt-1 font-bold">
              <span>Total</span>
              <span>${metadata.total.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details */}
      {metadata.bank_details && (
        <div className="bg-muted rounded-lg p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase">Payment Details</h3>
          <div className="space-y-1 text-sm">
            {metadata.bank_details.bank && (
              <p>
                <span className="text-muted-foreground">Bank: </span>
                {metadata.bank_details.bank}
              </p>
            )}
            {metadata.bank_details.iban && (
              <p>
                <span className="text-muted-foreground">IBAN: </span>
                <code className="bg-background rounded px-1">{metadata.bank_details.iban}</code>
              </p>
            )}
            {metadata.bank_details.swift && (
              <p>
                <span className="text-muted-foreground">SWIFT: </span>
                {metadata.bank_details.swift}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Body text if present */}
      {document.body.trim() && (
        <div className="border-border border-t pt-4">
          <pre className="text-muted-foreground whitespace-pre-wrap text-sm">{document.body}</pre>
        </div>
      )}
    </div>
  );
}
