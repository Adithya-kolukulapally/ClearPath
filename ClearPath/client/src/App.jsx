import { useEffect, useState } from "react";
import LandingPage from "./components/LandingPage";
import StudentForm from "./components/StudentForm";
import Dashboard from "./components/Dashboard";
import { fetchPlan, fetchWorkspace, logIn, saveStudyProfile, signUp, verifySession } from "./services/api";

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("clearpath-session"));
      return stored?.token && stored?.user ? stored : null;
    }
    catch { return null; }
  });
  const [studentData, setStudentData] = useState(null);
  const [solution, setSolution] = useState(null);
  const [target, setTarget] = useState('placement');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(Boolean(session?.token));
  const userData = session?.user || null;
  const sessionToken = session?.token;

  useEffect(() => {
    if (!sessionToken) return;
    let active = true;
    verifySession(sessionToken)
      .then(user => {
        if (active) {
          const refreshed = { token: sessionToken, user };
          sessionStorage.setItem("clearpath-session", JSON.stringify(refreshed));
          setSession(refreshed);
          return fetchWorkspace(sessionToken).then(({ workspace }) => {
            if (!active || !workspace?.profile?.studyPlan) return;
            const profile = workspace.profile;
            setStudentData(profile);
            setSolution(profile.studyPlan);
            setTarget(profile.target || "placement");
          });
        }
      })
      .catch(err => {
        if (!active) return;
        if (err.status === 401) {
          sessionStorage.removeItem("clearpath-session");
          setSession(null);
        }
      })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, [sessionToken]);

  const handleStart = async ({ name, email, password, mode }) => {
    setAuthLoading(true);
    try {
      const result = mode === "signup"
        ? await signUp({ name, email, password })
        : await logIn({ email, password });
      sessionStorage.setItem("clearpath-session", JSON.stringify(result));
      setSession(result);
      setTarget("placement");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (formDetails) => {
    setLoading(true);
    setError(null);
    try {
      // Combine initial user data with form details
      const fullData = { ...userData, ...formDetails };
      setTarget(formDetails.target || 'placement');
      const result = await fetchPlan(fullData, session.token);
      let savedData = fullData;
      try {
        const saved = await saveStudyProfile(session.token, { ...fullData, studyPlan: result });
        savedData = { ...fullData, scheduleWarnings: saved.schedule?.warnings || [], scheduleAssumptions: saved.schedule?.assumptions || [] };
        result.studySchedule = saved.schedule;
      } catch (saveError) {
        console.warn("Could not persist study workspace profile:", saveError.message);
      }
      setStudentData(savedData);
      setSolution(result);
      return true;
    } catch (err) {
      setError(err.message || "An error occurred");
      if (err.status === 401) {
        sessionStorage.removeItem("clearpath-session");
        setSession(null);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("clearpath-session");
    setSession(null);
    setStudentData(null);
    setSolution(null);
  };

  return (
    <div className={`app-container${solution ? " workspace-shell" : !userData ? " auth-shell" : ""}`}>
      <div className="background-shapes" aria-hidden="true">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      {!sessionLoading && !userData && (
        <LandingPage onStart={handleStart} isLoading={authLoading} />
      )}

      {userData && !solution && (
        <>
          <header className="app-header fade-in">
            <h1>ClearPath</h1>
            <p>A clear, realistic path through your backlogs</p>
          </header>

          <main className="app-main fade-in">
            <div className="glass-panel">
              <StudentForm 
                initialName={studentData?.name || userData.name}
                initialEmail={studentData?.email || userData.email}
                initialData={studentData}
                onSubmit={handleSubmit} 
                isLoading={loading}
              />
            </div>

            {loading && (
              <div className="loading-state glass-panel">
                <div className="spinner"></div>
                <p>Analyzing prerequisites, deadlines, and rules...</p>
              </div>
            )}

            {error && (
              <div className="error-state glass-panel" role="alert">
                <p>Error: {error}</p>
              </div>
            )}

          </main>
        </>
      )}
      {solution && studentData && (
          <Dashboard
          solution={solution}
          target={target}
          studentData={studentData}
          token={session.token}
          onEdit={() => setSolution(null)}
            onLogout={handleLogout}
        />
      )}
      {sessionLoading && <div className="auth-session-loading" role="status">Checking your session…</div>}
    </div>
  );
}
