import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LightningAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function LightningAnimation({ isActive, onComplete }: LightningAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    animationId?: number;
    cleanup?: () => void;
    isAnimating?: boolean;
  }>({});

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    // Prevent multiple animations from running simultaneously
    if (sceneRef.current.animationId || sceneRef.current.isAnimating) {
      return;
    }

    sceneRef.current.isAnimating = true;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    // Create lightning effect
    const createLightningBolt = () => {
      const points: THREE.Vector3[] = [];
      const segments = 10;
      const height = 18;
      
      // Start from top center
      points.push(new THREE.Vector3(0, height/2, 0));
      
      let prevX = 0;
      let prevY = height/2;
      
      // Create zigzag path down
       for (let i = 1; i <= segments; i++) {
         const progress = i / segments;
         const jitter = Math.min(4.5, 9 * (1 - progress)); // More jitter at top, less at bottom
        
        const x = prevX + (Math.random() - 0.5) * jitter;
        const y = prevY - (height / segments) + (Math.random() - 0.5) * 0.9;
        
        points.push(new THREE.Vector3(x, y, 0));
        
        // Add branches with 30% probability
         if (Math.random() > 0.7 && i > 1 && i < segments - 1) {
           const branchLength = 1.5 + Math.random() * 4.5;
           const branchX = x + (Math.random() - 0.5) * branchLength * 2;
           const branchY = y + (Math.random() - 0.5) * branchLength;
          
          // Add branch
          points.push(new THREE.Vector3(branchX, branchY, 0));
          // Return to main path
          points.push(new THREE.Vector3(x, y, 0));
        }
        
        prevX = x;
        prevY = y;
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return geometry;
    };

    // Create multiple lightning bolts
    const bolts: Array<{
      bolt: THREE.Line;
      glow: THREE.Line;
      material: THREE.LineBasicMaterial;
      glowMaterial: THREE.LineBasicMaterial;
    }> = [];
    const boltCount = 3;
    
    for (let i = 0; i < boltCount; i++) {
      const geometry = createLightningBolt();
      
      // Main bright line
       const material = new THREE.LineBasicMaterial({ 
         color: 0xff0000, 
         linewidth: 2,
         transparent: true,
         opacity: 1
       });
       
       const bolt = new THREE.Line(geometry, material);
       scene.add(bolt);
       
       // Glow effect
       const glowMaterial = new THREE.LineBasicMaterial({ 
         color: 0xff8888, 
         linewidth: 6,
         transparent: true,
         opacity: 0.4
       });
      
      const glow = new THREE.Line(geometry, glowMaterial);
      scene.add(glow);
      
      bolts.push({ bolt, glow, material, glowMaterial });
    }

    sceneRef.current = { renderer, scene, camera };

    let startTime = Date.now();
    const duration = 800; // Animation duration in ms

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Animate each bolt
      bolts.forEach((bolt, index) => {
        // Stagger the bolts slightly
        const boltProgress = Math.min(1, Math.max(0, progress * 3 - index * 0.3));
        
        // Animate opacity with flickering
        const flicker = Math.sin(boltProgress * Math.PI * 10) * 0.3 + 0.7;
        const opacity = flicker * Math.max(0, 1 - boltProgress * 1.5);
        
        bolt.material.opacity = opacity;
        bolt.glowMaterial.opacity = opacity * 0.4;
      });

      renderer.render(scene, camera);

      if (progress < 1) {
        sceneRef.current.animationId = requestAnimationFrame(animate);
      } else {
        // Animation complete
        console.log('Lightning animation finished, calling onComplete');
        sceneRef.current.isAnimating = false;
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 100);
      }
    }

    animate();

    const cleanup = () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      
      // Reset animation state
      sceneRef.current.isAnimating = false;
      
      // Clean up all resources
      bolts.forEach(bolt => {
        bolt.bolt.geometry.dispose();
        bolt.material.dispose();
        bolt.glowMaterial.dispose();
        scene.remove(bolt.bolt);
        scene.remove(bolt.glow);
      });
      
      renderer.dispose();
    };

    sceneRef.current.cleanup = cleanup;

    return cleanup;
  }, [isActive]); // Removed onComplete from dependencies

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}