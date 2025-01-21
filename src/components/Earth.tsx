import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth: React.FC = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  const [colorMap, normalMap, roughnessMap] = [
    new THREE.TextureLoader().load('/textures/earth_daymap.jpg'),
    new THREE.TextureLoader().load('/textures/earth_normal_map.jpg'),
    new THREE.TextureLoader().load('/textures/earth_roughness_map.jpg')
  ];

  useFrame(() => {
    if (earthRef.current && !earthRef.current.userData.isDragging) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <>
      <Sphere ref={earthRef} args={[1, 64, 64]}>
        <meshPhysicalMaterial
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          normalScale={new THREE.Vector2(0.2, 0.2)}
          roughness={0.7}
          metalness={0.1}
        />
      </Sphere>
    </>
  );
};

export default Earth; 