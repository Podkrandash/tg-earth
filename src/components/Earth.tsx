import React from 'react';
import * as THREE from 'three';

const Earth: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhongMaterial 
        color="blue"
        side={THREE.DoubleSide}
        shininess={50}
      />
    </mesh>
  );
};

export default Earth; 