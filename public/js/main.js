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

        // Создаем сферу
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.5
        });
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);

        // Добавляем освещение
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, 2, 4);
        this.scene.add(directionalLight);

        // Запускаем анимацию
        this.animate();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
            window.TelegramGameProxy.requestFullscreen();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Вращение сферы
        this.sphere.rotation.y += 0.001;
        
        // Обновление контролов
        this.controls.update();
        
        // Рендеринг
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск приложения
new Earth(); 