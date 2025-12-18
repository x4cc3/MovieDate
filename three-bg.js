import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/**
 * Abstract Sci-Fi Background with 3D Model
 * - Spiral Galaxy & Stars
 * - 3D Pomegranate Model (Romantic centerpiece)
 * - Abstract Floating Objects (Cubes, Rings, Crystals)
 * - Camera panning to sectors
 */

const canvas = document.querySelector('#bg-canvas');

// Mobile detection for performance optimization
const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const config = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    bgHex: 0x020205,
    galaxy: {
        // Reduced counts for smoother performance
        count: isMobile ? 4000 : 12000,
        radius: 10,
        branches: 4,
        spin: 1.2,
        randomness: 0.5,
        colorInside: new THREE.Color('#ff8c69'),
        colorOutside: new THREE.Color('#4a90e2')
    },
    stars: {
        count: isMobile ? 1200 : 3000
    }
};

let scene, camera, renderer;
let galaxySystem, starSystem;
let pomegranateModel = null; // 3D Model
let objectGroups = [];
let mouseX = 0, mouseY = 0;
let targetCamX = 0, targetCamY = 0, targetCamZ = 8;
let isRunning = true;

// Linear Interpolation
const lerp = (start, end, t) => start * (1 - t) + end * t;

function init() {
    if (config.reducedMotion) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(config.bgHex, 0.04);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) { return; }

    // Lights
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);
    const pLight1 = new THREE.PointLight(0x9d4edd, 3, 30);
    pLight1.position.set(5, 5, 5);
    scene.add(pLight1);
    const pLight2 = new THREE.PointLight(0xff6b9d, 2, 25);
    pLight2.position.set(-5, -2, 5);
    scene.add(pLight2);
    const pLight3 = new THREE.PointLight(0x4ade80, 1.5, 20);
    pLight3.position.set(0, 10, -5);
    scene.add(pLight3);

    createGalaxy();
    createStars();
    loadPomegranateModel();
    createAbstractObjects();

    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    animate();
}

function createGalaxy() {
    const params = config.galaxy;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const r = Math.random() * params.radius;
        const spinAngle = r * params.spin;
        const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;

        const rndX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;
        const rndY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;
        const rndZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;

        positions[i3] = Math.cos(branchAngle + spinAngle) * r + rndX;
        positions[i3 + 1] = rndY * 0.5;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rndZ;

        const mixedColor = params.colorInside.clone().lerp(params.colorOutside, r / params.radius);
        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.04,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    });

    galaxySystem = new THREE.Points(geometry, material);
    scene.add(galaxySystem);
}

function createStars() {
    const geometry = new THREE.BufferGeometry();
    const count = config.stars.count;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = (Math.random() - 0.5) * 80;
        pos[i3 + 1] = (Math.random() - 0.5) * 80;
        pos[i3 + 2] = (Math.random() - 0.5) * 80;

        // Random star colors
        const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.8);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 0.08,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });
    starSystem = new THREE.Points(geometry, material);
    scene.add(starSystem);
}

function loadPomegranateModel() {
    const loader = new GLTFLoader();

    // Try to load from models folder, or scripts folder as fallback
    const modelPaths = ['./models/pomegranate.glb', './pomegranate.glb', './scripts/../models/pomegranate.glb'];

    loader.load(
        modelPaths[0],
        (gltf) => {
            pomegranateModel = gltf.scene;

            // Scale and position
            pomegranateModel.scale.set(2, 2, 2);
            pomegranateModel.position.set(0, 0, 0);

            // Add dramatic lighting for the model
            const spotLight = new THREE.SpotLight(0xff6b9d, 3);
            spotLight.position.set(5, 10, 5);
            spotLight.target = pomegranateModel;
            spotLight.angle = Math.PI / 6;
            spotLight.penumbra = 0.3;
            scene.add(spotLight);

            const rimLight = new THREE.PointLight(0x9d4edd, 2, 15);
            rimLight.position.set(-5, 3, -5);
            scene.add(rimLight);

            scene.add(pomegranateModel);
        },
        (progress) => {
            // Loading progress (silent)
        },
        (error) => {
            // Graceful fallback - create a simple geometric pomegranate representation
            createFallbackPomegranate();
        }
    );
}

