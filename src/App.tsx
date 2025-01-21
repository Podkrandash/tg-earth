import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
        camera={{ position: [0, 0, 3], fov: 75 }}
        style={{ height: '100vh', background: '#000' }}
      >
        <ambientLight intensity={2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Earth />
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
      <div className="navigation-panel">
        Navigation Panel
      </div>
    </div>
  );
}

export default App; 