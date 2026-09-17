import { Navigate, Route, Routes } from "react-router-dom";
import { InboxPage } from "@/features/invoices/pages/InboxPage";
import { InvoiceDetailPage } from "@/features/invoices/pages/InvoiceDetailPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/invoices" replace />} />
      <Route path="/invoices" element={<InboxPage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      <Route path="*" element={<Navigate to="/invoices" replace />} />
    </Routes>
  );
}
