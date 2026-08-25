import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import arModelImage from "../assets/ar-model.png";

export class ARScene {
  constructor(container) {
    this.container = container;

    // =====================================================
    // THREE.JS
    // =====================================================

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // =====================================================
    // WEBXR
    // =====================================================

    this.controller = null;
    this.hitTestSource = null;
    this.localReferenceSpace = null;

    this.xrSession = null;

    // =====================================================
    // AR OBJECTS
    // =====================================================

    this.reticle = null;
    this.arModelAnchor = null;
    this.arModel = null;

    // =====================================================
    // MODEL SETTINGS
    // =====================================================

    this.modelHeight = 1.8;

    // =====================================================
    // CALLBACKS
    // =====================================================

    this.onSessionStart = null;
    this.onSessionEndCallback = null;

    // =====================================================
    // CAPTURE
    // =====================================================

    this.captureRequested = false;
    this.captureResolve = null;
    this.captureReject = null;

    this.captureCanvas = null;
    this.captureContext = null;

    // =====================================================
    // INIT
    // =====================================================

    this.init();
  }

  // =====================================================
  // INITIALIZE
  // =====================================================

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();

    this.createReticle();
    this.createARModel();

    this.createController();
    this.createARButton();

    this.createCaptureCanvas();

    window.addEventListener("resize", this.handleResize);

