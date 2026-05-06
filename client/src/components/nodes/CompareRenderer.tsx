import '../../styles/CompareRenderer.scss';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomInIcon, ZoomOutIcon, FullscreenIcon, MinimizeIcon, CloseIcon, DiscussIcon, ExpertOpinionsIcon } from '../../assets/icons';

interface CompareData {
  options: string[];
  dimensions: string[];
}

interface CompareRendererProps {
  data: CompareData;
  onDelete?: () => void;
}

export function CompareRenderer({ data, onDelete }: CompareRendererProps) {
  const { options = [], dimensions: initialDimensions = [] } = data || {};
  const [zoomLevel, setZoomLevel] = useState(1);
  const [localDimensions, setLocalDimensions] = useState(initialDimensions);
  const [isFetchingDimensions, setIsFetchingDimensions] = useState(false);
  const [cellData, setCellData] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [discussionResult, setDiscussionResult] = useState<{ agent: string, role: string, message: string }[] | null>(null);

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

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

  const handleGetMoreQuestions = async () => {
    setIsFetchingDimensions(true);
    try {
      const input = `We are comparing: ${options.join(', ')}. Existing dimensions are: ${localDimensions.join(', ')}. Generate exactly 2 NEW additional dimensions (aspects or questions) to evaluate these options. Focus on aspects not yet covered. Return a Compare JSON containing the new dimensions only.`;
      const response = await fetch('http://localhost:3002/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!response.ok) throw new Error("Failed to fetch more questions");
      const result = await response.json();
      
      if (result.type === 'compare' && result.data && result.data.dimensions) {
        setLocalDimensions(prev => [...prev, ...result.data.dimensions]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsFetchingDimensions(false);
    }
  };

  const handleDiscuss = async () => {
    setIsDiscussing(true);
    setDiscussionResult(null);
    try {
      const payload = { type: 'compare', options, dimensions: localDimensions, reflections: cellData };
      const response = await fetch('http://localhost:3002/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapData: payload }),
      });

      if (!response.ok) throw new Error("Failed to generate discussion");
      const data = await response.json();
      setDiscussionResult(data.discussion);
    } catch (error) {
      console.error(error);
      setDiscussionResult([{ agent: 'System', role: 'Error', message: 'Failed to generate discussion. Please try again.' }]);
    }
  };

  if (!options.length && !localDimensions.length) {
    return <div className="json-render">Invalid Compare Data</div>;
  }

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const content = (
    <div className={`mindmap-container compare-view ${isFullscreen ? 'is-fullscreen' : ''}`}>
          {isFullscreen && (
            <h1 className="mindmap-title">
              Evaluate Options
            </h1>
          )}

          <div
            className="canvas-controls"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isFullscreen && (
              <button
                className="canvas-control-btn discuss-btn"
                onClick={(e) => { e.stopPropagation(); handleDiscuss(); }}
                title="Done thinking, need another opinion"
              >
                <DiscussIcon />
                Done thinking, need another opinion
              </button>
            )}
            <button
              className="canvas-control-btn"
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              title="Zoom In"
            >
              <ZoomInIcon />
            </button>
            <button
              className="canvas-control-btn"
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
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
              {isFullscreen ? (
                <MinimizeIcon />
              ) : (
                <FullscreenIcon />
              )}
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
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
              paddingTop: isFullscreen ? '60px' : '0'
            }}
          >
            <div className="compare-grid-wrapper">
              <div
                className="compare-grid"
                style={{ gridTemplateColumns: `auto repeat(${options.length}, 250px)` }}
              >
                {/* Top-left empty cell */}
                <div className="compare-empty-cell"></div>

                {/* Column Headers (Options) */}
                {options.map((opt, i) => (
                  <div key={`opt-${i}`} className="mindmap-node-wrapper compare-header-wrapper">
                    <div className="mindmap-node-content compare-header-content">
                      <div className="mindmap-node-inner">
                        <div className="option-badge">Option {i + 1}</div>
                        <div className="option-name">{opt}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Rows (Dimensions and cells) */}
                {localDimensions.map((dim, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {/* Row Header (Dimension) */}
                    <div className="mindmap-node-wrapper compare-header-wrapper">
                      <div className="mindmap-node-content compare-dimension-content">
                        <div className="mindmap-node-inner">
                          <span className="mindmap-node-text" style={{ fontWeight: 600 }}>{dim}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cells */}
                    {options.map((_, colIndex) => {
                      const cellKey = `${rowIndex}-${colIndex}`;
                      return (
                        <div key={`cell-${cellKey}`} className="mindmap-node-wrapper compare-cell-wrapper">
                          <div className="mindmap-node-content compare-cell-content" style={{ padding: '0.5rem' }}>
                            <div className="mindmap-answer-form">
                              <textarea
                                className="mindmap-answer-input"
                                placeholder="Reflect on this..."
                                spellCheck="false"
                                value={cellData[cellKey] || ''}
                                onChange={(e) => setCellData(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                style={{ minHeight: '100px', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Add more questions button */}
                <div key="add-more" className="mindmap-node-wrapper compare-header-wrapper" style={{ gridColumn: '1 / 2' }}>
                  <button 
                    className="mindmap-add-btn" 
                    title="Get more questions"
                    onClick={(e) => { e.stopPropagation(); handleGetMoreQuestions(); }}
                    style={{ margin: 'auto', width: 'auto', padding: '6px 16px', fontSize: '13px', whiteSpace: 'nowrap', borderRadius: '16px' }}
                    disabled={isFetchingDimensions}
                  >
                    {isFetchingDimensions ? "Thinking..." : "+ More questions"}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {isFullscreen && (isDiscussing || discussionResult) && (
            <div className="mindmap-discussion-overlay" onPointerDown={e => e.stopPropagation()}>
              <div className="discussion-header">
                <h3 className="discussion-title">
                  <ExpertOpinionsIcon />
                  Expert Opinions
                </h3>
                <button
                  className="discussion-close-btn"
                  onClick={() => { setIsDiscussing(false); setDiscussionResult(null); }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div className="discussion-content">
                {!discussionResult ? (
                  <div className="discussion-loading">
                    <div className="mindmap-spinner"></div>
                    Analyzing your reflections...
                  </div>
                ) : (
                  discussionResult.map((msg, i) => (
                    <div key={i} className="discussion-message" style={{ animation: `fadeIn 0.3s ease-out ${i * 0.1}s backwards` }}>
                      <div className="discussion-message-header">
                        <span className="discussion-agent-name">{msg.agent}</span>
                        <span className="discussion-agent-role">{msg.role}</span>
                      </div>
                      <div className="discussion-message-body">
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
