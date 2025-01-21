import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <Sphere
      ref={earthRef}
      args={[1, 32, 32]}
      material={
        new THREE.MeshPhongMaterial({
          color: "royalblue",
          shininess: 30,
          specular: new THREE.Color(0x444444)
        })
      }
    />
  );
};

export default Earth; 