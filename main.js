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
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  const textureLoader = new THREE.TextureLoader();

  const roseTexture = textureLoader.load(
    "/red_rose/textures/Red_rose_diffuse.jpeg",
    (texture) => {
      console.log("Texture loaded successfully");
    },
    undefined,
    (error) => {
      console.error("Error loading texture:", error);
    }
  );

  loader.load(
    "/red_rose/scene.gltf",
    (gltf) => {
      gltf.scene.scale.set(0.5, 0.5, 0.5); // Reduced scale
      gltf.scene.position.set(0, 2, 0);

      flower = gltf.scene;
      // Initialize the userData object properly
      flower.userData = { shouldMove: false };
      flower.texture = THREE.SRGBColorSpace;

      // Add bounding box for collision detection
      flower.geometry = new THREE.BoxGeometry(1, 1, 1); // Approximate size
      flower.geometry.computeBoundingBox();

      flower.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({
            map: roseTexture,
            transparent: true,
            opacity: 1,
          });
        }
      });

      scene.add(flower);
      console.log("Rose model loaded successfully");
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (error) => {
      console.error("Error loading GLTF:", error);
    }
  );
}

function createPot() {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
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

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×"; // × is the multiplication symbol, looks like a close icon
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
  closeButton.style.zIndex = "1000";
  closeButton.onclick = () => {
    container.style.display = "none";
    createFlowerHemisphere(); // Create the flower animation
  };

  const iframe = document.createElement("iframe");
  iframe.id = "youtubePlayer";
  iframe.width = "640";
  iframe.height = "360";
  iframe.src = "https://www.youtube.com/embed/0SnwZtj61S4?enablejsapi=1";
  iframe.allow =
    "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
  iframe.frameBorder = "0";

  // Add iframe and close button to container
  container.appendChild(closeButton);
  container.appendChild(iframe);
  document.body.appendChild(container);
  videoPlayer = container; // Update videoPlayer reference to container
}

// Add this function to create the flower hemisphere
function createFlowerHemisphere() {
  const radius = 2;
  const flowerCount = 50;

  for (let i = 0; i < flowerCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / flowerCount);
    const theta = Math.sqrt(flowerCount * Math.PI) * phi;

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    const miniFlower = flower.clone();
    miniFlower.position.set(x, y, z);
    miniFlower.lookAt(0, 0, 0);
    scene.add(miniFlower);
  }

  // Add birthday message after flowers
  createBirthdayMessage();
}

// Add this function to create the birthday message
function createBirthdayMessage() {
  const message = document.createElement("div");
  message.style.position = "fixed";
  message.style.top = "50%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%)";
  message.style.color = "#FF1493";
  message.style.fontSize = "48px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.textAlign = "center";
  message.innerHTML = "Happy Birthday!<br>🎉🎂✨";
  message.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
  document.body.appendChild(message);
}

// Update the link click handler in createPopup
function createPopup() {
  popup = document.createElement("div");
  popup.style.position = "absolute";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "white";
  popup.style.padding = "20px";
  popup.style.border = "2px solid black";
  popup.style.display = "none";

  const message = document.createElement("p");
  message.textContent =
    "Wow you gave me a new life. Are you the one who loves noodles, biryani and chocolate cake? A guy passing by told me that he loves that person so much and that she will save me. Thank you so much for giving me a new life. He also left a message for you.";

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = "Click here to view the message";
  link.onclick = () => {
    videoPlayer.style.display = "block"; // This now shows the container
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
  floor.name = "invisibleFloor";
  scene.add(floor);
}

function onMouseDown(event) {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(flower); // Changed to only check flower

  if (intersects.length > 0) {
    console.log("Flower clicked");
    flower.userData.shouldMove = true;
  }
}

function onMouseMove(event) {
  // Check if flower exists and has userData
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(
    scene.getObjectByName("invisibleFloor")
  );

  if (intersects.length > 0) {
    const newY = intersects[0].point.y;
    flower.position.y = Math.max(newY + 1, -0.5);
  }
}

function onMouseUp() {
  // Check if flower exists and has userData
  if (!flower || !flower.userData || !flower.userData.shouldMove) return;

  flower.userData.shouldMove = false;

  // Use box collision instead of geometry parameters
  const SNAP_THRESHOLD = 0.75;
  const potTopY = pot.position.y + 0.25; // Half of pot height

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
// Animate the scene
animate();
// Export the scene for use in other modules
export { scene, camera, renderer, flower, pot, videoPlayer, popup };

function onYouTubeIframeAPIReady() {
  new YT.Player("youtubePlayer", {
    events: {
      onStateChange: function (event) {
        // Video ended
        if (event.data === YT.PlayerState.ENDED) {
          videoPlayer.style.display = "none";
          // Add your flower hemisphere and birthday message code here
        }
      },
    },
  });
}
