import React, { useCallback, createContext, useContext } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Создаем контекст для управления камерой
const CameraControlsContext = createContext<{
  handleView: () => void;
  handleCenter: () => void;
  handleReset: () => void;
}>({
  handleView: () => {},
  handleCenter: () => {},
  handleReset: () => {},
});

// Компонент для Three.js сцены
export const CameraControls = () => {
  const { camera, controls } = useThree();
  const orbitControls = controls as OrbitControlsImpl;

  const handleView = useCallback(() => {
    if (orbitControls) {
      orbitControls.reset();
    }
  }, [orbitControls]);

  const handleCenter = useCallback(() => {
    if (camera && orbitControls) {
      camera.position.set(0, 2, 5);
      orbitControls.target.set(0, 0, 0);
      orbitControls.update();
    }
  }, [camera, orbitControls]);

  const handleReset = useCallback(() => {
    if (camera && orbitControls) {
      camera.position.set(0, 2, 5);
      camera.rotation.set(0, 0, 0);
      orbitControls.target.set(0, 0, 0);
      orbitControls.update();
    }
  }, [camera, orbitControls]);

  React.useEffect(() => {
    // @ts-ignore
    window.cameraControls = { handleView, handleCenter, handleReset };
  }, [handleView, handleCenter, handleReset]);

  return null;
};

// UI компонент
const NavigationPanel = () => {
  const handleClick = (action: string) => {
    // @ts-ignore
    const controls = window.cameraControls;
    if (controls) {
      switch (action) {
        case 'view':
          controls.handleView();
          break;
        case 'center':
          controls.handleCenter();
          break;
        case 'reset':
          controls.handleReset();
          break;
      }
    }
  };

  return (
    <div className="navigation-panel">
      <button className="nav-button" onClick={() => handleClick('view')}>🌍 View</button>
      <button className="nav-button" onClick={() => handleClick('center')}>🎯 Center</button>
      <button className="nav-button" onClick={() => handleClick('reset')}>🔄 Reset</button>
    </div>
  );
};

export default NavigationPanel; 