import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Константы для вращения
const EARTH_ROTATION_SPEED = 0.001; // Скорость вращения Земли
const MOON_ROTATION_SPEED = 0.00037; // Скорость вращения Луны (27.3 раза медленнее Земли)
const EARTH_TILT = 23.5 * Math.PI / 180; // Наклон оси Земли
const MOON_DISTANCE = 10; // Расстояние от Земли до Луны
const MOON_TILT = 5.14 * Math.PI / 180; // Наклон орбиты Луны к эклиптике

class Earth {
    constructor() {
        this.disposed = false;
        this.initGame();
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    async initGame() {
        try {
            // Показываем загрузочный экран сразу
            this.playLoadingAnimation();
            
            // Инициализируем Telegram и сцену последовательно
            await this.setupTelegram();
            await this.initScene();
            
            // Запускаем анимацию только после полной инициализации
            this.animate();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showErrorMessage('Failed to load the game. Please refresh the page.');
        }
    }

    async setupTelegram() {
        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                
                window.Telegram.WebApp.onEvent('viewportChanged', () => {
                    if (!this.disposed) this.onWindowResize();
                });
            } catch (error) {
                console.error('Telegram initialization error:', error);
            }
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
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = 'rgba(0,0,0,0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }

    loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        const texturesToLoad = [
            'textures/earth_daymap.jpg',
            'textures/earth_nightmap.jpg',
            'textures/earth_normal_map.jpg',
            'textures/earth_specular_map.jpg',
            'textures/earth_clouds.jpg',
            'textures/moon_map.jpg',
            'textures/moon_normal.jpg'
        ];

        const loadPromises = texturesToLoad.map(url => 
            new Promise((resolve, reject) => {
                textureLoader.load(url, resolve, undefined, reject);
            })
        );

        return Promise.all(loadPromises);
    }

    playLoadingAnimation() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingContainer = document.getElementById('loading-container');
        const loadingMoon = document.getElementById('loading-moon');
        const loadingEarth = document.getElementById('loading-earth');
        const sceneContainer = document.getElementById('scene-container');
        const navPanel = document.querySelector('.nav-panel');

        // Показываем загрузочный экран
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        
        // Скрываем основную сцену и панель навигации
        if (sceneContainer) {
            sceneContainer.style.display = 'block';
            sceneContainer.style.opacity = '0';
        }
        if (navPanel) {
            navPanel.style.display = 'none';
        }

        // Запускаем пиксельную анимацию вращения
        if (loadingEarth) {
            loadingEarth.style.animation = 'rotate 2s steps(4) infinite';
        }
        if (loadingMoon) {
            loadingMoon.style.animation = 'orbit 2s steps(4) infinite';
        }
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
            logarithmicDepthBuffer: true // Включаем логарифмический буфер глубины
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
            
            // Предотвращаем свайпы
            document.addEventListener('touchstart', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            document.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            // Предотвращаем масштабирование страницы
            document.addEventListener('gesturestart', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            // Обработка потери контекста WebGL
            this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                this.renderer.setAnimationLoop(null);
            }, false);
            
            this.renderer.domElement.addEventListener('webglcontextrestored', () => {
                this.renderer.setAnimationLoop(() => this.animate());
            }, false);
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
        
        // Сохраняем начальный зум
        this.lastZoom = this.camera.zoom;

        // Создаем Землю и Луну
        this.createEarth();
        this.createMoon();

        // Создаем звездное небо
        this.createStars();

        // Обработчики событий
        window.addEventListener('resize', () => this.onWindowResize());

        // Запускаем анимацию
        this.startTime = Date.now();
        this.animate();

        // После полной инициализации скрываем загрузочный экран
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingContainer = document.getElementById('loading-container');
        const loadingMoon = document.getElementById('loading-moon');
        const loadingEarth = document.getElementById('loading-earth');
        const sceneContainer = document.getElementById('scene-container');
        const navPanel = document.querySelector('.nav-panel');

        if (loadingEarth) loadingEarth.style.animation = 'none';
        if (loadingMoon) loadingMoon.style.animation = 'none';

        // Показываем сцену
        if (sceneContainer) {
            sceneContainer.style.opacity = '1';
        }

        // Скрываем загрузочный экран
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }

        // Показываем панель навигации
        if (navPanel) {
            navPanel.style.display = 'flex';
            requestAnimationFrame(() => {
                navPanel.style.opacity = '1';
            });
        }
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
        const specularTexture = textureLoader.load('textures/earth_specular_map.jpg');
        const cloudsTexture = textureLoader.load('textures/earth_clouds.jpg');

        // Настраиваем текстуры
        dayTexture.encoding = THREE.sRGBEncoding;
        nightTexture.encoding = THREE.sRGBEncoding;

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
                uniform sampler2D dayTexture;
                uniform sampler2D nightTexture;
                uniform sampler2D normalMap;
                uniform sampler2D specularMap;
                uniform sampler2D cloudsTexture;
                uniform vec3 sunDirection;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;

                void main() {
                    float cosAngle = dot(vWorldNormal, sunDirection);
                    float transition = smoothstep(-0.2, 0.2, cosAngle);
                    
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    vec4 clouds = texture2D(cloudsTexture, vUv);
                    
                    // Увеличиваем яркость и насыщенность дневной стороны
                    dayColor.rgb *= 1.8;
                    dayColor.rgb = pow(dayColor.rgb, vec3(0.9)); // Увеличиваем контраст
                    
                    // Настраиваем ночные огни
                    vec4 nightLights = nightColor * vec4(2.5, 2.2, 1.8, 1.0);
                    
                    vec4 groundColor = mix(nightLights, dayColor, transition);
                    
                    // Делаем облака ярче на дневной стороне
                    clouds.rgb *= 1.5;
                    vec4 cloudColor = clouds * transition;
                    
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
                cameraPosition: { value: this.camera.position }
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
                    
                    // Цвет атмосферы зависит от высоты и освещения
                    vec3 dayColor = mix(
                        vec3(0.4, 0.7, 1.0),  // Голубой у поверхности
                        vec3(0.2, 0.4, 0.8),  // Темно-синий вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    vec3 nightColor = mix(
                        vec3(0.1, 0.1, 0.2),  // Темно-синий у поверхности
                        vec3(0.05, 0.05, 0.1), // Почти черный вверху
                        vAtmosphereHeight * 0.5 + 0.5
                    );
                    
                    // Интенсивность зависит от освещения
                    float sunEffect = smoothstep(-0.2, 0.3, cosAngle);
                    vec3 atmosphereColor = mix(nightColor, dayColor, sunEffect);
                    
                    // Добавляем свечение на краях
                    float intensity = mix(0.3, 1.0, rimLight) * mix(0.2, 1.0, rayleigh);
                    
                    // Добавляем рассеивание света в атмосфере
                    vec3 finalColor = atmosphereColor * intensity;
                    finalColor += vec3(1.0, 1.0, 1.0) * pow(rimLight, 8.0) * 0.3;
                    
                    gl_FragColor = vec4(finalColor, intensity * 0.3);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.renderOrder = 1; // Рендерим атмосферу после Земли
        this.earthGroup.add(atmosphere);
    }

    createMoon() {
        // Загрузка текстур Луны
        const textureLoader = new THREE.TextureLoader();
        const moonTexture = textureLoader.load('textures/moon_map.jpg');
        const moonNormalMap = textureLoader.load('textures/moon_normal.jpg');

        // Настройка текстур
        moonTexture.encoding = THREE.sRGBEncoding;

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
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 