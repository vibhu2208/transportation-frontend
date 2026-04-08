export function lineKey(
  invoiceId: string,
  tripId: string,
  goodsReceiptId: string | null | undefined,
): string {
  return `${invoiceId}:${tripId}:${goodsReceiptId ?? 'TRIP'}`;
}
