import { UPI_ID } from '../data/upi.js';

// UPI "Support Us" bottom sheet.

export default function SupportModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-maroon/60" />
      <div
        className="relative w-full max-w-[480px] animate-slideUp rounded-t-sheet bg-cream px-gutter-lg pb-9 pt-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute right-4 top-4 cursor-pointer p-1 text-[22px] text-maroon/40 hover:text-maroon"
          onClick={onClose}
        >
          ✕
        </div>
        <div className="mx-auto mb-6 h-1 w-10 rounded-[2px] bg-maroon/10" />
        <div className="text-center">
          <div className="mx-auto flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-panel border-2 border-gold/30 bg-surface">
            <img src="/images/upi-qr.png" alt="UPI QR code" className="h-full w-full object-contain p-2" />
          </div>
          <div className="mt-4 inline-block rounded-lg bg-maroon/5 px-4 py-1.5 font-sans text-[13px] font-medium tracking-[0.5px] text-maroon">
            {UPI_ID}
          </div>
          <div className="mt-5 font-serif text-lg text-maroon">Ganpati Bappa Morya 🙏</div>
        </div>
      </div>
    </div>
  );
}