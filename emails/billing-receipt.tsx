import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `billing-receipt` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface BillingReceiptProps {
  /** Resend template variable `INVOICE_NUMBER`. */
  invoiceNumber?: string;
  /** Resend template variable `AMOUNT`. */
  amount?: string;
  /** Resend template variable `CURRENCY`. */
  currency?: string;
  /** Resend template variable `PERIOD`. */
  period?: string;
  /** Resend template variable `BILLED_ON`. */
  billedOn?: string;
  /** Resend template variable `RECEIPT_URL`. */
  receiptUrl?: string;
}

export function BillingReceipt({
  invoiceNumber = '',
  amount = '',
  currency = '',
  period = '',
  billedOn = '',
  receiptUrl = '',
}: Partial<BillingReceiptProps> = {}) {
  return (
    <EmailLayout
      preview={`Receipt ${invoiceNumber} for ${amount} ${currency}.`}
      heading={'Thanks - here is your receipt'}
      intro='Your payment was received. This receipt is for your records.'
      closing='If this charge is not one you recognise, contact billing@researchwith.me.'
    >
      <FieldTable
        fields={[
      { label: 'Invoice', value: invoiceNumber, monospace: true },
      { label: 'Amount', value: amount, monospace: false },
      { label: 'Currency', value: currency, monospace: false },
      { label: 'Period', value: period, monospace: false },
      { label: 'Billed on', value: billedOn, monospace: false },
        ]}
      />
      <ActionLink href={receiptUrl as string} label="View or download the receipt" />
    </EmailLayout>
  );
}

export default BillingReceipt;
