import React from 'react';

const NavigationPanel = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 20px',
      backdropFilter: 'blur(10px)',
      zIndex: 1000
    }}>
      <button style={buttonStyle}>🌍 View</button>
      <button style={buttonStyle}>🎯 Center</button>
      <button style={buttonStyle}>🔄 Reset</button>
    </div>
  );
};

const buttonStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  color: 'white',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  }
};

export default NavigationPanel; 