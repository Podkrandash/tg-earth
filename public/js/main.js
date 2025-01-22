import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Замедляем вращение Земли
const ROTATION_SPEED = 0.00005;

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
        this.container.appendChild(this.renderer.domElement);

        // Добавляем точечный свет (имитация солнца)
        this.sunLight = new THREE.PointLight(0xffffff, 2.0, 100);
        this.sunLight.position.set(50, 0, 0);
        this.scene.add(this.sunLight);

        // Создаем группу для Земли
        this.earthGroup = new THREE.Group();
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

        // Интеграция с Telegram
        if (window.TelegramGameProxy) {
            window.TelegramGameProxy.onEvent('game_loaded');
            window.TelegramGameProxy.requestFullscreen();
        }

        // Запускаем анимацию
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
        
        // Медленное вращение Земли
        if (this.earth) {
            this.earth.rotation.y += ROTATION_SPEED;
            
            // Обновляем позицию солнца относительно вращения Земли
            const time = Date.now() * 0.001;
            const radius = 50;
            this.sunLight.position.x = Math.cos(time * 0.05) * radius;
            this.sunLight.position.z = Math.sin(time * 0.05) * radius;
            
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
                    
                    // Более резкий переход между днем и ночью
                    float transition = smoothstep(-0.1, 0.1, cosAngle);
                    
                    // Делаем ночную сторону темнее и усиливаем огни
                    vec4 nightLights = nightColor * (1.0 - transition) * vec4(3.0, 2.5, 2.0, 1.0);
                    vec4 baseColor = mix(vec4(0.0, 0.0, 0.0, 1.0), dayColor, transition);
                    
                    // Финальный цвет
                    gl_FragColor = baseColor + nightLights;
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