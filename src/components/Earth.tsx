import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';

const Earth: React.FC = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  
  const [colorMap, normalMap, roughnessMap] = useTexture([
    '/textures/earth_daymap.jpg',
    '/textures/earth_normal_map.jpg',
    '/textures/earth_roughness_map.jpg'
  ]);

  useFrame(() => {
    if (earthRef.current && !earthRef.current.userData.isDragging) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <>
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={2}
        maxDistance={7}
        rotateSpeed={0.5}
        onStart={() => {
          if (earthRef.current) earthRef.current.userData.isDragging = true;
        }}
        onEnd={() => {
          if (earthRef.current) earthRef.current.userData.isDragging = false;
        }}
      />
      <group>
        <Atmosphere />
        <Sphere ref={earthRef} args={[1, 64, 64]}>
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={roughnessMap}
            normalScale={new THREE.Vector2(0.2, 0.2)}
            roughness={0.7}
            metalness={0.1}
          />
        </Sphere>
      </group>
    </>
  );
};

export default Earth; 