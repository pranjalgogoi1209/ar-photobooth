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
        texture.colorSpace = THREE.SRGBColorSpace;

        const image = texture.image;

        const aspectRatio = image.width / image.height;

        const height = this.modelHeight;

        const width = height * aspectRatio;

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
         * Plane is centered.
         *
         * Move it upward by half
         * its height so its bottom
         * represents the person's feet.
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

        console.log("AR Model loaded");

        console.log("Model height:", height, "meters");
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

    // -------------------------------------------------
    // SESSION START
    // -------------------------------------------------

    this.renderer.xr.addEventListener("sessionstart", this.handleSessionStart);

    // -------------------------------------------------
    // SESSION END
    // -------------------------------------------------

    this.renderer.xr.addEventListener("sessionend", this.handleSessionEnd);
  }

  // =====================================================
  // SESSION START
  // =====================================================

  handleSessionStart = () => {
    console.log("WebXR session started");

    /*
     * Hide START AR button.
     *
     * CameraPage will now show
     * the Capture button.
     */
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
    console.log("WebXR session ended");

    this.hitTestSource = null;

    this.localReferenceSpace = null;

    if (this.reticle) {
      this.reticle.visible = false;
    }

    if (this.arModelAnchor) {
      this.arModelAnchor.visible = false;
    }

    /*
     * Show START AR again.
     */
    const startButton = document.getElementById("webxr-start-button");

    if (startButton) {
      startButton.style.display = "block";
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

      console.log("Hit-test ready");
    } catch (error) {
      console.error("Hit-test setup failed:", error);
    }
  };

  // =====================================================
  // PLACE MODEL
  // =====================================================

  onSelect = () => {
    if (!this.reticle.visible || !this.arModelAnchor) {
      return;
    }

    const floorPosition = new THREE.Vector3();

    floorPosition.setFromMatrixPosition(this.reticle.matrix);

    /*
     * Put the anchor on the floor.
     */
    this.arModelAnchor.position.copy(floorPosition);

    /*
     * Show the person.
     */
    this.arModelAnchor.visible = true;

    console.log("AR Model placed at floor:", floorPosition);
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
      /*
       * Render latest frame.
       */
      this.renderer.render(this.scene, this.camera);

      /*
       * Convert canvas to PNG.
       */
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

    /*
     * Keep the AR model in the same
     * location.
     *
     * User can take another photo.
     */
    if (this.arModelAnchor) {
      this.arModelAnchor.visible = true;
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

    // Model cleanup
    if (this.arModel) {
      this.arModel.geometry.dispose();

      if (this.arModel.material.map) {
        this.arModel.material.map.dispose();
      }

      this.arModel.material.dispose();
    }

    // Reticle cleanup
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
