import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

let scene, camera, renderer, flower, pot, videoPlayer, popup;
// --- MODIFICATION --- Added a variable for our new reliable hitbox
let flowerHitbox;
let heartGroup = new THREE.Group();
heartGroup.rotation.x = (-3 * Math.PI) / 4;
heartGroup.userData.rotate = false;
let clock = new THREE.Clock();
let mixer, action;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let flowerInstances = [];
let heartAnimationStarted = false;
let HEART_FORMATION_DELAY = 20;
let SHOW_BDAY_TEXT_DELAY = 2000;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.physicallyCorrectLights = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
  directionalLight.position.set(0, 5, 5);
  directionalLight.castShadow = false;
  scene.add(directionalLight);

  const light2 = new THREE.DirectionalLight(0xffffff, 2.0);
  light2.position.set(-5, 5, 0);
  scene.add(light2);

  const light3 = new THREE.DirectionalLight(0xffffff, 2.0);
  light3.position.set(5, -5, 0);
  scene.add(light3);

  const pointLight = new THREE.PointLight(0xffffff, 3.0, 50);
  pointLight.position.set(0, 3, 2);
  scene.add(pointLight);
  createTitleMessage();
  document.body.appendChild(renderer.domElement);

  createFlower();
  createPot();
  createVideoPlayer();
  createPopup();
  createInvisibleFloor();

  camera.position.z = 5;

  // --- MODIFICATION --- Add event listeners for both Mouse (desktop) and Touch (mobile)
  const canvas = renderer.domElement;

  // Desktop Events
  canvas.addEventListener("mousedown", onMouseDown, false);
  canvas.addEventListener("mousemove", onMouseMove, false);
  canvas.addEventListener("mouseup", onMouseUp, false);
  // Add a listener for when the mouse leaves the window, to prevent a stuck dragging state
  canvas.addEventListener("mouseleave", onMouseUp, false);

  // Mobile Events
  canvas.addEventListener("touchstart", onTouchStart, false);
  canvas.addEventListener("touchmove", onTouchMove, false);
  canvas.addEventListener("touchend", onTouchEnd, false);
  canvas.addEventListener("touchcancel", onTouchEnd, false);

  window.addEventListener("resize", onWindowResize, false);

  animate();
}

function createFlower() {
  const loader = new GLTFLoader();

  loader.load(
    "/happy-birthday/models/model.glb",
    (gltf) => {
      console.log("GLB model loaded successfully");
      flower = gltf.scene;
      flower.scale.set(0.5, 0.5, 0.5);
      flower.position.set(0, 2, 0);
      flower.userData = { shouldMove: false }; // Initialize userData

      flower.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => {
            material.roughness = 0.5;
            material.metalness = 0.0;
            material.needsUpdate = true;
          });
        }
      });
      scene.add(flower);
      console.log("Rose model added to scene");

      // --- MODIFICATION --- Create the invisible hitbox after the flower loads.
      // We wait for the flower to load so we can get its exact size.
      const box = new THREE.Box3().setFromObject(flower);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Create a simple box geometry that matches the flower's dimensions
      const hitboxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      // Make the material invisible. visible: false is more performant than opacity: 0.
      // For debugging, you can use: new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ff00 })
      const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

      flowerHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      // Position the hitbox to match the flower model's center
      flowerHitbox.position.copy(center);
      scene.add(flowerHitbox);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (error) => {
      console.error("Error loading GLB:", error);
    }
  );
}

