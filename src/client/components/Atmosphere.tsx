import React from 'react';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Atmosphere: React.FC = () => {
  return (
    <Sphere args={[1.1, 64, 64]}>
      <meshBasicMaterial
        color={new THREE.Color(0x3388ff)}
        transparent={true}
        opacity={0.1}
        side={THREE.BackSide}
      />
    </Sphere>
  );
};

export default Atmosphere; 