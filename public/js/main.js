import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
        normalMap: textureLoader.load(`/textures/${name}_normal.jpg`),
        specularMap: textureLoader.load(`/textures/${name}_specular.jpg`)
    };
}

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
        
        // Устанавливаем начальную позицию камеры дальше от Земли
        this.camera.position.set(0, 0, 12);

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
        this.solarSystemGroup.position.set(-100, 0, -150); // Изменяем позицию солнечной системы
        this.scene.add(this.solarSystemGroup);

        // Создаем улучшенное Солнце
        const sunGeometry = new THREE.SphereGeometry(15, 64, 64);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: 0.9,
            map: textureLoader.load('/textures/sun_map.jpg')
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 0, 0);
        this.solarSystemGroup.add(this.sun);

        // Добавляем корону Солнца
        const coronaGeometry = new THREE.SphereGeometry(17, 64, 64);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0xffdd00) }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(color, intensity * (0.6 + 0.4 * sin(time)));
                }
            `,
            transparent: true,
            side: THREE.BackSide
        });
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.sun.add(this.corona);

        // Добавляем свечение для Солнца
        this.sunLight = new THREE.PointLight(0xffdd00, 2, 2000);
        this.sunLight.position.copy(this.sun.position);
        this.solarSystemGroup.add(this.sunLight);

        // Создаем планеты с текстурами
        const planetData = [
            { 
                name: 'mercury', 
                size: 0.38, 
                color: 0x808080, 
                distance: 20, 
                orbitTilt: 7.0, 
                orbitPeriod: 88,
                metalness: 0.5,
                roughness: 0.7
            },
            { 
                name: 'venus', 
                size: 0.95, 
                color: 0xffd700, 
                distance: 35, 
                orbitTilt: 3.4, 
                orbitPeriod: 225,
                metalness: 0.3,
                roughness: 0.8
            },
            { 
                name: 'mars', 
                size: 0.53, 
                color: 0xff4500, 
                distance: 75, 
                orbitTilt: 1.9, 
                orbitPeriod: 687,
                metalness: 0.3,
                roughness: 0.9
            },
            { 
                name: 'jupiter', 
                size: 2.5, 
                color: 0xffa500, 
                distance: 120, 
                orbitTilt: 1.3, 
                orbitPeriod: 4333,
                metalness: 0.3,
                roughness: 0.6
            },
            { 
                name: 'saturn', 
                size: 2.2, 
                color: 0xffd700, 
                distance: 170, 
                orbitTilt: 2.5, 
                orbitPeriod: 10759,
                metalness: 0.3,
                roughness: 0.6
            },
            { 
                name: 'uranus', 
                size: 1.8, 
                color: 0x40e0d0, 
                distance: 220, 
                orbitTilt: 0.8, 
                orbitPeriod: 30687,
                metalness: 0.4,
                roughness: 0.7
            },
            { 
                name: 'neptune', 
                size: 1.7, 
                color: 0x0000ff, 
                distance: 270, 
                orbitTilt: 1.8, 
                orbitPeriod: 60190,
                metalness: 0.4,
                roughness: 0.7
            }
        ];

        this.planets = [];
        planetData.forEach(planet => {
            const geometry = new THREE.SphereGeometry(planet.size, 64, 64);
            const textures = loadPlanetTextures(planet.name);
            
            const material = new THREE.MeshPhysicalMaterial({
                color: planet.color,
                metalness: planet.metalness,
                roughness: planet.roughness,
                map: textures.map,
                normalMap: textures.normalMap,
                specularMap: textures.specularMap,
                normalScale: new THREE.Vector2(0.05, 0.05)
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Создаем группу для планеты и её орбиты
            const planetGroup = new THREE.Group();
            
            // Наклоняем орбиту
            planetGroup.rotation.x = THREE.MathUtils.degToRad(planet.orbitTilt);
            
            // Создаем орбиту
            const orbitGeometry = new THREE.RingGeometry(planet.distance, planet.distance + 0.2, 128);
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            planetGroup.add(orbit);
            
            // Располагаем планеты на орбитах
            const earthDaysInYear = 365.25;
            const initialAngle = (planet.orbitPeriod / earthDaysInYear) * Math.PI * 2;
            mesh.position.x = Math.cos(initialAngle) * planet.distance;
            mesh.position.z = Math.sin(initialAngle) * planet.distance;
            
            planetGroup.add(mesh);
            this.solarSystemGroup.add(planetGroup);
            
            this.planets.push({
                mesh,
                group: planetGroup,
                orbitRadius: planet.distance,
                orbitSpeed: (2 * Math.PI) / (planet.orbitPeriod * ORBIT_SPEED_FACTOR),
                currentAngle: initialAngle,
                rotationSpeed: BASE_ROTATION_SPEED * (planet.distance / SELF_ROTATION_FACTOR)
            });
        });

        // Создаем группу для Земли и атмосферы
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);

        // Настройка контролей орбиты
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.5;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.8;
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;
        this.controls.minPolarAngle = Math.PI * 0.1;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.target.set(0, 0, 0);
        this.controls.enabled = true; // Включаем управление камерой
        this.controls.update();

        // Создаем сферу Земли
        const earthGeometry = new THREE.SphereGeometry(2, 128, 128);
        const earthMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.5,
            map: new THREE.TextureLoader().load('/textures/earth_daymap.jpg'),
            bumpMap: new THREE.TextureLoader().load('/textures/earth_normal_map.jpg'),
            bumpScale: 0.05,
            specularMap: new THREE.TextureLoader().load('/textures/earth_roughness_map.jpg'),
            clearcoat: 0.1,
            clearcoatRoughness: 0.4
        });
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earthGroup.add(this.earth);

        // Создаем многослойную атмосферу
        const atmosphereLayers = 4;
        this.atmospheres = [];
        
        for (let i = 0; i < atmosphereLayers; i++) {
            const scale = 1 + (i + 1) * 0.05;
            const geometry = new THREE.SphereGeometry(2 * scale, 128, 128);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0x4ca7ff),
                transparent: true,
                opacity: 0.08 * (1 - i / atmosphereLayers),
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
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
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
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
        
        // Обновляем время для шейдера короны Солнца
        this.corona.material.uniforms.time.value += 0.01;
        
        // Вращаем Солнце
        this.sun.rotation.y += BASE_ROTATION_SPEED * 0.5;
        
        // Автоматическое вращение Земли
        this.earth.rotation.y += BASE_ROTATION_SPEED;
        
        // Синхронное вращение атмосферы
        this.atmospheres.forEach(atmosphere => {
            atmosphere.rotation.y += BASE_ROTATION_SPEED;
        });
        
        // Вращение планет вокруг Солнца с реальными периодами обращения
        this.planets.forEach(planet => {
            planet.currentAngle += planet.orbitSpeed;
            const x = Math.cos(planet.currentAngle) * planet.orbitRadius;
            const z = Math.sin(planet.currentAngle) * planet.orbitRadius;
            planet.mesh.position.x = x;
            planet.mesh.position.z = z;
            planet.mesh.rotation.y += planet.rotationSpeed;
        });

        // Обновляем позицию света от Солнца
        const sunWorldPosition = new THREE.Vector3();
        this.sun.getWorldPosition(sunWorldPosition);
        
        // Обновляем позицию точечного света
        this.sunLight.position.copy(sunWorldPosition);
        
        // Обновляем направленный свет от Солнца к Земле
        this.directionalLight.position.copy(sunWorldPosition);
        
        // Обновляем контроли камеры
        this.controls.update();
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

new Earth(); 