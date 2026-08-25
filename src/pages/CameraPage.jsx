import { useEffect, useRef, useState } from "react";
import { ARScene } from "../ar/ARScene";

const CameraPage = () => {
  const arContainerRef = useRef(null);
  const arSceneRef = useRef(null);

  /*
   * start
   * capture
   * preview
   */
  const [stage, setStage] = useState("start");

  const [capturedImage, setCapturedImage] = useState(null);

  const [isCapturing, setIsCapturing] = useState(false);

  // =====================================================
  // INITIALIZE AR
  // =====================================================

  useEffect(() => {
    if (!arContainerRef.current) {
      return;
    }

    const arScene = new ARScene(arContainerRef.current);

    arSceneRef.current = arScene;

    // ---------------------------------------------------
    // AR STARTED
    // ---------------------------------------------------

    arScene.onSessionStart = () => {
      console.log("CameraPage: AR started");

      setCapturedImage(null);

      setStage("capture");
    };

    // ---------------------------------------------------
    // AR ENDED
    // ---------------------------------------------------

    arScene.onSessionEndCallback = () => {
      console.log("CameraPage: AR ended");

      setCapturedImage(null);

      setStage("start");
    };

    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------

    return () => {
      arScene.destroy();

      arSceneRef.current = null;
    };
  }, []);

  // =====================================================
  // CAPTURE
  // =====================================================

  const handleCapture = async () => {
    if (stage !== "capture" || !arSceneRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      console.log("Taking photo...");

      const image = await arSceneRef.current.capturePhoto();

      if (!image) {
        throw new Error("No image returned.");
      }

      /*
       * Store captured image.
       */
      setCapturedImage(image);

      /*
       * Hide Capture button.
       *
       * Show Retake + Download.
       */
      setStage("preview");

      console.log("Photo captured.");
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
    console.log("Retake clicked");

    setCapturedImage(null);

    if (arSceneRef.current) {
      arSceneRef.current.retakePhoto();
    }

    /*
     * Show Capture button again.
     */
    setStage("capture");
  };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const handleDownload = () => {
    if (!capturedImage || stage !== "preview") {
      return;
    }

    console.log("Downloading photo...");

    const link = document.createElement("a");

    link.href = capturedImage;

    link.download = `ar-photo-${Date.now()}.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      ref={arContainerRef}
      className="position-relative w-100 vh-100 overflow-hidden bg-black"
      style={{
        touchAction: "none",
      }}
    >
      {/* =================================================
          CAPTURE BUTTON
          ONLY AFTER AR STARTS
      ================================================= */}

      {stage === "capture" && (
        <div
          className="position-absolute bottom-0 start-0 w-100 d-flex justify-content-center"
          style={{
            zIndex: 10000,
            paddingBottom: "30px",
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={handleCapture}
            disabled={isCapturing}
            className="btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center"
            style={{
              width: "76px",
              height: "76px",

              border: "5px solid rgba(255,255,255,0.6)",

              fontSize: "30px",

              padding: 0,

              pointerEvents: "auto",
            }}
          >
            {isCapturing ? "..." : "📸"}
          </button>
        </div>
      )}

      {/* =================================================
          PHOTO PREVIEW
          ONLY AFTER CAPTURE
      ================================================= */}

      {stage === "preview" && capturedImage && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 bg-dark d-flex flex-column align-items-center justify-content-center"
          style={{
            zIndex: 20000,
            pointerEvents: "auto",
          }}
        >
          {/* PHOTO */}

          <div
            className="d-flex align-items-center justify-content-center w-100 px-3"
            style={{
              height: "78vh",
            }}
          >
            <img
              src={capturedImage}
              alt="Captured AR"
              className="img-fluid rounded"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {/* BUTTONS */}

          <div
            className="d-flex justify-content-center align-items-center gap-3 flex-wrap"
            style={{
              height: "22vh",
            }}
          >
            {/* RETAKE */}

            <button
              type="button"
              onClick={handleRetake}
              className="btn btn-secondary btn-lg px-4"
            >
              ↩ Retake
            </button>

            {/* DOWNLOAD */}

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
