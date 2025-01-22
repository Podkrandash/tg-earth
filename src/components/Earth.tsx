import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  
  // Загружаем текстуры
  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    '/textures/earth_daymap.jpg',
    '/textures/earth_normal_map.jpg',
    '/textures/earth_specular_map.jpg',
    '/textures/earth_clouds.jpg'
  ]);

  // Создаем материалы с помощью useMemo для оптимизации
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: colorMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: specularMap,
      roughness: 0.7,
      metalness: 0.1,
      envMapIntensity: 0.4,
    });
  }, [colorMap, normalMap, specularMap]);

  const cloudsMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [cloudsMap]);

  // Анимация вращения
  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05; // Замедлил вращение
    }
  });

  return (
    <group>
      <Sphere
        ref={earthRef}
        args={[1, 64, 64]} // Увеличил детализацию
        material={earthMaterial}
        castShadow
        receiveShadow
      >
        <Sphere
          args={[1.01, 64, 64]}
          material={cloudsMaterial}
        />
      </Sphere>
    </group>
  );
};

export default Earth; 