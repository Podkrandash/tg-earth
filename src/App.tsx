import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import WebApp from '@twa-dev/sdk';
import Earth from './components/Earth';
import './styles/App.css';

function App() {
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  return (
    <div className="App">
      <div className="token-counter">
        Tokens: {WebApp.initDataUnsafe.user?.id ? '0' : 'Loading...'}
      </div>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ height: '100vh', background: '#000' }}
      >
        <ambientLight intensity={1} />
        <Earth />
      </Canvas>
      <div className="navigation-panel">
        Navigation Panel
      </div>
    </div>
  );
}

export default App; 