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
                {/* Removed paint0_radial_102_274 path that was causing the protruding white vector */}
                <path d="M861 417.613C861 648.254 668.168 835.268 430.304 835.268C192.439 835.268 -0.392334 648.254 -0.392334 417.613C-0.392334 186.975 181.357 10.9062 409.676 0.442686C416.524 0.160977 423.413 0 430.304 0C437.193 0 444.083 0.120732 450.931 0.442686C679.208 10.9062 861 193.655 861 417.613Z" fill="url(#paint1_linear_102_274)" />
                {/* Removed paint2_linear_102_274 path - the second decorative colored stripe layer */}
                <path d="M683.941 663.546C717.393 631.108 742.836 593.843 760.309 554.081L430.304 417.613L571.047 737.594C612.053 720.652 650.487 695.982 683.941 663.546Z" fill="url(#paint4_linear_102_274)" />
                <path d="M176.667 663.546C210.12 695.982 248.554 720.652 289.561 737.594L430.304 417.613L100.298 554.081C117.772 593.843 143.214 631.108 176.667 663.546Z" fill="url(#paint5_linear_102_274)" />
                <path d="M176.667 171.681C143.214 204.119 117.772 241.385 100.298 281.146L430.304 417.613L289.561 97.6322C248.554 114.575 210.12 139.245 176.667 171.681Z" fill="url(#paint6_linear_102_274)" />
                <path d="M683.941 171.681C650.487 139.245 612.053 114.575 571.047 97.6322L430.304 417.613L760.309 281.146C742.836 241.385 717.393 204.119 683.941 171.681Z" fill="url(#paint7_linear_102_274)" />
                <path d="M753.42 568.851C776.248 523.134 789.031 471.822 789.031 417.614C789.031 363.405 776.248 312.094 753.42 266.376C755.868 271.246 758.151 276.195 760.35 281.146L430.345 417.614L760.35 554.081C758.151 559.032 755.868 563.981 753.42 568.851Z" fill="url(#paint8_linear_102_274)" />
                <path d="M107.188 266.376C84.3605 312.094 71.577 363.405 71.577 417.614C71.577 471.822 84.3605 523.134 107.188 568.851C104.739 563.981 102.457 559.032 100.257 554.081L430.262 417.614L100.298 281.146C102.498 276.195 104.781 271.246 107.23 266.376H107.188Z" fill="url(#paint9_linear_102_274)" />
                <path d="M586.28 104.313C539.129 82.1786 486.211 69.7834 430.304 69.7834C374.396 69.7834 321.478 82.1786 274.328 104.313C279.35 101.979 284.455 99.7251 289.56 97.5922L430.304 417.574L571.047 97.6323C576.151 99.7653 581.257 101.979 586.28 104.353V104.313Z" fill="url(#paint10_linear_102_274)" />
                <path d="M571.047 737.594L430.304 417.613L289.56 737.594C284.455 735.462 279.35 733.248 274.328 730.875C321.478 753.009 374.396 765.404 430.304 765.404C486.211 765.404 539.129 753.009 586.28 730.875C581.257 733.248 576.151 735.462 571.047 737.594Z" fill="url(#paint11_linear_102_274)" />
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
                    <linearGradient id="paint3_linear_102_274" x1="187.666" y1="182.346" x2="651.38" y2="660.588" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FEDC31" />
                        <stop offset="0.09" stopColor="#FDC347" />
                        <stop offset="0.27" stopColor="#FC8682" />
                        <stop offset="0.52" stopColor="#FA2CD7" />
                        <stop offset="0.76" stopColor="#987CDB" />
                        <stop offset="1" stopColor="#33D0E0" />
                    </linearGradient>
                    <linearGradient id="paint4_linear_102_274" x1="685.767" y1="665.316" x2="470.08" y2="442.873" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#CC0A60" />
                        <stop offset="0.48" stopColor="#E60C69" />
                        <stop offset="1" stopColor="#FE0E73" />
                    </linearGradient>
                    <linearGradient id="paint5_linear_102_274" x1="173.056" y1="667.047" x2="397.27" y2="435.809" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#006F67" />
                        <stop offset="0.07" stopColor="#00756B" />
                        <stop offset="0.7" stopColor="#00B392" />
                        <stop offset="1" stopColor="#00CBA2" />
                    </linearGradient>
                    <linearGradient id="paint6_linear_102_274" x1="182.893" y1="175.022" x2="382.269" y2="428.462" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF260D" />
                        <stop offset="0.25" stopColor="#FE3E0E" />
                        <stop offset="0.79" stopColor="#FC7B10" />
                        <stop offset="1" stopColor="#FC9512" />
                    </linearGradient>
                    <linearGradient id="paint7_linear_102_274" x1="685.518" y1="170.152" x2="466.01" y2="396.536" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FC9512" />
                        <stop offset="0.68" stopColor="#FED319" />
                        <stop offset="1" stopColor="#FFEB1C" />
                    </linearGradient>
                    <linearGradient id="paint8_linear_102_274" x1="430.304" y1="417.614" x2="789.031" y2="417.614" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2FFFFF" />
                        <stop offset="0.27" stopColor="#2AE7FF" />
                        <stop offset="0.82" stopColor="#1EA9FF" />
                        <stop offset="1" stopColor="#1A95FF" />
                    </linearGradient>
                    <linearGradient id="paint9_linear_102_274" x1="80.044" y1="417.614" x2="431.175" y2="417.614" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#808080" />
                        <stop offset="0.51" stopColor="#9D9D9D" />
                        <stop offset="1" stopColor="#B5B5B5" />
                    </linearGradient>
                    <linearGradient id="paint10_linear_102_274" x1="430.304" y1="82.9835" x2="430.304" y2="403.971" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FE7A18" />
                        <stop offset="0.33" stopColor="#FE9115" />
                        <stop offset="1" stopColor="#FFCC0F" />
                    </linearGradient>
                    <linearGradient id="paint11_linear_102_274" x1="430.304" y1="759.729" x2="430.304" y2="473.473" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3D08EA" />
                        <stop offset="0.55" stopColor="#600FF4" />
                        <stop offset="1" stopColor="#7815FC" />
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
