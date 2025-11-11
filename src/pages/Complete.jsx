import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";

function Complete() {
  const navigate = useNavigate();
  return (
    <>
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/")}>
          <svg
            width="55"
            height="55"
            viewBox="0 0 55 55"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M34.375 41.25L20.625 27.5L34.375 13.75"
              stroke="#7C8DA0"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Home Page
        </button>
        <h1>Analyzation</h1>
      </div>
      <div className="card-body">
        <div className="scores">
          <>
            <h2>Scores</h2>
          </>
          {/* <div className="score-body">
              <div className="left-arrow">
                <svg
                  width="93"
                  height="93"
                  viewBox="0 0 93 93"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M58.125 69.75L34.875 46.5L58.125 23.25"
                    stroke="#7C8DA0"
                    stroke-opacity="0.32"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div className="score-content"></div>
              <div className="right-arrow">
                <svg
                  width="93"
                  height="93"
                  viewBox="0 0 93 93"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M34.875 23.25L58.125 46.5L34.875 69.75"
                    stroke="#7C8DA0"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div> */}
        </div>
        <div className="hci-report">
          <h2>HCI Report</h2>
          <p>
            Perceivability: Most text meets contrast standards, but some
            secondary labels fall below WCAG AA. Operability: Interactive
            elements are easily clickable; however, keyboard focus states are
            missing. Understandability: Consistent layout and labeling make
            navigation intuitive. Robustness: Structure is largely compatible
            with assistive tools, though ARIA labels are absent.
          </p>
        </div>
        <div className="next-steps">
          <h2>Next Steps</h2>
          <p>
            Increase contrast for low-visibility text (#BDBDBD on #F8F8F8). Add
            visible focus states to all buttons. Include descriptive alt text
            for key visuals.
          </p>
        </div>
      </div>
      <footer>
        <h2>Acessa</h2>
      </footer>
    </>
  );
}

export default Complete;
