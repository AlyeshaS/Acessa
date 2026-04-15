// UploadBar lets you enter a URL and start the accessibility check

export default function UploadBar({
  value,
  onChange,
  onUploadClick,
  onAnalyzeClick,
}) {
  // Main row with input and analyze button
  return (
    <div className="upload-row">
      // URL input field
      <input
        type="url"
        className="url-pill"
        placeholder="Enter URL"
        value={value}
        onChange={onChange}
        aria-label="URL to analyze"
      />
      // Analyze button (disabled if input is empty)
      <button
        type="button"
        className="btn-icon btn-analyze"
        onClick={onAnalyzeClick}
        disabled={!value?.trim()}
        aria-label="Analyze"
        title="Analyze"
      >
        // Magnifying glass icon
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
