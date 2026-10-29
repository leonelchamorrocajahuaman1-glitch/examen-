import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { BottleSceneProps } from './BottleScene';
import { BottleArt } from '../product/BottleArt';
import { cn } from '../../lib/format';

const BottleScene = lazy(() => import('./BottleScene'));

let webglSupport: boolean | null = null;
export function hasWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[3D] Se usará la versión 2D de la botella:', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Props extends Omit<BottleSceneProps, 'reducedMotion'> {
  className?: string;
}

/**
 * Botella 3D con carga diferida. Si el navegador no soporta WebGL o la escena falla,
 * se muestra la ilustración vectorial para que la página siga funcionando.
 */
export function Bottle3D({ className, ...props }: Props) {
  const reduce = useReducedMotion() ?? false;
  const supported = useMemo(hasWebGL, []);
  const fallback = (
    <div className="flex size-full items-center justify-center">
      <BottleArt
        shape={props.shape}
        color={props.color}
        brand={props.brand}
        className={cn('h-[88%] w-auto drop-shadow-[0_30px_60px_rgba(124,58,237,0.35)]', !reduce && 'animate-float')}
      />
    </div>
  );

  return (
    <div className={cn('relative', className)}>
      {supported ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <BottleScene {...props} reducedMotion={reduce} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
