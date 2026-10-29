import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BOTTOM, radiusAt, SHAPES, shade, type ShapeSpec } from '../../lib/bottleShapes';
import type { BottleShape } from '../../lib/types';

const UNIT = 1 / 100; // 100 px del SVG = 1 unidad 3D

export interface BottleSceneProps {
  shape: BottleShape;
  color: string;
  brand: string;
  /** Rotación automática + seguimiento suave del puntero de toda la página. */
  autoRotate?: boolean;
  /** Permite girar la botella arrastrando. */
  draggable?: boolean;
  reducedMotion?: boolean;
}

function profilePoints(s: ShapeSpec, inset = 0, topY?: number) {
  const pts: THREE.Vector2[] = [];
  const top = topY ?? s.neckTop;
  const steps = 90;
  pts.push(new THREE.Vector2(0, (BOTTOM - BOTTOM) * UNIT + inset * UNIT));
  for (let i = 0; i <= steps; i++) {
    const y = BOTTOM - ((BOTTOM - top) * i) / steps;
    const r = Math.max(0.5, radiusAt(s, y) - inset);
    pts.push(new THREE.Vector2(r * UNIT, (BOTTOM - y) * UNIT));
  }
  pts.push(new THREE.Vector2(0, (BOTTOM - top) * UNIT));
  return pts;
}

/** `visible` es la fracción del ancho que se ve de frente (en una lata la etiqueta da toda la vuelta). */
function drawLabel(canvas: HTMLCanvasElement, brand: string, color: string, visible = 1) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const front = W * visible;
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, 0, W, H);
  const accent = shade(color, 0.35);
  ctx.fillStyle = accent;
  ctx.fillRect(W * 0.14, H * 0.14, W * 0.72, 6);
  ctx.fillRect(W * 0.14, H * 0.85, W * 0.72, 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4f4f8';
  const text = brand.toUpperCase();
  // Se ajusta el tamaño al ancho disponible en lugar de comprimir el texto.
  const maxW = front * 0.78;
  let size = 96;
  ctx.font = `600 ${size}px "Unbounded Variable", "Unbounded", sans-serif`;
  const width = ctx.measureText(text).width;
  if (width > maxW) {
    size = Math.floor((size * maxW) / width);
    ctx.font = `600 ${size}px "Unbounded Variable", "Unbounded", sans-serif`;
  }
  ctx.fillText(text, W / 2, H * 0.47);
  ctx.fillStyle = accent;
  const small = Math.min(30, front / 15);
  ctx.font = `600 ${small}px "Manrope Variable", "Manrope", sans-serif`;
  ctx.letterSpacing = `${small / 3}px`;
  ctx.fillText('NEON LIQUOR', W / 2 + small / 6, H * 0.73);
  ctx.letterSpacing = '0px';
}

/** La textura tiene la misma proporción que la superficie de la etiqueta para que el texto no se deforme. */
function labelTexture(brand: string, color: string, aspect: number, visible: number) {
  const canvas = document.createElement('canvas');
  canvas.height = 512;
  canvas.width = Math.round(512 * Math.min(4, Math.max(0.8, aspect)));
  drawLabel(canvas, brand, color, visible);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // Cuando terminan de cargar las fuentes, se vuelve a dibujar con la tipografía de la marca.
  document.fonts?.load('600 64px "Unbounded Variable"').then(() => {
    drawLabel(canvas, brand, color, visible);
    tex.needsUpdate = true;
  });
  return tex;
}

