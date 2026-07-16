import { useState } from "react";

export default function LandingPage({ onStart }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email) {
      onStart({ name, email });
    }
  };

  return (
    <div className="landing-container fade-in">
      <div className="glass-panel landing-panel">
        <div className="landing-header">
          <h1>Welcome to ClearPath</h1>
          <p className="landing-quote">"Don't worry about backlogs, ClearPath will clear it for you."</p>
        </div>
        
        <form className="landing-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input 
              placeholder="Enter your name" 
              value={name}
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Email (Gmail)</label>
            <input 
              type="email"
              placeholder="Enter your gmail" 
              value={email}
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary get-started-btn">Get Started</button>
        </form>
      </div>
    </div>
  );
}
