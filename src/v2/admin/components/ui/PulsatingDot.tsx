

export const PulsatingDot = ({ color = "#4CAF50" }: { color?: string }) => (
  <span className="relative flex h-2 w-2 mr-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>
    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }}></span>
  </span>
);