    this.renderer.setAnimationLoop(this.render);
  }

  // =====================================================
  // SCENE
  // =====================================================

  createScene() {
    this.scene = new THREE.Scene();
  }

  // =====================================================
  // CAMERA
  // =====================================================

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100,
    );
  }

  // =====================================================
  // RENDERER
  // =====================================================

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.xr.enabled = true;

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
  }

  // =====================================================
  // LIGHT
  // =====================================================

  createLights() {
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);

    this.scene.add(hemisphereLight);
  }

  // =====================================================
  // RETICLE
  // =====================================================

  createReticle() {
    const geometry = new THREE.RingGeometry(0.08, 0.1, 32);

    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    this.reticle = new THREE.Mesh(geometry, material);

    this.reticle.rotation.x = -Math.PI / 2;

    this.reticle.matrixAutoUpdate = false;

    this.reticle.visible = false;

    this.scene.add(this.reticle);
  }

  // =====================================================
  // AR MODEL
  // =====================================================

  createARModel() {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      arModelImage,

      (texture) => {
        console.log("AR Model image loaded successfully.");

        texture.colorSpace = THREE.SRGBColorSpace;

        const image = texture.image;

        const aspectRatio = image.width / image.height;

        const height = this.modelHeight;

        const width = height * aspectRatio;

        console.log("PNG:", image.width, "x", image.height);

        console.log("AR Model:", width, "x", height, "meters");

        // -------------------------------------------------
        // PERSON PLANE
        // -------------------------------------------------

        const geometry = new THREE.PlaneGeometry(width, height);

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          alphaTest: 0.01,
        });

        this.arModel = new THREE.Mesh(geometry, material);

        /*
         * Move PNG upward so its
         * bottom is at the floor.
         */
        this.arModel.position.set(0, height / 2, 0);

        this.arModel.visible = false;

        // -------------------------------------------------
        // FLOOR ANCHOR
        // -------------------------------------------------

        this.arModelAnchor = new THREE.Group();

        this.arModelAnchor.visible = false;

        this.arModelAnchor.add(this.arModel);

        this.scene.add(this.arModelAnchor);

        this.arModelAnchor.updateMatrixWorld(true);

        console.log("AR Model ready.");
      },

      undefined,

      (error) => {
        console.error("Failed to load AR Model:", error);
      },
    );
  }

  // =====================================================
  // CONTROLLER
  // =====================================================

  createController() {
    this.controller = this.renderer.xr.getController(0);

    this.controller.addEventListener("select", this.onSelect);

    this.scene.add(this.controller);
  }

  // =====================================================
  // AR BUTTON
  // =====================================================

  createARButton() {
    const arButton = ARButton.createButton(this.renderer, {
      requiredFeatures: ["hit-test", "camera-access"],

      optionalFeatures: ["dom-overlay"],

      domOverlay: {
        root: this.container,
      },
    });

    arButton.id = "webxr-start-button";

    arButton.style.position = "absolute";

    arButton.style.bottom = "30px";

    arButton.style.left = "50%";

    arButton.style.transform = "translateX(-50%)";

    arButton.style.padding = "12px 24px";

    arButton.style.border = "none";

    arButton.style.borderRadius = "8px";

    arButton.style.background = "#0d6efd";

    arButton.style.color = "#ffffff";

    arButton.style.fontSize = "16px";

    arButton.style.fontWeight = "600";

    arButton.style.zIndex = "9999";

    this.container.appendChild(arButton);

    // ===================================================
    // SESSION START
    // ===================================================

    this.renderer.xr.addEventListener("sessionstart", this.handleSessionStart);

    // ===================================================
    // SESSION END
    // ===================================================

    this.renderer.xr.addEventListener("sessionend", this.handleSessionEnd);
  }

  // =====================================================
  // SESSION START
  // =====================================================

  handleSessionStart = () => {
    console.log("WebXR session started.");

    this.xrSession = this.renderer.xr.getSession();

    const startButton = document.getElementById("webxr-start-button");

    if (startButton) {
      startButton.style.display = "none";
    }

    this.setupHitTestSource();

    if (this.onSessionStart) {
      this.onSessionStart();
    }
  };

  // =====================================================
  // SESSION END
  // =====================================================

  handleSessionEnd = () => {
    console.log("WebXR session ended.");

    this.xrSession = null;

    this.hitTestSource = null;

    this.localReferenceSpace = null;

    if (this.reticle) {
      this.reticle.visible = false;
    }

    if (this.arModelAnchor) {
      this.arModelAnchor.visible = false;
    }

    const startButton = document.getElementById("webxr-start-button");

    if (startButton) {
      startButton.style.display = "block";
    }

    if (this.captureReject) {
      this.captureReject(new Error("AR session ended."));

      this.captureResolve = null;

      this.captureReject = null;

      this.captureRequested = false;
    }

    if (this.onSessionEndCallback) {
      this.onSessionEndCallback();
    }
  };

  // =====================================================
  // HIT TEST
  // =====================================================

  setupHitTestSource = async () => {
    const session = this.renderer.xr.getSession();

    if (!session) {
      return;
    }

    try {
      const viewerSpace = await session.requestReferenceSpace("viewer");

      this.hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
      });

      this.localReferenceSpace = await session.requestReferenceSpace("local");

      console.log("Hit-test ready.");
    } catch (error) {
      console.error("Hit-test setup failed:", error);
    }
  };

  // =====================================================
  // PLACE MODEL
  // =====================================================

  onSelect = () => {
    console.log("Screen selected.");

    if (!this.reticle.visible) {
      console.log("No detected surface.");

      return;
    }

    if (!this.arModel) {
      console.log("AR model is not loaded.");

      return;
    }

    if (!this.arModelAnchor) {
      console.log("AR model anchor is not ready.");

      return;
    }

    const floorPosition = new THREE.Vector3();

    floorPosition.setFromMatrixPosition(this.reticle.matrix);

    console.log("Floor position:", floorPosition);

    this.arModelAnchor.position.copy(floorPosition);

    this.arModelAnchor.rotation.set(0, 0, 0);

    this.arModel.visible = true;

    this.arModelAnchor.visible = true;

    this.arModel.updateMatrixWorld(true);

    this.arModelAnchor.updateMatrixWorld(true);

    console.log("AR MODEL PLACED.");
  };

  // =====================================================
  // CAPTURE CANVAS
  // =====================================================

  createCaptureCanvas() {
    this.captureCanvas = document.createElement("canvas");

    this.captureContext = this.captureCanvas.getContext("2d", {
      willReadFrequently: true,
    });
  }

  // =====================================================
  // CAPTURE PHOTO
  // =====================================================

  capturePhoto() {
    /*
     * IMPORTANT:
     *
     * We cannot immediately read the
     * WebXR camera texture here.
     *
     * getCameraTexture() is only valid
     * during the current XR animation
     * frame.
     *
     * So we request capture and let
     * render() perform the actual capture.
     */

    return new Promise((resolve, reject) => {
      if (!this.renderer.xr.isPresenting) {
        reject(new Error("AR session is not active."));

        return;
      }

      if (this.captureRequested) {
        reject(new Error("A capture is already in progress."));

        return;
      }

      console.log("Capture requested.");

      this.captureRequested = true;

      this.captureResolve = resolve;

      this.captureReject = reject;
    });
  }

  // =====================================================
  // CAPTURE CURRENT XR FRAME
  // =====================================================

  captureCurrentXRFrame(frame) {
    try {
      console.log("Capturing current XR frame...");

      const xrCamera = this.renderer.xr.getCamera();

      if (!xrCamera || !xrCamera.cameras || xrCamera.cameras.length === 0) {
        throw new Error("XR camera is not available.");
      }

      /*
       * Get the first camera/view.
       */
      const viewCamera = xrCamera.cameras[0];

      /*
       * Three.js r179+ camera-access API.
       *
       * This gives us the raw camera
       * texture for the CURRENT XR frame.
       */
      const cameraTexture = this.renderer.xr.getCameraTexture(viewCamera);

      if (!cameraTexture) {
        throw new Error(
          "WebXR camera texture is not available on this device/browser.",
        );
      }

      console.log("Camera texture obtained.");

      /*
       * --------------------------------------------------
       * IMPORTANT
       * --------------------------------------------------
       *
       * The camera texture is an opaque GPU
       * texture. It cannot be passed directly
       * to canvas.drawImage().
       *
       * We therefore use Three.js to render
       * the camera texture into our capture
       * canvas.
       */

      const cameraMaterial = new THREE.MeshBasicMaterial({
        map: cameraTexture,
        depthTest: false,
        depthWrite: false,
      });

      const cameraGeometry = new THREE.PlaneGeometry(2, 2);

      const cameraMesh = new THREE.Mesh(cameraGeometry, cameraMaterial);

      const cameraScene = new THREE.Scene();

      const camera2D = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      cameraScene.add(cameraMesh);

      /*
       * Camera frame dimensions.
       */
      const cameraWidth = viewCamera.viewport?.z || window.innerWidth;

      const cameraHeight = viewCamera.viewport?.w || window.innerHeight;

      const width = Math.max(1, Math.floor(cameraWidth));

      const height = Math.max(1, Math.floor(cameraHeight));

      this.captureCanvas.width = width;

      this.captureCanvas.height = height;

      /*
       * Render camera texture.
       */
      this.renderer.setRenderTarget(null);

      /*
       * Save renderer state.
       */
      const oldXrEnabled = this.renderer.xr.enabled;

      this.renderer.xr.enabled = false;

      /*
       * Render camera image to
       * the canvas.
       */
      this.renderer.render(cameraScene, camera2D);

      /*
       * Now render the AR model on top.
       */
      this.renderer.render(this.scene, this.camera);

      /*
       * Read the renderer canvas.
       */
      const image = this.renderer.domElement.toDataURL("image/png");

      /*
       * Restore XR.
       */
      this.renderer.xr.enabled = oldXrEnabled;

      /*
       * Cleanup temporary objects.
       */
      cameraGeometry.dispose();
      cameraMaterial.dispose();

      /*
       * Resolve capture.
       */
      if (this.captureResolve) {
        this.captureResolve(image);
      }

      this.captureResolve = null;

      this.captureReject = null;

      this.captureRequested = false;

      console.log("Capture completed.");
    } catch (error) {
      console.error("XR capture failed:", error);

      if (this.captureReject) {
        this.captureReject(error);
      }

      this.captureResolve = null;

      this.captureReject = null;

      this.captureRequested = false;
    }
  }

  // =====================================================
  // RETAKE
  // =====================================================

  retakePhoto() {
    console.log("Retaking photo...");

    if (this.arModelAnchor) {
      this.arModelAnchor.visible = true;
    }

    if (this.arModel) {
      this.arModel.visible = true;
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  render = (timestamp, frame) => {
    // ===================================================
    // HIT TEST
    // ===================================================

    if (frame && this.hitTestSource && this.localReferenceSpace) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];

        const pose = hit.getPose(this.localReferenceSpace);

        if (pose) {
          this.reticle.visible = true;

          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        this.reticle.visible = false;
      }
    }

    // ===================================================
    // FACE CAMERA
    // ===================================================

    if (this.arModelAnchor && this.arModelAnchor.visible) {
      const cameraPosition = new THREE.Vector3();

      this.camera.getWorldPosition(cameraPosition);

      const modelPosition = new THREE.Vector3();

      this.arModelAnchor.getWorldPosition(modelPosition);

      const dx = cameraPosition.x - modelPosition.x;

      const dz = cameraPosition.z - modelPosition.z;

      this.arModelAnchor.rotation.y = Math.atan2(dx, dz);
    }

    // ===================================================
    // NORMAL XR RENDER
    // ===================================================

    this.renderer.render(this.scene, this.camera);

    // ===================================================
    // CAPTURE REQUEST
    // ===================================================

    /*
     * VERY IMPORTANT:
     *
     * getCameraTexture() must be called
     * during the XR animation frame.
     */

    if (frame && this.captureRequested) {
      this.captureCurrentXRFrame(frame);
    }
  };

  // =====================================================
  // RESIZE
  // =====================================================

  handleResize = () => {
    if (!this.camera || !this.renderer) {
      return;
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // =====================================================
  // CLEANUP
  // =====================================================

  destroy() {
    window.removeEventListener("resize", this.handleResize);

    this.renderer.xr.removeEventListener(
      "sessionstart",
      this.handleSessionStart,
    );

    this.renderer.xr.removeEventListener("sessionend", this.handleSessionEnd);

    if (this.controller) {
      this.controller.removeEventListener("select", this.onSelect);
    }

    this.renderer.setAnimationLoop(null);

    if (this.captureReject) {
      this.captureReject(new Error("AR scene destroyed."));
    }

    if (this.arModel) {
      this.arModel.geometry.dispose();

      if (this.arModel.material.map) {
        this.arModel.material.map.dispose();
      }

      this.arModel.material.dispose();
    }

    if (this.reticle) {
      this.reticle.geometry.dispose();
      this.reticle.material.dispose();
    }

    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
