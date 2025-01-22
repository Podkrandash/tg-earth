import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Константы для вращения
const DAY_MS = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
const ROTATION_SPEED = (2 * Math.PI) / DAY_MS; // Полный оборот за 24 часа
const EARTH_TILT = 23.5 * Math.PI / 180; // Наклон оси Земли
const MOON_ORBITAL_PERIOD = 27.3; // Сидерический период обращения Луны (дни)
const MOON_DISTANCE = 10; // Расстояние от Земли до Луны (в условных единицах)
const MOON_TILT = 5.14 * Math.PI / 180; // Наклон орбиты Луны к эклиптике

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

        // Создаем Землю и Луну
        this.createEarth();
        this.createMoon();

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
        
        const elapsed = (Date.now() - this.startTime) * 0.001;
        
        // Вращаем Землю вокруг своей оси
        if (this.earth) {
            this.earth.rotation.y = elapsed * 0.1; // Скорость вращения Земли
        }
        
        // Вращаем Луну вокруг Земли
        if (this.moonOrbit) {
            // Один оборот за MOON_ORBITAL_PERIOD дней
            const moonAngle = (elapsed * 0.1) / MOON_ORBITAL_PERIOD;
            this.moonOrbit.rotation.y = moonAngle;
            
            // Синхронное вращение Луны (всегда повернута одной стороной к Земле)
            if (this.moon) {
                this.moon.rotation.y = -moonAngle;
            }
        }
        
        // Обновляем контроли камеры (для управления пользователем)
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
                varying vec3 vPosition;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
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
                varying vec3 vPosition;

                void main() {
                    vec3 normal = normalize(vNormal);
                    float cosAngle = dot(normal, normalize(sunDirection));
                    
                    // Плавный переход между днем и ночью
                    float transition = smoothstep(-0.1, 0.1, cosAngle);
                    
                    // Получаем цвета из текстур
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    vec4 clouds = texture2D(cloudsTexture, vUv);
                    
                    // Усиливаем яркость ночных огней
                    vec4 nightLights = nightColor * vec4(2.0, 1.8, 1.5, 1.0);
                    
                    // Смешиваем день и ночь
                    vec4 groundColor = mix(nightLights, dayColor, transition);
                    
                    // Добавляем облака только на дневной стороне
                    vec4 cloudColor = clouds * transition;
                    
                    // Финальный цвет с облаками
                    gl_FragColor = groundColor + cloudColor * 0.3;
                }
            `
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.castShadow = true;
        this.earth.receiveShadow = true;
        this.earthGroup.add(this.earth);

        // Создаем реалистичную атмосферу
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vAtmosphereHeight;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vPosition = worldPosition.xyz;
                    vAtmosphereHeight = position.y;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 sunDirection;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vAtmosphereHeight;

                void main() {
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float cosAngle = dot(vNormal, normalize(sunDirection));
                    
                    // Рассеивание Рэлея
                    float rayleigh = 1.0 - pow(abs(dot(viewDirection, vNormal)), 2.0);
                    
                    // Свечение на краях
                    float rimLight = 1.0 - abs(dot(viewDirection, vNormal));
                    rimLight = pow(rimLight, 3.0);
                    
                    // Цвет атмосферы зависит от высоты и освещения
                    vec3 atmosphereColor = mix(
                        vec3(0.3, 0.6, 1.0),  // Голубой у поверхности
                        vec3(0.2, 0.4, 0.8),  // Темно-синий вверху
                        vAtmosphereHeight
                    );
                    
                    // Интенсивность зависит от освещения
                    float sunEffect = max(0.0, cosAngle);
                    float intensity = (rayleigh + rimLight) * sunEffect;
                    
                    gl_FragColor = vec4(atmosphereColor, intensity * 0.3);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
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

        // Создаем шейдерный материал для Луны
        const moonMaterial = new THREE.ShaderMaterial({
            uniforms: {
                moonTexture: { value: moonTexture },
                normalMap: { value: moonNormalMap },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D moonTexture;
                uniform sampler2D normalMap;
                uniform vec3 sunDirection;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vec3 normal = normalize(vNormal);
                    float cosAngle = dot(normal, normalize(sunDirection));
                    
                    // Получаем цвет из текстуры
                    vec4 moonColor = texture2D(moonTexture, vUv);
                    
                    // Делаем темную сторону полностью черной
                    float dayStrength = smoothstep(-0.1, 0.1, cosAngle);
                    
                    // Добавляем легкое свечение на краях кратеров
                    float rimLight = pow(1.0 - abs(dot(normal, normalize(cameraPosition - vPosition))), 4.0);
                    rimLight *= max(0.0, cosAngle) * 0.2;
                    
                    // Финальный цвет
                    gl_FragColor = moonColor * (dayStrength + rimLight);
                }
            `
        });

        // Создаем меш луны
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.castShadow = true;
        this.moon.receiveShadow = true;

        // Помещаем луну на орбиту
        this.moon.position.x = MOON_DISTANCE;
        this.moonOrbit.add(this.moon);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 