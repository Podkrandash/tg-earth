import React from 'react';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Atmosphere = () => {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x3388ff),
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  });

  return (
    <Sphere args={[1.1, 64, 64]} material={material} />
  );
};

export default Atmosphere; 