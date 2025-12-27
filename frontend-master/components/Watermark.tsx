// src/components/Watermark.tsx
import React from "react";

const Watermark: React.FC = () => {
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    rotate-[-30deg] text-[80px] font-bold text-black/10 
                    pointer-events-none select-none z-[9999] whitespace-nowrap">
      KHALED • DEMO VERSION
    </div>
  );
};

export default Watermark;

