import React from 'react';
import * as THREE from 'three';

const Earth: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color="royalblue"
        metalness={0.5}
        roughness={0.5}
      />
    </mesh>
  );
};

export default Earth; 