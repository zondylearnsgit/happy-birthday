`
This code creates a simple 3D scene, where a single flower is generated on top of the screen middle of the width, and at the bottom a pot is created in the middle of the screen \
the flower's user data is set to draggable, allowing it to move around the scene. An invisible plane is behind the flower, on which it can be dragged using the intersection point. only it's vertical position is updated which is dragged into the bpot.
This flower and pot collision is recognised and then a pop up comes saying.. Wow you gave me a new life. Are you the one who loves noodles, biryani and chocolate cake? A guy passing by told me that he loves that person so much and that she will save me.
Thanl you soo much for giving me a new life. He also left a message for you. 
CLick on this onk to view it. This link opens a video player, in which my happy birthday message will play, mp4.

As soon as the video ends, the pops closes, both video and message, then with the flowers, a cute hemisphere of flowers if formed
and a nice animate happy birthday message is displayed on the screen.
`;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

let scene, camera, renderer, flower, pot, videoPlayer, popup;
let clock = new THREE.Clock();
let mixer, action;
let isDragging = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let videoTexture, videoMaterial;
let video = document.createElement("video");

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue background

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Essential settings for Physical materials (PBR)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.physicallyCorrectLights = true;

  // Try much brighter lighting to see if it's a lighting issue
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Very bright ambient
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0); // Very bright directional
  directionalLight.position.set(0, 5, 5); // Closer position
  directionalLight.castShadow = false; // Disable shadows for debugging
  scene.add(directionalLight);

  // Add multiple lights from different angles
  const light2 = new THREE.DirectionalLight(0xffffff, 2.0);
  light2.position.set(-5, 5, 0);
  scene.add(light2);

  const light3 = new THREE.DirectionalLight(0xffffff, 2.0);
  light3.position.set(5, -5, 0);
  scene.add(light3);

  // Add a very bright point light near the flower
  const pointLight = new THREE.PointLight(0xffffff, 3.0, 50);
  pointLight.position.set(0, 3, 2);
  scene.add(pointLight);

  document.body.appendChild(renderer.domElement);

  createFlower();
  createPot();
  createVideoPlayer();
  createPopup();
  createInvisibleFloor();

  camera.position.z = 5;

  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousedown", onMouseDown, false);
  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("mouseup", onMouseUp, false);

  animate();
}

function createFlower() {
  const loader = new GLTFLoader();

  // Load the GLB file directly - no need for separate textures
  loader.load(
    "/models/model.glb", // Updated path to your GLB file
    (gltf) => {
      console.log("GLB model loaded successfully");
      console.log("Model structure:", gltf.scene);

      flower = gltf.scene;
      flower.scale.set(0.5, 0.5, 0.5); // Reduced scale
      flower.position.set(0, 2, 0);

      // Initialize the userData object properly
      flower.userData = { shouldMove: false };

      // Debug materials and try to fix them
      flower.traverse((child) => {
        if (child.isMesh) {
          console.log("=== MESH DEBUG ===");
          console.log("Mesh name:", child.name);
          console.log("Material:", child.material);
          console.log("Geometry:", child.geometry);

          // Enable shadows
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((material, index) => {
              console.log(`=== MATERIAL ${index} DEBUG ===`);
              console.log("Type:", material.type);
              console.log("Color:", material.color);
              console.log("Map:", material.map);
              console.log("Roughness:", material.roughness);
              console.log("Metalness:", material.metalness);
              console.log("Opacity:", material.opacity);
              console.log("Transparent:", material.transparent);

              // Force material properties for debugging
              if (
                material.type === "MeshStandardMaterial" ||
                material.type === "MeshPhysicalMaterial"
              ) {
                // Try forcing a bright red color to see if it's a texture issue
                // material.color.setHex(0xff0000); // Force bright red
                material.roughness = 0.5;
                material.metalness = 0.0;
                material.needsUpdate = true;

                if (material.map) {
                  material.map.colorSpace = THREE.SRGBColorSpace;
                  material.map.needsUpdate = true;
                  console.log(
                    "Texture dimensions:",
                    material.map.image?.width,
                    "x",
                    material.map.image?.height
                  );
                } else {
                  console.log("NO TEXTURE FOUND - this might be the issue!");
                }
              }

              // If it's any other material type, convert it
              if (material.type === "MeshBasicMaterial") {
                console.log(
                  "Found MeshBasicMaterial - this might be the issue"
                );
                // Basic materials don't respond to lights
                material.color.setHex(0xff0000);
                material.needsUpdate = true;
              }
            });
          }
        }
      });

      // Create a bounding box for collision detection
      const box = new THREE.Box3().setFromObject(flower);
      flower.userData.boundingBox = box;

      scene.add(flower);
      console.log("Rose model added to scene");
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (error) => {
      console.error("Error loading GLB:", error);
      console.error(
        "Make sure the file path '/models/red_rose.glb' is correct"
      );
    }
  );
}

