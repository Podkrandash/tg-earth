import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
        this.camera.position.set(0, 0, 10);

        // Настройка рендерера
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Добавляем контроль орбиты
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = isMobile() ? 7 : 5;
        this.controls.maxDistance = isMobile() ? 20 : 15;
        this.controls.minPolarAngle = Math.PI * 0.1;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.zoomSpeed = 0.5; // Замедляем зум для плавности

        // Создаем сферу Земли
        const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
        const earthMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.5,
            map: new THREE.TextureLoader().load('/textures/earth_daymap.jpg'),
            bumpMap: new THREE.TextureLoader().load('/textures/earth_normal_map.jpg'),
            bumpScale: 0.05,
            specularMap: new THREE.TextureLoader().load('/textures/earth_roughness_map.jpg')
        });
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);

        // Создаем внутреннюю атмосферу (свечение)
        const atmosphereGeometry1 = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial1 = new THREE.MeshPhongMaterial({
            color: 0x4ca7ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        this.atmosphere1 = new THREE.Mesh(atmosphereGeometry1, atmosphereMaterial1);
        this.scene.add(this.atmosphere1);

        // Создаем внешнюю атмосферу (свечение)
        const atmosphereGeometry2 = new THREE.SphereGeometry(2.2, 64, 64);
        const atmosphereMaterial2 = new THREE.MeshPhongMaterial({
            color: 0x4ca7ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        this.atmosphere2 = new THREE.Mesh(atmosphereGeometry2, atmosphereMaterial2);
        this.scene.add(this.atmosphere2);

        // Добавляем освещение
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(-1, 2, 4);
        this.scene.add(directionalLight);

        // Добавляем мягкий свет для атмосферы
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
        this.scene.add(hemisphereLight);

        // Запускаем анимацию
        this.animate();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
            window.TelegramGameProxy.requestFullscreen();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Вращение Земли и атмосферы
        const rotationSpeed = isMobile() ? 0.0005 : 0.001;
        this.earth.rotation.y += rotationSpeed;
        this.atmosphere1.rotation.y += rotationSpeed * 0.95;
        this.atmosphere2.rotation.y += rotationSpeed * 0.9;
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 