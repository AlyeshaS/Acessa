import React, { useEffect, useRef } from "react";

const matrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],

  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],

  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],

  monochrome: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

function applyMatrixToImageData(imageData, matrix) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const newR = r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2];
    const newG = r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2];
    const newB = r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2];

    data[i] = Math.round(Math.min(255, Math.max(0, newR)));
    data[i + 1] = Math.round(Math.min(255, Math.max(0, newG)));
    data[i + 2] = Math.round(Math.min(255, Math.max(0, newB)));
  }

  return imageData;
}
const ColorBlindSimulator = ({
  imageSrc,
  type = "original",
  style = {},
  className = "",
}) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext("2d");
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (type !== "original" && matrices[type]) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const transformed = applyMatrixToImageData(imageData, matrices[type]);
        ctx.putImageData(transformed, 0, 0);
      }
    };
    if (img.complete) {
      img.onload();
    }
  }, [imageSrc, type]);

  return (
    <div
      className={`colorblind-sim-root ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          background: "#fff",
        }}
        aria-label="Color blindness simulation preview"
      />
      <img
        ref={imgRef}
        src={imageSrc}
        alt="original screenshot"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default ColorBlindSimulator;
