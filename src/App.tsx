import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import Earth from './components/Earth';
import './styles/App.css';

declare global {
  interface Window {
    TelegramGameProxy?: {
      initGame: () => void;
      postEvent: (type: string, data?: any) => void;
    };
  }
}

function App() {
  useEffect(() => {
    // Prevent default touch behavior
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    // Initialize game
    if (window.TelegramGameProxy?.initGame) {
      window.TelegramGameProxy.initGame();
      // Notify game is ready
      window.TelegramGameProxy.postEvent('GAME_READY');
    }

    return () => {
      document.removeEventListener('touchmove', (e) => e.preventDefault());
    };
  }, []);

  return (
    <div className="App">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 60 }}
        style={{ height: '100vh', background: '#000' }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Grid infiniteGrid position={[0, -1, 0]} />
        <Earth />
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