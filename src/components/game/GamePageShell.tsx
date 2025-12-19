type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  footerNote?: string;
};

const PaletteBar: React.FC = () => {
  return (
    <svg
      viewBox="0 0 823 103"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-auto w-full max-w-[823px]"
      aria-hidden="true"
      focusable="false"
    >
      <g clipPath="url(#clip0_4195_1965)">
        <path d="M51.5 103C79.9427 103 103 79.9427 103 51.5C103 23.0573 79.9427 0 51.5 0C23.0573 0 0 23.0573 0 51.5C0 79.9427 23.0573 103 51.5 103Z" fill="black" />
        <path
          d="M171.5 102.5C199.667 102.5 222.5 79.6665 222.5 51.5C222.5 23.3335 199.667 0.5 171.5 0.5C143.333 0.5 120.5 23.3335 120.5 51.5C120.5 79.6665 143.333 102.5 171.5 102.5Z"
          fill="white"
          stroke="black"
        />
        <path
          d="M291.5 102.5C319.667 102.5 342.5 79.6665 342.5 51.5C342.5 23.3335 319.667 0.5 291.5 0.5C263.333 0.5 240.5 23.3335 240.5 51.5C240.5 79.6665 263.333 102.5 291.5 102.5Z"
          fill="#D2FD9C"
          stroke="#394508"
        />
        <path d="M411.5 103C439.943 103 463 79.9427 463 51.5C463 23.0573 439.943 0 411.5 0C383.057 0 360 23.0573 360 51.5C360 79.9427 383.057 103 411.5 103Z" fill="#394508" />
        <path d="M531.5 103C559.943 103 583 79.9427 583 51.5C583 23.0573 559.943 0 531.5 0C503.057 0 480 23.0573 480 51.5C480 79.9427 503.057 103 531.5 103Z" fill="#282D1A" />
        <path d="M651.5 103C679.943 103 703 79.9427 703 51.5C703 23.0573 679.943 0 651.5 0C623.057 0 600 23.0573 600 51.5C600 79.9427 623.057 103 651.5 103Z" fill="#5D5D5D" />
        <path d="M771.5 103C799.943 103 823 79.9427 823 51.5C823 23.0573 799.943 0 771.5 0C743.057 0 720 23.0573 720 51.5C720 79.9427 743.057 103 771.5 103Z" fill="black" />
      </g>
      <defs>
        <clipPath id="clip0_4195_1965">
          <rect width="823" height="103" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

const GamePageShell: React.FC<Props> = ({ title, subtitle, rightSlot, children, footerNote }) => {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-cc-moss via-black to-black text-white">
      <div className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 sm:py-10">
        {rightSlot ? <div className="mb-6 flex items-center justify-end gap-3">{rightSlot}</div> : null}

        <header className="rounded-3xl border border-white/10 bg-black/55 px-4 py-6 backdrop-blur sm:px-8">
          <PaletteBar />
          {subtitle && (
            <p className="mt-4 text-center text-[clamp(12px,2.6vw,14px)] font-bold uppercase tracking-[0.35em] text-cc-lime/90">
              {subtitle}
            </p>
          )}
          <h1 className="mt-3 text-center text-[clamp(22px,5.2vw,38px)] font-extrabold leading-tight text-white">
            {title}
          </h1>
          <div className="mx-auto mt-5 h-px w-full max-w-[720px] bg-gradient-to-r from-transparent via-cc-lime/60 to-transparent" />
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-black/55 p-4 backdrop-blur sm:mt-8 sm:p-8">
          {children}
        </section>

        {footerNote && (
          <footer className="mx-auto mt-6 max-w-[920px] text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
            {footerNote}
          </footer>
        )}
      </div>
    </main>
  );
};

export default GamePageShell;
