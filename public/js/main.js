import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Замедляем вращение Земли
const ROTATION_SPEED = 0.00005;

class Earth {
    constructor() {
        // Инициализация сцены
        this.container = document.getElementById('scene-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Настройка камеры
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 15);

        // Настройка рендерера
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Добавляем искусственное освещение
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 3, 5);
        this.scene.add(mainLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-5, -3, -5);
        this.scene.add(backLight);

        // Создаем группу для Земли
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);

        // Настройка контролей орбиты
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = isMobile() ? 0.3 : 0.5;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = isMobile() ? 0.5 : 0.8;
        this.controls.enablePan = false;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 20;
        this.controls.minPolarAngle = Math.PI * 0.1;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Создаем Землю
        this.createEarth();

        // Обработчики событий
        window.addEventListener('resize', () => this.onWindowResize());

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
            window.TelegramGameProxy.requestFullscreen();
        }

        // Запускаем анимацию
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Медленное вращение Земли
        if (this.earth) {
            this.earth.rotation.y += ROTATION_SPEED;
        }

        // Обновляем контроли камеры
        this.controls.update();
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }

    createEarth() {
        // Загрузка текстур
        const textureLoader = new THREE.TextureLoader();
        const dayTexture = textureLoader.load('textures/earth_daymap.jpg');
        const nightTexture = textureLoader.load('textures/earth_nightmap.jpg');
        const normalTexture = textureLoader.load('textures/earth_normal_map.jpg');
        const roughnessTexture = textureLoader.load('textures/earth_roughness_map.jpg');

        // Создаем геометрию земли
        const earthGeometry = new THREE.SphereGeometry(2, 64, 64);

        // Создаем материал земли
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: dayTexture,
            normalMap: normalTexture,
            roughnessMap: roughnessTexture,
            metalness: 0.1,
            roughness: 0.7
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earthGroup.add(this.earth);

        // Добавляем простую атмосферу
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x4ca7ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });

        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.earthGroup.add(atmosphere);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 