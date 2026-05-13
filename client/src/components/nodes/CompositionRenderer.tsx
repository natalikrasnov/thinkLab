import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/CompositionRenderer.scss';
import { ZoomInIcon, ZoomOutIcon, FullscreenIcon, MinimizeIcon, CloseIcon, DiscussIcon } from '../../assets/icons';

export interface CompositionData {
  title: string;
  canvas: {
    mode: string;
    background: string;
  };
  toolbox: any[];
  interactions: string[];
  promptSuggestions: string[];
}

export interface CanvasItemData {
  id: string;
  type: string;
  url?: string;
  x: number;
  y: number;
  scale: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ScenePhase = 'setup_choice' | 'gathering' | 'generating' | 'uploading' | 'playground' | 'done';

interface CompositionRendererProps {
  data: CompositionData;
  onDelete?: () => void;
}

export function CompositionRenderer({ data, onDelete }: CompositionRendererProps) {
  const [phase, setPhase] = useState<ScenePhase>('setup_choice');
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

  // Playground state
  const [items, setItems] = useState<CanvasItemData[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>(data.canvas.background || '#ffffff');
  const [dynamicTools, setDynamicTools] = useState<any[]>(data.toolbox);
  const [canvasZoom, setCanvasZoom] = useState<number>(0.5);

  // Gathering state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'gathering' && chatHistory.length === 0) {
      handleSendChat('', true);
    }
  }, [phase]);

  const handleSendChat = async (text: string, isInitial = false) => {
    const newHistory = isInitial ? [] : [...chatHistory, { role: 'user', content: text }];
    if (!isInitial) {
      setChatHistory(newHistory as ChatMessage[]);
      setChatInput('');
    }
    setIsBotTyping(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/scene/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: data.title,
          history: newHistory
        })
      });
      const result = await res.json();
      
      if (result.done) {
        setPhase('generating');
        generateScene(result.imagePrompt);
      } else {
        setChatHistory([...newHistory, { role: 'assistant', content: result.question }] as ChatMessage[]);
      }
    } catch(e) {
      console.error(e);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Connection error. Please try again.' }] as ChatMessage[]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const generateScene = async (imagePrompt: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/scene/generate-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt, context: data.title })
      });
      const result = await res.json();
      if (result.imageUrl) {
        setBackgroundImage(`url("${result.imageUrl}")`);
      }
      if (result.tools && result.tools.length > 0) {
        setDynamicTools(result.tools);
      }
      setPhase('playground');
    } catch(e) {
      console.error(e);
      alert('Failed to generate image. Did you restart the server?');
      setPhase('setup_choice');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setBackgroundImage(`url("${dataUrl}")`);
        setPhase('generating');
        
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/scene/generate-tools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: data.title })
          });
          const result = await res.json();
          if (result.tools && result.tools.length > 0) {
            setDynamicTools(result.tools);
          }
        } catch(err) {
          console.error(err);
        }
        setPhase('playground');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, type: string, source: 'toolbox' | 'canvas', id?: string, url?: string) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('source', source);
    if (url) e.dataTransfer.setData('url', url);
    if (id) {
      e.dataTransfer.setData('id', id);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      e.dataTransfer.setData('offsetX', ((e.clientX - rect.left) / canvasZoom).toString());
      e.dataTransfer.setData('offsetY', ((e.clientY - rect.top) / canvasZoom).toString());
    } else {
      e.dataTransfer.setData('offsetX', '40');
      e.dataTransfer.setData('offsetY', '20');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const type = e.dataTransfer.getData('type');
    const source = e.dataTransfer.getData('source');
    const url = e.dataTransfer.getData('url');
    if (!type || !source) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');
    
    const x = (e.clientX - rect.left) / canvasZoom - offsetX;
    const y = (e.clientY - rect.top) / canvasZoom - offsetY;

    if (source === 'toolbox') {
      const newItem: CanvasItemData = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        url: url || undefined,
        x,
        y,
        scale: 1
      };
      setItems([...items, newItem]);
    } else if (source === 'canvas') {
      const id = e.dataTransfer.getData('id');
      setItems(items.map(i => i.id === id ? { ...i, x, y } : i));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(items.filter(i => i.id !== id));
  };
  
  const handleScaleItem = (id: string, dir: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(items.map(i => i.id === id ? { ...i, scale: Math.max(0.2, i.scale + (dir * 0.2)) } : i));
  };

  const downloadImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = 1024;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;

    const bgMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    const bgUrl = bgMatch ? bgMatch[1] : backgroundImage;

    const exportCanvas = () => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        const safeTitle = (data.title || 'Composition').replace(/[\s\/\\?%*:|"<>]/g, '_');
        a.download = `${safeTitle}_design.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    };

    const loadImageToCanvas = async (url: string, drawProps: [number, number, number?, number?]) => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (drawProps.length === 4) {
              ctx.drawImage(img, drawProps[0], drawProps[1], drawProps[2]!, drawProps[3]!);
            } else {
              ctx.drawImage(img, drawProps[0], drawProps[1]);
            }
            URL.revokeObjectURL(objUrl);
            resolve();
          };
          img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(); };
          img.src = objUrl;
        });
      } catch (e) {
        console.error("Failed to load cross-origin image", url, e);
      }
    };

    if (bgUrl.startsWith('http') || bgUrl.startsWith('data:')) {
      await loadImageToCanvas(bgUrl, [0, 0, width, height]);
    } else {
      ctx.fillStyle = bgUrl || '#fff';
      ctx.fillRect(0,0,width,height);
    }

    for (const item of items) {
      const cleanTool = item.type.replace(/[\u1000-\uFFFF]/g, '').trim().toLowerCase();
      const hasLocalImage = ["trees", "shrubs", "flower beds", "pathways", "furniture"].includes(cleanTool);
      const finalUrl = item.url || (hasLocalImage ? `/images/composition/${cleanTool}.png` : null);

      if (finalUrl) {
        await loadImageToCanvas(finalUrl, [item.x, item.y, 100 * item.scale, 100 * item.scale]);
      } else {
        ctx.font = `${20 * item.scale}px sans-serif`;
        ctx.fillStyle = "white";
        ctx.fillText(item.type, item.x, item.y + 20);
      }
    }

    exportCanvas();
  };

  const getCanvasBackgroundStyle = () => {
    if (backgroundImage.startsWith('url')) {
      return { background: `${backgroundImage} center/cover no-repeat`, width: '1024px', height: '1024px' };
    }
    return { backgroundColor: backgroundImage, width: '1024px', height: '1024px' };
  };

  const renderSetupChoice = () => (
    <div className="scene-setup-wrapper">
      <h3>Let's conceptualize your {data.title}</h3>
      <div className="setup-options">
        <button className="setup-btn primary" onClick={() => setPhase('gathering')}>
          ✨ Create with AI Imagination
        </button>
        <button className="setup-btn secondary" onClick={() => setPhase('uploading')}>
          📂 Upload Base Image
        </button>
      </div>
    </div>
  );

  const renderGathering = () => (
    <div className="scene-chat-wrapper">
      <h3>AI Design Assistant</h3>
      <div className="chat-history">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isBotTyping && <div className="chat-bubble assistant typing">Typing...</div>}
      </div>
      <div className="chat-input-row">
        <input 
          type="text" 
          placeholder="Describe your vision..." 
          value={chatInput} 
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)}
        />
        <button onClick={() => handleSendChat(chatInput)} disabled={!chatInput.trim() || isBotTyping}>Send</button>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className="scene-loading-wrapper">
      <div className="spinner"></div>
      <h3>Generating your scene and downloading AI images...</h3>
      <p>This may take up to 30 seconds using DALL-E 3.</p>
    </div>
  );

  const renderUploading = () => (
    <div className="scene-setup-wrapper">
      <h3>Upload your base image</h3>
      <p>We'll extract layout and setup a realistic workspace with dynamic tools.</p>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        className="file-input"
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button className="setup-btn primary" onClick={() => fileInputRef.current?.click()}>
          Choose Image
        </button>
        <button className="setup-btn secondary" onClick={() => setPhase('setup_choice')}>Back</button>
      </div>
    </div>
  );

  const renderPlayground = () => (
    <div className="composition-layout">
      {/* Sidebar / Toolbox */}
      <aside className="composition-sidebar">
        <div className="composition-section">
          <h5>Dynamic Tools</h5>
          <div className="toolbox-items">
            {dynamicTools.map((toolObj, idx) => {
              const isString = typeof toolObj === 'string';
              const toolName = isString ? toolObj : toolObj.type;
              const toolUrl = isString ? null : toolObj.url;

              const cleanTool = toolName.replace(/[\u1000-\uFFFF]/g, '').trim().toLowerCase();
              const hasLocalImage = ["trees", "shrubs", "flower beds", "pathways", "furniture"].includes(cleanTool);
              const finalUrl = toolUrl || (hasLocalImage ? `/images/composition/${cleanTool}.png` : null);

              return (
                <div 
                  key={idx} 
                  className="toolbox-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, toolName, 'toolbox', undefined, finalUrl || undefined)}
                >
                  {finalUrl ? (
                    <img src={finalUrl} alt={toolName} className={`tool-image ${toolUrl ? 'ai-generated' : ''}`} />
                  ) : null}
                  {toolName}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <div className="composition-main">
        <div className="canvas-viewport">
          <div
            ref={canvasRef}
            className="composition-canvas playground-canvas"
            style={{...getCanvasBackgroundStyle(), transform: `scale(${canvasZoom})`}}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {items.length === 0 && (
              <div className="canvas-placeholder overlay" style={{ transform: `scale(${1/canvasZoom})`, top: '50%', left: '50%', position: 'absolute', transformOrigin: 'center' }}>
                Drag items here to redesign
              </div>
            )}
            {items.map(item => {
              const cleanTool = item.type.replace(/[\u1000-\uFFFF]/g, '').trim().toLowerCase();
              const hasLocalImage = ["trees", "shrubs", "flower beds", "pathways", "furniture"].includes(cleanTool);
              const finalUrl = item.url || (hasLocalImage ? `/images/composition/${cleanTool}.png` : null);
              
              return (
                <div
                  key={item.id}
                  className={`canvas-item ${finalUrl ? 'has-image' : ''}`}
                  style={{ left: item.x, top: item.y }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type, 'canvas', item.id, item.url)}
                >
                  {finalUrl ? (
                    <>
                      <img src={finalUrl} alt={item.type} className={`canvas-item-image ${item.url ? 'ai-generated' : ''}`} style={{ width: 100 * item.scale, height: 100 * item.scale }} />
                      <div className="canvas-controls">
                        <button className="remove-item-btn scale-btn" onClick={(e) => handleScaleItem(item.id, 1, e)}>+</button>
                        <button className="remove-item-btn scale-btn" onClick={(e) => handleScaleItem(item.id, -1, e)}>-</button>
                        <button className="remove-item-btn" onClick={(e) => handleRemoveItem(item.id, e)}>✕</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {item.type}
                      <button className="remove-item-btn" onClick={(e) => handleRemoveItem(item.id, e)}>✕</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );

  const renderDone = () => (
    <div className="scene-done-wrapper">
      <h3>Design Complete!</h3>
      <div className="done-preview playground-canvas" style={{...getCanvasBackgroundStyle(), transform: 'scale(0.5)', transformOrigin: 'top center', position: 'relative', overflow: 'hidden', height: '1024px', width: '1024px', border: 'none', borderRadius: '12px' }}>
        {items.map(item => {
          const finalUrl = item.url;
          return (
            <div key={item.id} className={`canvas-item no-interact ${finalUrl ? 'has-image' : ''}`} style={{ left: item.x, top: item.y }}>
              {finalUrl ? <img src={finalUrl} alt={item.type} className="canvas-item-image" style={{ width: 100 * item.scale, height: 100 * item.scale }} /> : item.type}
            </div>
          );
        })}
      </div>
      <div className="done-feedback" style={{ marginTop: '-450px', zIndex: 10, position: 'relative', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h4>Things to notice for real life execution:</h4>
        <ul>
          <li>Consider natural lighting exactly how we mapped the elements.</li>
          <li>Scale of the uploaded/generated image might slightly stretch some layouts.</li>
          <li>Bring this exact mock map when you start building!</li>
        </ul>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="setup-btn primary" onClick={downloadImage}>Download Image</button>
          <button className="setup-btn secondary" onClick={() => setPhase('playground')}>Back to Editing</button>
        </div>
      </div>
    </div>
  );

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const content = (
    <div className={`mindmap-container composition-view ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {isFullscreen && (
        <h1 className="mindmap-title">
          {data.title} (Scene Builder)
        </h1>
      )}

      <div
        className="canvas-controls"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {phase === 'playground' && isFullscreen && (
          <button
            className="canvas-control-btn discuss-btn"
            onClick={(e) => { e.stopPropagation(); setPhase('done'); }}
            title="Done Redesigning"
          >
            <DiscussIcon />
            Done Redesigning
          </button>
        )}
        <button
          className="canvas-control-btn"
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(z => z + 0.1); }}
          title="Zoom In"
        >
          <ZoomInIcon />
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(z => Math.max(0.2, z - 0.1)); }}
          title="Zoom Out"
        >
          <ZoomOutIcon />
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          title={isFullscreen ? 'Minimize' : 'Fullscreen'}
        >
          {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
        </button>
        {onDelete && (
          <button
            className="canvas-control-btn danger-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Close & Delete Node"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div
        className="mindmap-canvas-container"
        style={{
          paddingTop: isFullscreen ? '60px' : '0'
        }}
      >
        <div className="composition-container">
          {phase === 'setup_choice' && renderSetupChoice()}
          {phase === 'gathering' && renderGathering()}
          {phase === 'generating' && renderGenerating()}
          {phase === 'uploading' && renderUploading()}
          {phase === 'playground' && renderPlayground()}
          {phase === 'done' && renderDone()}
        </div>
      </div>
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
