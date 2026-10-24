import { useState } from "react";

function CapIcon({ small = false }) {
  return <svg width={small ? 19 : 27} height={small ? 19 : 27} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m3 12.2 13-6.7 13 6.7-13 6.7-13-6.7Z" fill="currentColor"/><path d="M8.4 15.3v6.3c4.7 4.1 10.5 4.1 15.2 0v-6.3L16 19.2l-7.6-3.9Z" fill="currentColor"/><path d="M28.8 13v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function FieldIcon({ type }) {
  if (type === "email") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m5 7 7 5.5L19 7"/></svg>;
  if (type === "password") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.5-3.7 3.2-5.5 7.5-5.5s7 1.8 7.5 5.5"/></svg>;
}

function FeatureIcon({ type }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "planner") return <svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2m4 0h2m-8 4h2m4 0h2"/></svg>;
  if (type === "tutor") return <svg {...common}><path d="M9 4.5a3 3 0 0 0-4 4.3A3.5 3.5 0 0 0 5 15a3 3 0 0 0 4 4.5M15 4.5a3 3 0 0 1 4 4.3 3.5 3.5 0 0 1 0 6.2 3 3 0 0 1-4 4.5M12 3v18M8.5 9.5h.1m-.1 5h.1m7-5h-.1m.1 5h-.1"/></svg>;
  if (type === "notes") return <svg {...common}><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 4v4h4M8 12h8m-8 4h8"/></svg>;
  return <svg {...common}><path d="M4 19V5m0 14h17M7 15l4-4 3 2 6-7m0 0h-4m4 0v4"/><path d="M8 18v-2m5 2v-4m5 4v-6"/></svg>;
}

export default function LandingPage({ onStart, isLoading }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onStart({ name, email, password, mode });
    } catch (err) {
      setError(err.message || "We couldn’t complete that request. Please try again.");
    }
  };

  const changeMode = () => {
    setMode(isSignup ? "login" : "signup");
    setError("");
  };

  return (
    <main className="auth-page fade-in">
      <section className="auth-story" aria-label="About ClearPath">
        <a href="#signup" className="auth-logo"><span className="auth-logo-mark"><CapIcon /></span><span className="auth-logo-copy"><strong>Clear<span>Path</span></strong><small>Your Backlog. Our Focus.</small></span></a>
        <div className="auth-story-copy"><h1>Turn Your Backlogs<br />into a <span>Clear Future</span></h1><p>ClearPath is your AI-powered study companion, helping you plan, learn and clear your backlogs with confidence.</p></div>
        <div className="auth-features" aria-label="ClearPath features">
          <div className="auth-feature"><span className="feature-icon feature-blue"><FeatureIcon type="planner" /></span><span>AI Study<br />Planner</span></div>
          <div className="auth-feature"><span className="feature-icon feature-purple"><FeatureIcon type="tutor" /></span><span>AI Tutor &amp;<br />Q&amp;A</span></div>
          <div className="auth-feature"><span className="feature-icon feature-green"><FeatureIcon type="notes" /></span><span>PDF Analysis &amp;<br />Notes</span></div>
          <div className="auth-feature"><span className="feature-icon feature-orange"><FeatureIcon type="progress" /></span><span>Track Progress<br />&amp; Stay on Track</span></div>
        </div>
        <div className="auth-art">
          <img className="auth-scene-wash" src="/clearpath-study-scene.png" alt="" />
          <img className="auth-scene" src="/clearpath-study-scene.png" alt="Student studying at a laptop, with ClearPath planning message and progress highlights" />
        </div>
      </section>

      <section className="auth-panel" id="signup">
        <div className="auth-switch"><span>{isSignup ? "Already have an account?" : "New to ClearPath?"}</span><button type="button" onClick={changeMode}>{isSignup ? "Log in" : "Create account"} <span aria-hidden="true">→</span></button></div>
        <div className="auth-card">
          <div className="auth-card-heading"><span className="auth-card-icon"><CapIcon /></span><h2>{isSignup ? <>Welcome to <span>ClearPath</span></> : <>Welcome back to <span>ClearPath</span></>}</h2><p>{isSignup ? <>"Don't worry about backlogs,<br />ClearPath will clear it for you."</> : "Log in to continue your study plan."}</p></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && <div className="auth-field"><label htmlFor="auth-name">Full Name</label><div className="auth-input-wrap"><FieldIcon type="name" /><input id="auth-name" type="text" autoComplete="name" placeholder="Enter your name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required /></div></div>}
            <div className="auth-field"><label htmlFor="auth-email">Email (Gmail)</label><div className="auth-input-wrap"><FieldIcon type="email" /><input id="auth-email" type="email" autoComplete="email" placeholder="Enter your Gmail address" value={email} onChange={event => setEmail(event.target.value)} required /></div></div>
            <div className="auth-field"><label htmlFor="auth-password">Password</label><div className="auth-input-wrap"><FieldIcon type="password" /><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Create a password (8+ characters)" : "Enter your password"} value={password} onChange={event => setPassword(event.target.value)} minLength={isSignup ? 8 : undefined} maxLength={128} required /><button type="button" className="password-visibility" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>{isSignup && <span className="auth-field-hint">Use at least 8 characters.</span>}</div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={isLoading}>{isLoading ? <><span className="auth-spinner" /> {isSignup ? "Creating your account…" : "Logging you in…"}</> : <><span aria-hidden="true">→</span> {isSignup ? "Get Started" : "Log in"}</>}</button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <div className="auth-privacy"><span className="privacy-shield" aria-hidden="true">✓</span><span><strong>Your data is safe with us</strong><small>We use industry-standard security to protect your information.</small></span></div>
          <p className="auth-footnote">By continuing, you agree to use ClearPath as a study-planning aid. Confirm exam and eligibility details with your institution.</p>
        </div>
      </section>
    </main>
  );
}
