import React from 'react';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Earth: React.FC = () => {
  return (
    <Sphere args={[1, 32, 32]} position={[0, 0, 0]}>
      <meshBasicMaterial color="blue" side={THREE.DoubleSide} />
    </Sphere>
  );
};

export default Earth; 