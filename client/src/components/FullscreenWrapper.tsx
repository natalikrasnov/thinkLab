import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/FullscreenWrapper.scss';
import { MinimizeIcon, FullscreenIcon, CloseIcon } from '../assets/icons';

interface FullscreenWrapperProps {
  children: React.ReactNode | ((props: { isFullscreen: boolean; toggleFullscreen: () => void }) => React.ReactNode);
  title: string;
  onDelete?: () => void;
  hideControls?: boolean;
}

export function FullscreenWrapper({ children, title, onDelete, hideControls = false }: FullscreenWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('has-fullscreen');
    } else {
      document.body.classList.remove('has-fullscreen');
    }
    return () => {
      document.body.classList.remove('has-fullscreen');
    };
  }, [isFullscreen]);

  const content = (
    <div 
      className={`fullscreen-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}
      onPointerDown={(e) => {
        if (!isFullscreen) {
           // allow spatial-node dragging
           return;
        }
        e.stopPropagation();
      }}
    >
      {isFullscreen && (
        <h1 className="fullscreen-title">
          {title}
        </h1>
      )}
      
      {!hideControls && (
        <div className="canvas-controls">
          <button 
            className="canvas-control-btn"
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsFullscreen(!isFullscreen); 
            }}
            title={isFullscreen ? 'Minimize to Canvas' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <MinimizeIcon />
            ) : (
              <FullscreenIcon />
            )}
          </button>
          {onDelete && (
            <button 
              className="canvas-control-btn" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Close & Delete Node"
              style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      
      <div className={`fullscreen-content ${isFullscreen ? 'is-fullscreen' : ''}`}>
        {typeof children === 'function' ? children({
          isFullscreen,
          toggleFullscreen: () => setIsFullscreen(!isFullscreen)
        }) : children}
      </div>
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
