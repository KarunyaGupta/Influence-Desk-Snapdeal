import type { InvoiceRequest } from "@/lib/types";

export interface SubmitInvoiceInput {
  youtubeVideoLinks: string[];
  lastVideoUploadDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountInr: number;
  fileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
}

export interface InvoiceService {
  listForCurrentUser(): Promise<InvoiceRequest[]>;
  getById(requestId: string): Promise<InvoiceRequest>;
  submit(input: SubmitInvoiceInput): Promise<InvoiceRequest>;
  approve(requestId: string): Promise<InvoiceRequest>;
  reject(requestId: string, comment: string): Promise<InvoiceRequest>;
  hold(requestId: string, comment: string): Promise<InvoiceRequest>;
  markPaid(requestId: string, paymentReference: string): Promise<InvoiceRequest>;
}
