import { useNavigate } from "react-router-dom";
export default function UploadBar({
  value,
  onChange,
  onUploadClick,
  onAnalyzeClick,
}) {
  const navigate = useNavigate();

  return (
    <div className="upload-row">
      {/* Left icon button (upload) */}
      <button
        type="button"
        className="btn-icon btn-upload"
        aria-label="Upload file"
        title="Upload file"
        onClick={onUploadClick}
      >
        <svg viewBox="0 0 24 24" width="50" height="50" aria-hidden="true">
          <path
            d="M12.5535 2.49392C12.4114 2.33852 12.2106 2.25 12 2.25C11.7894 2.25 11.5886 2.33852 11.4465 2.49392L7.44648 6.86892C7.16698 7.17462 7.18822 7.64902 7.49392 7.92852C7.79963 8.20802 8.27402 8.18678 8.55352 7.88108L11.25 4.9318V16C11.25 16.4142 11.5858 16.75 12 16.75C12.4142 16.75 12.75 16.4142 12.75 16V4.9318L15.4465 7.88108C15.726 8.18678 16.2004 8.20802 16.5061 7.92852C16.8118 7.64902 16.833 7.17462 16.5535 6.86892L12.5535 2.49392Z"
            fill="currentColor"
          />
          <path
            d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Divider */}
      <span className="v-divider" aria-hidden="true" />

      {/* URL input (pill) */}
      <input
        type="url"
        className="url-pill"
        placeholder="Enter URL (Figma or Website)"
        value={value}
        onChange={onChange}
        aria-label="URL to analyze"
      />

      {/* Right analyze button (dark rounded) */}
      <button
        type="button"
        className="btn-icon btn-analyze"
        onClick={() => navigate("/complete")}
        aria-label="Analyze"
        title="Analyze"
      >
        {/* magnifying glass with check */}
        <svg
          width="58"
          height="55"
          viewBox="0 0 58 55"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#filter0_d_50_3)">
            <path
              d="M50.7501 46.75L41.347 37.3468M35.1076 17.25L24.9105 27.4472L18.7917 21.3284M26.9669 2.5C15.6814 2.5 6.5 11.4308 6.5 22.4113C6.5 33.3918 15.6814 42.325 26.9669 42.325C38.2498 42.325 47.4312 33.3918 47.4312 22.4113C47.4312 11.4308 38.2498 2.5 26.9669 2.5Z"
              stroke="currentColor"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"
              shape-rendering="crispEdges"
            />
          </g>
          <defs>
            <filter
              id="filter0_d_50_3"
              x="0"
              y="0"
              width="57.2501"
              height="57.25"
              filterUnits="userSpaceOnUse"
              color-interpolation-filters="sRGB"
            >
              <feFlood flood-opacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="2" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
              />
              <feBlend
                mode="normal"
                in2="BackgroundImageFix"
                result="effect1_dropShadow_50_3"
              />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="effect1_dropShadow_50_3"
                result="shape"
              />
            </filter>
          </defs>
        </svg>
      </button>
    </div>
  );
}
