'use client';

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface MetricChartProps {
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
  height?: number;
}

export function MetricChart({ data, dataKey, color, unit, height = 180 }: MetricChartProps) {
  // Convert timestamp to local hh:mm:ss for display
  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }));

  const getGradientId = () => `colorGrad-${dataKey}`;

  // Custom tooltips formatting
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded shadow-lg text-[10px]">
          <p className="text-zinc-500 font-semibold mb-1">
            {payload[0].payload.timeLabel}
          </p>
          <p className="font-bold" style={{ color }}>
            {payload[0].value} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      {formattedData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
          No telemetry history accumulated
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id={getGradientId()} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="timeLabel" 
              stroke="#71717a" 
              fontSize={9} 
              tickLine={false} 
              axisLine={false}
              dy={5}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={9} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill={`url(#${getGradientId()})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
export default MetricChart;
