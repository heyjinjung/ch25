import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { cn } from "../../../lib/utils";

interface AdminChartProps {
  data: any[];
  type?: 'area' | 'bar';
  xKey: string;
  dataKey: string;
  color?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
}

export function AdminChart({
  data,
  type = 'area',
  xKey,
  dataKey,
  color = "#D2FD9C",
  height = 300,
  className,
  showGrid = true,
}: AdminChartProps) {
  
  const ChartComponent = type === 'bar' ? BarChart : AreaChart;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
             {type === 'area' && (
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
             )}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />}
          <XAxis 
            dataKey={xKey} 
            stroke="#666" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#666" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
             contentStyle={{ backgroundColor: '#18181B', borderColor: '#333', borderRadius: '8px' }}
             itemStyle={{ color: '#fff' }}
          />
          {type === 'area' ? (
             <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#gradient-${dataKey})`} 
             />
          ) : (
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
