import React from "react";

const RouletteFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
            {/* Premium SVG Frame */}
            <svg
                viewBox="0 0 861 843"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
                {/* Layer 1: Outer gradient ring (rainbow) */}
                <path d="M861 417.613C861 648.254 668.168 835.268 430.304 835.268C192.439 835.268 -0.392334 648.254 -0.392334 417.613C-0.392334 186.975 181.357 10.9062 409.676 0.442686C416.524 0.160977 423.413 0 430.304 0C437.193 0 444.083 0.120732 450.931 0.442686C679.208 10.9062 861 193.655 861 417.613Z" fill="url(#paint1_linear_102_274)" />

                {/* Layer 2: Black circle base - RESTORED */}
                <path d="M430.304 828.788C664.502 828.788 854.36 644.7 854.36 417.613C854.36 190.529 664.502 6.43909 430.304 6.43909C196.104 6.43909 6.24817 190.529 6.24817 417.613C6.24817 644.7 196.104 828.788 430.304 828.788Z" fill="url(#paint2_linear_102_274)" />

                {/* Layer 3 (Removed): Middle colored stripe layer (paint4-11) - DELETED as requested */}
                {/* The actual wheel segments are rendered via RouletteWheel component as children */}

                <defs>
                    <radialGradient id="paint0_radial_102_274" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(424.305 440.5) scale(423.659 440.546)">
                        <stop offset="0.63" stopColor="#757575" />
                        <stop offset="0.67" stopColor="#8F8F8F" />
                        <stop offset="0.74" stopColor="#B7B7B7" />
                        <stop offset="0.81" stopColor="#D6D6D6" />
                        <stop offset="0.88" stopColor="#ECECEC" />
                        <stop offset="0.94" stopColor="#FAFAFA" />
                        <stop offset="1" stopColor="white" />
                    </radialGradient>
                    <linearGradient id="paint1_linear_102_274" x1="723.203" y1="133.611" x2="123.529" y2="752.071" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FEDC31" />
                        <stop offset="0.09" stopColor="#FDC347" />
                        <stop offset="0.27" stopColor="#FC8682" />
                        <stop offset="0.52" stopColor="#FA2CD7" />
                        <stop offset="0.76" stopColor="#987CDB" />
                        <stop offset="1" stopColor="#33D0E0" />
                    </linearGradient>
                    <linearGradient id="paint2_linear_102_274" x1="718.679" y1="137.997" x2="128.257" y2="746.916" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#000604" />
                        <stop offset="0.4" stopColor="#303030" />
                        <stop offset="1" stopColor="#000604" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Content Area (Actual Wheel) */}
            <div className="relative z-10 w-[72%] aspect-square flex items-center justify-center -mt-[1%]">
                {children}
            </div>
        </div>
    );
};

export default RouletteFrame;