// ... (createPot and other functions remain the same)
function createPot() {
  const loader = new GLTFLoader();

  loader.load(
    "/happy-birthday/models/pot.glb", // Path to your GLB file

    // onLoad callback
    (gltf) => {
      console.log("Pot GLB model loaded successfully.");
      pot = gltf.scene;

      // --- Position and Scale ---
      // You will likely need to adjust these values to fit your scene.
      pot.position.set(0, -2, 0);
      pot.scale.set(0.005, 0.005, 0.005); // Example: Make it 50% larger

      // --- Enable Shadows and Correct Materials ---
      // Traverse the model to configure its parts.
      pot.traverse((child) => {
        if (child.isMesh) {
          console.log("Found mesh in pot:", child.name);

          // Enable shadows for the pot's mesh
          child.castShadow = true;
          child.receiveShadow = true;

          // Optional: Log the material properties to confirm they are loaded correctly
          if (child.material) {
            console.log("Pot material:", child.material.name);
            console.log("  - Type:", child.material.type); // Should be MeshPhysicalMaterial
            console.log("  - Diffuse Map (Texture):", child.material.map); // Should be a Texture object
          }
        }
      });

      scene.add(pot);
    },

    // onProgress callback
    (xhr) => {
      console.log(`Pot model: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },

    // onError callback
    (error) => {
      console.error(
        "An error happened while loading the pot GLB model:",
        error
      );
      // Fallback to a default pot if loading fails
      createDefaultPotAsFallback();
    }
  );
}

// Keep your fallback function just in case
function createDefaultPotAsFallback() {
  console.warn("Falling back to a default cylinder pot.");
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  pot = new THREE.Mesh(geometry, material);
  pot.position.set(0, -1, 0);
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

  // Create close button (no changes here)
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
  closeButton.onclick = async () => {
    container.style.display = "none";
    const player = document.getElementById("youtubePlayer");
    if (player && player.contentWindow) {
      player.contentWindow.postMessage(
        '{"event":"command","func":"stopVideo","args":""}',
        "*"
      );
    }
    await createHeartFlowerRing();
  };

  // --- MODIFICATIONS ARE HERE ---

  // 1. Create the new wrapper for aspect ratio control
  const aspectRatioWrapper = document.createElement("div");
  aspectRatioWrapper.className = "video-aspect-ratio-wrapper";

  // 2. Create the iframe WITHOUT fixed width and height
  const iframe = document.createElement("iframe");
  iframe.id = "youtubePlayer";
  iframe.src = "https://www.youtube.com/embed/0SnwZtj61S4?enablejsapi=1";
  iframe.allow =
    "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
  // The frameBorder="0" is handled by the CSS `border: 0;` but we can leave it
  iframe.frameBorder = "0";

  // 3. Build the new structure
  aspectRatioWrapper.appendChild(iframe); // Put iframe inside the new wrapper
  container.appendChild(closeButton);
  container.appendChild(aspectRatioWrapper); // Put the wrapper inside the main container

  // --- END OF MODIFICATIONS ---

  document.body.appendChild(container);
  videoPlayer = container;
}

async function createHeartFlowerRing() {
  if (!flower) {
    console.warn("Original flower not available");
    return;
  }

  const flowerCount = 50;
  const scaleFactor = 3;

  const heartPositions = [];

  for (let i = 0; i < flowerCount; i++) {
    const t = (i / flowerCount) * Math.PI * 2;
    const x = scaleFactor * 16 * Math.pow(Math.sin(t), 3);
    const z =
      scaleFactor *
      (13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t));
    heartPositions.push(new THREE.Vector3(x * 0.05, 0, z * 0.05));
  }

  // Initially place all flowers at the bottom center of the screen
  const yStart = -3;
  for (let i = 0; i < flowerCount; i++) {
    const miniFlower = flower.clone();
    miniFlower.position.set(0, yStart, 0);
    miniFlower.scale.set(0.2, 0.2, 0.2);
    heartGroup.add(miniFlower);
    flowerInstances.push(miniFlower);
  }

  scene.add(heartGroup);
  // Also remove the hitbox when removing the flower
  if (flower) scene.remove(flower);
  if (flowerHitbox) scene.remove(flowerHitbox);
  if (pot) scene.remove(pot);

  // Now move flowers to the heart path one by one with delay
  await animateHeartFormation(heartPositions);
}

async function animateHeartFormation(positions) {
  if (heartAnimationStarted) return;
  heartAnimationStarted = true;

  for (let i = 0; i < positions.length; i++) {
    const flower = flowerInstances[i];
    if (!flower) continue;

    const pos = positions[i];
    flower.position.set(pos.x, pos.y, pos.z);

    // Point outward from center of heart
    const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
    const lookTarget = new THREE.Vector3().addVectors(pos, dir);
    flower.lookAt(lookTarget);

    await new Promise((res) => setTimeout(res, HEART_FORMATION_DELAY));
  }

  // Wait additional time for smooth rendering before showing message
  setTimeout(() => {
    createBirthdayMessage();
    heartGroup.userData.rotate = true; // Allow rotation after message is shown
  }, SHOW_BDAY_TEXT_DELAY);
}

function createBirthdayMessage() {
  const message = document.createElement("div");
  message.style.position = "fixed";
  message.style.top = "20%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%)";
  message.style.color = "#FF1493";
  message.style.fontSize = "36px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.textAlign = "center";
  message.style.zIndex = "999";
  message.innerHTML = "Happy Birthday!<br>Bangaarammmmmm!!!!!";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
  message.style.opacity = "0";
  message.style.transition = "opacity 2s ease-in-out";
  document.body.appendChild(message);
  setTimeout(() => {
    message.style.opacity = "1";
  }, 100);
}

function createTitleMessage() {
  const message = document.createElement("div");
  message.id = "titleMessage";
  message.style.position = "fixed";
  message.style.top = "50%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%)";
  message.style.color = "#FF1493";
  message.style.fontSize = "48px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.textAlign = "center";
  message.style.zIndex = "999";
  message.innerHTML = "Save the Flower";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
  message.style.opacity = "0";
  message.style.transition = "opacity 2s ease-in-out";
  document.body.appendChild(message);
  setTimeout(() => {
    message.style.opacity = "1";
  }, 100);
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
    const player = document.getElementById("youtubePlayer");
    if (player && player.contentWindow) {
      player.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        "*"
      );
    }
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
  floor.name = "invisibleFloor";
  scene.add(floor);
}

// --- MODIFICATION --- Consolidated event handling logic
function handleInteractionStart(clientX, clientY) {
  if (!flower || !flower.userData || !flowerHitbox) return;

  const title = document.getElementById("titleMessage");
  if (title && title.style.display !== "none") {
    title.style.opacity = "0";
    setTimeout(() => {
      title.style.display = "none";
    }, 2000);
  }

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  // --- MODIFICATION --- Intersect with the reliable hitbox, not the complex flower model
  const intersects = raycaster.intersectObject(flowerHitbox);

  if (intersects.length > 0) {
    console.log("Flower hitbox clicked");
    flower.userData.shouldMove = true;
  }
}

function handleInteractionMove(clientX, clientY) {
  if (
    !flower ||
    !flower.userData ||
    !flower.userData.shouldMove ||
    !flowerHitbox
  )
    return;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const floor = scene.getObjectByName("invisibleFloor");

  if (floor) {
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      const newY = intersects[0].point.y;
      flower.position.y = newY;
      // --- MODIFICATION --- Make sure the hitbox moves with the flower
      flowerHitbox.position.y = newY;
    }
  }
}

function handleInteractionEnd() {
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  flower.userData.shouldMove = false;
  console.log("Interaction ended, checking for collision...");
  handleCollisionAndSnap();
}

// --- MODIFICATION --- Specific event listener functions for clarity
function onMouseDown(event) {
  handleInteractionStart(event.clientX, event.clientY);
}

function onMouseMove(event) {
  handleInteractionMove(event.clientX, event.clientY);
}

function onMouseUp() {
  handleInteractionEnd();
}

function onTouchStart(event) {
  // Prevent the default touch action (like page zoom)
  event.preventDefault();
  const touch = event.touches[0];
  handleInteractionStart(touch.clientX, touch.clientY);
}

function onTouchMove(event) {
  // --- MODIFICATION --- This is the key to preventing "pull-to-refresh" on mobile
  event.preventDefault();
  const touch = event.touches[0];
  handleInteractionMove(touch.clientX, touch.clientY);
}

function onTouchEnd() {
  handleInteractionEnd();
}

function handleCollisionAndSnap() {
  if (!flower || !pot || !flowerHitbox) return;

  // We can use the hitbox for collision detection as well for consistency
  const flowerBox = new THREE.Box3().setFromObject(flowerHitbox);
  const potBox = new THREE.Box3().setFromObject(pot);

  if (flowerBox.intersectsBox(potBox)) {
    console.log("Collision Detected! The flower has been placed in the pot.");

    const potTopY = pot.position.y + 0.25;
    flower.position.x = pot.position.x;
    flower.position.z = pot.position.z;
    flower.position.y = potTopY + 0.5;

    // --- MODIFICATION --- Also snap the hitbox to the final position
    flowerHitbox.position.copy(flower.position);

    popup.style.display = "block";

    // Disable further interaction
    flower.userData.shouldMove = false;
    // To be absolutely sure, we can remove the hitbox
    scene.remove(flowerHitbox);
    flowerHitbox = null; // Clean up
  } else {
    console.log("No collision. The flower was not placed in the pot.");
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (heartGroup && heartGroup.userData.rotate) {
    setTimeout(() => {
      heartGroup.rotation.z += 0.005;
    }, 1500);
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();

export { scene, camera, renderer, flower, pot, videoPlayer, popup };
