import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";

interface DiceProps {
  readonly value: number;
  readonly color?: string;
  readonly rolling?: boolean;
  readonly offset?: [number, number, number];
  readonly phase?: number;
}

const pipPositions: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.3, -0.3], [0.3, 0.3]],
  3: [[-0.35, -0.35], [0, 0], [0.35, 0.35]],
  4: [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]],
  5: [[-0.35, -0.35], [0.35, -0.35], [0, 0], [-0.35, 0.35], [0.35, 0.35]],
  6: [[-0.35, -0.4], [0.35, -0.4], [-0.35, 0], [0.35, 0], [-0.35, 0.4], [0.35, 0.4]],
};

const Face: React.FC<{ value: number; axis: "x" | "y" | "z"; sign: -1 | 1 }> = ({ value, axis, sign }) => {
  const positions = useMemo(() => pipPositions[value] ?? [], [value]);
  const rotation: [number, number, number] =
    axis === "z"
      ? [0, 0, sign === 1 ? 0 : Math.PI]
      : axis === "x"
      ? [0, Math.PI / 2 * sign, 0]
      : [Math.PI / 2 * -sign, 0, 0];
  const translate: [number, number, number] =
    axis === "z" ? [0, 0, 0.5 * sign] : axis === "x" ? [0.5 * sign, 0, 0] : [0, 0.5 * sign, 0];

  return (
    <group rotation={rotation} position={translate}>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {positions.map((p, idx) => (
        <mesh key={idx} position={[p[0], p[1], 0.01]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}
    </group>
  );
};

const valueRotation = (value: number): THREE.Euler => {
  switch (value) {
    case 1: return new THREE.Euler(0, 0, 0);
    case 2: return new THREE.Euler(Math.PI / 2, 0, 0);
    case 3: return new THREE.Euler(0, 0, Math.PI / 2);
    case 4: return new THREE.Euler(0, 0, -Math.PI / 2);
    case 5: return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 6: return new THREE.Euler(Math.PI, 0, 0);
    default: return new THREE.Euler(0, 0, 0);
  }
};

const DiceMesh: React.FC<DiceProps> = ({ value, color = "#e2e8f0", rolling, offset = [0, 0, 0], phase = 0 }) => {
  const randomSeed = useMemo(() => Math.random() * Math.PI * 2, []);
  const seedRotation: [number, number, number] = [randomSeed * 0.2, randomSeed * 0.4, randomSeed * 0.1];
  const spinRef = useRef<THREE.Group>(null);
  const spinMix = useRef(0);
  const restQuat = useMemo(() => new THREE.Quaternion().setFromEuler(valueRotation(value === 0 ? 1 : value)), [value]);

  useFrame((state, delta) => {
    if (!spinRef.current) return;
    const target = rolling ? 1 : 0;
    spinMix.current = THREE.MathUtils.lerp(spinMix.current, target, delta * 5);
    const t = state.clock.getElapsedTime();
    const wobble = 0.08 * Math.sin(t * 1.8 + phase);
    const speed = spinMix.current;

    if (speed > 0.02) {
      spinRef.current.rotation.x += (3.4 * delta + wobble * 0.5) * speed;
      spinRef.current.rotation.y += (2.9 * delta + wobble * 0.4) * speed;
      spinRef.current.rotation.z += (2.1 * delta + wobble * 0.3) * speed;
    } else {
      spinRef.current.quaternion.slerp(restQuat, delta * 6);
    }

    // Subtle hover + bounce when rolling
    const lift = 0.18 * speed + 0.04 * Math.sin(t * 5 + phase) * speed;
    spinRef.current.position.x = offset[0] + 0.35 * Math.sin(t * 4 + phase) * speed;
    spinRef.current.position.y = offset[1] + 0.35 * Math.sin(t * 3.6 + phase * 0.8) * speed;
    spinRef.current.position.z = offset[2] + lift;
  });

  return (
    <group ref={spinRef} position={offset} rotation={seedRotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color={color} metalness={0.1} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <Face value={value === 0 ? 1 : value} axis="z" sign={1} />
      <Face value={value === 0 ? 2 : value} axis="z" sign={-1} />
      <Face value={value === 0 ? 3 : value} axis="x" sign={1} />
      <Face value={value === 0 ? 4 : value} axis="x" sign={-1} />
      <Face value={value === 0 ? 5 : value} axis="y" sign={1} />
      <Face value={value === 0 ? 6 : value} axis="y" sign={-1} />
      {rolling && (
        <primitive
          object={new THREE.AxesHelper(0.01)}
          position={[0, 0, 0]}
          rotation={[0, 0, 0] as [number, number, number]}
        />
      )}
    </group>
  );
};

interface Dice3DProps {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly isRolling?: boolean;
}

export const Dice3D: React.FC<Dice3DProps> = ({ userDice, dealerDice, isRolling }) => {
  const safeUser = userDice.length ? userDice : [1, 2];
  const safeDealer = dealerDice.length ? dealerDice : [3, 4];

  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-700/40 bg-slate-950/70 p-3 shadow-2xl">
      <Canvas shadows style={{ height: "360px" }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#e0f2fe", "#0b1220", 0.6]} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <spotLight position={[0, 1.8, 7]} angle={0.65} penumbra={0.4} intensity={1.1} distance={18} castShadow color="#facc15" />
        <pointLight position={[-3.5, -3.5, 3.5]} intensity={1.2} distance={16} decay={1.3} color="#7dd3fc" />
        <Stars radius={20} depth={12} count={300} factor={1.5} saturation={0} fade speed={2} />
        <PerspectiveCamera makeDefault position={[0, -6, 4.2]} fov={52} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={(2 * Math.PI) / 3} />

        <group position={[0, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0] as [number, number, number]} receiveShadow>
            <planeGeometry args={[10, 6]} />
            <meshStandardMaterial color="#0b1220" metalness={0.05} roughness={0.9} />
          </mesh>
          <DiceMesh value={safeUser[0] ?? 1} offset={[-2.1, 0.7, 0.5]} rolling={isRolling} phase={0.2} />
          <DiceMesh value={safeUser[1] ?? 2} offset={[-0.6, 1.0, 0.5]} rolling={isRolling} color="#d1fae5" phase={0.7} />
          <DiceMesh value={safeDealer[0] ?? 3} offset={[0.9, -0.6, 0.5]} rolling={isRolling} color="#fecdd3" phase={1.1} />
          <DiceMesh value={safeDealer[1] ?? 4} offset={[2.4, -0.9, 0.5]} rolling={isRolling} color="#ffe4e6" phase={1.6} />
        </group>
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={8} blur={2.2} far={4} />
      </Canvas>
    </div>
  );
};

export default Dice3D;
