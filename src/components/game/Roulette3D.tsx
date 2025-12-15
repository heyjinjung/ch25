import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";

export interface Roulette3DSegment {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
}

interface Roulette3DProps {
  readonly segments: Roulette3DSegment[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
  readonly spinDurationMs?: number;
  readonly onSpinEnd?: () => void;
}

const COLORS = ["#16a34a", "#f97316", "#22d3ee", "#a855f7", "#eab308", "#0ea5e9"];
const DEFAULT_SEGMENTS: Roulette3DSegment[] = Array.from({ length: 8 }).map((_, idx) => ({
  label: `BONUS ${idx + 1}`,
  weight: 1,
  isJackpot: idx === 0,
}));

const WheelMesh: React.FC<Omit<Roulette3DProps, "segments"> & { segments: Roulette3DSegment[] }> = ({
  segments,
  isSpinning,
  selectedIndex,
  spinDurationMs = 3200,
  onSpinEnd,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const targetRotationRef = useRef(0);
  const lastSelectedRef = useRef<number | undefined>(undefined);

  const sliceAngles = useMemo(() => {
    const count = Math.max(segments.length, 6);
    const baseAngle = (2 * Math.PI) / count;
    return segments.map((s, i) => ({
      start: i * baseAngle,
      end: (i + 1) * baseAngle,
      isJackpot: s.isJackpot,
      color: s.isJackpot ? "#facc15" : COLORS[i % COLORS.length],
    }));
  }, [segments]);

  useEffect(() => {
    if (!isSpinning) return;
    const now = performance.now();
    startTimeRef.current = now;
    const baseTurns = 8 + (lastSelectedRef.current === undefined ? 0 : lastSelectedRef.current);
    const count = Math.max(segments.length, 6);
    const per = (2 * Math.PI) / count;
    const targetIndex = selectedIndex ?? 0;
    targetRotationRef.current = baseTurns * 2 * Math.PI + (Math.PI / 2) - (targetIndex + 0.5) * per;
    lastSelectedRef.current = targetIndex;
  }, [isSpinning, selectedIndex, segments.length]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !isSpinning || startTimeRef.current === null) return;
    const elapsed = performance.now() - startTimeRef.current;
    const duration = spinDurationMs;
    const t = Math.min(1, elapsed / duration);
    const easeOut = 1 - Math.pow(1 - t, 3);
    const base = targetRotationRef.current;
    group.rotation.z = base * easeOut;
    if (t >= 1) {
      onSpinEnd?.();
      startTimeRef.current = null;
    }
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0.02]}> {/* slight tilt for depth */}
      {/* Wheel body */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.4, Math.max(segments.length, 24)]} />
        <meshStandardMaterial color="#0f172a" metalness={0.15} roughness={0.85} emissive="#0a0f1a" emissiveIntensity={0.3} />
      </mesh>

      {/* Colored slices */}
      {sliceAngles.map((slice, idx) => (
        <mesh key={idx} rotation={[0, 0, (slice.start + slice.end) / 2]} position={[0, 0, 0.21]} castShadow receiveShadow>
          <cylinderGeometry args={[3.1, 3.1, 0.02, 2, 1, true, 0, slice.end - slice.start]} />
          <meshStandardMaterial
            color={slice.color}
            metalness={0.1}
            roughness={0.9}
            emissive={slice.isJackpot ? "#facc15" : slice.color}
            emissiveIntensity={slice.isJackpot ? 0.4 : 0.15}
          />
        </mesh>
      ))}

      {/* Center hub */}
      <mesh position={[0, 0, 0.25]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 24]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.35} roughness={0.4} emissive="#1f2937" emissiveIntensity={0.25} />
      </mesh>

      {/* Pointer */}
      <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.24, 0.6, 24]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
};

export const Roulette3D: React.FC<Roulette3DProps> = (props) => {
  const { segments } = props;
  const displaySegments = segments?.length ? segments : DEFAULT_SEGMENTS;
  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-emerald-700/40 bg-slate-950/70 p-3 shadow-2xl">
      <Canvas shadows style={{ height: "420px" }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#bfe3ff", "#0b1220", 0.45]} />
        <directionalLight position={[4, 6, 6]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <spotLight position={[0, 0, 9]} angle={0.7} penumbra={0.35} intensity={1.1} distance={25} castShadow color="#facc15" />
        <pointLight position={[3.5, -2.5, 4.8]} intensity={1.25} distance={20} decay={1.4} color="#7dd3fc" />
        <pointLight position={[-3, 3.5, 4]} intensity={1.05} distance={18} decay={1.3} color="#f9a8d4" />
        <Stars radius={30} depth={20} count={500} factor={2} saturation={0} fade speed={2} />
        <PerspectiveCamera makeDefault position={[0, -6.4, 4.2]} fov={50} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.4} maxPolarAngle={Math.PI / 2.4} />
        <RouletteCentralLabel labels={displaySegments.map((s) => s.label)} />
        <WheelMesh {...props} segments={displaySegments} />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={10}
          blur={2.5}
          far={4}
        />
      </Canvas>
      {!segments?.length && (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/70 text-sm font-semibold text-amber-200">
          실시간 구간 정보를 불러올 수 없습니다. 임시 구성으로 표시 중입니다.
        </div>
      )}
    </div>
  );
};

const RouletteCentralLabel: React.FC<{ labels: string[] }> = ({ labels }) => {
  const text = labels.join(" · ").slice(0, 64) || "Premium Roulette";
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 42px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text]);

  return (
    <mesh position={[0, 0, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.2, 32]} />
      <meshStandardMaterial map={texture} metalness={0.3} roughness={0.7} />
    </mesh>
  );
};

export default Roulette3D;
