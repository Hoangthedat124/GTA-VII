import {useFrame} from '@react-three/fiber';
import React, {useMemo, useRef} from 'react';
import * as THREE from 'three';
import {GraphicsQuality, VehicleInstance} from '../types';
import {VEHICLE_SPECS} from './worldData';

interface DetailedVehicleProps {
  vehicle: VehicleInstance;
  quality: GraphicsQuality;
  groupRef: (el: THREE.Group | null) => void;
}

/**
 * Multi-part PBR 3D Vehicle authored facing -Z.
 * Supports Sedan, SUV, Sports, Muscle, Motorcycle, Police Cruiser, and Heavy Battle Tank.
 */
export const DetailedVehicleMesh = React.memo(function DetailedVehicleMesh({
  vehicle,
  quality,
  groupRef,
}: DetailedVehicleProps): React.ReactElement {
  const spec = VEHICLE_SPECS[vehicle.kind];
  const bodyTiltRef = useRef<THREE.Group>(null);
  const turretRef = useRef<THREE.Group>(null);
  const flSteerRef = useRef<THREE.Group>(null);
  const frSteerRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const brakeLightMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sirenRedRef = useRef<THREE.MeshStandardMaterial>(null);
  const sirenBlueRef = useRef<THREE.MeshStandardMaterial>(null);

  const isMoto = vehicle.kind === 'motorcycle';
  const isSuv = vehicle.kind === 'suv';
  const isSports = vehicle.kind === 'sports';
  const isMuscle = vehicle.kind === 'muscle';
  const isPolice = vehicle.kind === 'police';
  const isTank = vehicle.kind === 'tank';

  const activeColor = vehicle.customColor || spec.color;
  const wheelRadius = isMoto ? 0.34 : isSuv ? 0.42 : isTank ? 0.44 : 0.36;
  const wheelWidth = isMoto ? 0.16 : isTank ? 0.56 : 0.26;
  const halfLen = spec.length * 0.5;
  const halfWid = spec.width * 0.5;
  const axleFrontZ = -halfLen * 0.64;
  const axleRearZ = halfLen * 0.64;
  const trackX = isMoto ? 0 : halfWid - wheelWidth * 0.5;

  const paintProps = useMemo(
    () => ({
      color: activeColor,
      roughness: isTank ? 0.58 : quality === 'low' ? 0.35 : 0.18,
      metalness: isTank ? 0.45 : 0.72,
      clearcoat: isTank ? 0.05 : quality === 'high' || quality === 'ultra' ? 0.9 : 0.3,
      clearcoatRoughness: 0.12,
    }),
    [activeColor, isTank, quality],
  );

  useFrame(({clock}, delta) => {
    const dt = Math.min(delta, 0.1);
    if (bodyTiltRef.current) {
      bodyTiltRef.current.rotation.x = THREE.MathUtils.lerp(
        bodyTiltRef.current.rotation.x,
        vehicle.pitch,
        10 * dt,
      );
      bodyTiltRef.current.rotation.z = THREE.MathUtils.lerp(
        bodyTiltRef.current.rotation.z,
        vehicle.roll,
        10 * dt,
      );
    }

    if (isTank && turretRef.current) {
      const targetLocalYaw = (vehicle.turretYaw ?? vehicle.rotY) - vehicle.rotY;
      const diff =
        THREE.MathUtils.euclideanModulo(
          targetLocalYaw - turretRef.current.rotation.y + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      turretRef.current.rotation.y += diff * Math.min(1, 7 * dt);
    }

    if (flSteerRef.current) flSteerRef.current.rotation.y = vehicle.steerAngle;
    if (frSteerRef.current) frSteerRef.current.rotation.y = vehicle.steerAngle;

    const wheelDeltaRot = -(vehicle.speed * dt) / Math.max(0.2, wheelRadius);
    for (const w of wheelRefs.current) {
      if (w) w.rotation.x += wheelDeltaRot;
    }

    if (brakeLightMatRef.current) {
      brakeLightMatRef.current.emissiveIntensity = vehicle.braking ? 3.2 : 0.9;
    }

    if (isPolice && sirenRedRef.current && sirenBlueRef.current) {
      const flash = Math.sin(clock.getElapsedTime() * 16) > 0;
      sirenRedRef.current.emissiveIntensity = flash ? 4.0 : 0.3;
      sirenBlueRef.current.emissiveIntensity = flash ? 0.3 : 4.0;
    }
  });

  if (isTank) {
    return (
      <group
        ref={groupRef}
        position={[vehicle.x, vehicle.y, vehicle.z]}
        rotation={[0, vehicle.rotY, 0]}>
        <group ref={bodyTiltRef}>
          {/* Left & Right Armored Track Sponsons */}
          {[-1.28, 1.28].map((tx, sideIdx) => (
            <group key={`track-${sideIdx}`} position={[tx, 0.52, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.72, 0.84, 5.9]} />
                <meshStandardMaterial
                  color="#18181b"
                  roughness={0.85}
                  metalness={0.4}
                />
              </mesh>
              {/* Side Armor Skirt */}
              <mesh position={[sideIdx === 0 ? -0.32 : 0.32, 0.24, 0]} castShadow>
                <boxGeometry args={[0.12, 0.42, 5.7]} />
                <meshPhysicalMaterial {...paintProps} />
              </mesh>
              {/* Road Wheels inside treads */}
              {[-2.1, -1.05, 0, 1.05, 2.1].map((wz, wi) => (
                <group
                  key={`tw-${wi}`}
                  position={[0, -0.08, wz]}
                  ref={(el) => {
                    if (sideIdx === 0 && wi < 4) wheelRefs.current[wi] = el;
                    if (sideIdx === 1 && wi < 4) wheelRefs.current[4 + wi] = el;
                  }}>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.38, 0.38, 0.62, 12]} />
                    <meshStandardMaterial color="#334155" metalness={0.65} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}

          {/* Main Armored Hull */}
          <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.88, 5.6]} />
            <meshPhysicalMaterial {...paintProps} />
          </mesh>
          {/* Sloped Front Glacis Armor (-Z) */}
          <mesh
            position={[0, 0.86, -2.85]}
            rotation={[0.45, 0, 0]}
            castShadow>
            <boxGeometry args={[2.05, 0.65, 0.9]} />
            <meshPhysicalMaterial {...paintProps} />
          </mesh>
          {/* Rear Engine Deck Vents (+Z) */}
          <mesh position={[0, 1.4, 2.05]}>
            <boxGeometry args={[1.65, 0.1, 1.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>

          {/* Rotating Turret & 120mm Cannon */}
          <group ref={turretRef} position={[0, 1.48, -0.15]}>
            <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.95, 0.72, 2.6]} />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>
            {/* Turret Cheek Slope */}
            <mesh position={[0, 0.38, -1.45]} rotation={[0.32, 0, 0]} castShadow>
              <boxGeometry args={[1.72, 0.56, 0.65]} />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>
            {/* Commander Cupola Hatch */}
            <mesh position={[0.45, 0.82, 0.35]} castShadow>
              <cylinderGeometry args={[0.34, 0.38, 0.22, 10]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} />
            </mesh>
            {/* 120mm Main Cannon Barrel (-Z) */}
            <mesh
              position={[0, 0.42, -3.1]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow>
              <cylinderGeometry args={[0.13, 0.16, 3.8, 12]} />
              <meshStandardMaterial
                color="#27272a"
                metalness={0.82}
                roughness={0.3}
              />
            </mesh>
            {/* Bore Evacuator */}
            <mesh position={[0, 0.42, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.21, 0.21, 0.68, 12]} />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>
            {/* Muzzle Brake */}
            <mesh position={[0, 0.42, -4.95]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.19, 0.19, 0.32, 12]} />
              <meshStandardMaterial color="#09090b" metalness={0.9} />
            </mesh>
          </group>

          {/* Tank Emissive Headlights (-Z) */}
          <mesh position={[-0.78, 1.05, -2.92]}>
            <boxGeometry args={[0.28, 0.16, 0.08]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fef08a"
              emissiveIntensity={vehicle.headlightsOn ? 3.0 : 0.4}
            />
          </mesh>
          <mesh position={[0.78, 1.05, -2.92]}>
            <boxGeometry args={[0.28, 0.16, 0.08]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fef08a"
              emissiveIntensity={vehicle.headlightsOn ? 3.0 : 0.4}
            />
          </mesh>

          {/* Tank Rear Brake Lights (+Z) */}
          <mesh position={[-0.75, 1.0, 2.82]}>
            <boxGeometry args={[0.32, 0.15, 0.08]} />
            <meshStandardMaterial
              ref={brakeLightMatRef}
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.9}
            />
          </mesh>
          <mesh position={[0.75, 1.0, 2.82]}>
            <boxGeometry args={[0.32, 0.15, 0.08]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={vehicle.braking ? 3.2 : 0.9}
            />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={[vehicle.x, vehicle.y, vehicle.z]}
      rotation={[0, vehicle.rotY, 0]}>
      {/* Chassis & Suspension Group */}
      <group ref={bodyTiltRef}>
        {isMoto ? (
          <group>
            <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.38, 1.55]} />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>
            <mesh
              position={[0, 0.78, -0.58]}
              rotation={[-0.45, 0, 0]}
              castShadow>
              <boxGeometry args={[0.38, 0.42, 0.45]} />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>
            <mesh position={[0, 0.98, -0.66]} rotation={[-0.55, 0, 0]}>
              <boxGeometry args={[0.32, 0.25, 0.06]} />
              <meshStandardMaterial
                color="#93c5fd"
                transparent
                opacity={0.45}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0, 0.88, -0.45]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} />
            </mesh>
            <mesh position={[0, 0.76, 0.22]}>
              <boxGeometry args={[0.32, 0.14, 0.65]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>
        ) : (
          <group>
            <mesh
              position={[0, wheelRadius + 0.18, 0]}
              castShadow
              receiveShadow>
              <boxGeometry
                args={[spec.width, isSuv ? 0.58 : 0.44, spec.length]}
              />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>

            {isPolice && (
              <mesh position={[0, wheelRadius + 0.2, 0]}>
                <boxGeometry
                  args={[spec.width + 0.02, 0.42, spec.length * 0.46]}
                />
                <meshStandardMaterial
                  color="#f8fafc"
                  roughness={0.22}
                  metalness={0.35}
                />
              </mesh>
            )}

            <mesh
              position={[0, wheelRadius + (isSuv ? 0.5 : 0.38), -halfLen * 0.48]}
              rotation={[0.08, 0, 0]}
              castShadow>
              <boxGeometry
                args={[spec.width * 0.92, 0.14, spec.length * 0.38]}
              />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>

            {isMuscle && (
              <mesh position={[0, wheelRadius + 0.49, -halfLen * 0.45]}>
                <boxGeometry args={[0.56, 0.14, 0.72]} />
                <meshStandardMaterial
                  color="#111827"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
            )}

            <mesh
              position={[0, wheelRadius + (isSuv ? 0.74 : 0.58), isSuv ? 0.2 : 0.12]}
              castShadow>
              <boxGeometry
                args={[
                  spec.width * 0.84,
                  isSuv ? 0.56 : 0.44,
                  spec.length * (isSuv ? 0.58 : 0.46),
                ]}
              />
              <meshStandardMaterial
                color="#7dd3fc"
                transparent
                opacity={0.44}
                roughness={0.08}
                metalness={0.9}
              />
            </mesh>

            <mesh
              position={[0, wheelRadius + (isSuv ? 1.03 : 0.81), isSuv ? 0.22 : 0.16]}
              castShadow>
              <boxGeometry
                args={[
                  spec.width * 0.82,
                  0.08,
                  spec.length * (isSuv ? 0.54 : 0.36),
                ]}
              />
              <meshPhysicalMaterial {...paintProps} />
            </mesh>

            {(isSports || vehicle.isRacer) && (
              <group position={[0, wheelRadius + 0.62, halfLen - 0.22]}>
                <mesh position={[0, 0.14, 0]} castShadow>
                  <boxGeometry args={[spec.width * 0.94, 0.06, 0.32]} />
                  <meshStandardMaterial
                    color="#0f172a"
                    metalness={0.7}
                    roughness={0.25}
                  />
                </mesh>
                <mesh position={[-0.55, 0, 0]}>
                  <boxGeometry args={[0.06, 0.24, 0.18]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[0.55, 0, 0]}>
                  <boxGeometry args={[0.06, 0.24, 0.18]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>
            )}

            {vehicle.isRacer && (
              <group>
                {/* Twin GT Racing Stripes on Hood & Roof */}
                <mesh position={[-0.22, wheelRadius + 0.46, -halfLen * 0.48]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.16, 0.04, spec.length * 0.36]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.2} />
                </mesh>
                <mesh position={[0.22, wheelRadius + 0.46, -halfLen * 0.48]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.16, 0.04, spec.length * 0.36]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.2} />
                </mesh>
                <mesh position={[-0.22, wheelRadius + 0.86, 0.16]}>
                  <boxGeometry args={[0.16, 0.03, spec.length * 0.34]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.2} />
                </mesh>
                <mesh position={[0.22, wheelRadius + 0.86, 0.16]}>
                  <boxGeometry args={[0.16, 0.03, spec.length * 0.34]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.2} />
                </mesh>
                {/* Glowing Race Number Plate on Roof */}
                <mesh position={[0, wheelRadius + 0.88, 0.16]}>
                  <boxGeometry args={[0.55, 0.03, 0.48]} />
                  <meshStandardMaterial
                    color="#fef08a"
                    emissive={activeColor}
                    emissiveIntensity={1.1}
                  />
                </mesh>
              </group>
            )}

            {isPolice && (
              <group position={[0, wheelRadius + 0.92, 0.12]}>
                <mesh position={[-0.32, 0, 0]}>
                  <boxGeometry args={[0.55, 0.14, 0.26]} />
                  <meshStandardMaterial
                    ref={sirenRedRef}
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={2.5}
                  />
                </mesh>
                <mesh position={[0.32, 0, 0]}>
                  <boxGeometry args={[0.55, 0.14, 0.26]} />
                  <meshStandardMaterial
                    ref={sirenBlueRef}
                    color="#3b82f6"
                    emissive="#3b82f6"
                    emissiveIntensity={2.5}
                  />
                </mesh>
              </group>
            )}

            <mesh position={[0, wheelRadius + 0.05, -halfLen - 0.02]}>
              <boxGeometry args={[spec.width * 0.96, 0.18, 0.14]} />
              <meshStandardMaterial
                color={spec.accentColor}
                roughness={0.4}
                metalness={0.5}
              />
            </mesh>
            <mesh position={[0, wheelRadius + 0.05, halfLen + 0.02]}>
              <boxGeometry args={[spec.width * 0.96, 0.18, 0.14]} />
              <meshStandardMaterial
                color={spec.accentColor}
                roughness={0.4}
                metalness={0.5}
              />
            </mesh>
          </group>
        )}

        <mesh
          position={[isMoto ? 0 : -halfWid * 0.65, wheelRadius + 0.24, -halfLen - 0.01]}>
          <boxGeometry args={[isMoto ? 0.2 : 0.34, 0.14, 0.06]} />
          <meshStandardMaterial
            color="#fef9c3"
            emissive="#fef08a"
            emissiveIntensity={vehicle.headlightsOn ? 2.8 : 0.4}
          />
        </mesh>
        {!isMoto && (
          <mesh position={[halfWid * 0.65, wheelRadius + 0.24, -halfLen - 0.01]}>
            <boxGeometry args={[0.34, 0.14, 0.06]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fef08a"
              emissiveIntensity={vehicle.headlightsOn ? 2.8 : 0.4}
            />
          </mesh>
        )}

        <mesh
          position={[isMoto ? 0 : -halfWid * 0.65, wheelRadius + 0.24, halfLen + 0.01]}>
          <boxGeometry args={[isMoto ? 0.18 : 0.36, 0.13, 0.06]} />
          <meshStandardMaterial
            ref={brakeLightMatRef}
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.9}
          />
        </mesh>
        {!isMoto && (
          <mesh position={[halfWid * 0.65, wheelRadius + 0.24, halfLen + 0.01]}>
            <boxGeometry args={[0.36, 0.13, 0.06]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={vehicle.braking ? 3.2 : 0.9}
            />
          </mesh>
        )}
      </group>

      {isMoto ? (
        <>
          <group ref={flSteerRef} position={[0, wheelRadius, axleFrontZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[0] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
          <group position={[0, wheelRadius, axleRearZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[1] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
        </>
      ) : (
        <>
          <group ref={flSteerRef} position={[-trackX, wheelRadius, axleFrontZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[0] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
          <group ref={frSteerRef} position={[trackX, wheelRadius, axleFrontZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[1] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
          <group position={[-trackX, wheelRadius, axleRearZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[2] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
          <group position={[trackX, wheelRadius, axleRearZ]}>
            <group
              ref={(el) => {
                wheelRefs.current[3] = el;
              }}>
              <WheelMesh radius={wheelRadius} width={wheelWidth} />
            </group>
          </group>
        </>
      )}
    </group>
  );
});

function WheelMesh({radius, width}: {radius: number; width: number}) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 16]} />
        <meshStandardMaterial color="#18181b" roughness={0.85} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.58, radius * 0.58, width + 0.02, 10]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  );
}
