import '../styles/ResultDisplay.scss';
import { UIResponse } from '../types/types';
import { MindMapRenderer } from './nodes/MindMapRenderer';
import { CompositionRenderer } from './nodes/CompositionRenderer';
import { CompareRenderer } from './nodes/CompareRenderer';

interface ResultDisplayProps {
  result: UIResponse;
  onDelete?: () => void;
}

export function ResultDisplay({ result, onDelete }: ResultDisplayProps) {
  return (
    <div className="result-content">
      <div className="result-header">
        <h3>Generated Result</h3>
        <span className="type-badge">{result.type}</span>
      </div>
      {result.type === 'map' ? (
        <MindMapRenderer data={result.data} onDelete={onDelete} />
      ) : result.type === 'composition' ? (
        <CompositionRenderer data={result.data} onDelete={onDelete} />
      ) : result.type === 'compare' ? (
        <CompareRenderer data={result.data} onDelete={onDelete} />
      ) : (
        <pre className="json-render">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
