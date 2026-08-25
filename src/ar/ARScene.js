import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

export class ARScene {
  constructor(container) {
    this.container = container;

    // Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // WebXR
    this.controller = null;
    this.hitTestSource = null;
    this.localReferenceSpace = null;

    // AR objects
    this.reticle = null;
    this.testCube = null;

    this.init();
  }

  // =========================================================
  // INITIALIZE
  // =========================================================

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();

    this.createReticle();
    this.createTestCube();

    this.createController();
    this.createARButton();

    window.addEventListener("resize", this.handleResize);

    this.renderer.setAnimationLoop(this.render);
  }

  // =========================================================
  // SCENE
  // =========================================================

  createScene() {
    this.scene = new THREE.Scene();
  }

  // =========================================================
  // CAMERA
  // =========================================================

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20,
    );

    this.camera.position.set(0, 0, 0);
  }

  // =========================================================
  // RENDERER
  // =========================================================

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Enable WebXR
    this.renderer.xr.enabled = true;

    // Better image colors
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Shadows
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);
  }

  // =========================================================
  // LIGHTS
  // =========================================================

  createLights() {
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);

    this.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);

    directionalLight.position.set(1, 3, 2);

    directionalLight.castShadow = true;

    this.scene.add(directionalLight);
  }

  // =========================================================
  // RETICLE
  // =========================================================

  createReticle() {
    const geometry = new THREE.RingGeometry(0.08, 0.1, 32);

    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    this.reticle = new THREE.Mesh(geometry, material);

    // Lay the ring flat on the detected surface
    this.reticle.rotation.x = -Math.PI / 2;

    // We manually update its position
    this.reticle.matrixAutoUpdate = false;

    this.reticle.visible = false;

    this.scene.add(this.reticle);
  }

  // =========================================================
  // TEST CUBE
  // =========================================================

  createTestCube() {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x007bff,
    });

    this.testCube = new THREE.Mesh(geometry, material);

    this.testCube.castShadow = true;
    this.testCube.receiveShadow = true;

    // Don't show until the user places it
    this.testCube.visible = false;

    this.scene.add(this.testCube);
  }

  // =========================================================
  // CONTROLLER
  // =========================================================

  createController() {
    this.controller = this.renderer.xr.getController(0);

    this.controller.addEventListener("select", this.onSelect);

    this.scene.add(this.controller);
  }

  // =========================================================
  // AR BUTTON
  // =========================================================

  createARButton() {
    const arButton = ARButton.createButton(this.renderer, {
      requiredFeatures: ["hit-test"],
    });

    // Bootstrap-like appearance
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

    arButton.style.cursor = "pointer";

    this.container.appendChild(arButton);

    // WebXR session events
    this.renderer.xr.addEventListener("sessionstart", this.setupHitTestSource);

    this.renderer.xr.addEventListener("sessionend", this.onSessionEnd);
  }

  // =========================================================
  // SETUP HIT TEST
  // =========================================================

  setupHitTestSource = async () => {
    const session = this.renderer.xr.getSession();

    if (!session) {
      console.error("WebXR session not found.");

      return;
    }

    try {
      // Reference space from the user's viewpoint
      const viewerSpace = await session.requestReferenceSpace("viewer");

      // Create hit-test source
      this.hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
      });

      // World/local reference space
      this.localReferenceSpace = await session.requestReferenceSpace("local");

      console.log("WebXR hit-test is ready.");
    } catch (error) {
      console.error("Failed to create hit-test source:", error);
    }
  };

  // =========================================================
  // USER SELECT / TAP
  // =========================================================

  onSelect = () => {
    // Don't place anything if no surface
    // has been detected.
    if (!this.reticle.visible) {
      return;
    }

    // Get position from reticle
    const position = new THREE.Vector3();

    position.setFromMatrixPosition(this.reticle.matrix);

    // Place cube on detected surface
    this.testCube.position.copy(position);

    // Keep cube sitting on the floor.
    // Cube height = 0.2m,
    // so move it up by 0.1m.
    this.testCube.position.y += 0.1;

    // Show cube
    this.testCube.visible = true;

    console.log("Cube placed:", this.testCube.position);
  };

  // =========================================================
  // RENDER LOOP
  // =========================================================

  render = (timestamp, frame) => {
    if (frame && this.hitTestSource && this.localReferenceSpace) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];

        const pose = hit.getPose(this.localReferenceSpace);

        if (pose) {
          // Show reticle
          this.reticle.visible = true;

          // Move reticle to detected surface
          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        // No surface detected
        this.reticle.visible = false;
      }
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  // =========================================================
  // SESSION END
  // =========================================================

  onSessionEnd = () => {
    console.log("WebXR session ended.");

    this.hitTestSource = null;
    this.localReferenceSpace = null;

    this.reticle.visible = false;

    this.testCube.visible = false;
  };

  // =========================================================
  // WINDOW RESIZE
  // =========================================================

  handleResize = () => {
    if (!this.camera || !this.renderer) {
      return;
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // =========================================================
  // CLEANUP
  // =========================================================

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

    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
