import { Suspense } from 'react';
import MoneyReceiptPage from '@/modules/money-receipt/MoneyReceiptPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-600">Loading…</div>}>
      <MoneyReceiptPage />
    </Suspense>
  );
}
