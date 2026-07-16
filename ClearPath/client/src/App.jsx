import { useState } from "react";
import LandingPage from "./components/LandingPage";
import StudentForm from "./components/StudentForm";
import Dashboard from "./components/Dashboard";
import { fetchPlan } from "./services/api";

export default function App() {
  const [userData, setUserData] = useState(null);
  const [solution, setSolution] = useState(null);
  const [target, setTarget] = useState('placement');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = (data) => {
    setUserData(data);
  };

  const handleSubmit = async (formDetails) => {
    setLoading(true);
    setError(null);
    try {
      // Combine initial user data with form details
      const fullData = { ...userData, ...formDetails };
      setTarget(formDetails.target || 'placement');
      const result = await fetchPlan(fullData);
      setSolution(result);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      {!userData && (
        <LandingPage onStart={handleStart} />
      )}

      {userData && (
        <>
          <header className="app-header fade-in">
            <h1>ClearPath</h1>
            <p>AI-Powered Backlog Clearing Planner</p>
          </header>

          <main className="app-main fade-in">
            <div className="glass-panel">
              <StudentForm 
                initialName={userData.name} 
                initialEmail={userData.email}
                onSubmit={handleSubmit} 
              />
            </div>

            {loading && (
              <div className="loading-state glass-panel">
                <div className="spinner"></div>
                <p>Analyzing prerequisites, deadlines, and rules...</p>
              </div>
            )}

            {error && (
              <div className="error-state glass-panel">
                <p>Error: {error}</p>
              </div>
            )}

            {solution && !loading && (
              <Dashboard solution={solution} target={target} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
