import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

let scene, camera, renderer, flower, pot, videoPlayer, popup;
let heartGroup = new THREE.Group();
heartGroup.rotation.x = (-3 * Math.PI) / 4; // Rotate to face upwards
heartGroup.userData.rotate = false; // Flag to control rotation
let clock = new THREE.Clock();
let mixer, action;
let isDragging = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let videoTexture, videoMaterial;
let video = document.createElement("video");

// Step 1: Add an async function to handle heart flower animation

let flowerInstances = [];
let heartAnimationStarted = false;
let HEART_FORMATION_DELAY = 20; // milliseconds delay between each rose
let SHOW_BDAY_TEXT_DELAY = 2000; // total delay to show birthday message

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Sky blue background

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10); // Adjusted camera position for better view
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
  createTitleMessage();
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
    "/happy-birthday/models/model.glb", // Updated path to your GLB file
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

/**
 * Loads the pot.glb model, which uses a Physical material, and adds it to the scene.
 * This function relies on the renderer and lighting being correctly set up for PBR.
 */
function createPot() {
  const loader = new GLTFLoader();

  loader.load(
    "/models/pot.glb", // Path to your GLB file

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

async function createHeartFlowerRing() {
  if (!flower || !flower.userData.boundingBox) {
    console.warn("Original flower or bounding box not available");
    return;
  }

  const flowerCount = 50;
  const scaleFactor = 4;

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
  scene.remove(flower);
  scene.remove(pot);

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
  message.style.fontSize = "48px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.textAlign = "center";
  message.style.zIndex = "999";
  message.innerHTML = "Happy Birthday!<br>Bangaarammmmmmmmmmmm!!!!!";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";

  // --- CHANGES ARE HERE ---
  // Set initial opacity to 0 for fade-in effect
  message.style.opacity = "0";
  // Add a smooth transition for the opacity property
  message.style.transition = "opacity 2s ease-in-out";

  // Remove the wobbling animation by commenting it out or deleting it
  // message.style.animation = "pulse 2s infinite";

  // Add CSS animation - we are keeping the style block in case you want other animations later,
  // but the 'pulse' keyframes are no longer applied.
  const style = document.createElement("style");
  style.textContent = `
    /* The pulse animation is no longer used, but we keep the style block */
    @keyframes pulse {
      0% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(message);

  // After a short delay, change the opacity to 1 to trigger the fade-in
  setTimeout(() => {
    message.style.opacity = "1";
  }, 100); // A small delay ensures the transition is applied correctly
  // --- END OF CHANGES ---
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

  // --- CHANGES ARE HERE ---
  // Set initial opacity to 0 for fade-in effect
  message.style.opacity = "0";
  // Add a smooth transition for the opacity property
  message.style.transition = "opacity 2s ease-in-out";

  // Remove the wobbling animation by commenting it out or deleting it
  // message.style.animation = "pulse 2s infinite";

  // Add CSS animation - we are keeping the style block in case you want other animations later,
  // but the 'pulse' keyframes are no longer applied.
  const style = document.createElement("style");
  style.textContent = `
    /* The pulse animation is no longer used, but we keep the style block */
    @keyframes pulse {
      0% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(message);

  // After a short delay, change the opacity to 1 to trigger the fade-in
  setTimeout(() => {
    message.style.opacity = "1";
  }, 100); // A small delay ensures the transition is applied correctly
  // --- END OF CHANGES ---
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

function onMouseDown(event) {
  if (!flower || !flower.userData) return;
  let title = document.getElementById("titleMessage");
  if (title) {
    title.style.display = "none"; // Hide the title message on flower click
    title.style.opacity = "0"; // Start fade-out effect
    setTimeout(() => {
      title.style.display = "none"; // Ensure it's hidden after fade-out
    }, 2000); // Match this duration to the CSS transition duration
  }

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
      flower.position.y = newY;
    }
  }
}

function handleCollisionAndSnap() {
  // Ensure both flower and pot are loaded before proceeding
  if (!flower || !pot) return;

  // 1. Create bounding boxes for collision detection
  const flowerBox = new THREE.Box3().setFromObject(flower);
  const potBox = new THREE.Box3().setFromObject(pot);

  // 2. (Optional) Create visual helpers to debug the bounding boxes
  // These helpers draw a wireframe box around the objects.
  // const flowerHelper = new THREE.Box3Helper(flowerBox, 0xff0000); // Red for flower
  // scene.add(flowerHelper);

  // const potHelper = new THREE.Box3Helper(potBox, 0x00ff00); // Green for pot
  // scene.add(potHelper);

  // 3. Check if the bounding boxes are intersecting
  if (flowerBox.intersectsBox(potBox)) {
    // Log a success message to the console
    console.log("Collision Detected! The flower has been placed in the pot.");

    // 4. Snap the flower into position on top of the pot
    const potTopY = pot.position.y + 0.25; // Top surface of the pot
    flower.position.x = pot.position.x;
    flower.position.z = pot.position.z;

    // NOTE: The original value `potTopY - 3` would place the flower far below the pot.
    // A value like `potTopY + 0.5` (adjust as needed) will place it correctly inside.
    flower.position.y = potTopY + 0.5;

    // 5. Display the popup message
    popup.style.display = "block";

    // Optional: Disable further dragging after successful placement
    flower.userData.isDraggable = false;
  } else {
    // Log a message if no collision occurred
    console.log("No collision. The flower was not placed in the pot.");

    // Optional: Remove the helpers if you only want to see them on a failed attempt
    // setTimeout(() => {
    //   scene.remove(flowerHelper);
    //   scene.remove(potHelper);
    // }, 2000); // Remove after 2 seconds
  }
}
function onMouseUp() {
  // Exit if the flower isn't being dragged
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  // Stop the dragging state
  flower.userData.shouldMove = false;
  console.log("Mouse released, checking for collision...");

  // Call the dedicated function to handle collision logic
  handleCollisionAndSnap();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (heartGroup && heartGroup.userData.rotate) {
    setTimeout(() => {
      heartGroup.rotation.z += 0.005; // Adjust the value to change rotation speed
    }, 1500); // Delay to allow for smoother animation
    // heartGroup.rotation.y += 0.005; // Adjust the value to change rotation speed
  }

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
