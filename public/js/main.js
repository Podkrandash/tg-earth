class Earth {
    constructor() {
        // Получаем параметры из Telegram
        this.gameParams = window.TelegramGameProxy?.initParams() || {};

        // Инициализация сцены
        this.container = document.getElementById('scene-container');
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
        window.addEventListener('resize', () => this.onWindowResize());

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
            // Автоматический полноэкранный режим
            window.TelegramGameProxy.requestFullscreen();
        }
    }

    createEarth() {
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 30
        });
        return new THREE.Mesh(geometry, material);
    }

    createAtmosphere() {
        const geometry = new THREE.SphereGeometry(2.1, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x0077ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        return new THREE.Mesh(geometry, material);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, 2, 4);
        this.scene.add(directionalLight);
    }

    setupControls() {
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
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Вращение Земли
        this.earth.rotation.y += 0.001;
        
        // Обновление контролов
        this.controls.update();
        
        // Рендеринг
        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск приложения
new Earth(); 