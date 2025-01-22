import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

// Константы для вращения
const BASE_ROTATION_SPEED = 0.001;
const ORBIT_SPEED_FACTOR = 100; // Замедляем орбитальное движение
const SELF_ROTATION_FACTOR = 50; // Фактор для собственного вращения планет

// Загрузчик текстур
const textureLoader = new THREE.TextureLoader();

// Функция для загрузки текстур планеты
function loadPlanetTextures(name) {
    return {
        map: textureLoader.load(`/textures/${name}_map.jpg`),
        normalMap: textureLoader.load(`/textures/${name}_normal.jpg`)
    };
}

// Улучшенный шейдер атмосферы с рассеиванием Релея
const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vViewPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPosition = worldPosition.xyz;
    vViewPosition = cameraPosition - worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const atmosphereFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vViewPosition;

uniform vec3 sunPosition;
uniform vec3 atmosphereColor;
uniform float atmospherePower;
uniform float time;

const float R0 = 0.8;
const float ATMOSPHERE_THICKNESS = 0.3;
const vec3 BETA_R = vec3(5.5e-6, 13.0e-6, 22.4e-6); // Коэффициенты рассеивания Релея
const float G = -0.85; // Фактор асимметрии Хеньи-Гринштейна

float miePhase(float cosTheta) {
    float g = G;
    float g2 = g * g;
    return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
}

