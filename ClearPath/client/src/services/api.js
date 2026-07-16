const API_BASE = "https://clearpath-bz7p.onrender.com";

export async function fetchPlan(studentData) {
  const res = await fetch(`${API_BASE}/api/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate plan');
  }
  return res.json();
}
