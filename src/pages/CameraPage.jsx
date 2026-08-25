import { useEffect, useRef } from "react";
import { ARScene } from "../ar/ARScene";

const CameraPage = () => {
  const arContainerRef = useRef(null);

  useEffect(() => {
    if (!arContainerRef.current) {
      return;
    }

    const arScene = new ARScene(arContainerRef.current);

    return () => {
      arScene.destroy();
    };
  }, []);

  return (
    <div
      ref={arContainerRef}
      className="position-relative w-100 vh-100 overflow-hidden"
    />
  );
};

export default CameraPage;
