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
}

declare global {
  interface Window {
    TelegramGameProxy?: TelegramGameProxy;
  }
}

function App() {
  const [gameParams, setGameParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const tg = window.TelegramGameProxy;
    if (tg) {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId') || '';
      const messageId = urlParams.get('messageId') || '';
      const chatId = urlParams.get('chatId') || '';

      // Get game parameters
      const params = tg.initParams();
      setGameParams({ ...params, userId, messageId, chatId });
      
      // Report game loaded
      tg.onEvent('LOADED');
      
      // Report game ready
      setTimeout(() => {
        tg?.onEvent('READY');
      }, 1000);
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
        style={{ height: '100vh', background: '#000' }}
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