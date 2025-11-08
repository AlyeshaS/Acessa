import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import UploadBar from "./components/UploadBar.jsx";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="title">
        <h1>Welcome to Acessa!</h1>
        <p className="subheader">Design Smarter. Design Accessible</p>
      </div>
      <div className="body-area">
        <h2>Upload document:</h2>
        <p className="subheader">File type: PDF, PNG or Figma </p>
        <div className="enter-area">
          <UploadBar
          // value={url}
          // onChange={(e) => setUrl(e.target.value)}
          // onUploadClick={() => console.log("upload")}
          // onAnalyzeClick={() => console.log("analyze", url)}
          />
        </div>
      </div>
    </>
  );
}

export default App;
