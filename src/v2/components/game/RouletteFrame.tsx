import React from "react";

const RouletteFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative w-full aspect-square flex items-center justify-center">
            {/* Background Plate - Stationary */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img 
                    src="/assets/roulette/v1.png" 
                    alt="Plate" 
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Rotating Content Area - Expanded for 20mm visual thickness */}
            <div className="relative z-10 w-[92%] h-[92%] flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

export default RouletteFrame;
