// src/App.jsx
import { useState } from "react";
import "./styles/App.css";
import "./styles/index.css";
import UploadBar from "./components/uploadBar.jsx";
import { useNavigate } from "react-router-dom";

function App() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  function normalizeUrl(input) {
    if (!input) return "";

    let trimmed = input.trim();

    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = "https://" + trimmed;
    }

    return trimmed;
  }

  const handleAnalyzeClick = () => {
    if (!url) return;

    const fixedUrl = normalizeUrl(url);

    navigate("/complete", { state: { url: fixedUrl } });
  };

  const handleVisualClick = () => {
    if (!url) return;

    const fixedUrl = normalizeUrl(url);
    navigate("/visual", { state: { url: fixedUrl } });
  };

  return (
    <>
      <div className="home-page">
        {/* Decorative blobs */}
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />

        {/* Hero */}
        <div className="hero-section">
          <div className="hero-badge">Web Accessibility Analyzer</div>
          <h1 className="hero-title">
            Make the web <span className="hero-accent">accessible</span> for
            everyone.
          </h1>
          <p className="hero-subtitle">
            Paste any URL and get an instant WCAG 2.2 score, HCI report, and
            actionable fixes.
          </p>

          <div className="input-card">
            <p className="input-label">Enter a website URL to analyze</p>
            <UploadBar
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onUploadClick={() => {
                console.log("upload clicked");
              }}
              onAnalyzeClick={handleAnalyzeClick}
            />
          </div>
        </div>

        {/* Feature cards */}
        <div className="features-section">
          <p className="features-label">What you get</p>
          <div className="feature-grid">
            <div className="feature-card feature-card--score">
              <div className="feature-illustration" aria-hidden="true">
                <div className="feature-icon-bg feature-icon-bg--score">
                  <svg
                    fill="currentColor"
                    viewBox="0 0 92 92"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M72.8,24.9L53.4,66.7c-1.7,4.3-4.7,6.8-8,6.8c-2.7,0-5-1.4-6.3-3.6c-1.4-2.6-1.3-5.8,0.4-8.5v0l25.4-40.7 c1.3-2,3.9-2.7,6-1.6C73,20.2,73.8,22.7,72.8,24.9z M79.6,37c-1.5-1.6-4-1.7-5.7-0.2c-1.6,1.5-1.7,4-0.2,5.7 C80.3,49.7,84,59.1,84,69c0,2.2,1.8,4,4,4s4-1.8,4-4C92,57.1,87.6,45.7,79.6,37z M49.2,30.4c2.2,0.2,4.1-1.4,4.3-3.6 c0.2-2.2-1.4-4.1-3.6-4.3c-1.3-0.1-2.6-0.2-3.9-0.2c-25.4,0-46,21-46,46.8c0,2.2,1.8,4,4,4s4-1.8,4-4c0-21.4,17-38.8,38-38.8 C47.1,30.2,48.2,30.3,49.2,30.4z" />
                  </svg>
                </div>
              </div>
              <div className="feature-body">
                <h3 className="feature-title">WCAG Score</h3>
                <p className="feature-desc">
                  Instant compliance score across all four POUR principles —
                  Perceivable, Operable, Understandable, Robust.
                </p>
              </div>
            </div>

            <div className="feature-card feature-card--hci">
              <div className="feature-illustration" aria-hidden="true">
                <div className="feature-icon-bg feature-icon-bg--hci">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              </div>
              <div className="feature-body">
                <h3 className="feature-title">HCI Report</h3>
                <p className="feature-desc">
                  A detailed human-computer interaction analysis covering
                  cognitive load, usability patterns, and mobile experience.
                </p>
              </div>
            </div>

            <div className="feature-card feature-card--steps">
              <div className="feature-illustration" aria-hidden="true">
                <div className="feature-icon-bg feature-icon-bg--steps">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
              </div>
              <div className="feature-body">
                <h3 className="feature-title">Next Steps</h3>
                <p className="feature-desc">
                  Prioritised, actionable recommendations to fix every issue —
                  with specific WCAG criteria and code-level guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
