/// <reference types="@react-three/fiber" />
/// <reference types="@react-three/drei" />

declare module '*.css';
declare module '*.jpg';
declare module '*.png';

import { Object3DNode } from '@react-three/fiber';
import { DirectionalLight, AmbientLight } from 'three';

declare module '@react-three/fiber' {
  interface ThreeElements {
    ambientLight: Object3DNode<AmbientLight, typeof AmbientLight>;
    directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight>;
  }
} 