float rayleighPhase(float cosTheta) {
    return 0.75 * (1.0 + cosTheta * cosTheta);
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(sunPosition - vPosition);
    float cosTheta = dot(viewDir, lightDir);
    
    // Рассчитываем рассеивание Релея
    float rayleigh = rayleighPhase(cosTheta);
    float mie = miePhase(cosTheta);
    
    // Рассчитываем оптическую глубину
    float viewDist = length(vViewPosition);
    float depth = exp(-viewDist * 0.1);
    
    // Добавляем градиент от центра к краям
    float edgeFactor = pow(1.0 - abs(dot(viewDir, vNormal)), atmospherePower);
    
    // Добавляем временную анимацию для легкого свечения
    float glow = sin(time * 0.5) * 0.1 + 0.9;
    
    // Комбинируем все эффекты
    vec3 rayleighColor = BETA_R * rayleigh;
    vec3 mieColor = vec3(0.1) * mie;
    vec3 totalScattering = (rayleighColor + mieColor) * atmosphereColor;
    
    // Финальный цвет атмосферы
    vec3 finalColor = totalScattering * edgeFactor * glow;
    float alpha = edgeFactor * depth;
    
    gl_FragColor = vec4(finalColor, alpha * 0.6);
}`;

// Улучшенный шейдер короны солнца
const enhancedCoronaVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewPosition = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const enhancedCoronaFragmentShader = `
uniform vec3 glowColor;
uniform float time;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    float intensity = pow(0.75 - dot(normalize(vNormal), normalize(vViewPosition)), 3.0);
    
    // Плавная пульсация без тряски
    float pulse = 1.0 + 0.1 * sin(time * 0.5);
    
    vec3 glow = glowColor * intensity * pulse;
    gl_FragColor = vec4(glow, intensity * 0.6);
}`;

class Earth {
    constructor() {
        // Инициализация сцены
        this.container = document.getElementById('scene-container');
        this.scene = new THREE.Scene();
        
        // Возвращаем черный фон
        this.scene.background = new THREE.Color(0x000000);
        
        // Создаем красивый космический фон
        this.createSpaceBackground();
        
        // Настройка камеры
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Устанавливаем начальную позицию камеры ближе к Земле
        this.camera.position.set(0, 5, 15);

        // Настройка рендерера
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // Создаем группу для солнечной системы на заднем плане
        this.solarSystemGroup = new THREE.Group();
        this.solarSystemGroup.position.set(-100, -50, -200);
        this.scene.add(this.solarSystemGroup);

        // Создаем Солнце в центре солнечной системы
        this.createSun();
        this.sun.position.set(0, 0, 0); // Фиксируем Солнце в центре

        // Создаем планеты с текстурами
        const planetData = [
            { 
                name: 'mercury', 
                size: 0.383,
                color: 0x8B7355, // Коричнево-серый
                distance: 58,
                orbitTilt: 7.0,
                orbitPeriod: 88,
                metalness: 0.5,
                roughness: 0.7
            },
            { 
                name: 'venus', 
                size: 0.949,
                color: 0xBEB894, // Бежево-коричневый
                distance: 108,
                orbitTilt: 3.4,
                orbitPeriod: 225,
                metalness: 0.3,
                roughness: 0.8
            },
            { 
                name: 'mars', 
                size: 0.532,
                color: 0xA0522D, // Темно-красный
                distance: 228,
                orbitTilt: 1.9,
                orbitPeriod: 687,
                metalness: 0.3,
                roughness: 0.9
            },
            { 
                name: 'jupiter', 
                size: 11.209,
                color: 0xC19A6B, // Песочно-коричневый
                distance: 778,
                orbitTilt: 1.3,
                orbitPeriod: 4333,
                metalness: 0.3,
                roughness: 0.6
            },
            { 
                name: 'saturn', 
                size: 9.449,
                color: 0xDAA520, // Темно-золотой
                distance: 1427,
                orbitTilt: 2.5,
                orbitPeriod: 10759,
                metalness: 0.3,
                roughness: 0.6
            },
            { 
                name: 'uranus', 
                size: 4.007,
                color: 0x4682B4, // Стально-голубой
                distance: 2871,
                orbitTilt: 0.8,
                orbitPeriod: 30687,
                metalness: 0.4,
                roughness: 0.7
            },
            { 
                name: 'neptune', 
                size: 3.883,
                color: 0x4169E1, // Темно-синий
                distance: 4497,
                orbitTilt: 1.8,
                orbitPeriod: 60190,
                metalness: 0.4,
                roughness: 0.7
            }
        ];

        // Масштабирование для фоновых планет
        const DISTANCE_SCALE = 2; // Увеличиваем расстояния для лучшей видимости на фоне
        const SIZE_SCALE = 1; // Нормальный размер планет

        this.planets = [];
        planetData.forEach(planet => {
            const scaledSize = planet.size * SIZE_SCALE;
            const scaledDistance = planet.distance * DISTANCE_SCALE;
            
            const geometry = new THREE.SphereGeometry(scaledSize, 64, 64);
            const textures = loadPlanetTextures(planet.name);
            
            const material = new THREE.MeshPhysicalMaterial({
                color: planet.color,
                metalness: planet.metalness,
                roughness: planet.roughness,
                map: textures.map,
                normalMap: textures.normalMap,
                normalScale: new THREE.Vector2(0.05, 0.05)
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Создаем группу для планеты и её орбиты
            const planetGroup = new THREE.Group();
            
            // Наклоняем орбиту
            planetGroup.rotation.x = THREE.MathUtils.degToRad(planet.orbitTilt);
            
            // Располагаем планеты на орбитах
            const earthDaysInYear = 365.25;
            const initialAngle = (planet.orbitPeriod / earthDaysInYear) * Math.PI * 2;
            mesh.position.x = Math.cos(initialAngle) * scaledDistance;
            mesh.position.z = Math.sin(initialAngle) * scaledDistance;
            
            planetGroup.add(mesh);
            this.solarSystemGroup.add(planetGroup);
            
            this.planets.push({
                mesh,
                group: planetGroup,
                orbitRadius: scaledDistance,
                orbitSpeed: (2 * Math.PI) / (planet.orbitPeriod * ORBIT_SPEED_FACTOR),
                currentAngle: initialAngle,
                rotationSpeed: BASE_ROTATION_SPEED * (scaledDistance / SELF_ROTATION_FACTOR)
            });
        });

        // Создаем группу для Земли и атмосферы
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
        this.controls.enabled = true;
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };
        this.controls.update();

        // Создаем сферу Земли
        this.createEarth();

        // Создаем многослойную атмосферу
        const atmosphereLayers = 3; // Уменьшаем количество слоев
        this.atmospheres = [];
        
        for (let i = 0; i < atmosphereLayers; i++) {
            const scale = 1 + (i + 1) * 0.08; // Увеличиваем расстояние между слоями
            const geometry = new THREE.SphereGeometry(2 * scale, 128, 128);
            const material = new THREE.ShaderMaterial({
                vertexShader: atmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                uniforms: {
                    sunPosition: { value: new THREE.Vector3() },
                    atmosphereColor: { value: new THREE.Color(0x4ca7ff) },
                    atmospherePower: { value: 2.0 + i * 0.5 }, // Разная интенсивность для каждого слоя
                    time: { value: 0 }
                },
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false
            });
            const atmosphere = new THREE.Mesh(geometry, material);
            this.atmospheres.push(atmosphere);
            this.earthGroup.add(atmosphere);
        }

        // Настройка освещения
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(this.ambientLight);

        // Направленный свет от Солнца
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(100, 10, 100);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 1000;
        this.directionalLight.shadow.bias = -0.001;
        this.scene.add(this.directionalLight);
        
        // Добавляем цель для направленного света
        this.directionalLight.target = this.earth;

        // Включаем тени в рендерере
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Анимация звезд
        if (this.stars) {
            this.stars.rotation.y = time * 0.01;
        }
        
        // Анимация туманностей
        this.nebulae.forEach(nebula => {
            if (nebula.material.uniforms) {
                nebula.material.uniforms.time.value = time;
                nebula.rotation.z += 0.0001;
            }
        });
        
        // Обновляем позицию света от Солнца
        if (this.sun) {
            const sunWorldPosition = new THREE.Vector3();
            this.sun.getWorldPosition(sunWorldPosition);
            this.directionalLight.position.copy(sunWorldPosition);
            
            // Обновляем шейдеры короны солнца
            this.sun.children.forEach(child => {
                if (child.material && child.material.uniforms && child.material.uniforms.time) {
                    child.material.uniforms.time.value = time;
                }
            });
            
            // Обновляем интенсивность бликов
            if (this.updateLensflareIntensity) {
                this.updateLensflareIntensity();
            }
        }
        
        // Обновляем шейдеры атмосферы
        this.atmospheres.forEach(atmosphere => {
            if (atmosphere.material.uniforms) {
                atmosphere.material.uniforms.time.value = time;
                if (this.sun) {
                    const sunWorldPosition = new THREE.Vector3();
                    this.sun.getWorldPosition(sunWorldPosition);
                    atmosphere.material.uniforms.sunPosition.value.copy(sunWorldPosition);
                }
            }
        });
        
        // Автоматическое вращение Земли
        this.earth.rotation.y += BASE_ROTATION_SPEED;
        
        // Синхронное вращение атмосферы
        this.atmospheres.forEach(atmosphere => {
            atmosphere.rotation.y += BASE_ROTATION_SPEED;
        });
        
        // Вращение планет вокруг Солнца
        this.planets.forEach(planet => {
            planet.currentAngle += planet.orbitSpeed;
            const x = Math.cos(planet.currentAngle) * planet.orbitRadius;
            const z = Math.sin(planet.currentAngle) * planet.orbitRadius;
            planet.mesh.position.x = x;
            planet.mesh.position.z = z;
            planet.mesh.rotation.y += planet.rotationSpeed;
        });

        // Обновляем контроли камеры
        this.controls.update();
        
        // Обновляем направление солнца для шейдеров
        if (this.earth && this.earth.material.uniforms) {
            const sunDirection = new THREE.Vector3(100 * Math.cos(Date.now() * 0.0001), 0, 100 * Math.sin(Date.now() * 0.0001));
            this.earth.material.uniforms.sunDirection.value = sunDirection;
            if (this.atmosphere) {
                this.atmosphere.material.uniforms.sunDirection.value = sunDirection;
            }
        }
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }

    createSun() {
        const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
        const sunTexture = textureLoader.load('/textures/sun_map.jpg');
        sunTexture.wrapS = THREE.RepeatWrapping;
        sunTexture.wrapT = THREE.RepeatWrapping;
        
        const sunMaterial = new THREE.MeshBasicMaterial({
            map: sunTexture,
            color: 0xffdd00,
            transparent: true,
            opacity: 0.9
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        
        // Добавляем точечный свет от солнца с меньшей интенсивностью
        const sunLight = new THREE.PointLight(0xffffff, 0.8, 2000);
        sunLight.position.set(0, 0, 0);
        this.sun.add(sunLight);
        
        // Добавляем корону с меньшей яркостью
        const coronaGeometry = new THREE.SphereGeometry(5.2, 64, 64);
        const coronaMaterial = new THREE.ShaderMaterial({
            vertexShader: enhancedCoronaVertexShader,
            fragmentShader: enhancedCoronaFragmentShader,
            uniforms: {
                glowColor: { value: new THREE.Color(0xffaa00) },
                time: { value: 0 }
            },
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.sun.add(corona);
        
        // Добавляем внешнее свечение с меньшей яркостью
        const outerCoronaGeometry = new THREE.SphereGeometry(5.4, 64, 64);
        const outerCoronaMaterial = new THREE.ShaderMaterial({
            vertexShader: enhancedCoronaVertexShader,
            fragmentShader: enhancedCoronaFragmentShader,
            uniforms: {
                glowColor: { value: new THREE.Color(0xff6600) },
                time: { value: 0 }
            },
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const outerCorona = new THREE.Mesh(outerCoronaGeometry, outerCoronaMaterial);
        this.sun.add(outerCorona);
        
        // Уменьшаем интенсивность линзовых бликов
        const textureFlare = textureLoader.load('/textures/lensflare.png');
        this.lensflare = new Lensflare();
        
        this.lensflare.addElement(new LensflareElement(textureFlare, 200, 0, new THREE.Color(0xffffff)));
        this.lensflare.addElement(new LensflareElement(textureFlare, 60, 0.4, new THREE.Color(0xff8800)));
        this.lensflare.addElement(new LensflareElement(textureFlare, 40, 0.7, new THREE.Color(0xff4400)));
        this.lensflare.addElement(new LensflareElement(textureFlare, 30, 0.9, new THREE.Color(0xff0000)));
        this.lensflare.addElement(new LensflareElement(textureFlare, 20, 1.0, new THREE.Color(0xff8800)));
        
        this.sun.add(this.lensflare);
        this.sun.rotation.y = 0;
        this.solarSystemGroup.add(this.sun);
    }

    // Добавляем новый метод для создания космического фона
    createSpaceBackground() {
        // Создаем звездное небо
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 15000;
        const positions = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        const colors = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount; i++) {
            // Позиции звезд в форме сферы
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = Math.random() * 1000 + 500;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Уменьшаем размеры звезд
            sizes[i] = Math.random() * 1.5 + 0.5;

            // Делаем звезды более тусклыми
            let starType = Math.random();
            let color;
            if (starType < 0.2) {
                color = new THREE.Color(0x4169e1).multiplyScalar(0.8); // Ярче голубой
            } else if (starType < 0.4) {
                color = new THREE.Color(0xffd700).multiplyScalar(0.6); // Ярче желтый
            } else if (starType < 0.6) {
                color = new THREE.Color(0xff8c00).multiplyScalar(0.6); // Ярче оранжевый
            } else if (starType < 0.8) {
                color = new THREE.Color(0xff4500).multiplyScalar(0.6); // Ярче красный
            } else {
                color = new THREE.Color(0xffffff).multiplyScalar(0.7); // Ярче белый
            }

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
            `,
            fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, dist);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);

        // Создаем туманности
        const nebulaeCount = 5; // Уменьшаем количество туманностей
        this.nebulae = [];
        
        for (let i = 0; i < nebulaeCount; i++) {
            const size = Math.random() * 400 + 200; // Уменьшаем размер
            const geometry = new THREE.PlaneGeometry(size, size);

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                
                float rand(vec2 n) { 
                    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
                }
                
                float noise(vec2 p) {
                    vec2 ip = floor(p);
                    vec2 u = fract(p);
                    u = u * u * (3.0 - 2.0 * u);
                    float res = mix(
                        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
                        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
                    return res * res;
                }
                
                void main() {
                    vec2 uv = vUv;
                        float t = time * 0.02;
                        
                        float f = noise(uv * 3.0 + t);
                        f *= noise(uv * 6.0 - t);
                        
                        vec3 color1 = vec3(0.1, 0.2, 0.4); // Темно-синий
                        vec3 color2 = vec3(0.2, 0.1, 0.3); // Темно-фиолетовый
                        
                        vec3 finalColor = mix(color1, color2, f);
                        float alpha = f * 0.3; // Увеличиваем с 0.15 до 0.3
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const nebula = new THREE.Mesh(geometry, material);
            
            // Располагаем туманности дальше
            const radius = Math.random() * 600 + 800;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            nebula.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            nebula.rotation.x = Math.random() * Math.PI;
            nebula.rotation.y = Math.random() * Math.PI;
            nebula.rotation.z = Math.random() * Math.PI;
            
            this.nebulae.push(nebula);
            this.scene.add(nebula);
        }
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

        // Создаем материал земли с более светлой ночной стороной
        const earthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: dayTexture },
                nightTexture: { value: nightTexture },
                normalMap: { value: normalTexture },
                roughnessMap: { value: roughnessTexture },
                sunDirection: { value: new THREE.Vector3(100, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D dayTexture;
                uniform sampler2D nightTexture;
                uniform sampler2D normalMap;
                uniform sampler2D roughnessMap;
                uniform vec3 sunDirection;

                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                    vec3 normal = normalize(vNormal);
                    float cosAngle = dot(normal, normalize(sunDirection));
                    
                    // Получаем цвета из текстур
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    
                    // Делаем ночные огни очень яркими
                    vec4 brightNightColor = nightColor * vec4(60.0, 50.0, 35.0, 1.0);
                    
                    // Базовое свечение городов (всегда видимое)
                    vec4 baseCityLights = nightColor * vec4(15.0, 12.0, 8.0, 1.0);
                    
                    // Плавный переход между днем и ночью
                    float transition = smoothstep(-0.2, 0.2, cosAngle);
                    
                    // Усиливаем свечение на ночной стороне
                    float nightGlow = pow(1.0 - transition, 3.0);
                    vec4 nightGlowColor = brightNightColor * nightGlow;
                    
                    // Делаем ночную сторону более светлой
                    vec4 brightNightSide = dayColor * 0.3 + baseCityLights;
                    
                    // Смешиваем дневной цвет с базовым свечением городов
                    vec4 dayWithLights = mix(dayColor, baseCityLights, 0.2);
                    
                    // Добавляем амбиентное освещение для темной стороны
                    vec3 ambientLight = vec3(0.15, 0.15, 0.2);
                    
                    // Финальное смешивание с учетом перехода
                    vec4 finalColor = mix(brightNightSide + nightGlowColor, dayWithLights, transition);
                    finalColor.rgb += ambientLight * (1.0 - transition);
                    
                    // Добавляем свечение на границе дня и ночи
                    float edgeGlow = pow(1.0 - abs(cosAngle), 8.0) * 0.4;
                    finalColor.rgb += vec3(1.0, 0.9, 0.8) * edgeGlow;
                    
                    gl_FragColor = finalColor;
                }
            `
        });

        // Создаем меш земли
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);

        // Добавляем атмосферу с улучшенным свечением
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: new THREE.Vector3(100, 0, 0) }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 sunDirection;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, normalize(sunDirection)), 2.0);
                    gl_FragColor = vec4(0.3, 0.6, 1.0, intensity * 0.4);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(this.atmosphere);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 