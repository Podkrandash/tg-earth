import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Константы для вращения
const EARTH_ROTATION_SPEED = 0.001; // Скорость вращения Земли
const MOON_ROTATION_SPEED = 0.00037; // Скорость вращения Луны (27.3 раза медленнее Земли)
const EARTH_TILT = 23.5 * Math.PI / 180; // Наклон оси Земли
const MOON_DISTANCE = 10; // Расстояние от Земли до Луны
const MOON_TILT = 5.14 * Math.PI / 180; // Наклон орбиты Луны к эклиптике

// Константы для визуализации загрязнения
const POLLUTION_LEVELS = {
    NORMAL: { max: 30, atmosphereColor: [0.4, 0.7, 1.0], earthTint: [1.0, 1.0, 1.0] },
    WARNING: { max: 50, atmosphereColor: [0.5, 0.6, 0.8], earthTint: [1.0, 0.95, 0.9] },
    MODERATE: { max: 70, atmosphereColor: [0.6, 0.5, 0.4], earthTint: [0.9, 0.8, 0.7] },
    HIGH: { max: 90, atmosphereColor: [0.7, 0.4, 0.3], earthTint: [0.8, 0.6, 0.5] },
    CRITICAL: { max: 100, atmosphereColor: [0.8, 0.3, 0.2], earthTint: [0.6, 0.4, 0.3] }
};

