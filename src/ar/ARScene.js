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

    // This is the floor anchor
    this.arModelAnchor = null;

    // This is the actual person image
    this.arModel = null;

    // =====================================================
    // AR MODEL SETTINGS
    // =====================================================

    // Change this to control real-world height.
    // Try 2.0 or 2.1 if you want a larger person.
    this.modelHeight = 2.0;

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

        // -----------------------------------------------
        // REAL WORLD HEIGHT
        // -----------------------------------------------

        const height = this.modelHeight;

        const width = height * aspectRatio;

        // -----------------------------------------------
        // PERSON PLANE
        // -----------------------------------------------

        const geometry = new THREE.PlaneGeometry(width, height);

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,

          // Important for transparent PNG
          depthWrite: false,

          // Slightly better transparency
          alphaTest: 0.01,
        });

        this.arModel = new THREE.Mesh(geometry, material);

        /*
         * IMPORTANT:
         *
         * The plane is centered at its origin.
         *
         * Move the IMAGE upward by half
         * its height.
         *
         * Therefore:
         *
         * anchor = floor
         * image bottom = floor
         */
        this.arModel.position.set(0, height / 2, 0);

        this.arModel.visible = true;

        // -----------------------------------------------
        // FLOOR ANCHOR GROUP
        // -----------------------------------------------

        this.arModelAnchor = new THREE.Group();

        /*
         * The group's origin is the floor.
         */
        this.arModelAnchor.position.set(0, 0, 0);

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
    });

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

    this.container.appendChild(arButton);

    this.renderer.xr.addEventListener("sessionstart", this.setupHitTestSource);

    this.renderer.xr.addEventListener("sessionend", this.onSessionEnd);
  }

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

    // -----------------------------------------------
    // Get detected floor position
    // -----------------------------------------------

    const floorPosition = new THREE.Vector3();

    floorPosition.setFromMatrixPosition(this.reticle.matrix);

    // -----------------------------------------------
    // IMPORTANT:
    //
    // Put the GROUP on the floor.
    //
    // NOT the image itself.
    // -----------------------------------------------

    this.arModelAnchor.position.copy(floorPosition);

    // -----------------------------------------------
    // Make model visible
    // -----------------------------------------------

    this.arModelAnchor.visible = true;

    console.log("AR Model placed at floor:", floorPosition);
  };

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

      /*
       * We only rotate around Y.
       *
       * This keeps the person's feet
       * on the floor.
       */

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
  // SESSION END
  // =====================================================

  onSessionEnd = () => {
    console.log("AR session ended");

    this.hitTestSource = null;

    this.localReferenceSpace = null;

    if (this.reticle) {
      this.reticle.visible = false;
    }

    if (this.arModelAnchor) {
      this.arModelAnchor.visible = false;
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
      this.setupHitTestSource,
    );

    this.renderer.xr.removeEventListener("sessionend", this.onSessionEnd);

    if (this.controller) {
      this.controller.removeEventListener("select", this.onSelect);
    }

    this.renderer.setAnimationLoop(null);

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
