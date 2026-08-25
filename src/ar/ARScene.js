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

    // =====================================================
    // AR OBJECTS
    // =====================================================

    this.reticle = null;

    // Floor anchor
    this.arModelAnchor = null;

    // PNG person
    this.arModel = null;

    // =====================================================
    // AR MODEL SETTINGS
    // =====================================================

    this.modelHeight = 1.8;

    // =====================================================
    // CALLBACKS
    // =====================================================

    this.onSessionStart = null;
    this.onSessionEndCallback = null;

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

        const imageWidth = image.width;

        const imageHeight = image.height;

        const aspectRatio = imageWidth / imageHeight;

        console.log("PNG size:", imageWidth, "x", imageHeight);

        console.log("Aspect ratio:", aspectRatio);

        // =================================================
        // REAL WORLD MODEL SIZE
        // =================================================

        const height = this.modelHeight;

        const width = height * aspectRatio;

        console.log("AR model size:", width, "x", height, "meters");

        // =================================================
        // PERSON PLANE
        // =================================================

        const geometry = new THREE.PlaneGeometry(width, height);

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,

          // Important for PNG
          depthWrite: false,

          // Remove almost-transparent pixels
          alphaTest: 0.01,
        });

        this.arModel = new THREE.Mesh(geometry, material);

        /*
         * PlaneGeometry is centered
         * around its origin.
         *
         * Move it upward by half
         * its height.
         *
         * This makes the bottom
         * of the PNG correspond
         * to the floor anchor.
         */
        this.arModel.position.set(0, height / 2, 0);

        // Keep hidden until user taps floor
        this.arModel.visible = false;

        // =================================================
        // FLOOR ANCHOR
        // =================================================

        this.arModelAnchor = new THREE.Group();

        /*
         * Anchor origin = person's feet
         */
        this.arModelAnchor.position.set(0, 0, 0);

        this.arModelAnchor.rotation.set(0, 0, 0);

        this.arModelAnchor.visible = false;

        // Add person to anchor
        this.arModelAnchor.add(this.arModel);

        // Add anchor to scene
        this.scene.add(this.arModelAnchor);

        // Force world matrix update
        this.arModelAnchor.updateMatrixWorld(true);

        console.log("AR Model ready.");
      },

      // ===================================================
      // LOADING PROGRESS
      // ===================================================

      undefined,

      // ===================================================
      // LOADING ERROR
      // ===================================================

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
      requiredFeatures: ["hit-test"],

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

    // =================================================
    // SESSION START
    // =================================================

    this.renderer.xr.addEventListener("sessionstart", this.handleSessionStart);

    // =================================================
    // SESSION END
    // =================================================

    this.renderer.xr.addEventListener("sessionend", this.handleSessionEnd);
  }

  // =====================================================
  // SESSION START
  // =====================================================

  handleSessionStart = () => {
    console.log("WebXR session started.");

    // Hide START AR button
    const startButton = document.getElementById("webxr-start-button");

    if (startButton) {
      startButton.style.display = "none";
    }

    // Start hit testing
    this.setupHitTestSource();

    // Tell React
    if (this.onSessionStart) {
      this.onSessionStart();
    }
  };

  // =====================================================
  // SESSION END
  // =====================================================

  handleSessionEnd = () => {
    console.log("WebXR session ended.");

    this.hitTestSource = null;

    this.localReferenceSpace = null;

    if (this.reticle) {
      this.reticle.visible = false;
    }

    if (this.arModelAnchor) {
      this.arModelAnchor.visible = false;
    }

    // Show START AR button again
    const startButton = document.getElementById("webxr-start-button");

    if (startButton) {
      startButton.style.display = "block";
    }

    // Tell React
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
      console.error("No active WebXR session.");

      return;
    }

    try {
      // -----------------------------------------------
      // Viewer reference space
      // -----------------------------------------------

      const viewerSpace = await session.requestReferenceSpace("viewer");

      // -----------------------------------------------
      // Hit test source
      // -----------------------------------------------

      this.hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
      });

      // -----------------------------------------------
      // Local reference space
      // -----------------------------------------------

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

    // -----------------------------------------------
    // Check reticle
    // -----------------------------------------------

    if (!this.reticle.visible) {
      console.log("Cannot place model: no surface detected.");

      return;
    }

    // -----------------------------------------------
    // Check model
    // -----------------------------------------------

    if (!this.arModel) {
      console.log("Cannot place model: AR model is not loaded yet.");

      return;
    }

    // -----------------------------------------------
    // Check anchor
    // -----------------------------------------------

    if (!this.arModelAnchor) {
      console.log("Cannot place model: anchor is not ready.");

      return;
    }

    // -----------------------------------------------
    // Get floor position
    // -----------------------------------------------

    const floorPosition = new THREE.Vector3();

    floorPosition.setFromMatrixPosition(this.reticle.matrix);

    console.log("Detected floor position:", floorPosition);

    // -----------------------------------------------
    // Place anchor
    // -----------------------------------------------

    this.arModelAnchor.position.copy(floorPosition);

    // -----------------------------------------------
    // Reset rotation
    // -----------------------------------------------

    this.arModelAnchor.rotation.set(0, 0, 0);

    // -----------------------------------------------
    // Make model visible
    // -----------------------------------------------

    this.arModel.visible = true;

    this.arModelAnchor.visible = true;

    // -----------------------------------------------
    // Update world matrices
    // -----------------------------------------------

    this.arModel.updateMatrixWorld(true);

    this.arModelAnchor.updateMatrixWorld(true);

    console.log("AR MODEL PLACED SUCCESSFULLY.");

    console.log("Model visible:", this.arModel.visible);

    console.log("Anchor visible:", this.arModelAnchor.visible);

    console.log(
      "Model world position:",
      this.arModel.getWorldPosition(new THREE.Vector3()),
    );
  };

  // =====================================================
  // CAPTURE PHOTO
  // =====================================================

  capturePhoto() {
    if (!this.renderer) {
      throw new Error("Renderer is not available.");
    }

    const canvas = this.renderer.domElement;

    if (!canvas) {
      throw new Error("Renderer canvas not found.");
    }

    try {
      // Render latest frame
      this.renderer.render(this.scene, this.camera);

      // Convert Three.js canvas
      // to PNG
      const image = canvas.toDataURL("image/png");

      if (!image || image === "data:,") {
        throw new Error("Canvas returned an empty image.");
      }

      console.log("Photo captured successfully.");

      return image;
    } catch (error) {
      console.error("Photo capture failed:", error);

      throw error;
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
    // MAKE PERSON FACE CAMERA
    // ===================================================

    if (this.arModelAnchor && this.arModelAnchor.visible) {
      const cameraPosition = new THREE.Vector3();

      this.camera.getWorldPosition(cameraPosition);

      const modelPosition = new THREE.Vector3();

      this.arModelAnchor.getWorldPosition(modelPosition);

      const dx = cameraPosition.x - modelPosition.x;

      const dz = cameraPosition.z - modelPosition.z;

      /*
       * Rotate only around Y.
       */
      this.arModelAnchor.rotation.y = Math.atan2(dx, dz);
    }

    // ===================================================
    // RENDER
    // ===================================================

    this.renderer.render(this.scene, this.camera);
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

    // ---------------------------------------------------
    // Model cleanup
    // ---------------------------------------------------

    if (this.arModel) {
      this.arModel.geometry.dispose();

      if (this.arModel.material.map) {
        this.arModel.material.map.dispose();
      }

      this.arModel.material.dispose();
    }

    // ---------------------------------------------------
    // Reticle cleanup
    // ---------------------------------------------------

    if (this.reticle) {
      this.reticle.geometry.dispose();

      this.reticle.material.dispose();
    }

    // ---------------------------------------------------
    // Renderer cleanup
    // ---------------------------------------------------

    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
