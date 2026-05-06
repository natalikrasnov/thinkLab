import { useState, useRef, useEffect } from 'react';
import '../styles/App.css';
import '../styles/compare-styles.css';
import { PromptForm } from '../components/PromptForm';
import { ResultDisplay } from '../components/ResultDisplay';
import { useGenerateUI } from '../hooks/useGenerateUI';
import { SpatialNode } from '../types/types';

function DraggableNode({ node, onDelete }: { node: SpatialNode; onDelete: (id: string) => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent dragging if interacting with child components that have their own drag/scroll
    if ((e.target as HTMLElement).closest('.mindmap-container') ||
      (e.target as HTMLElement).closest('.composition-container') ||
      (e.target as HTMLElement).closest('.json-render') ||
      (e.target as HTMLElement).closest('button')) {
      return;
    }

    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="spatial-node"
      style={{
        left: `${node.x + offset.x}px`,
        top: `${node.y + offset.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 100 : 1,
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ResultDisplay result={node.response} onDelete={() => onDelete(node.id)} />
    </div>
  );
}

function App() {
  const { nodes, isSimulating, generate: handleGenerate, deleteNode } = useGenerateUI();
  const isInitialState = nodes.length === 0;
  
  // 3D Perspective Mouse Parallax
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const xPercent = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const yPercent = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1
      
      // Gentle rotation: max 5 degrees for subtlety, but 3D feel
      setRotation({
        x: -yPercent * 5, 
        y: xPercent * 5
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>thinklab</h1>
      </header>

      <main 
        className="main-content spatial-scene"
        style={{
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="star-layer layer-back"></div>
        <div className="star-layer layer-mid"></div>
        
        <section className="result-area">
          {nodes.map((node) => (
            <DraggableNode key={node.id} node={node} onDelete={deleteNode} />
          ))}
        </section>
      </main>

      <PromptForm onSubmit={handleGenerate} isSimulating={isSimulating} isCentered={isInitialState} />
    </div>
  );
}

export default App;
