import { useState, useCallback } from 'react';
import { UIResponse, SpatialNode } from '../types/types';

export const useGenerateUI = () => {
  const [nodes, setNodes] = useState<SpatialNode[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  const generate = useCallback(async (input: string) => {
    setIsSimulating(true);

    try {
      const response = await fetch('http://localhost:3002/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: UIResponse = await response.json();

      // Calculate a random position near the center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Add some jitter so they don't perfectly overlap
      const jitterX = (Math.random() - 0.5) * 400;
      const jitterY = (Math.random() - 0.5) * 300 - 100; // slight offset up because of palette

      const newNode: SpatialNode = {
        id: crypto.randomUUID(),
        x: centerX + jitterX,
        y: centerY + jitterY,
        response: data
      };

      setNodes(prev => [...prev, newNode]);
    } catch (error) {
      console.error('Failed to generate UI:', error);

      const errorNode: SpatialNode = {
        id: crypto.randomUUID(),
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 2 - 100,
        response: {
          type: "error",
          data: { message: "Failed to connect to the AI service." },
          tone: "stressed"
        }
      };

      setNodes(prev => [...prev, errorNode]);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  return { nodes, isSimulating, generate, deleteNode };
};