function EnvironmentSetup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Bottle({ shape, color, brand, autoRotate, draggable, reducedMotion }: BottleSceneProps) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef<{ x: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const { gl } = useThree();
  const s = SHAPES[shape];
  const height = (BOTTOM - s.neckTop) * UNIT;

  const geometries = useMemo(() => {
    const glass = new THREE.LatheGeometry(profilePoints(s), 96);
    const liquid = s.opaque ? null : new THREE.LatheGeometry(profilePoints(s, 5, s.liquidTop), 96);
    return { glass, liquid };
  }, [s]);

  const labelArc = s.opaque ? Math.PI * 2 : 1.9;
  const labelAspect = ((s.bodyW / 2) * labelArc) / s.labelH;
  const labelVisible = s.opaque ? 1.9 / (Math.PI * 2) : 1;
  const label = useMemo(
    () => labelTexture(brand, color, labelAspect, labelVisible),
    [brand, color, labelAspect, labelVisible],
  );

  useEffect(
    () => () => {
      geometries.glass.dispose();
      geometries.liquid?.dispose();
      label.dispose();
    },
    [geometries, label],
  );

  // Seguimiento del puntero en toda la ventana (no solo sobre el canvas).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Arrastrar para girar.
  useEffect(() => {
    if (!draggable) return;
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      dragging.current = { x: e.clientX };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.x;
      dragging.current.x = e.clientX;
      spin.current += dx * 0.012;
      velocity.current = dx * 0.012;
    };
    const up = (e: PointerEvent) => {
      dragging.current = null;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = 'grab';
    };
    el.style.cursor = 'grab';
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [draggable, gl]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    if (!dragging.current) {
      velocity.current *= 0.94;
      spin.current += velocity.current;
      if (autoRotate && !reducedMotion) spin.current += dt * 0.35;
    }
    g.rotation.y = spin.current;
    const tiltX = reducedMotion ? 0 : pointer.current.y * 0.12;
    const tiltZ = reducedMotion ? 0 : -pointer.current.x * 0.08;
    g.rotation.x += (tiltX - g.rotation.x) * 0.05;
    g.rotation.z += (tiltZ - g.rotation.z) * 0.05;
    g.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
  });

  const bodyR = (s.bodyW / 2) * UNIT;
  const labelH = s.labelH * UNIT;
  const labelY = (BOTTOM - s.labelTop - s.labelH / 2) * UNIT;
  const capW = ((s.neckW + s.capWExtra) / 2) * UNIT;
  const capH = (s.cap === 'foil' ? s.capH * 0.4 + 26 : s.capH) * UNIT;
  const capY = (BOTTOM - s.neckTop) * UNIT + (s.cap === 'foil' ? s.capH * 0.4 * UNIT - capH / 2 : capH / 2);

  return (
    <group ref={group} position={[0, 0, 0]}>
      <group position={[0, -height / 2 - 0.1, 0]}>
        {s.opaque ? (
          <mesh geometry={geometries.glass}>
            <meshPhysicalMaterial color={color} metalness={0.85} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
          </mesh>
        ) : (
          <>
            {/* Líquido opaco: así el vidrio con transmisión lo refracta correctamente. */}
            {geometries.liquid && (
              <mesh geometry={geometries.liquid}>
                <meshPhysicalMaterial
                  color={color}
                  roughness={0.18}
                  metalness={0.05}
                  clearcoat={1}
                  clearcoatRoughness={0.1}
                  emissive={color}
                  emissiveIntensity={0.28}
                />
              </mesh>
            )}
            <mesh geometry={geometries.glass}>
              <meshPhysicalMaterial
                color="#ffffff"
                roughness={0.03}
                metalness={0}
                transmission={1}
                thickness={0.08}
                ior={1.5}
                clearcoat={1}
                clearcoatRoughness={0.04}
                specularIntensity={1}
                envMapIntensity={0.75}
              />
            </mesh>
          </>
        )}

        {/* Etiqueta frontal */}
        {/* theta = 0 apunta a +z (hacia la cámara): la etiqueta queda centrada al frente. */}
        <mesh position={[0, labelY, 0]}>
          <cylinderGeometry args={[bodyR + 0.006, bodyR + 0.006, labelH, 64, 1, true, -labelArc / 2, labelArc]} />
          <meshStandardMaterial map={label} roughness={0.55} metalness={0.15} side={THREE.FrontSide} />
        </mesh>

        {/* Tapa */}
        {s.cap !== 'none' && (
          <mesh position={[0, capY, 0]}>
            <cylinderGeometry args={[capW, capW, capH, 48]} />
            <meshPhysicalMaterial
              color={s.cap === 'foil' ? shade(color, -0.2) : s.cap === 'cork' ? '#1a1410' : '#2a2a38'}
              metalness={s.cap === 'cork' ? 0.2 : 0.9}
              roughness={s.cap === 'cork' ? 0.6 : 0.25}
              clearcoat={0.6}
            />
          </mesh>
        )}

        {/* Pedestal tecnológico */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[bodyR * 1.25, bodyR * 1.32, 96]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[bodyR * 1.9, 96]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function NeonLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, 1.5, 1.5]} intensity={22} color="#7c3aed" distance={10} />
      <pointLight position={[3, -0.5, 1.5]} intensity={18} color="#22d3ee" distance={10} />
      <pointLight position={[0, 3, -2]} intensity={12} color="#e879f9" distance={8} />
    </>
  );
}

/** Pausa el render cuando el lienzo no está visible para ahorrar batería. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

export default function BottleScene(props: BottleSceneProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const s = SHAPES[props.shape];
  const height = (BOTTOM - s.neckTop + s.capH) * UNIT;
  const distance = Math.max(7, height * 2.75);

  return (
    <div ref={ref} className="size-full">
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, distance], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <EnvironmentSetup />
        <NeonLights />
        <Bottle {...props} />
      </Canvas>
    </div>
  );
}
