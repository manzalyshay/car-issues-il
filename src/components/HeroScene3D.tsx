'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* ── Stylised low-poly car built from basic geometries ── */
function CarModel() {
  const group = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.35;
  });

  const bodyColor   = '#1a1a2e';
  const glassColor  = '#5c9bd4';
  const wheelColor  = '#111';
  const rimColor    = '#c8c8c8';
  const accentColor = '#dc1a2c';

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Main body — lower */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[2.2, 0.44, 1.0]} />
        <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.7} />
      </mesh>

      {/* Cabin / upper body */}
      <mesh position={[0.05, 0.58, 0]} castShadow>
        <boxGeometry args={[1.3, 0.38, 0.88]} />
        <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.7} />
      </mesh>

      {/* Windshield (front glass) */}
      <mesh position={[0.7, 0.56, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.04, 0.36, 0.82]} />
        <meshStandardMaterial color={glassColor} roughness={0.05} metalness={0.1} opacity={0.7} transparent />
      </mesh>
      {/* Rear glass */}
      <mesh position={[-0.68, 0.56, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.04, 0.36, 0.82]} />
        <meshStandardMaterial color={glassColor} roughness={0.05} metalness={0.1} opacity={0.7} transparent />
      </mesh>

      {/* Red accent stripe along lower body */}
      <mesh position={[0, 0.06, 0.51]}>
        <boxGeometry args={[2.0, 0.07, 0.02]} />
        <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} emissive={accentColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.06, -0.51]}>
        <boxGeometry args={[2.0, 0.07, 0.02]} />
        <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} emissive={accentColor} emissiveIntensity={0.4} />
      </mesh>

      {/* Front headlights */}
      <mesh position={[1.1, 0.25, 0.3]}>
        <boxGeometry args={[0.08, 0.1, 0.22]} />
        <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[1.1, 0.25, -0.3]}>
        <boxGeometry args={[0.08, 0.1, 0.22]} />
        <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={1.2} />
      </mesh>

      {/* Rear lights */}
      <mesh position={[-1.1, 0.25, 0.3]}>
        <boxGeometry args={[0.06, 0.1, 0.22]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-1.1, 0.25, -0.3]}>
        <boxGeometry args={[0.06, 0.1, 0.22]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} />
      </mesh>

      {/* Wheels — four corners */}
      {[
        [0.75, -0.08, 0.52],
        [-0.75, -0.08, 0.52],
        [0.75, -0.08, -0.52],
        [-0.75, -0.08, -0.52],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          {/* Tyre */}
          <mesh castShadow>
            <cylinderGeometry args={[0.27, 0.27, 0.18, 20]} />
            <meshStandardMaterial color={wheelColor} roughness={0.9} />
          </mesh>
          {/* Rim */}
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.19, 12]} />
            <meshStandardMaterial color={rimColor} roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Hub */}
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.21, 8]} />
            <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Underbody / chassis */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.0, 0.08, 0.88]} />
        <meshStandardMaterial color="#0d0d12" roughness={0.8} />
      </mesh>

      {/* Ground glow — red disc underneath */}
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.25}
          opacity={0.35}
          transparent
          roughness={1}
        />
      </mesh>
    </group>
  );
}

/* ── Floating score labels (HTML overlaid on canvas) ── */
function ScoreLabel({ position, label, score }: { position: [number,number,number]; label: string; score: string }) {
  return (
    <Html position={position} center>
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(27,79,138,.18)',
        borderRadius: 8,
        padding: '5px 10px',
        fontSize: 11,
        fontFamily: "'Rubik', sans-serif",
        fontWeight: 700,
        color: '#111318',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        pointerEvents: 'none',
      }}>
        <span style={{ color: '#dc1a2c' }}>{score}</span> {label}
      </div>
    </Html>
  );
}

/* ── Ground reflection grid ── */
function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
      <planeGeometry args={[8, 8, 20, 20]} />
      <meshStandardMaterial
        color="#f0f0f3"
        wireframe={false}
        roughness={1}
        opacity={0.4}
        transparent
      />
    </mesh>
  );
}

/* ── The scene itself ── */
function Scene({ locale }: { locale: string }) {
  const isHe = locale === 'he';
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 4, -3]} intensity={0.4} color="#a0b8e0" />
      {/* Red glow from below */}
      <pointLight position={[0, -0.5, 0]} intensity={2.5} color="#dc1a2c" distance={3} />
      <pointLight position={[1.2, 0.5, 1]} intensity={0.8} color="#ffffff" distance={5} />

      <Environment preset="city" />
      <GridFloor />

      <Float floatIntensity={0.4} rotationIntensity={0} speed={1.5}>
        <CarModel />
      </Float>

      {/* Floating score labels */}
      <ScoreLabel position={[2, 1.2, 0]} label={isHe ? 'אמינות' : 'Reliability'} score="9.1" />
      <ScoreLabel position={[-2, 0.8, 0.5]} label={isHe ? 'ביצועים' : 'Performance'} score="8.4" />
      <ScoreLabel position={[1.6, -0.1, 1.2]} label={isHe ? 'ערך' : 'Value'} score="8.7" />
    </>
  );
}

/* ── Skeleton while loading ── */
function SceneSkeleton() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        width: 120, height: 60,
        background: 'linear-gradient(90deg, #e4e4e7 25%, #ececee 50%, #e4e4e7 75%)',
        backgroundSize: '600px 100%',
        animation: 'glassShimmer 1.8s ease-in-out infinite',
        borderRadius: 8,
      }} />
      <div style={{
        width: 80, height: 12,
        background: 'linear-gradient(90deg, #e4e4e7 25%, #ececee 50%, #e4e4e7 75%)',
        backgroundSize: '600px 100%',
        animation: 'glassShimmer 1.8s ease-in-out infinite',
        borderRadius: 6,
      }} />
    </div>
  );
}

/* ── Exported component ── */
export default function HeroScene3D({ locale = 'he' }: { locale?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <SceneSkeleton />;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [3.5, 1.8, 3.5], fov: 38 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene locale={locale} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 6}
          />
        </Suspense>
      </Canvas>

      {/* Drag hint */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(100,100,110,0.6)', fontWeight: 500,
        pointerEvents: 'none', whiteSpace: 'nowrap',
        fontFamily: "'Rubik', sans-serif",
      }}>
        {locale === 'he' ? '🖱️ גרור לסיבוב' : '🖱️ drag to rotate'}
      </div>
    </div>
  );
}
