import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';

const Earth: React.FC = () => {
  const earthRef = useRef<THREE.Mesh>(null);

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
      />
      
      <group>
        <Atmosphere />
        <Sphere ref={earthRef} args={[1, 64, 64]}>
          <meshBasicMaterial color="blue" />
        </Sphere>
      </group>
    </>
  );
};

export default Earth; 