class Earth {
    constructor() {
        this.initialized = false;
        this.disposed = false;
        this.initPromise = null;
        this.camera = null;
        this.renderer = null;
        this.scene = null;
        this.textures = [];
        this.currentPollutionLevel = 0;
        this.pollutionUpdateTimer = null;
        this.initGame().catch(error => {
            console.error('Failed to initialize game:', error);
            this.showError('Ошибка инициализации игры');
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        
        // Подписываемся на событие изменения загрязнения
        window.addEventListener('pollutionChanged', this.updatePlanetAppearance.bind(this));
        
        // Запускаем регулярную проверку уровня загрязнения каждые 2 секунды
        this.pollutionUpdateTimer = setInterval(() => {
            this.checkPollutionLevel();
        }, 2000);
    }

    async initGame() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                // Показываем загрузочный экран сразу
                this.playLoadingAnimation();
                
                // Инициализируем сцену
                await this.initScene();
                
                // Пытаемся инициализировать Telegram WebApp
                try {
                    await this.setupTelegram();
                } catch (error) {
                    console.warn('Telegram initialization warning:', error);
                    // Продолжаем работу даже при ошибке инициализации Telegram
                }
                
                // Запускаем анимацию только после полной инициализации
                this.initialized = true;
                this.animate();
                
                // Скрываем загрузочный экран
                this.hideLoading();
                resolve();
            } catch (error) {
                console.error('Game initialization error:', error);
                this.hideLoading();
                this.showError('Ошибка инициализации игры');
                reject(error);
            }
        });

        return this.initPromise;
    }

    async setupTelegram() {
        // Ждем небольшую задержку для инициализации Telegram WebApp
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                
                // Добавляем обработчик изменения viewport
                window.Telegram.WebApp.onEvent('viewportChanged', () => {
                    if (!this.disposed && this.initialized) {
                        this.onWindowResize();
                    }
                });
            } catch (error) {
                console.warn('Telegram WebApp API warning:', error);
            }
        } else {
            console.warn('Telegram WebApp не доступен');
        }
    }

    cleanup() {
        this.disposed = true;
        if (this.controls) this.controls.dispose();
        if (this.renderer) this.renderer.dispose();
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // Очищаем таймер проверки загрязнения
        if (this.pollutionUpdateTimer) {
            clearInterval(this.pollutionUpdateTimer);
            this.pollutionUpdateTimer = null;
        }
        
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));
        window.removeEventListener('pollutionChanged', this.updatePlanetAppearance.bind(this));
    }

    showError(message) {
        // Показываем ошибку пользователю
        if (window.errorHandler) {
            window.errorHandler.show(message);
        } else {
            alert(message);
        }
    }

    loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        const texturesToLoad = [
            '/assets/textures/earth_daymap.jpg',
            '/assets/textures/earth_nightmap.jpg',
            '/assets/textures/earth_normal_map.jpg',
            '/assets/textures/earth_specular_map.jpg',
            '/assets/textures/earth_clouds.jpg',
            '/assets/textures/moon_map.jpg',
            '/assets/textures/moon_normal.jpg'
        ];

        return Promise.all(texturesToLoad.map(url => 
            new Promise((resolve) => {
                textureLoader.load(
                    url,
                    (texture) => {
                        // Используем colorSpace вместо encoding
                        texture.colorSpace = THREE.SRGBColorSpace;
                        resolve(texture);
                    },
                    undefined,
                    () => {
                        console.warn(`Failed to load texture: ${url}`);
                        // Создаем пустую текстуру при ошибке загрузки
                        const emptyTexture = new THREE.Texture();
                        emptyTexture.colorSpace = THREE.SRGBColorSpace;
                        resolve(emptyTexture);
                    }
                );
            })
        ));
    }

    playLoadingAnimation() {
        const elements = {
            loadingScreen: document.getElementById('loading-screen'),
            loadingContainer: document.getElementById('loading-container'),
            loadingMoon: document.getElementById('loading-moon'),
            loadingEarth: document.getElementById('loading-earth'),
            sceneContainer: document.getElementById('scene-container'),
            navPanel: document.querySelector('.nav-panel')
        };

        // Показываем загрузочный экран
        if (elements.loadingScreen) {
            elements.loadingScreen.style.display = 'flex';
            elements.loadingScreen.style.opacity = '1';
            elements.loadingScreen.classList.add('visible');
        }
        
        // Скрываем основную сцену и панель навигации
        if (elements.sceneContainer) {
            elements.sceneContainer.style.display = 'block';
            elements.sceneContainer.style.opacity = '0';
        }
        if (elements.navPanel) {
            elements.navPanel.style.display = 'none';
        }

        // Запускаем анимацию
        setTimeout(() => {
            if (elements.loadingEarth) {
                elements.loadingEarth.style.animation = 'rotate 2s linear infinite';
            }
            if (elements.loadingMoon) {
                elements.loadingMoon.style.animation = 'orbit 2s linear infinite';
            }
        }, 100);
    }

    hideLoading() {
        const elements = {
            loadingScreen: document.getElementById('loading-screen'),
            loadingContainer: document.getElementById('loading-container'),
            loadingMoon: document.getElementById('loading-moon'),
            loadingEarth: document.getElementById('loading-earth'),
            sceneContainer: document.getElementById('scene-container'),
            navPanel: document.querySelector('.nav-panel')
        };

        // Останавливаем анимации
        if (elements.loadingEarth) {
            elements.loadingEarth.style.animationPlayState = 'paused';
        }
        if (elements.loadingMoon) {
            elements.loadingMoon.style.animationPlayState = 'paused';
        }

        // Показываем сцену
        if (elements.sceneContainer) {
            elements.sceneContainer.style.opacity = '1';
        }

        // Скрываем загрузочный экран
        if (elements.loadingScreen) {
            elements.loadingScreen.classList.remove('visible');
            elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
            }, 500);
        }

        // Показываем панель навигации
        if (elements.navPanel) {
            elements.navPanel.style.display = 'flex'; // Убедимся, что она видима
            elements.navPanel.classList.add('visible'); // Добавляем класс для стилей (позиция и opacity)
        }
    }

    onWindowResize() {
        if (!this.initialized || this.disposed || !this.camera || !this.renderer) {
            return;
        }
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        if (!this.initialized || this.disposed) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Вращаем Землю вокруг своей оси
        if (this.earth) {
            this.earth.rotation.y += EARTH_ROTATION_SPEED;
            
            // Обновляем направление солнца в шейдере Земли
            const worldSunDirection = new THREE.Vector3(1, 0, 0);
            const earthWorldMatrix = this.earth.matrixWorld;
            const inverseMatrix = new THREE.Matrix4().copy(earthWorldMatrix).invert();
            const localSunDirection = worldSunDirection.clone().transformDirection(inverseMatrix);
            
            this.earth.material.uniforms.sunDirection.value.copy(localSunDirection);
        }
        
        // Вращаем Луну вокруг Земли и вокруг своей оси
        if (this.moonOrbit) {
            this.moonOrbit.rotation.y += MOON_ROTATION_SPEED;
            
            if (this.moon) {
                // Вращаем Луну вокруг своей оси с той же скоростью
                this.moon.rotation.y += MOON_ROTATION_SPEED;
                
                // Обновляем направление солнца в шейдере Луны
                const worldSunDirection = new THREE.Vector3(1, 0, 0);
                const moonWorldMatrix = this.moon.matrixWorld;
                const inverseMatrix = new THREE.Matrix4().copy(moonWorldMatrix).invert();
                const localSunDirection = worldSunDirection.clone().transformDirection(inverseMatrix);
                
                this.moon.material.uniforms.sunDirection.value.copy(localSunDirection);
            }
        }
        
        // Обновляем время для мерцания звезд
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.time.value = performance.now() * 0.001;
        }
        
        // Анимация "разрушения" планеты при критическом уровне загрязнения
        if (this.currentPollutionLevel >= 90 && this.earth) {
            // Добавляем дрожание при критическом уровне загрязнения
            const shakeAmount = (this.currentPollutionLevel - 90) * 0.002;
            this.earthGroup.position.x = Math.sin(performance.now() * 0.01) * shakeAmount;
            this.earthGroup.position.y = Math.cos(performance.now() * 0.01) * shakeAmount;
            
            // При 100% загрязнения - анимация разрушения
            if (this.currentPollutionLevel >= 99.5) {
                this.renderDestructionEffect();
            }
        }
        
        // Обновляем контроли камеры
        this.controls.update();
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }

    async initScene() {
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
            antialias: true,
            logarithmicDepthBuffer: true
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

        // Создаем группу для системы Земля-Луна
        this.earthMoonSystem = new THREE.Group();
        this.scene.add(this.earthMoonSystem);

        // Создаем группу для Земли с наклоном оси
        this.earthGroup = new THREE.Group();
        this.earthGroup.rotation.z = EARTH_TILT;
        this.earthMoonSystem.add(this.earthGroup);

        // Создаем группу для орбиты Луны с наклоном
        this.moonOrbit = new THREE.Group();
        this.moonOrbit.rotation.x = MOON_TILT;
        this.earthMoonSystem.add(this.moonOrbit);

        // Настройка контролей для камеры
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Предотвращаем всплытие событий касания, чтобы они не закрывали Mini App
        this.renderer.domElement.addEventListener('touchstart', (e) => { 
            e.stopPropagation(); 
            e.preventDefault();
        }, { passive: false });
        this.renderer.domElement.addEventListener('touchmove', (e) => { 
            e.stopPropagation(); 
            e.preventDefault();
        }, { passive: false });
        this.renderer.domElement.addEventListener('touchend', (e) => { 
            e.stopPropagation(); 
            e.preventDefault();
        }, { passive: false });

        // Базовые настройки
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Настройки для мобильных устройств
        if (isMobile()) {
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 0.5;
            this.controls.enableZoom = true;
            this.controls.enableRotate = true;
            this.controls.enablePan = false;
            this.controls.touches = {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN
            };
        } else {
            this.controls.rotateSpeed = 0.8;
            this.controls.zoomSpeed = 1.0;
        }
        
        // Общие ограничения
        this.controls.minDistance = 4;
        this.controls.maxDistance = 30;
        this.controls.minPolarAngle = Math.PI * 0.1;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        
        // Сброс позиции камеры
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        // Загружаем текстуры
        this.textures = await this.loadTextures();
        
        // Создаем объекты сцены
        this.createEarth();
        this.createMoon();
        this.createStars();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }

    createEarth() {
        // Используем уже загруженные текстуры
        const dayTexture = this.textures[0];
        const nightTexture = this.textures[1];
        const normalTexture = this.textures[2];
        const specularTexture = this.textures[3];
        const cloudsTexture = this.textures[4];

        // Создаем геометрию земли
        const earthGeometry = new THREE.SphereGeometry(2, 64, 64);

        // Создаем материал земли с шейдером для дня и ночи
        const earthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: dayTexture },
                nightTexture: { value: nightTexture },
                normalMap: { value: normalTexture },
                specularMap: { value: specularTexture },
                cloudsTexture: { value: cloudsTexture },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                // Добавляем новые униформы для эффекта загрязнения
                pollutionTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                pollutionLevel: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vWorldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D dayTexture;
                uniform sampler2D nightTexture;
                uniform sampler2D normalMap;
                uniform sampler2D specularMap;
                uniform sampler2D cloudsTexture;
                uniform vec3 sunDirection;
                uniform vec3 pollutionTint;
                uniform float pollutionLevel;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;

                void main() {
                    float cosAngle = dot(vWorldNormal, sunDirection);
                    float transition = smoothstep(-0.2, 0.2, cosAngle);
                    
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    vec4 clouds = texture2D(cloudsTexture, vUv);
                    
                    // Изменяем цвет Земли в зависимости от загрязнения
                    // В нормальных условиях увеличиваем яркость дневной стороны
                    dayColor.rgb *= 1.8;
                    dayColor.rgb = pow(dayColor.rgb, vec3(0.9)); // Увеличиваем контраст
                    
                    // Применяем тонирование в зависимости от уровня загрязнения
                    dayColor.rgb *= pollutionTint;
                    
                    // С увеличением загрязнения уменьшаем блики воды
                    // и делаем континенты более коричневыми
                    if (pollutionLevel > 0.3) {
                        // Более коричневые континенты
                        vec3 brownTint = vec3(0.8, 0.6, 0.4);
                        // Определяем "суша ли это" по зеленому каналу (он ярче на суше)
                        float isLand = smoothstep(0.3, 0.5, dayColor.g);
                        
                        // Применяем коричневый оттенок к суше
                        dayColor.rgb = mix(dayColor.rgb, dayColor.rgb * brownTint, isLand * pollutionLevel);
                        
                        // Уменьшаем блики воды (голубизну)
                        float isWater = 1.0 - isLand;
                        vec3 waterTint = vec3(0.7, 0.7, 0.8);
                        dayColor.rgb = mix(dayColor.rgb, dayColor.rgb * waterTint, isWater * pollutionLevel);
                    }
                    
                    // Настраиваем ночные огни - уменьшаем их при высоком загрязнении
                    float lightFactor = 1.0 - pollutionLevel * 0.5;
                    vec4 nightLights = nightColor * vec4(2.5 * lightFactor, 2.2 * lightFactor, 1.8 * lightFactor, 1.0);
                    
                    vec4 groundColor = mix(nightLights, dayColor, transition);
                    
                    // Меняем облака в зависимости от уровня загрязнения
                    if (pollutionLevel > 0.3) {
                        // Более грязные облака
                        clouds.rgb *= mix(vec3(1.5), vec3(1.0, 0.9, 0.8), pollutionLevel);
                    } else {
                        // Чистые, яркие облака
                        clouds.rgb *= 1.5;
                    }
                    
                    vec4 cloudColor = clouds * transition;
                    
                    // При очень высоком загрязнении добавляем красноватый оттенок
                    if (pollutionLevel > 0.7) {
                        float redTint = (pollutionLevel - 0.7) / 0.3; // 0 -> 1 при 0.7 -> 1.0
                        groundColor.rgb = mix(groundColor.rgb, groundColor.rgb * vec3(1.3, 0.8, 0.7), redTint);
                    }
                    
                    gl_FragColor = vec4(groundColor.rgb + cloudColor.rgb * 0.4, 1.0);
                }
            `,
            transparent: false,
            side: THREE.FrontSide
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.castShadow = true;
        this.earth.receiveShadow = true;
        this.earth.renderOrder = 0; // Рендерим Землю после звезд
        this.earthGroup.add(this.earth);

        // Создаем реалистичную атмосферу
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                cameraPosition: { value: this.camera.position },
                // Добавляем униформы для эффекта загрязнения в атмосфере
                pollutionColor: { value: new THREE.Vector3(0.4, 0.7, 1.0) },
                pollutionLevel: { value: 0.0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vAtmosphereHeight;
                varying vec3 vViewDirection;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vPosition = worldPosition.xyz;
                    vAtmosphereHeight = position.y;
                    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 sunDirection;
                uniform vec3 pollutionColor;
                uniform float pollutionLevel;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vAtmosphereHeight;
                varying vec3 vViewDirection;

                void main() {
                    float cosAngle = dot(vNormal, normalize(sunDirection));
                    
                    // Рассеивание Рэлея
                    float rayleigh = 1.0 - pow(abs(dot(vViewDirection, vNormal)), 2.0);
                    
                    // Свечение на краях
                    float rimLight = 1.0 - abs(dot(vViewDirection, vNormal));
                    rimLight = pow(rimLight, 4.0);
                    
                    // Цвет атмосферы зависит от высоты, освещения и загрязнения
                    // Базовые цвета чистой атмосферы
                    vec3 cleanDayColor = mix(
                        vec3(0.4, 0.7, 1.0),  // Голубой у поверхности
                        vec3(0.2, 0.4, 0.8),  // Темно-синий вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    vec3 cleanNightColor = mix(
                        vec3(0.1, 0.1, 0.2),  // Темно-синий у поверхности
                        vec3(0.05, 0.05, 0.1), // Почти черный вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    // Цвета загрязненной атмосферы
                    vec3 pollutedDayColor = mix(
                        pollutionColor,  // Цвет загрязнения у поверхности
                        pollutionColor * 0.7,  // Цвет загрязнения вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    vec3 pollutedNightColor = mix(
                        pollutionColor * 0.3,  // Темный цвет загрязнения ночью
                        pollutionColor * 0.1,  // Еще более темный вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    // Смешиваем чистые и загрязненные цвета
                    vec3 dayColor = mix(cleanDayColor, pollutedDayColor, pollutionLevel);
                    vec3 nightColor = mix(cleanNightColor, pollutedNightColor, pollutionLevel);
                    
                    // Интенсивность зависит от освещения
                    float sunEffect = smoothstep(-0.2, 0.3, cosAngle);
                    vec3 atmosphereColor = mix(nightColor, dayColor, sunEffect);
                    
                    // Добавляем свечение на краях
                    float intensity = mix(0.3, 1.0, rimLight) * mix(0.2, 1.0, rayleigh);
                    
                    // При высоком загрязнении увеличиваем плотность атмосферы
                    if (pollutionLevel > 0.5) {
                        intensity = intensity * (1.0 + pollutionLevel * 0.5);
                    }
                    
                    // Добавляем рассеивание света в атмосфере
                    vec3 finalColor = atmosphereColor * intensity;
                    
                    // При низком загрязнении добавляем белое свечение по краям
                    if (pollutionLevel < 0.5) {
                        finalColor += vec3(1.0, 1.0, 1.0) * pow(rimLight, 8.0) * 0.3 * (1.0 - pollutionLevel);
                    } 
                    // При высоком загрязнении добавляем красноватое свечение
                    else {
                        finalColor += vec3(1.0, 0.5, 0.3) * pow(rimLight, 6.0) * 0.4 * pollutionLevel;
                    }
                    
                    // Подстраиваем прозрачность атмосферы - более мутная при загрязнении
                    float alpha = intensity * 0.3 * (1.0 + pollutionLevel * 0.7);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.atmosphere.renderOrder = 1; // Рендерим атмосферу после Земли
        this.earthGroup.add(this.atmosphere);
        
        // Проверяем текущий уровень загрязнения и обновляем внешний вид
        const pollution = localStorage.getItem('earthPollution');
        this.currentPollutionLevel = pollution ? parseFloat(pollution) : 50;
        this.updatePlanetAppearance();
    }

    createMoon() {
        // Используем уже загруженные текстуры
        const moonTexture = this.textures[5];
        const moonNormalMap = this.textures[6];

        // Создаем геометрию луны (примерно 27% от размера Земли)
        const moonGeometry = new THREE.SphereGeometry(0.54, 64, 64);

        // Создаем материал для Луны
        const moonMaterial = new THREE.ShaderMaterial({
            uniforms: {
                moonTexture: { value: moonTexture },
                normalMap: { value: moonNormalMap },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vWorldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D moonTexture;
                uniform sampler2D normalMap;
                uniform vec3 sunDirection;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;

                void main() {
                    float cosAngle = dot(vWorldNormal, sunDirection);
                    float transition = smoothstep(-0.2, 0.2, cosAngle);
                    
                    vec4 moonColor = texture2D(moonTexture, vUv);
                    
                    // Увеличиваем яркость освещенной стороны
                    vec3 brightSideColor = moonColor.rgb * 1.8;
                    brightSideColor = pow(brightSideColor, vec3(0.9));
                    
                    // Делаем темную сторону более реалистичной
                    vec3 darkSideColor = moonColor.rgb * 0.1;
                    
                    vec3 finalColor = mix(darkSideColor, brightSideColor, transition);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: false,
            side: THREE.FrontSide
        });

        // Создаем меш луны
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.castShadow = true;
        this.moon.receiveShadow = true;
        this.moon.renderOrder = 0; // Рендерим Луну после звезд
        this.moon.material.depthTest = true;
        this.moon.material.depthWrite = true;

        // Помещаем луну на орбиту
        this.moon.position.x = MOON_DISTANCE;
        this.moonOrbit.add(this.moon);
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 5000;
        
        const positions = new Float32Array(starsCount * 3);
        const opacities = new Float32Array(starsCount);
        const blinkSpeeds = new Float32Array(starsCount);
        const blinkOffsets = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount; i++) {
            // Распределяем звезды равномерно в пространстве
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 50 + Math.random() * 150;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Задаем случайные параметры мерцания
            opacities[i] = Math.random();
            blinkSpeeds[i] = 0.1 + Math.random() * 2.0; // Разная скорость мерцания
            blinkOffsets[i] = Math.random() * Math.PI * 2; // Разный фазовый сдвиг
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        starsGeometry.setAttribute('blinkSpeed', new THREE.BufferAttribute(blinkSpeeds, 1));
        starsGeometry.setAttribute('blinkOffset', new THREE.BufferAttribute(blinkOffsets, 1));
        
        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float opacity;
                attribute float blinkSpeed;
                attribute float blinkOffset;
                uniform float time;
                varying float vOpacity;
                
                void main() {
                    vOpacity = opacity * (0.7 + 0.3 * sin(time * blinkSpeed + blinkOffset));
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 1.5;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vOpacity;
                
                void main() {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true
        });
        
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.stars.renderOrder = -1; // Рендерим звезды первыми
        this.scene.add(this.stars);
    }

    // Новый метод для проверки уровня загрязнения в localStorage
    checkPollutionLevel() {
        if (!this.initialized || this.disposed) return;
        
        const pollution = localStorage.getItem('earthPollution');
        const pollutionValue = pollution ? parseFloat(pollution) : 50;
        
        // Если уровень загрязнения изменился, обновляем внешний вид планеты
        if (pollutionValue !== this.currentPollutionLevel) {
            this.currentPollutionLevel = pollutionValue;
            this.updatePlanetAppearance();
            
            // Создаем событие изменения загрязнения для оповещения других частей приложения
            const event = new CustomEvent('pollutionChanged', { 
                detail: { level: pollutionValue } 
            });
            window.dispatchEvent(event);
        }
    }

    // Новый метод для обновления внешнего вида планеты в зависимости от уровня загрязнения
    updatePlanetAppearance() {
        if (!this.initialized || this.disposed || !this.earth || !this.earth.material) return;
        
        console.log(`Обновление внешнего вида планеты. Уровень загрязнения: ${this.currentPollutionLevel}%`);
        
        // Определяем текущий уровень загрязнения
        let pollutionLevel;
        if (this.currentPollutionLevel <= POLLUTION_LEVELS.NORMAL.max) {
            pollutionLevel = POLLUTION_LEVELS.NORMAL;
        } else if (this.currentPollutionLevel <= POLLUTION_LEVELS.WARNING.max) {
            pollutionLevel = POLLUTION_LEVELS.WARNING;
        } else if (this.currentPollutionLevel <= POLLUTION_LEVELS.MODERATE.max) {
            pollutionLevel = POLLUTION_LEVELS.MODERATE;
        } else if (this.currentPollutionLevel <= POLLUTION_LEVELS.HIGH.max) {
            pollutionLevel = POLLUTION_LEVELS.HIGH;
        } else {
            pollutionLevel = POLLUTION_LEVELS.CRITICAL;
        }
        
        // Обновляем шейдер земли с учетом уровня загрязнения
        if (this.earth.material.uniforms) {
            // Добавляем параметр тонирования (оттенка) в шейдере Земли
            if (!this.earth.material.uniforms.pollutionTint) {
                this.earth.material.uniforms.pollutionTint = { value: new THREE.Vector3(...pollutionLevel.earthTint) };
            } else {
                this.earth.material.uniforms.pollutionTint.value.set(...pollutionLevel.earthTint);
            }
            
            // Добавляем параметр уровня загрязнения
            if (!this.earth.material.uniforms.pollutionLevel) {
                this.earth.material.uniforms.pollutionLevel = { value: this.currentPollutionLevel / 100.0 };
            } else {
                this.earth.material.uniforms.pollutionLevel.value = this.currentPollutionLevel / 100.0;
            }
        }
        
        // Обновляем атмосферу
        if (this.atmosphere && this.atmosphere.material.uniforms) {
            // Добавляем параметр цвета атмосферы в зависимости от загрязнения
            if (!this.atmosphere.material.uniforms.pollutionColor) {
                this.atmosphere.material.uniforms.pollutionColor = { 
                    value: new THREE.Vector3(...pollutionLevel.atmosphereColor) 
                };
            } else {
                this.atmosphere.material.uniforms.pollutionColor.value.set(...pollutionLevel.atmosphereColor);
            }
            
            // Добавляем параметр уровня загрязнения для атмосферы
            if (!this.atmosphere.material.uniforms.pollutionLevel) {
                this.atmosphere.material.uniforms.pollutionLevel = { value: this.currentPollutionLevel / 100.0 };
            } else {
                this.atmosphere.material.uniforms.pollutionLevel.value = this.currentPollutionLevel / 100.0;
            }
        }
        
        // Особые визуальные эффекты при критическом уровне загрязнения
        if (this.currentPollutionLevel > 90) {
            // Более выраженный наклон планеты для визуализации нестабильности
            const extraTilt = (this.currentPollutionLevel - 90) * 0.01;
            this.earthGroup.rotation.z = EARTH_TILT + extraTilt;
        } else {
            // Возвращаем нормальный наклон
            this.earthGroup.rotation.z = EARTH_TILT;
        }
    }
    
    // Метод для создания эффекта разрушения планеты при 100% загрязнения
    renderDestructionEffect() {
        // Если уже запустили анимацию разрушения, то не запускаем снова
        if (this.destructionStarted) return;
        
        this.destructionStarted = true;
        console.log("Начало анимации разрушения планеты!");
        
        // Усиливаем тряску
        const animateDestruction = () => {
            if (this.disposed || !this.earth) return;
            
            const progress = (performance.now() - this.destructionStartTime) / 5000; // 5-секундная анимация
            
            if (progress < 1) {
                // Увеличиваем тряску
                const shakeAmount = 0.02 + progress * 0.1;
                this.earthGroup.position.x = Math.sin(performance.now() * 0.01) * shakeAmount;
                this.earthGroup.position.y = Math.cos(performance.now() * 0.01) * shakeAmount;
                
                // Изменяем скорость вращения
                this.earth.rotation.y += EARTH_ROTATION_SPEED * (1 + progress * 3);
                
                // Постепенно меняем цвет планеты на красный
                if (this.earth.material.uniforms.pollutionTint) {
                    const red = 1.0 - progress * 0.4;
                    const green = 0.4 - progress * 0.4;
                    const blue = 0.3 - progress * 0.3;
                    this.earth.material.uniforms.pollutionTint.value.set(red, green, blue);
                }
                
                // Постепенно увеличиваем интенсивность атмосферы
                if (this.atmosphere && this.atmosphere.material.uniforms) {
                    // Атмосфера становится красной и плотной
                    if (this.atmosphere.material.uniforms.pollutionColor) {
                        const red = 0.8 + progress * 0.2;
                        const green = 0.3 - progress * 0.2;
                        const blue = 0.2 - progress * 0.2;
                        this.atmosphere.material.uniforms.pollutionColor.value.set(red, green, blue);
                    }
                }
                
                requestAnimationFrame(animateDestruction);
            } else {
                // Завершающий этап - показываем сообщение о катастрофе
                if (window.errorHandler) {
                    window.errorHandler.show("Планета уничтожена! Начните заново, чтобы спасти Землю.");
                } else {
                    alert("Планета уничтожена! Начните заново, чтобы спасти Землю.");
                }
                
                // Сбрасываем уровень загрязнения до 80%
                localStorage.setItem('earthPollution', "80");
                this.currentPollutionLevel = 80;
                this.updatePlanetAppearance();
                this.destructionStarted = false;
                
                // Возвращаем планету в нормальное положение
                this.earthGroup.position.x = 0;
                this.earthGroup.position.y = 0;
            }
        };
        
        this.destructionStartTime = performance.now();
        animateDestruction();
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 