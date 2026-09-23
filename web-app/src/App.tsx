import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ScorePage from './pages/ScorePage';
import MetricsTestPage from './pages/MetricsTestPage';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <header className="container">
          <nav className="top-nav">
            <Link to="/" className="nav-logo logo-text">
              Cadenza
            </Link>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/upload">Upload Score</Link>
              <Link to="/metrics-test">Metrics Lab</Link>
            </div>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/score" element={<ScorePage />} />
            <Route path="/metrics-test" element={<MetricsTestPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
