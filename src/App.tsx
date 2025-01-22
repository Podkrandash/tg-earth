import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import Earth from './components/Earth';
import Atmosphere from './components/Atmosphere';
import NavigationPanel from './components/NavigationPanel';
import './styles/App.css';

interface TelegramGameProxy {
  initParams: () => Record<string, string>;
  onEvent: (eventName: string) => void;
  requestFullscreen?: () => void;
}

declare global {
  interface Window {
    TelegramGameProxy?: TelegramGameProxy;
  }
}

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const tg = window.TelegramGameProxy;
    if (tg) {
      const params = tg.initParams();
      const requestFs = tg.requestFullscreen;
      
      // Отправляем событие о загрузке игры
      tg.onEvent('game_loaded');
      
      // Запрашиваем полноэкранный режим при первом взаимодействии
      const handleInteraction = () => {
        if (requestFs && !isFullscreen) {
          requestFs();
          setIsFullscreen(true);
        }
      };

      window.addEventListener('touchstart', handleInteraction, { once: true });
      window.addEventListener('click', handleInteraction, { once: true });

      return () => {
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('click', handleInteraction);
      };
    }
  }, [isFullscreen]);

  // Предотвращаем скролл и другие жесты
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });
    document.addEventListener('touchend', preventDefault, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('touchend', preventDefault);
    };
  }, []);

  return (
    <div className="App">
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 2, 5], fov: 60 }}
          style={{ background: '#000' }}
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
      <NavigationPanel />
    </div>
  );
}

export default App; 