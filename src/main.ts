import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class Earth {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private earth: THREE.Mesh;
    private atmosphere: THREE.Mesh;
    private gameParams: Record<string, string>;

    constructor() {
        // Получаем параметры из Telegram
        this.gameParams = window.TelegramGameProxy?.initParams() || {};

        // Инициализация сцены
        this.container = document.getElementById('scene-container')!;
        this.scene = new THREE.Scene();
        
        // Настройка камеры
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);

        // Настройка рендерера
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Добавляем контроль орбиты
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 15;

        // Создаем объекты
        this.earth = this.createEarth();
        this.atmosphere = this.createAtmosphere();
        this.scene.add(this.earth);
        this.scene.add(this.atmosphere);

        // Добавляем освещение
        this.setupLights();

        // Настраиваем управление
        this.setupControls();

        // Запускаем анимацию
        this.animate();

        // Обработка изменения размера окна
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
        }
    }

    private createEarth(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: new THREE.TextureLoader().load('/textures/earth_daymap.jpg'),
            bumpMap: new THREE.TextureLoader().load('/textures/earth_normal_map.jpg'),
            bumpScale: 0.05,
            specularMap: new THREE.TextureLoader().load('/textures/earth_roughness_map.jpg'),
            specular: new THREE.Color('grey'),
            shininess: 5
        });
        return new THREE.Mesh(geometry, material);
    }

    private createAtmosphere(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(2.1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            color: 0x0077ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        return new THREE.Mesh(geometry, material);
    }

    private setupLights(): void {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, 2, 4);
        this.scene.add(directionalLight);
    }

    private setupControls(): void {
        const viewBtn = document.getElementById('viewBtn');
        const centerBtn = document.getElementById('centerBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (viewBtn) {
            viewBtn.onclick = () => {
                this.camera.position.set(0, 0, 10);
                this.controls.target.set(0, 0, 0);
            };
        }

        if (centerBtn) {
            centerBtn.onclick = () => {
                this.controls.target.set(0, 0, 0);
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                this.camera.position.set(0, 0, 10);
                this.controls.target.set(0, 0, 0);
                this.controls.reset();
            };
        }

        // Обработка полноэкранного режима для Telegram
        const handleInteraction = () => {
            if (window.TelegramGameProxy?.requestFullscreen) {
                window.TelegramGameProxy.requestFullscreen();
            }
        };

        this.container.addEventListener('touchstart', handleInteraction, { once: true });
        this.container.addEventListener('click', handleInteraction, { once: true });
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
        
        // Вращение Земли
        this.earth.rotation.y += 0.001;
        
        // Обновление контролов
        this.controls.update();
        
        // Рендеринг
        this.renderer.render(this.scene, this.camera);
    }
}

// Типы для Telegram
declare global {
    interface Window {
        TelegramGameProxy?: {
            initParams: () => Record<string, string>;
            onEvent: (eventName: string) => void;
            requestFullscreen?: () => void;
        };
    }
}

// Запуск приложения
new Earth(); 