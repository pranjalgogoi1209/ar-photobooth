import { useEffect, useRef, useState } from "react";
import { ARScene } from "../ar/ARScene";

const CameraPage = () => {
  const arContainerRef = useRef(null);
  const arSceneRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);

  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!arContainerRef.current) {
      return;
    }

    const arScene = new ARScene(arContainerRef.current);

    arSceneRef.current = arScene;

    return () => {
      arScene.destroy();
      arSceneRef.current = null;
    };
  }, []);

  // =====================================================
  // CAPTURE
  // =====================================================

  const handleCapture = () => {
    if (!arSceneRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const image = arSceneRef.current.capturePhoto();

      if (!image) {
        alert("Unable to capture photo.");
        return;
      }

      setCapturedImage(image);
    } catch (error) {
      console.error("Capture error:", error);

      alert("Something went wrong while capturing.");
    } finally {
      setIsCapturing(false);
    }
  };

  // =====================================================
  // RETAKE
  // =====================================================

  const handleRetake = () => {
    setCapturedImage(null);

    if (arSceneRef.current) {
      arSceneRef.current.retakePhoto();
    }
  };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const handleDownload = () => {
    if (!capturedImage) {
      return;
    }

    const link = document.createElement("a");

    link.href = capturedImage;

    link.download = `ar-photo-${Date.now()}.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div
      ref={arContainerRef}
      className="position-relative w-100 vh-100 overflow-hidden bg-transparent"
      style={{
        touchAction: "none",
      }}
    >
      {/* =================================================
          CAPTURE BUTTON
      ================================================= */}

      {!capturedImage && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          aria-label="Capture photo"
          className="btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center"
          style={{
            position: "absolute",

            width: "76px",
            height: "76px",

            bottom: "30px",
            left: "50%",

            transform: "translateX(-50%)",

            zIndex: 9999,

            border: "5px solid rgba(255,255,255,0.6)",

            fontSize: "30px",

            padding: 0,

            pointerEvents: "auto",
          }}
        >
          {isCapturing ? "..." : "📸"}
        </button>
      )}

      {/* =================================================
          PHOTO PREVIEW
      ================================================= */}

      {capturedImage && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 bg-dark d-flex flex-column align-items-center justify-content-center"
          style={{
            zIndex: 10000,
            pointerEvents: "auto",
          }}
        >
          <div
            className="d-flex align-items-center justify-content-center w-100 px-3"
            style={{
              height: "78vh",
            }}
          >
            <img
              src={capturedImage}
              alt="Captured AR photo"
              className="img-fluid rounded"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          <div
            className="d-flex flex-wrap justify-content-center gap-3 px-3"
            style={{
              height: "22vh",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={handleRetake}
              className="btn btn-secondary btn-lg px-4"
            >
              ↩ Retake
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-success btn-lg px-4"
            >
              ⬇ Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPage;
