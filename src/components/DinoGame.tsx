// @ts-nocheck
import React, { useRef, useState } from 'react';
import useGameEngine from '../hooks/useGameEngine';

const DinoGame = ({ onFocusChange }) => {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Notify parent of focus changes
  const handleFocus = (focused) => {
    setIsFocused(focused);
    if (onFocusChange) onFocusChange(focused);
  };

  // Engine hook: handles asset loading + draws idle preview on canvas
  const { assetsLoaded, loadError } = useGameEngine(canvasRef, isFocused);

  const handleKeyDown = (e) => {
    // Only intercept jump keys if the game is focused
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault(); // Prevent the page from scrolling
      window.dispatchEvent(new CustomEvent('dinoJump'));
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('dinoDuck', { detail: true }));
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('dinoDuck', { detail: false }));
    }
  };

  const handleTouch = (e) => {
    e.preventDefault(); // Prevent accidental mobile zooming/scrolling
    if (containerRef.current) containerRef.current.focus();
    window.dispatchEvent(new CustomEvent('dinoJump'));
  };

  return (
    <div
      style={{
        width: '100%',
        transformOrigin: 'bottom center',
        transform: isFocused ? 'scale(1)' : 'scale(0.7)',
        transition: 'transform 0.3s ease',
      }}
    >
    <div
      ref={containerRef}
      tabIndex="0"
      onFocus={() => handleFocus(true)}
      onBlur={() => handleFocus(false)}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onTouchStart={handleTouch}
      style={{
        position: 'relative',
        width: '100%',
        margin: '0 auto',
        outline: 'none',
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      {/* Click-to-Play Overlay (Resolves Spacebar conflict) */}
      {!isFocused && (
        <div
          onPointerDown={(e) => {
            e.preventDefault(); // Prevent browser from shifting focus away immediately
            if (containerRef.current) {
              containerRef.current.focus();
              setTimeout(() => window.dispatchEvent(new CustomEvent('dinoJump')), 50);
            }
          }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fc7a00',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(2px)'
          }}>
          <div style={{ textAlign: 'center' }}>
            <div>Click here to play</div>
            <div style={{ fontSize: '13px', marginTop: '8px', color: '#ccc', fontWeight: 'normal' }}>
              Space / ↑ to Jump &nbsp;·&nbsp; ↓ to Duck
            </div>
          </div>
        </div>
      )}
      
      {/* Asset Loading State */}
      {!assetsLoaded && !loadError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: '#fc7a00', fontSize: '14px', zIndex: 5
        }}>
          Loading assets...
        </div>
      )}

      {/* Asset Error State */}
      {loadError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: '#dc3545', fontSize: '14px', zIndex: 5
        }}>
          Failed to load game assets.
        </div>
      )}

      {/* 
        The canvas resolution is fixed at 800x250 for crisp rendering. 
        CSS makes it responsive to the parent container.
      */}
      <canvas 
        ref={canvasRef} 
        width={1200} 
        height={250} 
        style={{ 
          width: '100%', 
          display: 'block',
          imageRendering: 'pixelated'
        }} 
      />
    </div>
    </div>
  );
};

export default DinoGame;
