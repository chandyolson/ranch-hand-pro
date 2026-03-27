import React from "react";

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

const ChatTable: React.FC<{ data: TableData }> = ({ data }) => {
  if (!data?.headers?.length) return null;
  return (
    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 8, border: "1px solid #D4D4D0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                style={{
                  background: "#0E2646",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 10px",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                  borderBottom: "1px solid #D4D4D0",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#FAFAF7" }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "7px 10px",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid #D4D4D0",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChatTable;
