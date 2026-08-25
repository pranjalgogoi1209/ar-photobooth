import { useEffect, useRef, useState } from "react";
import { ARScene } from "../ar/ARScene";

const CameraPage = () => {
  const arContainerRef = useRef(null);
  const arSceneRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // =====================================================
  // INITIALIZE AR SCENE
  // =====================================================

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
  // CAPTURE PHOTO
  // =====================================================

  const handleCapture = () => {
    if (!arSceneRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const image = arSceneRef.current.capturePhoto();

      if (!image) {
        console.error("Unable to capture image");

        alert("Unable to capture photo. Please try again.");

        return;
      }

      setCapturedImage(image);
    } catch (error) {
      console.error("Capture error:", error);

      alert("Something went wrong while capturing the photo.");
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

    try {
      const link = document.createElement("a");

      link.href = capturedImage;

      link.download = `ar-photo-${Date.now()}.png`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);

      alert("Unable to download the photo.");
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      ref={arContainerRef}
      className="position-relative w-100 vh-100 overflow-hidden bg-black"
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
          className="position-absolute btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center"
          style={{
            width: "76px",
            height: "76px",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            border: "5px solid rgba(255, 255, 255, 0.5)",
            fontSize: "30px",
            padding: 0,
          }}
        >
          {isCapturing ? "..." : "📸"}
        </button>
      )}

      {/* =================================================
          CAPTURED PHOTO PREVIEW
      ================================================= */}

      {capturedImage && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 bg-black d-flex flex-column align-items-center justify-content-center"
          style={{
            zIndex: 2000,
          }}
        >
          {/* =============================================
              PHOTO
          ============================================= */}

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

          {/* =============================================
              ACTION BUTTONS
          ============================================= */}

          <div
            className="d-flex flex-wrap justify-content-center gap-3 px-3"
            style={{
              height: "22vh",
              alignItems: "center",
            }}
          >
            {/* RETAKE */}

            <button
              type="button"
              onClick={handleRetake}
              className="btn btn-secondary btn-lg px-4 py-2"
            >
              ↩ Retake
            </button>

            {/* DOWNLOAD */}

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-success btn-lg px-4 py-2"
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
