import React from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";

const PALETTE = ["#3266AD", "#3B2072", "#7B2D3B", "#C4A24E", "#6B7280"];

interface ChartConfig {
  chart_type: "bar" | "pie" | "line" | "stacked_bar";
  title?: string;
  data: Record<string, any>[];
  x_axis?: string;
  y_axis?: string | string[];
  colors?: string[];
}

const ChatChart: React.FC<{ config: ChartConfig }> = ({ config }) => {
  if (!config || !config.data || config.data.length === 0) return null;

  const { chart_type, title, data, x_axis, y_axis, colors } = config;
  const palette = colors?.length ? colors : PALETTE;
  const yKeys = Array.isArray(y_axis) ? y_axis : y_axis ? [y_axis] : Object.keys(data[0] || {}).filter((k) => k !== x_axis);

  console.log('ChatChart rendering:', chart_type, 'x:', x_axis, 'y:', y_axis, 'keys:', Object.keys(data[0]));

  return (
    <div style={{ marginTop: 10 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#1A1A1A" }}>{title}</div>}
      <ResponsiveContainer width="100%" height={220}>
        {chart_type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey={yKeys[0]} nameKey={x_axis} cx="50%" cy="50%" outerRadius={80} label>
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : chart_type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x_axis} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {yKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} dot />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x_axis} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={palette[i % palette.length]} stackId={chart_type === "stacked_bar" ? "stack" : undefined} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default ChatChart;
