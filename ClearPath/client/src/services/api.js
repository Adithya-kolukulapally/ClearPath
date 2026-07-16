const API_BASE = "http://localhost:5000/api";

export async function fetchPlan(studentData) {
  const res = await fetch(`${API_BASE}/plan/generate`, {
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
