import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  
  // Загружаем текстуры с обработкой ошибок
  const [colorMap, normalMap, roughnessMap] = useLoader(THREE.TextureLoader, [
    '/textures/earth_daymap.jpg',
    '/textures/earth_normal_map.jpg',
    '/textures/earth_roughness_map.jpg'
  ]);

  // Создаем материал с помощью useMemo для оптимизации
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: colorMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: roughnessMap,
      roughness: 0.7,
      metalness: 0.1,
      envMapIntensity: 0.4,
    });
  }, [colorMap, normalMap, roughnessMap]);

  // Анимация вращения
  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group>
      <Sphere
        ref={earthRef}
        args={[1, 64, 64]}
        material={earthMaterial}
        castShadow
        receiveShadow
      />
    </group>
  );
};

export default Earth; 