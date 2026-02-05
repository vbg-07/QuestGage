import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WebcamCapture from './components/WebcamCapture';
import Dashboard from './components/Dashboard';

import Exam from './components/Exam';
import { AuroraBackground } from './components/ui/aurora-background';

function App() {
  return (
    <Router>
      <header className="glass-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #3b82f6)', borderRadius: '6px' }}></div>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>QuestGage</h3>
        </div>
        <nav>
          <Link to="/" style={{ marginRight: '20px', color: 'white', textDecoration: 'none', fontWeight: '500' }}>Student Exam</Link>
          <Link to="/teacher" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Teacher Dashboard</Link>
        </nav>
      </header>

      <main>
        <AuroraBackground>
          <div style={{ paddingTop: '80px', width: '100%', minHeight: '100vh', boxSizing: 'border-box', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
            <Routes>
              <Route path="/" element={<Exam />} />
              <Route path="/teacher" element={<Dashboard />} />
            </Routes>
          </div>
        </AuroraBackground>
      </main>
    </Router>
  );
}

export default App;
