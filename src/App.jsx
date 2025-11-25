// src/App.jsx
import { useState } from "react";
import "./styles/App.css";
import "./styles/index.css";
import UploadBar from "./components/UploadBar.jsx";
import { useNavigate } from "react-router-dom";

function App() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  function normalizeUrl(input) {
    if (!input) return "";

    let trimmed = input.trim();

    // If they typed "example.com" → turn it into https://example.com
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

  return (
    <>
      <div className="main-container">
        <div className="title">
          <h1>Welcome to Acessa!</h1>
          <p className="subheader">Design Smarter. Design Accessible</p>
        </div>

        <div className="body-area">
          <h2>Upload document:</h2>
          <p className="subheader">Please upload your website </p>

          <div className="enter-area">
            <UploadBar
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onUploadClick={() => {
                console.log("upload clicked");
              }}
              onAnalyzeClick={handleAnalyzeClick}
            />
          </div>

          <div className="cards">
            <h2>What Acessa does:</h2>
            <div className="feature-grid">
              {/* WCAG Score */}
              <div className="feature-card">
                <div className="feature-illustration" aria-hidden="true">
                  <svg
                    fill="#7C8DA0"
                    version="1.1"
                    id="Layer_1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 92 92"
                    enableBackground="new 0 0 92 92"
                    xmlSpace="preserve"
                    stroke="#7C8DA0"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        id="XMLID_1594_"
                        d="M72.8,24.9L53.4,66.7c-1.7,4.3-4.7,6.8-8,6.8c-2.7,0-5-1.4-6.3-3.6c-1.4-2.6-1.3-5.8,0.4-8.5v0l25.4-40.7 c1.3-2,3.9-2.7,6-1.6C73,20.2,73.8,22.7,72.8,24.9z M79.6,37c-1.5-1.6-4-1.7-5.7-0.2c-1.6,1.5-1.7,4-0.2,5.7 C80.3,49.7,84,59.1,84,69c0,2.2,1.8,4,4,4s4-1.8,4-4C92,57.1,87.6,45.7,79.6,37z M49.2,30.4c2.2,0.2,4.1-1.4,4.3-3.6 c0.2-2.2-1.4-4.1-3.6-4.3c-1.3-0.1-2.6-0.2-3.9-0.2c-25.4,0-46,21-46,46.8c0,2.2,1.8,4,4,4s4-1.8,4-4c0-21.4,17-38.8,38-38.8 C47.1,30.2,48.2,30.3,49.2,30.4z"
                      ></path>{" "}
                    </g>
                  </svg>
                </div>
                <div className="feature-footer">WCAG Score</div>
              </div>

              {/* HCI Report */}
              <article className="feature-card">
                <div className="feature-illustration" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="256"
                    height="256"
                    viewBox="0 0 256 256"
                    role="img"
                    aria-hidden="true"
                    style={{
                      display: "block",
                      color: "var(--color-text, #7C8DA0)",
                    }}
                  >
                    <g transform="translate(1.4066 1.4066) scale(2.81)">
                      <path
                        d="M 42.725 75.254 c -0.486 0 -0.963 -0.177 -1.335 -0.511 c -0.534 -0.479 -0.771 -1.207 -0.62 -1.908 l 2.986 -13.938 c 0.073 -0.341 0.234 -0.657 0.467 -0.916 l 28.373 -31.637 c 1.104 -1.231 2.621 -1.958 4.272 -2.048 c 1.656 -0.089 3.238 0.469 4.47 1.573 l 4.306 3.863 c 0.31 0.276 0.594 0.587 0.843 0.924 c 0.243 0.327 0.454 0.681 0.628 1.051 c 0.2 0.427 0.351 0.902 0.457 1.451 l 0 0 c 0.211 1.084 0.141 2.188 -0.205 3.195 c -0.134 0.389 -0.305 0.761 -0.51 1.109 c -0.209 0.357 -0.456 0.696 -0.734 1.008 L 57.745 70.109 c -0.233 0.26 -0.529 0.454 -0.86 0.563 l -13.532 4.479 C 43.147 75.221 42.935 75.254 42.725 75.254 z M 47.555 60.256 l -2.143 10.002 l 9.71 -3.215 l 28.019 -31.24 c 0.1 -0.11 0.188 -0.233 0.264 -0.36 c 0.071 -0.123 0.132 -0.254 0.179 -0.391 c 0.117 -0.34 0.139 -0.731 0.062 -1.128 c 0 0 0 -0.001 -0.001 -0.001 c -0.042 -0.22 -0.092 -0.388 -0.151 -0.515 c -0.062 -0.132 -0.135 -0.254 -0.218 -0.367 c -0.089 -0.119 -0.189 -0.229 -0.3 -0.328 l -4.309 -3.865 c -0.436 -0.391 -0.998 -0.583 -1.582 -0.557 c -0.584 0.032 -1.12 0.289 -1.511 0.725 L 47.555 60.256 z M 56.256 68.774 h 0.01 H 56.256 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                      <path
                        d="M 66.242 90 H 9.849 c -4.157 0 -7.539 -3.382 -7.539 -7.539 V 7.539 C 2.31 3.382 5.692 0 9.849 0 h 56.394 c 4.157 0 7.539 3.382 7.539 7.539 v 10.873 c 0 1.104 -0.896 2 -2 2 s -2 -0.896 -2 -2 V 7.539 C 69.781 5.587 68.193 4 66.242 4 H 9.849 C 7.897 4 6.31 5.587 6.31 7.539 v 74.922 C 6.31 84.412 7.897 86 9.849 86 h 56.394 c 1.951 0 3.539 -1.588 3.539 -3.539 V 63.962 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 v 18.499 C 73.781 86.618 70.399 90 66.242 90 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                      <path
                        d="M 58.882 18.746 H 17.209 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 h 41.673 c 1.104 0 2 0.896 2 2 S 59.986 18.746 58.882 18.746 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                      <path
                        d="M 52.45 37.582 H 17.209 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 H 52.45 c 1.104 0 2 0.896 2 2 S 53.555 37.582 52.45 37.582 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                      <path
                        d="M 36.83 56.418 H 17.209 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 H 36.83 c 1.104 0 2 0.896 2 2 S 37.935 56.418 36.83 56.418 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                      <path
                        d="M 32.398 75.254 H 17.209 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 h 15.189 c 1.104 0 2 0.896 2 2 S 33.502 75.254 32.398 75.254 z"
                        fill="currentColor"
                        fillRule="nonzero"
                        opacity="1"
                      />
                    </g>
                  </svg>
                </div>
                <div className="feature-footer">HCI Report</div>
              </article>

              {/* Next Steps */}
              <article className="feature-card">
                <div className="feature-illustration" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="256"
                    height="256"
                    viewBox="0 0 256 256"
                    role="img"
                    aria-hidden="true"
                  >
                    <g transform="translate(1.4066 1.4066) scale(2.81)">
                      <path
                        d="M 87.993 38.683 c 0.782 0 1.477 -0.439 1.812 -1.146 c 0.335 -0.708 0.235 -1.523 -0.261 -2.129 l -5.508 -6.73 l 5.508 -6.724 c 0.496 -0.605 0.596 -1.421 0.261 -2.129 c -0.335 -0.707 -1.029 -1.146 -1.812 -1.146 H 69.602 v -1.023 c 0 -0.552 -0.447 -1 -1 -1 s -1 0.448 -1 1 v 2.023 v 18.005 v 10.295 H 54.086 h -9.425 V 34.162 c 2.596 -0.523 4.557 -2.821 4.557 -5.568 c 0 -3.133 -2.549 -5.681 -5.681 -5.681 c -3.133 0 -5.681 2.548 -5.681 5.681 c 0 2.834 2.088 5.183 4.805 5.606 v 13.778 H 27.543 h -9.872 V 34.162 c 2.596 -0.523 4.557 -2.821 4.557 -5.568 c 0 -3.133 -2.548 -5.681 -5.681 -5.681 c -3.132 0 -5.681 2.548 -5.681 5.681 c 0 2.834 2.088 5.183 4.805 5.606 v 13.778 H 1 c -0.375 0 -0.718 0.209 -0.889 0.542 c -0.171 0.333 -0.143 0.734 0.075 1.039 L 8.11 60.662 L 0.186 71.765 c -0.218 0.305 -0.247 0.706 -0.075 1.039 C 0.283 73.137 0.626 73.346 1 73.346 h 26.543 h 26.543 h 26.543 c 0.323 0 0.626 -0.156 0.814 -0.419 l 8.338 -11.684 c 0.247 -0.348 0.247 -0.814 0 -1.162 l -8.338 -11.685 c -0.188 -0.263 -0.491 -0.419 -0.814 -0.419 H 69.602 v -9.295 H 87.993 z M 39.856 28.593 c 0 -2.03 1.651 -3.681 3.681 -3.681 s 3.681 1.651 3.681 3.681 c 0 2.03 -1.651 3.681 -3.681 3.681 S 39.856 30.623 39.856 28.593 z M 12.866 28.593 c 0 -2.03 1.651 -3.681 3.681 -3.681 c 2.03 0 3.681 1.651 3.681 3.681 c 0 2.03 -1.651 3.681 -3.681 3.681 C 14.518 32.274 12.866 30.623 12.866 28.593 z M 53.57 71.346 H 29.485 l 7.21 -10.103 c 0.248 -0.348 0.248 -0.814 0 -1.162 l -7.21 -10.103 H 53.57 l 7.625 10.685 L 53.57 71.346 z M 10.152 61.243 c 0.248 -0.348 0.248 -0.814 0 -1.162 l -7.21 -10.103 h 24.086 l 7.624 10.685 l -7.624 10.685 H 2.942 L 10.152 61.243 z M 87.738 60.662 l -7.624 10.685 H 56.029 l 7.21 -10.103 c 0.247 -0.348 0.247 -0.814 0 -1.162 l -7.21 -10.103 h 24.085 L 87.738 60.662 z M 87.997 20.686 l -5.509 6.725 c -0.601 0.736 -0.601 1.804 0.001 2.541 l 5.513 6.731 c 0 0 -0.003 0 -0.009 0 H 69.602 V 20.678 L 87.997 20.686 z"
                        fill="rgb(124,141,160)"
                        fillRule="nonzero"
                        opacity="1"
                      />
                    </g>
                  </svg>
                </div>

                <div className="feature-footer">Next Steps</div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
