import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import Earth from './components/Earth';
import './styles/App.css';

declare global {
  interface Window {
    TelegramGameProxy?: {
      initParams: () => { [key: string]: string };
      onEvent: (eventName: string, eventData?: string) => void;
    };
  }
}

function App() {
  useEffect(() => {
    // Initialize game
    if (window.TelegramGameProxy) {
      // Get initial parameters
      const params = window.TelegramGameProxy.initParams();
      console.log('Game initialized with params:', params);

      // Report game loaded
      window.TelegramGameProxy.onEvent('game_loaded');
    }
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
        />
      </Canvas>
    </div>
  );
}

export default App; 