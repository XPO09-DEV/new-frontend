import type { Wallet } from "../types/api";
import { money } from "../utils/format";

export default function BalanceCard({ wallet }: { wallet: Wallet }) {
  return (
    <div className="relative isolate aspect-[1.72/1] w-full overflow-hidden rounded-[24px] bg-[#050505] p-5 text-white shadow-[0_14px_35px_rgba(0,0,0,0.16)] sm:p-6">
      <svg
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 360 210"
        preserveAspectRatio="none"
      >
        <g fill="none" strokeLinecap="round" strokeWidth="8">
          <path d="M 4 42 L 17 46" stroke="#F4D63D" />
          <path d="M 67 38 L 73 22" stroke="#D94C9B" />
          <path d="M 151 70 L 164 65" stroke="#F6D94A" />
          <path d="M 224 31 L 229 45" stroke="#F47743" />
          <path d="M 315 38 L 322 20" stroke="#F4D63D" />
          <path d="M 18 103 L 31 109" stroke="#D8BE25" />
          <path d="M 105 111 L 120 112" stroke="#FA6D4D" />
          <path d="M 191 101 L 198 114" stroke="#9B63EE" />
          <path d="M 275 97 L 290 96" stroke="#C7478B" />
          <path d="M 257 147 L 262 132" stroke="#3BA7E9" />
          <path d="M 70 158 L 79 144" stroke="#D14D91" />
          <path d="M 160 176 L 161 163" stroke="#31B86A" />
          <path d="M 339 154 L 347 166" stroke="#F1D33D" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/65 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">Subtle Pay</p>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
            Wallet
          </span>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-white/70">Total balance</p>
          <p className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums sm:text-4xl">
            {money(wallet.balanceUsd)}
          </p>
          <p className="mt-2 text-sm text-white/65">
            ≈ {money(wallet.balanceLocal, wallet.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
