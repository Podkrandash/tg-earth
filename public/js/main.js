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
        this.initialized = false;
        this.disposed = false;
        this.initPromise = null;
        this.camera = null;
        this.renderer = null;
        this.scene = null;
        this.initGame().catch(error => {
            console.error('Failed to initialize game:', error);
            this.showError('Ошибка инициализации игры');
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
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
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));
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
            setTimeout(() => {
                elements.navPanel.style.display = 'flex';
                requestAnimationFrame(() => {
                    elements.navPanel.style.opacity = '1';
                });
            }, 300);
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