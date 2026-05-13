import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/MindMapRenderer.scss';
import { ZoomInIcon, ZoomOutIcon, MinimizeIcon, FullscreenIcon, CloseIcon, DiscussIcon, ExpertOpinionsIcon } from '../../assets/icons';

export interface MindMapData {
  central: string;
  branches: string[];
}

interface TreeNode {
  id: string;
  text: string;
  children: TreeNode[];
  isLoading?: boolean;
  isUserAnswer?: boolean;
}

interface MindMapRendererProps {
  data: MindMapData;
  onDelete?: () => void;
}

const NodeComponent = ({ node, onAnswer, depth = 0 }: { node: TreeNode; onAnswer: (id: string, answer: string) => void; depth?: number }) => {
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Random slight tilt for 3D feel
  const randomTilt = useRef({
    x: (Math.random() - 0.5) * 4,
    y: (Math.random() - 0.5) * 4
  });

  useEffect(() => {
    if (isAnswering && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAnswering]);

  return (
    <div className="mindmap-node-wrapper" style={{ transformStyle: 'preserve-3d' }}>
      <div
        className={`mindmap-node-content ${node.children.length > 0 ? 'has-children' : ''} ${node.isLoading ? 'loading' : ''}`}
        style={{
          transform: `translateZ(${depth * 40}px) rotateX(${randomTilt.current.x}deg) rotateY(${randomTilt.current.y}deg)`,
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="mindmap-node-inner">
          <span className="mindmap-node-text">{node.text}</span>

          {node.isLoading ? (
            <div className="mindmap-node-loading-text">thinking...</div>
          ) : !isAnswering ? (
            !node.isUserAnswer && (
              <button
                className="mindmap-reply-btn"
                onClick={(e) => { e.stopPropagation(); setIsAnswering(true); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Reply"
              >
                Reply
              </button>
            )
          ) : (
            <div className="mindmap-answer-form" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
              <input
                className="mindmap-answer-input"
                ref={inputRef}
                type="text"
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="Your reply..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && answerText.trim()) {
                    onAnswer(node.id, answerText.trim());
                    setIsAnswering(false);
                    setAnswerText("");
                  }
                }}
              />
              <div className="mindmap-answer-actions">
                <button
                  className="mindmap-answer-cancel-btn"
                  onClick={() => setIsAnswering(false)}
                >Cancel</button>
                <button
                  className="mindmap-answer-send-btn"
                  onClick={() => {
                    if (answerText.trim()) {
                      onAnswer(node.id, answerText.trim());
                      setIsAnswering(false);
                      setAnswerText("");
                    }
                  }}
                >Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="mindmap-children-container" style={{ transformStyle: 'preserve-3d' }}>
          {node.children.map(child => (
            <NodeComponent key={child.id} node={child} onAnswer={onAnswer} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export function MindMapRenderer({ data, onDelete }: MindMapRendererProps) {
  const [tree, setTree] = useState<TreeNode>(() => ({
    id: `root-${Date.now()}`,
    text: data.central,
    children: data.branches.map((b, i) => ({
      id: `branch-${Date.now()}-${i}`,
      text: b,
      children: []
    }))
  }));

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [discussionResult, setDiscussionResult] = useState<{ agent: string, role: string, message: string }[] | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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

  const handleAddAnswer = async (nodeId: string, answerText: string) => {
    // 1. Find the path to the node to construct context
    let targetNodePath: string[] = [];
    const findNodeAndPath = (node: TreeNode, path: string[]): boolean => {
      path.push(node.text);
      if (node.id === nodeId) return true;
      for (const child of node.children) {
        if (findNodeAndPath(child, path)) return true;
      }
      path.pop();
      return false;
    };

    findNodeAndPath(tree, targetNodePath);
    const pathContext = targetNodePath.join(" -> ");
    const fullInput = `${pathContext} -> Answer: ${answerText}`;

    // 2. Add answer node as a child in loading state
    const answerId = `answer-${Date.now()}`;
    const newAnswerNode: TreeNode = {
      id: answerId,
      text: answerText,
      children: [],
      isLoading: true,
      isUserAnswer: true
    };

    setTree(prevTree => {
      const addNode = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, children: [...node.children, newAnswerNode] };
        }
        if (node.children.length > 0) {
          return { ...node, children: node.children.map(addNode) };
        }
        return node;
      };
      return addNode(prevTree);
    });

    // 3. Make API request for branches
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: fullInput }),
      });

      if (!response.ok) throw new Error("Failed to generate branches");
      const data = await response.json();
      console.log("[MindMap Q&A] response data:", data);

      const newBranches = data.type === 'map' && data.data?.branches
        ? data.data.branches
        : ["What else can you tell me about this?"]; // robust fallback

      const childNodes: TreeNode[] = newBranches.map((b: string, i: number) => ({
        id: `branch-${Date.now()}-${i}`,
        text: b,
        children: []
      }));

      // 4. Update the answer node to remove loading state and add new branches
      setTree(prevTree => {
        const updateAnswerNode = (node: TreeNode): TreeNode => {
          if (node.id === answerId) {
            return { ...node, isLoading: false, children: childNodes };
          }
          if (node.children.length > 0) {
            return { ...node, children: node.children.map(updateAnswerNode) };
          }
          return node;
        };
        return updateAnswerNode(prevTree);
      });

    } catch (error) {
      console.error(error);
      // Fallback on error
      setTree(prevTree => {
        const updateAnswerNode = (node: TreeNode): TreeNode => {
          if (node.id === answerId) {
            return {
              ...node,
              isLoading: false,
              children: [{ id: `error-${Date.now()}`, text: "Error generating branches. Try again.", children: [] }]
            };
          }
          if (node.children.length > 0) {
            return { ...node, children: node.children.map(updateAnswerNode) };
          }
          return node;
        };
        return updateAnswerNode(prevTree);
      });
    }
  };

  const handleDiscuss = async () => {
    setIsDiscussing(true);
    setDiscussionResult(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapData: tree }),
      });

      if (!response.ok) throw new Error("Failed to generate discussion");
      const data = await response.json();
      setDiscussionResult(data.discussion);
    } catch (error) {
      console.error(error);
      setDiscussionResult([{ agent: 'System', role: 'Error', message: 'Failed to generate discussion. Please try again.' }]);
    }
  };

  const content = (
    <div
      className={`mindmap-container ${isFullscreen ? 'is-fullscreen' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isFullscreen && (
        <h1 className="mindmap-title">
          {tree.text}
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
            title="Expert Opinions"
          >
            <DiscussIcon />
            Expert Opinions
          </button>
        )}
        <button
          className="canvas-control-btn"
          onClick={(e) => { e.stopPropagation(); setScale(s => s + 0.1); }}
          title="Zoom In"
        >
          <ZoomInIcon />
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.2, s - 0.1)); }}
          title="Zoom Out"
        >
          <ZoomOutIcon />
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(!isFullscreen);
            setOffset({ x: 0, y: 0 });
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
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease'
        }}
      >
        <NodeComponent node={tree} onAnswer={handleAddAnswer} />
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
                Analyzing your thoughts...
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