// Removed setupMaterial function as it's now handled inline

function createPot() {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.1,
  }); // Changed to Standard for PBR consistency
  pot = new THREE.Mesh(geometry, material);
  pot.position.set(0, -1, 0);
  pot.castShadow = true;
  pot.receiveShadow = true;

  scene.add(pot);
}

function createVideoPlayer() {
  // Create a container for video and close button
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "50%";
  container.style.left = "50%";
  container.style.transform = "translate(-50%, -50%)";
  container.style.display = "none";
  container.id = "videoContainer";
  container.style.zIndex = "1000";

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.position = "absolute";
  closeButton.style.right = "-10px";
  closeButton.style.top = "-10px";
  closeButton.style.backgroundColor = "red";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "50%";
  closeButton.style.width = "30px";
  closeButton.style.height = "30px";
  closeButton.style.cursor = "pointer";
  closeButton.style.zIndex = "1001";
  closeButton.onclick = () => {
    container.style.display = "none";
    createFlowerHemisphere();
  };

  const iframe = document.createElement("iframe");
  iframe.id = "youtubePlayer";
  iframe.width = "640";
  iframe.height = "360";
  iframe.src = "https://www.youtube.com/embed/0SnwZtj61S4?enablejsapi=1";
  iframe.allow =
    "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
  iframe.frameBorder = "0";

  container.appendChild(closeButton);
  container.appendChild(iframe);
  document.body.appendChild(container);
  videoPlayer = container;
}

function createFlowerHemisphere() {
  if (!flower) {
    console.warn("Original flower not loaded yet");
    return;
  }

  const radius = 2;
  const flowerCount = 30; // Reduced count for better performance

  for (let i = 0; i < flowerCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / flowerCount);
    const theta = Math.sqrt(flowerCount * Math.PI) * phi;

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = Math.abs(radius * Math.sin(theta) * Math.sin(phi)); // Keep positive Y for hemisphere
    const z = radius * Math.cos(phi);

    const miniFlower = flower.clone();
    miniFlower.position.set(x, y, z);
    miniFlower.scale.set(0.2, 0.2, 0.2); // Smaller flowers
    miniFlower.lookAt(0, 0, 0);
    scene.add(miniFlower);
  }

  createBirthdayMessage();
}

function createBirthdayMessage() {
  const message = document.createElement("div");
  message.style.position = "fixed";
  message.style.top = "20%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%)";
  message.style.color = "#FF1493";
  message.style.fontSize = "48px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.textAlign = "center";
  message.style.zIndex = "999";
  message.innerHTML = "Happy Birthday!<br>🎉🎂✨";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
  message.style.animation = "pulse 2s infinite";

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(message);
}

function createPopup() {
  popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "white";
  popup.style.padding = "20px";
  popup.style.border = "2px solid black";
  popup.style.borderRadius = "10px";
  popup.style.display = "none";
  popup.style.zIndex = "999";
  popup.style.maxWidth = "400px";
  popup.style.textAlign = "center";
  popup.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

  const message = document.createElement("p");
  message.textContent =
    "Wow you gave me a new life! Are you the one who loves noodles, biryani and chocolate cake? A guy passing by told me that he loves that person so much and that she will save me. Thank you so much for giving me a new life. He also left a message for you.";
  message.style.marginBottom = "15px";

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = "Click here to view the message";
  link.style.color = "#007bff";
  link.style.textDecoration = "underline";
  link.onclick = () => {
    videoPlayer.style.display = "block";
    popup.style.display = "none";
    return false;
  };

  popup.appendChild(message);
  popup.appendChild(link);
  document.body.appendChild(popup);
}

function createInvisibleFloor() {
  const geometry = new THREE.PlaneGeometry(10, 10);
  const material = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.position.y = -2;
  floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  floor.name = "invisibleFloor";
  scene.add(floor);
}

function onMouseDown(event) {
  if (!flower || !flower.userData) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(flower, true); // Recursive check

  if (intersects.length > 0) {
    console.log("Flower clicked");
    flower.userData.shouldMove = true;
  }
}

function onMouseMove(event) {
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const floor = scene.getObjectByName("invisibleFloor");

  if (floor) {
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      const newY = intersects[0].point.y;
      flower.position.y = Math.max(newY + 1, -0.5);
    }
  }
}

function onMouseUp() {
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  flower.userData.shouldMove = false;

  const SNAP_THRESHOLD = 0.75;
  const potTopY = pot.position.y + 0.25;

  const flowerBox = new THREE.Box3().setFromObject(flower);
  const potBox = new THREE.Box3().setFromObject(pot);

  if (flowerBox.intersectsBox(potBox)) {
    flower.position.y = potTopY + 0.5;
    flower.position.x = pot.position.x;
    flower.position.z = pot.position.z;
    popup.style.display = "block";
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize the scene
init();

// Export for other modules
export { scene, camera, renderer, flower, pot, videoPlayer, popup };