function createFallbackPomegranate() {
    // Create a stylized pomegranate using basic geometry
    const pomGroup = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xc73866,
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x4a0e1f,
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(1, 0.9, 1);

    // Crown (top)
    const crownGeo = new THREE.ConeGeometry(0.3, 0.4, 6);
    const crownMat = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.7
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.9;
    crown.rotation.y = Math.PI / 6;

    pomGroup.add(body, crown);
    pomGroup.position.set(0, 0, 0);

    pomegranateModel = pomGroup;
    scene.add(pomegranateModel);

}

function createAbstractObjects() {
    // Common Material
    const stdMaterial = new THREE.MeshStandardMaterial({
        color: 0x8899ff, roughness: 0.3, metalness: 0.8, emissive: 0x110033
    });

    // --- Step 2: Snacks (Right Sector) ---
    const snacksGroup = new THREE.Group();

    // 1. Soda Cups
    const cupGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.6, 16);
    const lidGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const strawGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);

    for (let i = 0; i < 8; i++) {
        const cupGroup = new THREE.Group();
        // Random cup color
        const cupColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
        const cupMat = new THREE.MeshStandardMaterial({
            color: cupColor,
            roughness: 0.2,
            metalness: 0.1,
            emissive: cupColor,
            emissiveIntensity: 0.2
        });

        const cup = new THREE.Mesh(cupGeo, cupMat);
        const lid = new THREE.Mesh(lidGeo, lidMat);
        lid.position.y = 0.32;
        const straw = new THREE.Mesh(strawGeo, lidMat);
        straw.position.set(0.05, 0.45, 0);
        straw.rotation.z = -0.2;

        cupGroup.add(cup, lid, straw);
        cupGroup.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
        cupGroup.rotation.set(Math.random(), Math.random(), Math.random());
        cupGroup.userData.rotSpeed = Math.random() * 0.01 + 0.005;
        snacksGroup.add(cupGroup);
    }

    // 2. Popcorn
    const cornGeo = new THREE.DodecahedronGeometry(0.12);

    for (let i = 0; i < 30; i++) {
        // Random popcorn tint (yellowish to white)
        const cornColor = new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 1, 0.8);
        const cornMat = new THREE.MeshStandardMaterial({
            color: cornColor,
            roughness: 0.8,
            emissive: cornColor,
            emissiveIntensity: 0.1
        });

        const mesh = new THREE.Mesh(cornGeo, cornMat);
        mesh.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4);
        mesh.userData.rotSpeed = Math.random() * 0.02 + 0.01;
        snacksGroup.add(mesh);
    }

    // Add local light for snacks
    const snackLight = new THREE.PointLight(0xffaa00, 2, 10);
    snackLight.position.set(0, 2, 2);
    snacksGroup.add(snackLight);

    snacksGroup.position.set(12, 0, 0);
    scene.add(snacksGroup);
    objectGroups.push(snacksGroup);

    // --- Step 3: Dates (Left Sector) ---
    const datesGroup = new THREE.Group();

    // Helper to create number texture
    function createNumberTexture(num) {
        const cvs = document.createElement('canvas');
        cvs.width = 128; cvs.height = 128;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent
        ctx.fillRect(0, 0, 128, 128);
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#7059ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, 64, 64);

        // Glow effect
        ctx.shadowColor = '#7059ff';
        ctx.shadowBlur = 15;
        ctx.fillText(num, 64, 64);

        const tex = new THREE.CanvasTexture(cvs);
        return tex;
    }

    // Create floating numbers 1-31
    // We'll create a subset to save performance, e.g., random numbers
    for (let i = 1; i <= 15; i++) {
        // Random number between 1 and 31
        const num = Math.floor(Math.random() * 31) + 1;
        const tex = createNumberTexture(num.toString());
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(1, 1);
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
        mesh.rotation.set(Math.random() * 0.5, Math.random() * 0.5, 0);
        mesh.userData.rotSpeed = Math.random() * 0.005;

        datesGroup.add(mesh);
    }

    datesGroup.position.set(-12, 1, -2);
    scene.add(datesGroup);
    objectGroups.push(datesGroup);

    // --- Step 4: Time (Up Sector) - Clocks & Hourglasses ---
    const timeGroup = new THREE.Group();

    // 1. Simple Clocks
    const clockFaceGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32);
    const clockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const handGeo = new THREE.BoxGeometry(0.04, 0.3, 0.02);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    for (let i = 0; i < 6; i++) {
        const clock = new THREE.Group();
        const face = new THREE.Mesh(clockFaceGeo, clockMat);
        face.rotation.x = Math.PI / 2;

        const hourHand = new THREE.Mesh(handGeo, handMat);
        hourHand.position.z = 0.04;
        hourHand.scale.y = 0.6;
        hourHand.rotation.z = Math.random() * Math.PI * 2;

        const minuteHand = new THREE.Mesh(handGeo, handMat);
        minuteHand.position.z = 0.04;
        minuteHand.rotation.z = Math.random() * Math.PI * 2;

        clock.add(face, hourHand, minuteHand);
        clock.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
        clock.rotation.set(Math.random(), Math.random(), Math.random());
        clock.userData.rotSpeed = Math.random() * 0.01;
        timeGroup.add(clock);
    }

    // 2. Hourglasses (Two cones)
    const coneGeo = new THREE.ConeGeometry(0.2, 0.4, 16);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, roughness: 0.1 });

    for (let i = 0; i < 5; i++) {
        const hg = new THREE.Group();
        const topCone = new THREE.Mesh(coneGeo, glassMat);
        topCone.position.y = 0.2;
        topCone.rotation.x = Math.PI; // Point down

        const bottomCone = new THREE.Mesh(coneGeo, glassMat);
        bottomCone.position.y = -0.2;

        hg.add(topCone, bottomCone);
        hg.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
        hg.rotation.set(Math.random(), Math.random(), Math.random());
        hg.userData.rotSpeed = Math.random() * 0.01 + 0.005;
        timeGroup.add(hg);
    }

    timeGroup.position.set(0, 8, 0);
    scene.add(timeGroup);
    objectGroups.push(timeGroup);
}

