import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import Earth from './components/Earth';
import Atmosphere from './components/Atmosphere';
import './styles/App.css';

interface TelegramGameProxy {
  initParams: () => Record<string, string>;
  onEvent: (eventName: string, eventData?: string) => void;
  shareScore?: () => void;
  requestFullscreen?: () => void;
}

declare global {
  interface Window {
    TelegramGameProxy?: TelegramGameProxy;
  }
}

function App() {
  useEffect(() => {
    const tg = window.TelegramGameProxy;
    if (tg) {
      // Initialize game
      tg.initParams();
      
      // Report game loaded
      tg.onEvent('game_loaded');
      
      // Request fullscreen after a short delay
      setTimeout(() => {
        if (tg.requestFullscreen) {
          tg.requestFullscreen();
        }
      }, 100);
    }

    // Prevent default touch behavior
    const preventDefault = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <div className="App">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 60 }}
        style={{ height: '100vh', width: '100vw', background: '#000' }}
      >
        <Environment preset="city" />
        <Grid infiniteGrid position={[0, -1, 0]} />
        <Earth />
        <Atmosphere />
        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

export default App; 