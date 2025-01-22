import React, { useCallback } from 'react';
import { useThree } from '@react-three/fiber';

const NavigationPanel = () => {
  const { camera, controls } = useThree();

  const handleView = useCallback(() => {
    if (controls) {
      controls.reset();
    }
  }, [controls]);

  const handleCenter = useCallback(() => {
    if (camera && controls) {
      camera.position.set(0, 2, 5);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [camera, controls]);

  const handleReset = useCallback(() => {
    if (camera && controls) {
      camera.position.set(0, 2, 5);
      camera.rotation.set(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [camera, controls]);

  return (
    <div className="navigation-panel">
      <button className="nav-button" onClick={handleView}>🌍 View</button>
      <button className="nav-button" onClick={handleCenter}>🎯 Center</button>
      <button className="nav-button" onClick={handleReset}>🔄 Reset</button>
    </div>
  );
};

export default NavigationPanel; 