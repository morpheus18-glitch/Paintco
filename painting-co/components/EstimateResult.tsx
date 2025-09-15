'use client';

type Props = {
  data: {
    subtotal: number;
    rangeLow: number;
    rangeHigh: number;
    labor: number;
    materials: number;
    prep: number;
    difficulty: string;
    sqft: number;
    notes: string[];
    crew?: { people: number; days: number; hoursTotal: number };
  };
};

export default function EstimateResult({ data }: Props) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Estimate</h2>
      <p style={{ fontSize: 14, margin: '4px 0', color: 'var(--muted)' }}>
        Range: ${data.rangeLow.toLocaleString()} – ${data.rangeHigh.toLocaleString()}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
        <li>Labor: ${data.labor}</li>
        <li>Materials: ${data.materials}</li>
        <li>Prep: ${data.prep}</li>
        <li>Difficulty: {data.difficulty}</li>
        <li>Sq Ft: {data.sqft}</li>
      </ul>

      {data.crew && (
        <p style={{ fontSize: 13, marginTop: 8, color: 'var(--muted)' }}>
          Crew: {data.crew.people} people · {data.crew.days} days
        </p>
      )}

      {data.notes?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong>Notes:</strong>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {data.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
