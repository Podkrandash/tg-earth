import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Константы для вращения
const DAY_MS = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
const ROTATION_SPEED = (2 * Math.PI) / DAY_MS; // Полный оборот за 24 часа
const EARTH_TILT = 23.5 * Math.PI / 180; // Наклон оси Земли

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
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Добавляем направленный свет (Солнце)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(50, 0, 0);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        // Создаем группу для Земли с наклоном оси
        this.earthGroup = new THREE.Group();
        this.earthGroup.rotation.z = 23.5 * Math.PI / 180;
        this.scene.add(this.earthGroup);

        // Настройка контролей для камеры
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
            window.TelegramGameProxy.setScore(1);
        }

        // Запускаем анимацию
        this.startTime = Date.now();
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
        
        // Вращаем Землю вокруг своей оси
        if (this.earth) {
            const elapsed = (Date.now() - this.startTime) * 0.001;
            this.earth.rotation.y = elapsed * 0.1; // Скорость вращения
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
        const normalTexture = textureLoader.load('textures/earth_normal_map.jpg');
        const specularTexture = textureLoader.load('textures/earth_specular_map.jpg');

        // Создаем геометрию земли
        const earthGeometry = new THREE.SphereGeometry(2, 64, 64);

        // Создаем материал земли
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: dayTexture,
            normalMap: normalTexture,
            specularMap: specularTexture,
            shininess: 5
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.castShadow = true;
        this.earth.receiveShadow = true;
        this.earthGroup.add(this.earth);

        // Создаем атмосферу
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