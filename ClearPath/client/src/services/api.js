const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://clearpath-bz7p.onrender.com/api").replace(/\/$/, "");

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error("We couldn’t reach ClearPath. Check your connection and try again.");
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(payload.error || "We couldn’t complete that request. Please try again.");
    error.status = res.status;
    throw error;
  }
  return payload;
}

export function signUp(credentials) {
  return request("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
}

export function logIn(credentials) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
}

export async function verifySession(token) {
  const result = await request("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  return result.user;
}

export function fetchPlan(studentData, token) {
  return request("/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(studentData)
  });
}

function authorized(token, path, options = {}) {
  return request(path, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers, Authorization: `Bearer ${token}` }
  });
}

export const fetchWorkspace = token => authorized(token, "/workspace");
export const saveStudyProfile = (token, profile) => authorized(token, "/workspace/profile", { method: "PUT", body: JSON.stringify({ profile }) });
export const updateStudyTask = (token, taskId, changes) => authorized(token, `/workspace/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: JSON.stringify(changes) });
export const recoverStudyTasks = (token, requestBody) => authorized(token, "/workspace/tasks/recover", { method: "POST", body: JSON.stringify(requestBody) });
export const askStudyTutor = (token, question) => authorized(token, "/workspace/tutor", { method: "POST", body: JSON.stringify(question) });
export const clearTutorHistory = token => authorized(token, "/workspace/tutor/history", { method: "DELETE" });
export const createPracticeQuiz = (token, data) => authorized(token, "/workspace/quizzes/generate", { method: "POST", body: JSON.stringify(data) });
export const submitQuizAttempt = (token, quizId, answers) => authorized(token, `/workspace/quizzes/${encodeURIComponent(quizId)}/attempts`, { method: "POST", body: JSON.stringify({ answers }) });
export function uploadStudyPdf(token, file, { type, subject }) {
  return request("/workspace/documents/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent(file.name),
      "X-Document-Type": type,
      "X-Subject": encodeURIComponent(subject || "")
    },
    body: file
  });
}
export const updateStudyDocument = (token, documentId, changes) => authorized(token, `/workspace/documents/${encodeURIComponent(documentId)}`, { method: "PATCH", body: JSON.stringify(changes) });
export const deleteStudyDocument = (token, documentId) => authorized(token, `/workspace/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
export const analyzeQuestionPapers = token => authorized(token, "/workspace/documents/paper-analysis", { method: "POST", body: JSON.stringify({}) });
export const createFlashcard = (token, card) => authorized(token, "/workspace/flashcards", { method: "POST", body: JSON.stringify(card) });
export const updateFlashcard = (token, cardId, changes) => authorized(token, `/workspace/flashcards/${encodeURIComponent(cardId)}`, { method: "PATCH", body: JSON.stringify(changes) });
export const deleteFlashcard = (token, cardId) => authorized(token, `/workspace/flashcards/${encodeURIComponent(cardId)}`, { method: "DELETE" });
export const createStudyNote = (token, note) => authorized(token, "/workspace/notes", { method: "POST", body: JSON.stringify(note) });
export const updateStudyNote = (token, noteId, changes) => authorized(token, `/workspace/notes/${encodeURIComponent(noteId)}`, { method: "PATCH", body: JSON.stringify(changes) });
export const deleteStudyNote = (token, noteId) => authorized(token, `/workspace/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
export const updatePreferences = (token, preferences) => authorized(token, "/workspace/preferences", { method: "PATCH", body: JSON.stringify(preferences) });
export const exportWorkspaceData = token => authorized(token, "/workspace/data/export");
export const deleteWorkspaceData = token => authorized(token, "/workspace/data", { method: "DELETE" });
