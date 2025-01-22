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
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Добавляем точечный свет (имитация солнца)
        this.sunLight = new THREE.PointLight(0xffffff, 2.0, 100);
        this.sunLight.position.set(50, 0, 0);
        this.scene.add(this.sunLight);

        // Создаем группу для Земли с наклоном оси
        this.earthGroup = new THREE.Group();
        this.earthGroup.rotation.z = EARTH_TILT;
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

        // Расширенная интеграция с Telegram
        if (window.TelegramGameProxy) {
            // Сообщаем о загрузке игры
            window.TelegramGameProxy.onEvent('game_loaded');
            
            // Запрашиваем полноэкранный режим
            window.TelegramGameProxy.requestFullscreen();

            // Отправляем счет (в данном случае просто 1, так как это не игра на очки)
            window.TelegramGameProxy.setScore(1);

            // Добавляем обработчики событий Telegram
            window.TelegramGameProxy.onEvent('game_over', () => {
                console.log('Game over event');
            });

            window.TelegramGameProxy.onEvent('game_quit', () => {
                console.log('Game quit event');
            });

            // Сообщаем о готовности игры
            window.TelegramGameProxy.onEvent('game_ready');
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
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        
        // Вращение Земли (один оборот за 24 часа)
        if (this.earth) {
            this.earth.rotation.y = (elapsed * ROTATION_SPEED) % (2 * Math.PI);
            
            // Обновляем позицию солнца (противоположно вращению Земли)
            const radius = 50;
            const sunAngle = -this.earth.rotation.y;
            this.sunLight.position.x = Math.cos(sunAngle) * radius;
            this.sunLight.position.z = Math.sin(sunAngle) * radius;
            
            // Обновляем uniform для шейдера
            if (this.earth.material.uniforms) {
                this.earth.material.uniforms.sunPosition.value.copy(this.sunLight.position);
            }
            if (this.atmosphere && this.atmosphere.material.uniforms) {
                this.atmosphere.material.uniforms.sunPosition.value.copy(this.sunLight.position);
            }
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

        // Создаем материал земли с шейдером для дневной и ночной стороны
        const earthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: dayTexture },
                nightTexture: { value: nightTexture },
                normalMap: { value: normalTexture },
                roughnessMap: { value: roughnessTexture },
                sunPosition: { value: this.sunLight.position.clone() }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D dayTexture;
                uniform sampler2D nightTexture;
                uniform sampler2D normalMap;
                uniform sampler2D roughnessMap;
                uniform vec3 sunPosition;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vec3 sunDirection = normalize(sunPosition - vPosition);
                    float cosAngle = dot(vNormal, sunDirection);
                    
                    // Получаем цвета из текстур
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    
                    // Делаем более жесткий переход между днем и ночью
                    float transition = smoothstep(-0.05, 0.05, cosAngle);
                    
                    // Ночная сторона полностью черная, только огни городов
                    vec4 nightLights = nightColor * (1.0 - transition) * vec4(5.0, 4.0, 3.0, 1.0);
                    vec4 baseColor = mix(vec4(0.0, 0.0, 0.0, 1.0), dayColor, pow(transition, 1.5));
                    
                    // Финальный цвет: черная ночь + яркие огни
                    gl_FragColor = baseColor + (nightLights * pow(1.0 - transition, 2.0));
                }
            `
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earthGroup.add(this.earth);

        // Улучшенная атмосфера с градиентом и свечением
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunPosition: { value: this.sunLight.position.clone() }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 sunPosition;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec3 sunDirection = normalize(sunPosition - vPosition);
                    float intensity = pow(0.75 - dot(vNormal, normalize(cameraPosition - vPosition)), 3.0);
                    float sunEffect = max(0.0, dot(vNormal, sunDirection));
                    
                    // Делаем атмосферу более заметной на освещенной стороне
                    vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
                    vec3 glowColor = mix(vec3(0.0), atmosphereColor, sunEffect);
                    
                    gl_FragColor = vec4(glowColor, intensity * 0.3 * sunEffect);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.earthGroup.add(this.atmosphere);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 