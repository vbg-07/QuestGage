import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WebcamCapture from './components/WebcamCapture';
import Dashboard from './components/Dashboard';

import Exam from './components/Exam';

function App() {
  return (
    <Router>
      <header className="glass-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '6px' }}></div>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>QuestGage</h3>
        </div>
        <nav>
          <Link to="/" style={{ marginRight: '20px', color: 'white', textDecoration: 'none', fontWeight: '500' }}>Student Exam</Link>
          <Link to="/teacher" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Teacher Dashboard</Link>
        </nav>
      </header>

      <main style={{ paddingTop: '80px', minHeight: '100vh', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<Exam />} />
          <Route path="/teacher" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
