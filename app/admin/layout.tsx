import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zee Sip Admin',
  description: 'Zee Sip Rewards Administration Panel',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] text-[#3D0B0E] font-['Montserrat',sans-serif]">
      {/* MOBILE BLOCK (< 768px) */}
      <div className="flex md:hidden min-h-screen w-full items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[12px] p-8 shadow-sm border border-[#E0E0E0] max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F3] text-[#B92429] flex items-center justify-center mb-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h2 className="font-anton text-[22px] text-[#B92429] uppercase mb-2">
            DESKTOP ONLY
          </h2>
          <p className="text-[14px] font-bold text-[#7A4547] leading-relaxed">
            Admin panel is best viewed on desktop. Please open on a laptop or computer.
          </p>
        </div>
      </div>

      {/* DESKTOP CONTENT (>= 768px) */}
      <div className="hidden md:block w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