function onMouseMove(e) {
    if (config.reducedMotion) return;
    mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
}

function onResize() {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    // Galaxy Spin
    if (galaxySystem) galaxySystem.rotation.y += 0.0003;
    if (starSystem) starSystem.rotation.y -= 0.0001;

    // Pomegranate gentle rotation
    if (pomegranateModel) {
        pomegranateModel.rotation.y += 0.005;
        pomegranateModel.position.y = Math.sin(Date.now() * 0.001) * 0.2;
    }

    // Objects Spin
    objectGroups.forEach(group => {
        group.rotation.y += 0.002;
        group.children.forEach(child => {
            if (child.userData.rotSpeed) {
                child.rotation.x += child.userData.rotSpeed;
                child.rotation.y += child.userData.rotSpeed;
            }
        });
    });

    // Camera Movement (Smooth Pan to Target + Mouse Parallax)
    camera.position.x = lerp(camera.position.x, targetCamX, 0.03);
    camera.position.y = lerp(camera.position.y, targetCamY, 0.03);
    camera.position.z = lerp(camera.position.z, targetCamZ, 0.03);

    // Parallax LookAt
    const lookX = camera.position.x + (mouseX * 5);
    const lookY = camera.position.y + (-mouseY * 5);
    camera.lookAt(lookX, lookY, camera.position.z - 10);

    renderer.render(scene, camera);
}

export const threeBg = {
    transitionToStep: (step) => {
        if (config.reducedMotion) return;

        // Step mappings to camera positions
        switch (step) {
            case 1: // Intro (New - Far away)
                targetCamX = 0; targetCamY = 0; targetCamZ = 14;
                break;
            case 2: // Genre (Old 1 - Center)
                targetCamX = 0; targetCamY = 0; targetCamZ = 8;
                break;
            case 3: // Snacks (Old 2 - Right)
                targetCamX = 12; targetCamY = 0; targetCamZ = 6;
                break;
            case 4: // Dates (Old 3 - Left)
                targetCamX = -12; targetCamY = 1; targetCamZ = 6;
                break;
            case 5: // Time (Old 4 - Up)
                targetCamX = 0; targetCamY = 8; targetCamZ = 6;
                break;
            case 6: // Extra (Old 5 - Center Zoom)
                targetCamX = 0; targetCamY = 0; targetCamZ = 4;
                break;
            case 'accepted': // Warp Speed / Close up
                targetCamX = 0; targetCamY = 0; targetCamZ = 1;
                break;
        }
    },
    toggleMotion: (stop) => {
        if (stop) {
            isRunning = false;
            renderer.domElement.style.opacity = 0.3;
        } else {
            isRunning = true;
            renderer.domElement.style.opacity = 1;
            animate();
        }
    }
};

init();
