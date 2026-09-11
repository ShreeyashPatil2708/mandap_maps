// Public UPI id shown next to the QR (/images/upi-qr.png) on Home, Team and
// the Support popup. VITE_UPI_ID overrides it at build time; the fallback is
// the real id because CD does not set that variable.
export const UPI_ID = import.meta.env.VITE_UPI_ID || 'shreeyashdc52247@nyes';
