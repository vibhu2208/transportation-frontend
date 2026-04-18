/** Open a PDF blob in a new tab. Returns the window, or null if pop-ups are blocked (caller should revoke nothing in that case). */
export function openPdfBlobInNewTab(blob: Blob): Window | null {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    URL.revokeObjectURL(url);
    return null;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return w;
}
