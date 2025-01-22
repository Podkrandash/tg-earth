import React, { useMemo } from 'react';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Atmosphere = () => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: {
        glowColor: { value: new THREE.Color(0x6699ff) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 2.0);
          gl_FragColor = vec4(glowColor, intensity);
        }
      `
    });
  }, []);

  return (
    <Sphere
      args={[1.025, 64, 64]}
      material={material}
      scale={[1.1, 1.1, 1.1]}
    />
  );
};

export default Atmosphere; 