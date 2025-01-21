import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
  const material = new THREE.MeshStandardMaterial({
    color: "royalblue",
    metalness: 0.5,
    roughness: 0.5
  });

  return (
    <Sphere args={[1, 32, 32]} material={material} />
  );
};

export default Earth; 