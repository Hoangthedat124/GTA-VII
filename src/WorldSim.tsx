import {useFrame} from '@react-three/fiber';
import {
  CuboidCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {HumanoidCharacter} from '../components/HumanoidCharacter';
import {
  GraphicsQuality,
  PickupItem,
  VehicleInstance,
  VehicleKind,
  WeaponId,
  WeatherType,
} from '../types';
import {gameAudio, isBodyAlive, toVec3} from '../utils';
import {TrafficLightState} from './CityEnvironment';
import {DetailedVehicleMesh} from './VehicleSystem';
import {
  BRIDGE_Z_CENTERS,
  getAllCollisionBoxes,
  getBridgeSurfaceY,
  hasLineOfSight,
  INITIAL_PICKUPS,
  INITIAL_VEHICLES,
  intersectSegmentWithWalls,
  MISSIONS,
  RACETRACK_SAMPLE_COUNT,
  RACETRACK_SAMPLES,
  RIVER_MAX_X,
  RIVER_MIN_X,
  ROAD_X_CENTERS,
  ROAD_Z_CENTERS,
  ROBBERY_SPOTS,
  SIDE_MISSIONS,
  TOTAL_RACE_LAPS,
  VEHICLE_SPECS,
} from './worldData';

export interface NPCData {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  fallRotX: number;
  speed: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  fleeing: boolean;
  fleeTimer: number;
  knockedDown: boolean;
  knockdownTimer: number;
  knockVx: number;
  knockVy: number;
  knockVz: number;
  hp: number;
  dead: boolean;
  respawnTimer: number;
  skinColor: string;
  clothesColor: string;
  pantsColor: string;
  isPolice?: boolean;
  isSwat?: boolean;
  isIndoors?: boolean;
  homeX?: number;
  homeZ?: number;
  fireCooldown: number;
  animMode: 'idle' | 'walk' | 'run' | 'action';
}

export interface ProjectileTrace {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  fromPlayer: boolean;
  damage: number;
  isTankShell?: boolean;
  blastRadius?: number;
}

export interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  isSmoke: boolean;
}

export interface RacerProgress {
  lap: number;
  sampleIdx: number;
  gateStage: number; // 0 -> 1 -> 2 -> 3 -> next lap
  laneOffset: number;
  baseSpeed: number;
  finished: boolean;
  finishOrder: number | null;
}

export interface RaceState {
  active: boolean;
  countdown: number;
  lastCountdownBeep: number;
  elapsedSec: number;
  totalLaps: number;
  playerRank: number;
  playerProgress: RacerProgress;
  aiProgress: Record<string, RacerProgress>;
  finishCounter: number;
  lastFinishedPos: number | null;
}

export interface SharedWorldState {
  vehicles: VehicleInstance[];
  npcs: NPCData[];
  pickups: PickupItem[];
  inVehicleId: string | null;
  wantedLevel: number;
  wantedHeat: number;
  policeSawPlayer: boolean;
  wantedTimer: number;
  wantedEvadeDuration: number;
  lastCrimeTime: number;
  money: number;
  bankBalance: number;
  score: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  activeMissionId: number | null;
  activeSideMissionId: string | null;
  missionStep: number;
  missionTimer: number | null;
  completedMissions: number[];
  completedSideMissions: string[];
  ownedVehicles: VehicleKind[];
  vehicleColors: Partial<Record<VehicleKind, string>>;
  ownedHouses: string[];
  weaponUpgrades: Record<WeaponId, number>;
  robberyActiveId: string | null;
  robberyElapsed: number;
  robberyPoliceDispatched: boolean;
  robberyCooldowns: Record<string, number>;
  race: RaceState;
  toastMessage: string | null;
  toastTimer: number;
}

interface WorldSimProps {
  worldRef: React.MutableRefObject<SharedWorldState>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  playerRotRef: React.MutableRefObject<number>;
  vehicleBodiesRef: React.MutableRefObject<
    Record<string, RapierRigidBody | null>
  >;
  vehicleGroupRefs: React.MutableRefObject<Record<string, THREE.Group | null>>;
  trafficLightRef: React.MutableRefObject<TrafficLightState>;
  projectilesRef: React.MutableRefObject<ProjectileTrace[]>;
  particlesRef: React.MutableRefObject<SparkParticle[]>;
  weather: WeatherType;
  quality: GraphicsQuality;
  paused: boolean;
  onPlayerDamage: (dmg: number) => void;
  onPickupCollected: (kind: PickupItem['kind']) => void;
  onHitMarker: () => void;
  onCameraShake: (amount: number) => void;
  onMissionComplete: (
    kind: 'main' | 'side',
    id: number | string,
    money: number,
    score: number,
  ) => void;
  onShowToast: (msg: string) => void;
}

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

const SKIN_PALETTE = ['#fcd5b5', '#e5b887', '#c68642', '#8d5524', '#f5cba7'];
const CLOTHES_PALETTE = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#475569',
  '#db2777',
];
const PANTS_PALETTE = ['#1e293b', '#0f172a', '#334155', '#3f3f46', '#1e3a8a'];

export function createInitialWorldState(
  maxHealth: number,
  maxArmor: number,
): SharedWorldState {
  const vehicles: VehicleInstance[] = INITIAL_VEHICLES.map((v) => ({...v}));
  const pickups: PickupItem[] = INITIAL_PICKUPS.map((p) => ({...p}));

  const trafficSpecs: Array<{
    kind: VehicleInstance['kind'];
    x: number;
    z: number;
    rotY: number;
  }> = [
    {kind: 'sedan', x: -61, z: -40, rotY: Math.PI},
    {kind: 'suv', x: 3, z: -137, rotY: Math.PI / 2},
    {kind: 'muscle', x: 67, z: 25, rotY: 0},
    {kind: 'sedan', x: -30, z: 61, rotY: -Math.PI / 2},
    {kind: 'sports', x: -3, z: 36, rotY: 0},
    {kind: 'suv', x: 61, z: -48, rotY: Math.PI},
    {kind: 'sedan', x: 175, z: -3, rotY: -Math.PI / 2}, // Main Bridge Eastbound
    {kind: 'muscle', x: 291, z: -35, rotY: Math.PI},
    {kind: 'sedan', x: 403, z: 40, rotY: 0},
    {kind: 'sports', x: 185, z: -137, rotY: Math.PI / 2}, // North Bridge Westbound
    {kind: 'suv', x: 523, z: 25, rotY: Math.PI},
    {kind: 'sedan', x: -237, z: -20, rotY: 0},
    {kind: 'muscle', x: 175, z: 137, rotY: -Math.PI / 2}, // South Bridge Eastbound
    {kind: 'sedan', x: -357, z: 45, rotY: Math.PI},
    {kind: 'suv', x: 653, z: -60, rotY: 0},
    {kind: 'sports', x: 803, z: 40, rotY: Math.PI},
  ];
  trafficSpecs.forEach((t, idx) => {
    const startY = getBridgeSurfaceY(t.x, t.z) + 0.12;
    vehicles.push({
      id: `traffic-${idx}`,
      kind: t.kind,
      x: t.x,
      y: startY,
      z: t.z,
      rotY: t.rotY,
      speed: 9.5,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      health: 100,
      headlightsOn: true,
      braking: false,
      occupiedByPlayer: false,
    });
  });

  const npcs: NPCData[] = Array.from({length: 36}, (_, i) => {
    const alongX = i % 2 === 0;
    const inEastCity = i >= 20;
    const roadBase = alongX
      ? ROAD_Z_CENTERS[i % ROAD_Z_CENTERS.length]
      : ROAD_X_CENTERS[i % ROAD_X_CENTERS.length];
    const sideOffset = i % 4 < 2 ? 7.6 : -7.6;
    const posAlongX = inEastCity
      ? 260 + ((i * 53) % 580)
      : -380 + ((i * 41) % 460);
    const posAlongZ = -240 + ((i * 37) % 440);
    const nx = alongX ? posAlongX : roadBase + sideOffset;
    const nz = alongX ? roadBase + sideOffset : posAlongZ;
    return {
      id: `npc-${i}`,
      x: nx,
      y: getBridgeSurfaceY(nx, nz),
      z: nz,
      rotY: alongX ? (i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2) : 0,
      fallRotX: 0,
      speed: 1.8 + (i % 3) * 0.45,
      axis: alongX ? 'x' : 'z',
      dir: i % 3 === 0 ? -1 : 1,
      laneCoord: roadBase + sideOffset,
      fleeing: false,
      fleeTimer: 0,
      knockedDown: false,
      knockdownTimer: 0,
      knockVx: 0,
      knockVy: 0,
      knockVz: 0,
      hp: 65,
      dead: false,
      respawnTimer: 0,
      skinColor: SKIN_PALETTE[i % SKIN_PALETTE.length],
      clothesColor: CLOTHES_PALETTE[i % CLOTHES_PALETTE.length],
      pantsColor: PANTS_PALETTE[i % PANTS_PALETTE.length],
      fireCooldown: 0,
      animMode: 'walk',
    };
  });

  // Indoor Shopkeepers, Bank Tellers, Jewelers, Cashiers & Mechanic NPCs!
  const indoorSpecs: Array<{
    id: string;
    x: number;
    z: number;
    rotY: number;
    clothes: string;
    pants: string;
  }> = [
    {id: 'indoor-bank-w-1', x: -36, z: -25.2, rotY: 0, clothes: '#0f172a', pants: '#020617'},
    {id: 'indoor-bank-w-2', x: -32, z: -25.2, rotY: 0, clothes: '#1e3a8a', pants: '#0f172a'},
    {id: 'indoor-jewel-w-1', x: 35, z: -42, rotY: -Math.PI / 2, clothes: '#312e81', pants: '#0f172a'},
    {id: 'indoor-shop-w-1', x: 38, z: -18, rotY: -Math.PI / 2, clothes: '#475569', pants: '#1e293b'},
    {id: 'indoor-mart-w-1', x: -94, z: 18, rotY: -Math.PI / 2, clothes: '#16a34a', pants: '#1e293b'},
    {id: 'indoor-garage-w-1', x: -53, z: 25, rotY: Math.PI, clothes: '#ea580c', pants: '#1e293b'},
    {id: 'indoor-bank-e-1', x: 322, z: 21, rotY: Math.PI, clothes: '#0f172a', pants: '#020617'},
    {id: 'indoor-jewel-e-1', x: 327, z: -48, rotY: Math.PI / 2, clothes: '#4c1d95', pants: '#0f172a'},
    {id: 'indoor-shop-e-1', x: 324, z: -24, rotY: Math.PI / 2, clothes: '#334155', pants: '#0f172a'},
    {id: 'indoor-mart-e-1', x: 438, z: 24, rotY: Math.PI / 2, clothes: '#15803d', pants: '#1e293b'},
  ];
  indoorSpecs.forEach((ind, idx) => {
    npcs.push({
      id: ind.id,
      x: ind.x,
      y: 0,
      z: ind.z,
      rotY: ind.rotY,
      fallRotX: 0,
      speed: 0,
      axis: 'x',
      dir: 1,
      laneCoord: ind.z,
      fleeing: false,
      fleeTimer: 0,
      knockedDown: false,
      knockdownTimer: 0,
      knockVx: 0,
      knockVy: 0,
      knockVz: 0,
      hp: 80,
      dead: false,
      respawnTimer: 0,
      skinColor: SKIN_PALETTE[idx % SKIN_PALETTE.length],
      clothesColor: ind.clothes,
      pantsColor: ind.pants,
      isIndoors: true,
      homeX: ind.x,
      homeZ: ind.z,
      fireCooldown: 0,
      animMode: 'idle',
    });
  });

  // 14 Patrol Police + SWAT Officers across both cities
  const policeCoords: [number, number][] = [
    [-22, -26],
    [22, 20],
    [48, -36],
    [-54, 18],
    [8, -66],
    [42, 58],
    [-128, -28],
    [-240, 24],
    [288, -14],
    [340, 48],
    [520, -40],
    [-68, -134],
    [68, 68],
    [650, -134],
  ];
  policeCoords.forEach(([px, pz], p) => {
    const isSwat = p >= 10;
    npcs.push({
      id: isSwat ? `police-swat-${p}` : `police-npc-${p}`,
      x: px,
      y: 0,
      z: pz,
      rotY: 0,
      fallRotX: 0,
      speed: 2.1,
      axis: p % 2 === 0 ? 'x' : 'z',
      dir: 1,
      laneCoord: p % 2 === 0 ? pz : px,
      fleeing: false,
      fleeTimer: 0,
      knockedDown: false,
      knockdownTimer: 0,
      knockVx: 0,
      knockVy: 0,
      knockVz: 0,
      hp: isSwat ? 175 : 110,
      dead: false,
      respawnTimer: 0,
      skinColor: SKIN_PALETTE[p % SKIN_PALETTE.length],
      clothesColor: isSwat ? '#0f172a' : '#1d4ed8',
      pantsColor: '#020617',
      isPolice: true,
      isSwat,
      fireCooldown: 0.55 + (p % 4) * 0.18,
      animMode: 'walk',
    });
  });

  return {
    vehicles,
    npcs,
    pickups,
    inVehicleId: null,
    wantedLevel: 0,
    wantedHeat: 0,
    policeSawPlayer: false,
    wantedTimer: 0,
    wantedEvadeDuration: 8,
    lastCrimeTime: 0,
    money: 500,
    bankBalance: 1000,
    score: 0,
    health: maxHealth,
    maxHealth,
    armor: maxArmor,
    maxArmor,
    stamina: 100,
    activeMissionId: null,
    activeSideMissionId: null,
    missionStep: 0,
    missionTimer: null,
    completedMissions: [],
    completedSideMissions: [],
    ownedVehicles: ['sedan'],
    vehicleColors: {},
    ownedHouses: ['house-starter'],
    weaponUpgrades: {
      fists: 0,
      pistol: 0,
      smg: 0,
      rifle: 0,
      shotgun: 0,
    },
    robberyActiveId: null,
    robberyElapsed: 0,
    robberyPoliceDispatched: false,
    robberyCooldowns: {},
    race: {
      active: false,
      countdown: 0,
      lastCountdownBeep: 4,
      elapsedSec: 0,
      totalLaps: TOTAL_RACE_LAPS,
      playerRank: 1,
      playerProgress: {
        lap: 1,
        sampleIdx: 0,
        gateStage: 0,
        laneOffset: 0,
        baseSpeed: 44,
        finished: false,
        finishOrder: null,
      },
      aiProgress: {
        'racer-0': {lap: 1, sampleIdx: 0, gateStage: 0, laneOffset: -4.0, baseSpeed: 37.5, finished: false, finishOrder: null},
        'racer-1': {lap: 1, sampleIdx: 0, gateStage: 0, laneOffset: 4.0, baseSpeed: 39.0, finished: false, finishOrder: null},
        'racer-2': {lap: 1, sampleIdx: 0, gateStage: 0, laneOffset: -2.0, baseSpeed: 35.8, finished: false, finishOrder: null},
        'racer-3': {lap: 1, sampleIdx: 0, gateStage: 0, laneOffset: 2.0, baseSpeed: 38.2, finished: false, finishOrder: null},
        'racer-4': {lap: 1, sampleIdx: 0, gateStage: 0, laneOffset: 0.0, baseSpeed: 36.6, finished: false, finishOrder: null},
      },
      finishCounter: 0,
      lastFinishedPos: null,
    },
    toastMessage: null,
    toastTimer: 0,
  };
}

function overlapsBuilding(
  x: number,
  z: number,
  pad = 1.2,
  y = 0.2,
  height = 1.7,
): boolean {
  const boxes = getAllCollisionBoxes();
  const minY = y;
  const maxY = y + height;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (
      maxY > b.y - b.h * 0.5 &&
      minY < b.y + b.h * 0.5 &&
      Math.abs(x - b.x) < b.w / 2 + pad &&
      Math.abs(z - b.z) < b.d / 2 + pad
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Exact continuous 3D segment vs vertical cylinder intersection for hit ordering
 * against wall AABBs (prevents bullets from hitting targets behind walls).
 */
function segmentHitsCylinder(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  cx: number,
  cyMin: number,
  cyMax: number,
  cz: number,
  radius: number,
): number | null {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const fx = x0 - cx;
  const fz = z0 - cz;
  const rSq = radius * radius;
  const a = dx * dx + dz * dz;

  let tHit: number;
  if (fx * fx + fz * fz <= rSq) {
    tHit = 0;
  } else if (a < 1e-8) {
    return null;
  } else {
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - rSq;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    tHit = (-b - Math.sqrt(disc)) / (2 * a);
    if (tHit < 0 || tHit > 1) return null;
  }

  const yAt = y0 + (y1 - y0) * tHit;
  if (yAt < cyMin || yAt > cyMax) return null;
  return tHit;
}

function findNearestTrackSample(
  x: number,
  z: number,
  hintIdx?: number,
  windowRadius = 14,
): number {
  const n = RACETRACK_SAMPLE_COUNT;
  let bestIdx = 0;
  let bestDistSq = Infinity;
  if (hintIdx !== undefined) {
    for (let offset = -4; offset <= windowRadius; offset++) {
      const idx = ((hintIdx + offset) % n + n) % n;
      const s = RACETRACK_SAMPLES[idx];
      const dSq = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    if (bestDistSq < 55 * 55) return bestIdx;
  }
  for (let idx = 0; idx < n; idx++) {
    const s = RACETRACK_SAMPLES[idx];
    const dSq = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

function advanceTrackGate(prog: RacerProgress, idx: number): boolean {
  prog.sampleIdx = idx;
  if (prog.gateStage === 0 && idx >= 20 && idx < 44) prog.gateStage = 1;
  else if (prog.gateStage === 1 && idx >= 44 && idx < 68) prog.gateStage = 2;
  else if (prog.gateStage === 2 && idx >= 68 && idx < 92) prog.gateStage = 3;
  else if (prog.gateStage === 3 && idx < 16) {
    prog.gateStage = 0;
    prog.lap += 1;
    return true;
  }
  return false;
}

function inRiverWater(x: number, z: number): boolean {
  if (x >= RIVER_MIN_X - 2 && x <= RIVER_MAX_X + 2) {
    if (BRIDGE_Z_CENTERS.some((bz) => Math.abs(z - bz) < 6.5)) return false;
    return true;
  }
  return false;
}

function findSafeRoadSpawn(
  px: number,
  pz: number,
  minDist = 42,
  maxDist = 64,
): [number, number] {
  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const sx = THREE.MathUtils.clamp(px + Math.cos(angle) * dist, -410, 900);
    const sz = THREE.MathUtils.clamp(pz + Math.sin(angle) * dist, -290, 240);
    if (!inRiverWater(sx, sz) && !overlapsBuilding(sx, sz, 2.4)) {
      return [sx, sz];
    }
  }
  const fallbackX =
    px >= RIVER_MIN_X && px <= RIVER_MAX_X
      ? px < 175
        ? 98
        : 252
      : THREE.MathUtils.clamp(px + 44, -390, 880);
  return [fallbackX, THREE.MathUtils.clamp(pz, -250, 220)];
}

function computeWantedStarsFromHeat(heat: number): number {
  if (heat <= 0) return 0;
  if (heat < 95) return 1;
  if (heat < 220) return 2;
  if (heat < 410) return 3;
  if (heat < 660) return 4;
  return 5;
}

function getEvadeDurationForLevel(level: number): number {
  if (level <= 1) return 7;
  if (level === 2) return 9;
  if (level === 3) return 11;
  if (level === 4) return 13;
  return 15;
}

const NpcActor = React.memo(function NpcActor({
  npc,
  castShadow,
  registerRef,
}: {
  npc: NPCData;
  castShadow: boolean;
  registerRef: (
    id: string,
    group: THREE.Group | null,
    setMode: (m: 'idle' | 'walk' | 'run' | 'action') => void,
  ) => void;
}): React.ReactElement {
  const [animState, setAnimState] = useState<'idle' | 'walk' | 'run' | 'action'>(
    npc.animMode,
  );
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    registerRef(npc.id, groupRef.current, setAnimState);
    return () => registerRef(npc.id, null, setAnimState);
  }, [npc.id, registerRef]);

  return (
    <HumanoidCharacter
      ref={groupRef}
      position={[npc.x, npc.y, npc.z]}
      rotation={[0, npc.rotY, 0]}
      state={animState}
      skinColor={npc.skinColor}
      clothesColor={npc.clothesColor}
      pantsColor={npc.pantsColor}
      castShadow={castShadow}
    />
  );
});

export const WorldSim = React.memo(function WorldSim({
  worldRef,
  playerPosRef,
  playerRotRef,
  vehicleBodiesRef,
  vehicleGroupRefs,
  trafficLightRef,
  projectilesRef,
  particlesRef,
  weather,
  quality,
  paused,
  onPlayerDamage,
  onPickupCollected,
  onHitMarker,
  onCameraShake,
  onMissionComplete,
  onShowToast,
}: WorldSimProps): React.ReactElement {
  const npcRefs = useRef<Record<string, THREE.Group | null>>({});
  const npcAnimSetters = useRef<
    Record<string, (m: 'idle' | 'walk' | 'run' | 'action') => void>
  >({});
  const pickupRefs = useRef<Record<string, THREE.Group | null>>({});
  const bulletInstRef = useRef<THREE.InstancedMesh>(null);
  const particleInstRef = useRef<THREE.InstancedMesh>(null);
  const missionBeaconRef = useRef<THREE.Mesh>(null);
  const checkpointRingRef = useRef<THREE.Mesh>(null);
  const raceGateGroupRef = useRef<THREE.Group>(null);
  const alarmTimerRef = useRef(0);
  const policeCarShotTimerRef = useRef(0);
  const policeReinforceTimerRef = useRef(0);
  const sirenTimerRef = useRef(0);

  const registerNpcRef = React.useCallback(
    (
      id: string,
      group: THREE.Group | null,
      setMode: (m: 'idle' | 'walk' | 'run' | 'action') => void,
    ) => {
      npcRefs.current[id] = group;
      npcAnimSetters.current[id] = setMode;
    },
    [],
  );

  const vehicles = worldRef.current.vehicles;
  const npcs = worldRef.current.npcs;
  const pickups = worldRef.current.pickups;

  const MAX_BULLETS = 64;
  const MAX_PARTICLES = 128;

  useMemo(() => {
    if (projectilesRef.current.length === 0) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        projectilesRef.current.push({
          active: false,
          x: 0,
          y: -50,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0,
          fromPlayer: true,
          damage: 0,
        });
      }
    }
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        particlesRef.current.push({
          active: false,
          x: 0,
          y: -50,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0,
          maxLife: 1,
          scale: 0.2,
          isSmoke: true,
        });
      }
    }
  }, [projectilesRef, particlesRef]);

  const spawnParticle = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    isSmoke: boolean,
    scale = 0.28,
    maxLife = 0.5,
  ) => {
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) {
        pool[i].active = true;
        pool[i].x = x;
        pool[i].y = y;
        pool[i].z = z;
        pool[i].vx = vx;
        pool[i].vy = vy;
        pool[i].vz = vz;
        pool[i].life = maxLife;
        pool[i].maxLife = maxLife;
        pool[i].scale = scale;
        pool[i].isSmoke = isSmoke;
        break;
      }
    }
  };

  const addCrimeHeat = (amount: number, minStars = 1) => {
    const w = worldRef.current;
    const prevStars = w.wantedLevel;
    w.wantedHeat = Math.min(950, w.wantedHeat + amount);
    const computed = Math.max(
      minStars,
      computeWantedStarsFromHeat(w.wantedHeat),
    );
    w.wantedLevel = Math.max(w.wantedLevel, computed);
    w.wantedEvadeDuration = getEvadeDurationForLevel(w.wantedLevel);
    w.wantedTimer = 0;
    if (w.wantedLevel > prevStars) {
      const label =
        w.wantedLevel === 1
          ? '1★ Cảnh sát tuần tra chú ý — Hãy rời khỏi khu vực!'
          : w.wantedLevel === 2
            ? '2★ Xe tuần tra đang truy đuổi!'
            : w.wantedLevel === 3
              ? '3★ Nhiều xe cảnh sát phong tỏa khu vực!'
              : w.wantedLevel === 4
                ? '4★ Lực lượng Đặc Nhiệm SWAT đã vào cuộc!'
                : '5★ BÁO ĐỘNG ĐỎ: Truy đuổi toàn thành phố!';
      onShowToast(label);
    }
  };

  const triggerBlast = (
    bx: number,
    by: number,
    bz: number,
    radius: number,
    damage: number,
  ) => {
    const w = worldRef.current;
    gameAudio.playChiptuneExplosion();
    onCameraShake(0.32);

    // Fireball + smoke burst
    for (let p = 0; p < 16; p++) {
      const isSmoke = p % 2 === 1;
      spawnParticle(
        bx + (Math.random() - 0.5) * 1.4,
        Math.max(0.3, by) + Math.random() * 0.8,
        bz + (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * (isSmoke ? 7 : 12),
        2.5 + Math.random() * 7.5,
        (Math.random() - 0.5) * (isSmoke ? 7 : 12),
        isSmoke,
        isSmoke ? 1.15 : 0.72,
        isSmoke ? 0.95 : 0.45,
      );
    }

    // Blast NPCs within radius
    let hitAny = false;
    for (let n = 0; n < w.npcs.length; n++) {
      const npc = w.npcs[n];
      if (npc.dead) continue;
      const dx = npc.x - bx;
      const dz = npc.z - bz;
      const d = Math.hypot(dx, dz);
      if (d < radius) {
        hitAny = true;
        const falloff = 1 - d / radius;
        npc.hp -= damage * (0.45 + falloff * 0.8);
        npc.knockedDown = true;
        npc.knockdownTimer = 2.6;
        const inv = 1 / Math.max(0.5, d);
        npc.knockVx = dx * inv * (14 * falloff + 4);
        npc.knockVz = dz * inv * (14 * falloff + 4);
        npc.knockVy = 6.5 * falloff + 2.5;
        if (npc.hp <= 0) {
          npc.dead = true;
          npc.respawnTimer = npc.isPolice ? 10 : 14;
          w.money += npc.isPolice ? 150 : 40;
          w.score += npc.isPolice ? 120 : 35;
          addCrimeHeat(npc.isPolice ? 120 : 75, npc.isPolice ? 2 : 1);
        } else {
          addCrimeHeat(45, 1);
        }
      }
    }

    // Blast non-player vehicles (police cars / traffic) within radius
    for (let vIdx = 0; vIdx < w.vehicles.length; vIdx++) {
      const veh = w.vehicles[vIdx];
      if (veh.occupiedByPlayer) continue;
      const dx = veh.x - bx;
      const dz = veh.z - bz;
      const d = Math.hypot(dx, dz);
      if (d < radius + 1.5) {
        hitAny = true;
        const vb = vehicleBodiesRef.current[veh.id];
        if (vb && isBodyAlive(vb)) {
          const inv = 1 / Math.max(0.8, d);
          vb.setLinvel(
            toVec3({
              x: dx * inv * 15,
              y: 4.5,
              z: dz * inv * 15,
            }),
            true,
          );
        }
        veh.speed = -8;
        if (veh.isPolice) {
          w.score += 180;
          w.money += 200;
          addCrimeHeat(140, 2);
          onShowToast('Đã thổi bay xe tuần tra! +$200');
        }
      }
    }

    if (hitAny) onHitMarker();
  };

  useEffect(() => {
    if (bulletInstRef.current) {
      bulletInstRef.current.count = MAX_BULLETS;
    }
    if (particleInstRef.current) {
      particleInstRef.current.count = MAX_PARTICLES;
    }
  }, []);

  useFrame(({clock}, delta) => {
    if (paused) return;
    const dt = Math.min(delta, 0.1);
    const w = worldRef.current;
    const pPos = playerPosRef.current;
    const elapsed = clock.getElapsedTime();

    if (w.toastTimer > 0) {
      w.toastTimer = Math.max(0, w.toastTimer - dt);
      if (w.toastTimer === 0) w.toastMessage = null;
    }

    for (const key of Object.keys(w.robberyCooldowns)) {
      if (w.robberyCooldowns[key] > 0) {
        w.robberyCooldowns[key] = Math.max(0, w.robberyCooldowns[key] - dt);
      }
    }

    // 0. World Pickups
    for (let i = 0; i < w.pickups.length; i++) {
      const pk = w.pickups[i];
      const grp = pickupRefs.current[pk.id];
      if (!pk.active) {
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0) {
          pk.active = true;
        }
        if (grp) grp.visible = false;
        continue;
      }

      if (grp) {
        grp.visible = true;
        grp.rotation.y += dt * 1.9;
        grp.position.y = pk.y + Math.sin(elapsed * 2.8 + i) * 0.14;
      }

      const dPick = Math.hypot(pPos.x - pk.x, pPos.z - pk.z);
      if (dPick < (w.inVehicleId ? 2.6 : 1.75)) {
        const needed =
          (pk.kind === 'medkit' && w.health < w.maxHealth) ||
          (pk.kind === 'armor' && w.armor < w.maxArmor) ||
          pk.kind === 'ammo';
        if (needed) {
          pk.active = false;
          pk.respawnTimer = 40;
          onPickupCollected(pk.kind);
        }
      }
    }

    // 1A. Update Active GP Race Countdown & Player Lap/Rank Tracking
    if (w.race.active) {
      if (w.race.countdown > 0) {
        w.race.countdown = Math.max(0, w.race.countdown - dt);
        const ceilSec = Math.ceil(w.race.countdown);
        if (ceilSec < w.race.lastCountdownBeep && ceilSec >= 1) {
          w.race.lastCountdownBeep = ceilSec;
          gameAudio.playTone({type: 'square', freq: 520, dur: 0.16, gain: 0.08});
          onShowToast(`Chuẩn bị xuất phát: ${ceilSec}...`);
        }
        if (w.race.countdown === 0) {
          w.race.lastCountdownBeep = 0;
          gameAudio.playTone({type: 'triangle', freq: 880, dur: 0.35, gain: 0.11});
          onShowToast('XUẤT PHÁT! Chạy hết 3 vòng Trường Đua Port Aurelia GP!');
        }
      } else {
        w.race.elapsedSec += dt;
        const pIdx = findNearestTrackSample(
          pPos.x,
          pPos.z,
          w.race.playerProgress.sampleIdx,
          16,
        );
        const completedLap = advanceTrackGate(w.race.playerProgress, pIdx);
        if (completedLap) {
          if (w.race.playerProgress.lap > w.race.totalLaps) {
            const finishPos = w.race.finishCounter + 1;
            w.race.finishCounter = finishPos;
            w.race.playerProgress.finished = true;
            w.race.playerProgress.finishOrder = finishPos;
            w.race.active = false;
            w.race.lastFinishedPos = finishPos;

            const prizeMoney =
              finishPos === 1
                ? 4500
                : finishPos === 2
                  ? 2500
                  : finishPos === 3
                    ? 1400
                    : 600;
            const prizeScore =
              finishPos === 1
                ? 1800
                : finishPos === 2
                  ? 1000
                  : finishPos === 3
                    ? 600
                    : 300;
            w.money += prizeMoney;
            w.score += prizeScore;
            gameAudio.playVictoryFanfare();
            onShowToast(
              `Về đích Hạng ${finishPos}/6 (${w.race.elapsedSec.toFixed(1)}s)! +$${prizeMoney.toLocaleString('en-US')}`,
            );
          } else {
            gameAudio.playCoinPickup();
            onShowToast(
              `Vòng ${w.race.playerProgress.lap}/${w.race.totalLaps} · Thời gian ${w.race.elapsedSec.toFixed(1)}s`,
            );
          }
        }
      }

      // Update race gate visual marker for player's next sector
      if (raceGateGroupRef.current && w.race.active) {
        const stage = w.race.playerProgress.gateStage;
        const gateIdx =
          stage === 0 ? 24 : stage === 1 ? 48 : stage === 2 ? 72 : 0;
        const gs = RACETRACK_SAMPLES[gateIdx];
        raceGateGroupRef.current.visible = true;
        raceGateGroupRef.current.position.set(gs.x, 0, gs.z);
        raceGateGroupRef.current.rotation.y = Math.atan2(-gs.tx, -gs.tz);
      }
    } else if (raceGateGroupRef.current) {
      raceGateGroupRef.current.visible = false;
    }

    // 1B. Update Non-Player Vehicles (AI Racers + AI Traffic + Police Cruiser Pursuit 2★-5★)
    let policeSawPlayer = false;
    const sightRadius = w.inVehicleId ? 48 : 44;
    const gripMul = weather === 'rain' ? 0.72 : 1.0;
    const activePoliceCarsAllowed =
      w.wantedLevel < 2
        ? 0
        : w.wantedLevel === 2
          ? 2
          : w.wantedLevel === 3
            ? 3
            : w.wantedLevel === 4
              ? 4
              : 6;
    let policeCarIndex = 0;
    policeCarShotTimerRef.current = Math.max(
      0,
      policeCarShotTimerRef.current - dt,
    );

    for (let i = 0; i < w.vehicles.length; i++) {
      const v = w.vehicles[i];
      const body = vehicleBodiesRef.current[v.id];
      const grp = vehicleGroupRefs.current[v.id];

      if (!v.occupiedByPlayer) {
        if (v.isPolice) {
          policeCarIndex++;
          const cruiserActive =
            w.wantedLevel >= 2 && policeCarIndex <= activePoliceCarsAllowed;

          if (cruiserActive) {
            const dx = pPos.x - v.x;
            const dz = pPos.z - v.z;
            const dist = Math.hypot(dx, dz);
            const carHasLos =
              dist < sightRadius &&
              hasLineOfSight(v.x, v.y + 1.25, v.z, pPos.x, pPos.y + 1.15, pPos.z);

            if (carHasLos) policeSawPlayer = true;

            if (dist > 9.5 && dist < 115) {
              const targetRot = Math.atan2(dx, dz) + Math.PI;
              const turn =
                THREE.MathUtils.euclideanModulo(
                  targetRot - v.rotY + Math.PI,
                  Math.PI * 2,
                ) - Math.PI;
              const maxTurn = 2.4 * dt;
              v.rotY += THREE.MathUtils.clamp(turn, -maxTurn, maxTurn);
              v.steerAngle = THREE.MathUtils.clamp(turn, -0.4, 0.4);
              const targetSpeed =
                Math.min(29, 13 + w.wantedLevel * 2.6) * gripMul;
              v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, 3.4 * dt);
              v.braking = false;
            } else if (dist <= 9.5) {
              v.speed = THREE.MathUtils.lerp(v.speed, 0, 6 * dt);
              v.braking = true;
            } else {
              v.speed = THREE.MathUtils.lerp(v.speed, 0, 3 * dt);
            }
            v.headlightsOn = true;

            if (dist < 24 && carHasLos && policeCarShotTimerRef.current <= 0) {
              policeCarShotTimerRef.current = Math.max(
                0.75,
                1.8 - w.wantedLevel * 0.2,
              );
              gameAudio.playGunshotBlast();
              const invD = 1 / Math.max(1, dist);
              const aimX = dx * invD;
              const aimZ = dz * invD;
              for (let b = 0; b < projectilesRef.current.length; b++) {
                const pr = projectilesRef.current[b];
                if (!pr.active) {
                  pr.active = true;
                  pr.isTankShell = false;
                  pr.x = v.x + aimX * 1.4;
                  pr.y = 1.2;
                  pr.z = v.z + aimZ * 1.4;
                  pr.vx = aimX * 58;
                  pr.vy = 0;
                  pr.vz = aimZ * 58;
                  pr.life = 0.65;
                  pr.fromPlayer = false;
                  pr.damage = w.inVehicleId ? 4 : 7 + w.wantedLevel;
                  break;
                }
              }
            }

            if (body && isBodyAlive(body)) {
              const curV = body.linvel();
              body.setLinvel(
                toVec3({
                  x: -Math.sin(v.rotY) * v.speed,
                  y: curV.y,
                  z: -Math.cos(v.rotY) * v.speed,
                }),
                true,
              );
              const t = body.translation();
              v.x = t.x;
              v.y = t.y;
              v.z = t.z;
            }
          } else {
            v.speed = THREE.MathUtils.lerp(v.speed, 0, 5 * dt);
            v.braking = false;
            if (body && isBodyAlive(body)) {
              const curV = body.linvel();
              body.setLinvel(toVec3({x: 0, y: curV.y, z: 0}), true);
              const t = body.translation();
              v.x = t.x;
              v.y = t.y;
              v.z = t.z;
            }
          }
        } else if (v.id.startsWith('traffic-')) {
          const fwdX = -Math.sin(v.rotY);
          const fwdZ = -Math.cos(v.rotY);

          let shouldStop = false;
          const isNS = Math.abs(fwdZ) > Math.abs(fwdX);
          const lightGreen = isNS
            ? trafficLightRef.current.nsGreen
            : !trafficLightRef.current.nsGreen;

          if (!lightGreen) {
            for (const rx of ROAD_X_CENTERS) {
              for (const rz of ROAD_Z_CENTERS) {
                const distToInter = Math.hypot(v.x - rx, v.z - rz);
                if (distToInter > 7.5 && distToInter < 16) {
                  const dot = (rx - v.x) * fwdX + (rz - v.z) * fwdZ;
                  if (dot > 0) shouldStop = true;
                }
              }
            }
          }

          const dPlayer = Math.hypot(pPos.x - v.x, pPos.z - v.z);
          if (dPlayer < 10) {
            const dotP = (pPos.x - v.x) * fwdX + (pPos.z - v.z) * fwdZ;
            if (dotP > 0) shouldStop = true;
          }

          for (let j = 0; j < w.vehicles.length; j++) {
            if (i === j) continue;
            const other = w.vehicles[j];
            const dOther = Math.hypot(other.x - v.x, other.z - v.z);
            if (dOther < 9.5) {
              const dotO = (other.x - v.x) * fwdX + (other.z - v.z) * fwdZ;
              if (dotO > 0) shouldStop = true;
            }
          }

          const targetSpd = shouldStop ? 0 : 10.5;
          v.braking = shouldStop;
          v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, 4 * dt);

          if (body && isBodyAlive(body)) {
            const curV = body.linvel();
            body.setLinvel(
              toVec3({
                x: fwdX * v.speed,
                y: curV.y,
                z: fwdZ * v.speed,
              }),
              true,
            );
            const t = body.translation();
            v.x = t.x;
            v.y = t.y;
            v.z = t.z;

            if (v.x < -410 || v.x > 900 || v.z < -280 || v.z > 245) {
              v.rotY += Math.PI;
              const nx = THREE.MathUtils.clamp(v.x, -400, 890);
              const nz = THREE.MathUtils.clamp(v.z, -270, 235);
              body.setTranslation(
                {x: nx, y: getBridgeSurfaceY(nx, nz) + 0.15, z: nz},
                true,
              );
            }
          }
        } else if (v.isRacer && v.id.startsWith('racer-')) {
          const prog = w.race.aiProgress[v.id];
          if (prog) {
            if (w.race.active && w.race.countdown > 0) {
              v.speed = 0;
              v.braking = true;
              v.steerAngle = 0;
            } else {
              const curIdx = findNearestTrackSample(v.x, v.z, prog.sampleIdx, 14);
              if (w.race.active && !prog.finished) {
                const aiDoneLap = advanceTrackGate(prog, curIdx);
                if (aiDoneLap && prog.lap > w.race.totalLaps) {
                  w.race.finishCounter += 1;
                  prog.finished = true;
                  prog.finishOrder = w.race.finishCounter;
                }
              } else {
                prog.sampleIdx = curIdx;
              }

              // Dynamic overtaking lateral adjustment if another car is close ahead
              let desiredOffset = prog.laneOffset;
              for (let j = 0; j < w.vehicles.length; j++) {
                if (i === j) continue;
                const other = w.vehicles[j];
                if (!other.isRacer && !other.occupiedByPlayer) continue;
                const odx = other.x - v.x;
                const odz = other.z - v.z;
                const oDist = Math.hypot(odx, odz);
                if (oDist < 12) {
                  const fwdDot =
                    odx * -Math.sin(v.rotY) + odz * -Math.cos(v.rotY);
                  if (fwdDot > 1.0) {
                    const sCur = RACETRACK_SAMPLES[curIdx];
                    const sideDot = (other.x - sCur.x) * sCur.nx + (other.z - sCur.z) * sCur.nz;
                    desiredOffset = sideDot > 0 ? -4.2 : 4.2;
                    break;
                  }
                }
              }

              const lookIdx = (curIdx + 4) % RACETRACK_SAMPLE_COUNT;
              const farIdx = (curIdx + 8) % RACETRACK_SAMPLE_COUNT;
              const sLook = RACETRACK_SAMPLES[lookIdx];
              const sCur = RACETRACK_SAMPLES[curIdx];
              const sFar = RACETRACK_SAMPLES[farIdx];
              const cornerDot = sCur.tx * sFar.tx + sCur.tz * sFar.tz;

              const tx = sLook.x + sLook.nx * desiredOffset;
              const tz = sLook.z + sLook.nz * desiredOffset;
              const targetRot = Math.atan2(-(tx - v.x), -(tz - v.z));
              const turn =
                THREE.MathUtils.euclideanModulo(
                  targetRot - v.rotY + Math.PI,
                  Math.PI * 2,
                ) - Math.PI;
              const maxTurn = 3.5 * dt;
              v.rotY += THREE.MathUtils.clamp(turn, -maxTurn, maxTurn);
              v.steerAngle = THREE.MathUtils.clamp(turn * 0.85, -0.42, 0.42);

              let targetSpd = w.race.active
                ? prog.baseSpeed
                : prog.baseSpeed * 0.72;
              if (cornerDot < 0.84) targetSpd *= 0.68;
              else if (cornerDot < 0.94) targetSpd *= 0.85;

              // Gentle rubber-banding during active race so pack stays competitive
              if (w.race.active && !prog.finished) {
                const playerMetric =
                  w.race.playerProgress.lap * RACETRACK_SAMPLE_COUNT +
                  w.race.playerProgress.sampleIdx;
                const aiMetric = prog.lap * RACETRACK_SAMPLE_COUNT + prog.sampleIdx;
                const gap = playerMetric - aiMetric;
                if (gap > 8) targetSpd += 3.8;
                else if (gap < -12) targetSpd -= 2.4;
              }
              targetSpd *= gripMul;

              v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, 3.6 * dt);
              v.braking = cornerDot < 0.82 && v.speed > 26;
              v.roll = THREE.MathUtils.clamp(-turn * 0.08, -0.07, 0.07);
            }
            v.headlightsOn = true;

            if (body && isBodyAlive(body)) {
              const curV = body.linvel();
              body.setLinvel(
                toVec3({
                  x: -Math.sin(v.rotY) * v.speed,
                  y: curV.y,
                  z: -Math.cos(v.rotY) * v.speed,
                }),
                true,
              );
              const t = body.translation();
              v.x = t.x;
              v.y = t.y;
              v.z = t.z;
            }
          }
        } else {
          v.speed = THREE.MathUtils.lerp(v.speed, 0, 5 * dt);
          v.braking = false;
          if (body && isBodyAlive(body)) {
            const curV = body.linvel();
            body.setLinvel(
              toVec3({
                x: -Math.sin(v.rotY) * v.speed,
                y: curV.y,
                z: -Math.cos(v.rotY) * v.speed,
              }),
              true,
            );
            const t = body.translation();
            v.x = t.x;
            v.y = t.y;
            v.z = t.z;
          }
        }

        if (grp) {
          grp.position.set(v.x, Math.max(0, v.y), v.z);
          grp.rotation.y = v.rotY;
        }
      } else {
        // Player-driven vehicle smoke & tank/heavy collision push
        if (Math.abs(v.speed) > 16 && Math.random() < 0.35) {
          const rx = v.x + Math.sin(v.rotY) * 2.1;
          const rz = v.z + Math.cos(v.rotY) * 2.1;
          spawnParticle(
            rx + (Math.random() - 0.5) * 0.6,
            0.25,
            rz + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 1.2,
            0.8 + Math.random() * 0.8,
            (Math.random() - 0.5) * 1.2,
            true,
            0.35,
            0.55,
          );
        }

        // Tank Unstoppable Ramming: flings any blocking police/traffic vehicle out of the way!
        for (let oi = 0; oi < w.vehicles.length; oi++) {
          if (oi === i) continue;
          const other = w.vehicles[oi];
          if (other.kind === 'tank') continue;
          const dx = other.x - v.x;
          const dz = other.z - v.z;
          const d = Math.hypot(dx, dz);
          const minSep = v.kind === 'tank' ? 5.2 : 3.2;
          if (v.kind === 'tank' && d < minSep && Math.abs(v.speed) > 0.5) {
            const ob = vehicleBodiesRef.current[other.id];
            const inv = 1 / Math.max(0.4, d);
            const pushImpulse = 24 + Math.abs(v.speed) * 0.85;
            if (ob && isBodyAlive(ob)) {
              const pushX = other.x + dx * inv * 3.8;
              const pushZ = other.z + dz * inv * 3.8;
              ob.setTranslation({x: pushX, y: 0.45, z: pushZ}, true);
              ob.setLinvel(
                toVec3({
                  x: dx * inv * pushImpulse,
                  y: 5.5,
                  z: dz * inv * pushImpulse,
                }),
                true,
              );
              other.x = pushX;
              other.z = pushZ;
            }
            other.speed = 0;

            if (Math.abs(v.speed) > 8 && other.isPolice) {
              triggerBlast(other.x, 0.8, other.z, 6.5, 160);
              const [rx, rz] = findSafeRoadSpawn(pPos.x, pPos.z, 60, 85);
              other.x = rx;
              other.z = rz;
              if (ob && isBodyAlive(ob)) {
                ob.setTranslation({x: rx, y: 0.1, z: rz}, true);
              }
            } else {
              spawnParticle(
                (v.x + other.x) * 0.5,
                1.0,
                (v.z + other.z) * 0.5,
                (Math.random() - 0.5) * 6,
                3.5,
                (Math.random() - 0.5) * 6,
                false,
                0.35,
                0.35,
              );
              gameAudio.playJumpLandingThud();
            }
          }
        }
      }
    }

    // 2. Vehicle-vs-NPC Knockdown / Ragdoll Physics
    for (let vi = 0; vi < w.vehicles.length; vi++) {
      const veh = w.vehicles[vi];
      const absSpeed = Math.abs(veh.speed);
      if (absSpeed < 3.0) continue;

      const hitRadius =
        veh.kind === 'motorcycle' ? 1.3 : veh.kind === 'tank' ? 2.6 : 1.95;
      const vFwdX = -Math.sin(veh.rotY) * Math.sign(veh.speed);
      const vFwdZ = -Math.cos(veh.rotY) * Math.sign(veh.speed);

      for (let ni = 0; ni < w.npcs.length; ni++) {
        const npc = w.npcs[ni];
        if (npc.dead || npc.knockedDown) continue;
        const dx = npc.x - veh.x;
        const dz = npc.z - veh.z;
        const dist = Math.hypot(dx, dz);
        if (dist < hitRadius) {
          npc.knockedDown = true;
          npc.knockdownTimer = absSpeed > 11 ? 2.4 : 3.2;
          const pushSpeed = Math.min(20, absSpeed * 0.78);
          const sideJitter = (Math.random() - 0.5) * 3.5;
          npc.knockVx = vFwdX * pushSpeed - vFwdZ * sideJitter;
          npc.knockVz = vFwdZ * pushSpeed + vFwdX * sideJitter;
          npc.knockVy = Math.min(7.5, 3.0 + absSpeed * 0.16);
          npc.hp -= absSpeed * (veh.kind === 'tank' ? 8.0 : 4.5);

          gameAudio.playJumpLandingThud();
          spawnParticle(npc.x, 0.9, npc.z, 0, 2.2, 0, true, 0.42, 0.45);

          if (veh.occupiedByPlayer) {
            addCrimeHeat(npc.isPolice ? 120 : 65, npc.isPolice ? 2 : 1);
          }
        }
      }
    }

    // Update live race rank (1/6 .. 6/6)
    if (w.race.active) {
      const pMetric = w.race.playerProgress.finished
        ? 100000 - (w.race.playerProgress.finishOrder ?? 6)
        : w.race.playerProgress.lap * RACETRACK_SAMPLE_COUNT +
          w.race.playerProgress.sampleIdx;
      let rank = 1;
      for (const aiId of Object.keys(w.race.aiProgress)) {
        const ap = w.race.aiProgress[aiId];
        const aiMetric = ap.finished
          ? 100000 - (ap.finishOrder ?? 6)
          : ap.lap * RACETRACK_SAMPLE_COUNT + ap.sampleIdx;
        if (aiMetric > pMetric) rank += 1;
      }
      w.race.playerRank = rank;
    }

    // 3. Update NPCs (Pedestrians & Police/SWAT Gunfights & Knockdowns)
    // Check existing police sight FIRST without teleporting anyone onto an escaping player!
    for (let i = 0; i < w.npcs.length; i++) {
      const npc = w.npcs[i];
      const grp = npcRefs.current[npc.id];

      if (npc.dead) {
        npc.respawnTimer = Math.max(0, npc.respawnTimer - dt);
        if (!npc.isPolice && npc.respawnTimer <= 0) {
          if (npc.isIndoors && npc.homeX !== undefined && npc.homeZ !== undefined) {
            npc.dead = false;
            npc.knockedDown = false;
            npc.fallRotX = 0;
            npc.hp = 80;
            npc.x = npc.homeX;
            npc.y = 0;
            npc.z = npc.homeZ;
            npc.fleeing = false;
          } else {
            const [sx, sz] = findSafeRoadSpawn(pPos.x, pPos.z, 48, 76);
            npc.dead = false;
            npc.knockedDown = false;
            npc.fallRotX = 0;
            npc.hp = 65;
            npc.x = sx;
            npc.y = 0;
            npc.z = sz;
            npc.fleeing = false;
          }
        }
        if (grp) grp.visible = false;
        continue;
      }

      let nextAnimMode: 'idle' | 'walk' | 'run' | 'action' = 'walk';

      if (npc.knockedDown) {
        npc.knockdownTimer -= dt;
        const nx = npc.x + npc.knockVx * dt;
        const nz = npc.z + npc.knockVz * dt;
        if (!overlapsBuilding(nx, nz, 1.0) && !inRiverWater(nx, nz)) {
          npc.x = THREE.MathUtils.clamp(nx, -420, 910);
          npc.z = THREE.MathUtils.clamp(nz, -300, 250);
        }
        npc.knockVx = THREE.MathUtils.lerp(npc.knockVx, 0, 3.8 * dt);
        npc.knockVz = THREE.MathUtils.lerp(npc.knockVz, 0, 3.8 * dt);

        npc.knockVy -= 20 * dt;
        npc.y = Math.max(0, npc.y + npc.knockVy * dt);
        if (npc.y <= 0 && npc.knockVy < 0) {
          npc.y = 0;
          npc.knockVy = 0;
        }

        npc.fallRotX = THREE.MathUtils.lerp(npc.fallRotX, -Math.PI / 2, 12 * dt);
        nextAnimMode = 'idle';

        if (npc.knockdownTimer <= 0) {
          if (npc.hp <= 0) {
            npc.dead = true;
            npc.respawnTimer = npc.isPolice ? 12 : 14;
            w.money += npc.isPolice ? 120 : 35;
            w.score += npc.isPolice ? 100 : 30;
          } else {
            npc.knockedDown = false;
            npc.fallRotX = 0;
            npc.y = 0;
            if (!npc.isPolice) {
              npc.fleeing = true;
              npc.fleeTimer = 8;
            }
          }
        }

        if (grp) {
          grp.visible = true;
          grp.position.set(
            npc.x,
            npc.y + (npc.fallRotX < -0.8 ? 0.22 : 0),
            npc.z,
          );
          grp.rotation.set(npc.fallRotX, npc.rotY, 0);
        }
        if (npc.animMode !== nextAnimMode) {
          npc.animMode = nextAnimMode;
          npcAnimSetters.current[npc.id]?.(nextAnimMode);
        }
        continue;
      }

      npc.fallRotX = 0;
      const dxP = pPos.x - npc.x;
      const dzP = pPos.z - npc.z;
      const distP = Math.hypot(dxP, dzP);

      if (
        npc.isPolice &&
        w.wantedLevel >= 1 &&
        (!npc.isSwat || w.wantedLevel >= 4)
      ) {
        const npcHasLos =
          distP < sightRadius &&
          hasLineOfSight(npc.x, npc.y + 1.35, npc.z, pPos.x, pPos.y + 1.15, pPos.z);
        if (npcHasLos) policeSawPlayer = true;

        const targetRot = Math.atan2(dxP, dzP) + Math.PI;
        npc.rotY = targetRot;

        const maxPursueDist = w.wantedLevel === 1 ? 58 : 78;
        if (distP > 11 && distP < maxPursueDist) {
          nextAnimMode = 'run';
          const spd =
            w.wantedLevel === 1
              ? 4.2
              : (npc.isSwat ? 5.6 : 4.8) + w.wantedLevel * 0.2;
          const nx = npc.x + (dxP / distP) * spd * dt;
          const nz = npc.z + (dzP / distP) * spd * dt;
          if (!overlapsBuilding(nx, nz, 1.1, npc.y)) {
            npc.x = nx;
            npc.z = nz;
          } else {
            const sx = npc.x + (-dzP / distP) * spd * dt;
            const sz = npc.z + (dxP / distP) * spd * dt;
            if (!overlapsBuilding(sx, sz, 1.1, npc.y)) {
              npc.x = sx;
              npc.z = sz;
            }
          }
        } else {
          nextAnimMode = distP < 34 && npcHasLos ? 'action' : 'idle';
        }

        npc.fireCooldown = Math.max(0, npc.fireCooldown - dt);
        if (distP < 34 && npcHasLos && npc.fireCooldown <= 0) {
          npc.fireCooldown = npc.isSwat
            ? 0.45
            : Math.max(0.65, 1.65 - w.wantedLevel * 0.18);
          gameAudio.playGunshotBlast();
          const invD = 1 / Math.max(1, distP);
          const spreadAngle = (Math.random() - 0.5) * 0.09;
          const dirX = dxP * invD;
          const dirZ = dzP * invD;
          const cosS = Math.cos(spreadAngle);
          const sinS = Math.sin(spreadAngle);
          const aimX = dirX * cosS - dirZ * sinS;
          const aimZ = dirX * sinS + dirZ * cosS;

          for (let b = 0; b < projectilesRef.current.length; b++) {
            const pr = projectilesRef.current[b];
            if (!pr.active) {
              pr.active = true;
              pr.isTankShell = false;
              pr.x = npc.x + aimX * 0.6;
              pr.y = 1.32;
              pr.z = npc.z + aimZ * 0.6;
              pr.vx = aimX * 56;
              pr.vy = 0;
              pr.vz = aimZ * 56;
              pr.life = 0.72;
              pr.fromPlayer = false;
              pr.damage = w.inVehicleId
                ? 4
                : (npc.isSwat ? 11 : 6) + w.wantedLevel * 1.4;
              break;
            }
          }
          spawnParticle(
            npc.x + aimX * 0.7,
            1.32,
            npc.z + aimZ * 0.7,
            0,
            0.4,
            0,
            false,
            0.22,
            0.09,
          );
        }
      } else if (npc.fleeing) {
        if (npc.isIndoors) {
          // Shopkeepers duck/cower inside their store
          nextAnimMode = 'action';
          npc.fleeTimer -= dt;
          if (npc.fleeTimer <= 0) npc.fleeing = false;
        } else {
          nextAnimMode = 'run';
          npc.fleeTimer -= dt;
          if (npc.fleeTimer <= 0) npc.fleeing = false;
          const inv = 1 / Math.max(0.5, distP);
          const fx = -dxP * inv;
          const fz = -dzP * inv;
          npc.rotY = Math.atan2(fx, fz) + Math.PI;
          const nx = npc.x + fx * 5.6 * dt;
          const nz = npc.z + fz * 5.6 * dt;
          if (!overlapsBuilding(nx, nz, 1.2) && !inRiverWater(nx, nz)) {
            npc.x = THREE.MathUtils.clamp(nx, -420, 910);
            npc.z = THREE.MathUtils.clamp(nz, -300, 250);
          }
        }
      } else if (npc.isIndoors) {
        nextAnimMode = 'idle';
        if (distP < 8) {
          npc.rotY = Math.atan2(dxP, dzP) + Math.PI;
        }
      } else {
        const nearPlayer = distP < 2.8;
        if (!nearPlayer) {
          nextAnimMode = 'walk';
          if (npc.axis === 'x') {
            const nextX = npc.x + npc.dir * npc.speed * dt;
            if (
              nextX > 895 ||
              nextX < -405 ||
              inRiverWater(nextX, npc.z) ||
              overlapsBuilding(nextX, npc.z, 1.0)
            ) {
              npc.dir = npc.dir === 1 ? -1 : 1;
            } else {
              npc.x = nextX;
            }
            npc.rotY = npc.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
          } else {
            const nextZ = npc.z + npc.dir * npc.speed * dt;
            if (
              nextZ > 240 ||
              nextZ < -280 ||
              inRiverWater(npc.x, nextZ) ||
              overlapsBuilding(npc.x, nextZ, 1.0)
            ) {
              npc.dir = npc.dir === 1 ? -1 : 1;
            } else {
              npc.z = nextZ;
            }
            npc.rotY = npc.dir === 1 ? Math.PI : 0;
          }
        } else {
          nextAnimMode = 'idle';
          npc.rotY = Math.atan2(dxP, dzP) + Math.PI;
        }
      }

      if (npc.animMode !== nextAnimMode) {
        npc.animMode = nextAnimMode;
        npcAnimSetters.current[npc.id]?.(nextAnimMode);
      }

      npc.y = getBridgeSurfaceY(npc.x, npc.z);
      if (grp) {
        grp.visible = true;
        grp.position.set(npc.x, npc.y, npc.z);
        grp.rotation.set(0, npc.rotY, 0);
      }
    }

    // 4. Rate-Limited Police Reinforcements ONLY when player is actively spotted or at crime onset!
    // NEVER teleport/spawn police around a player who has broken line of sight!
    policeReinforceTimerRef.current = Math.max(
      0,
      policeReinforceTimerRef.current - dt,
    );
    if (w.wantedLevel >= 1 && policeSawPlayer && policeReinforceTimerRef.current <= 0) {
      policeReinforceTimerRef.current = 4.8;
      const maxFootPolice =
        w.wantedLevel === 1
          ? 3
          : w.wantedLevel === 2
            ? 5
            : w.wantedLevel === 3
              ? 7
              : w.wantedLevel === 4
                ? 9
                : 12;

      let activeClose = 0;
      for (const npc of w.npcs) {
        if (npc.isPolice && !npc.dead) {
          if (npc.isSwat && w.wantedLevel < 4) continue;
          if (Math.hypot(pPos.x - npc.x, pPos.z - npc.z) < 65) activeClose++;
        }
      }

      if (activeClose < maxFootPolice) {
        for (const npc of w.npcs) {
          if (!npc.isPolice) continue;
          if (npc.isSwat && w.wantedLevel < 4) continue;
          const d = Math.hypot(pPos.x - npc.x, pPos.z - npc.z);
          if ((npc.dead && npc.respawnTimer <= 0) || (!npc.dead && d > 80)) {
            const [sx, sz] = findSafeRoadSpawn(pPos.x, pPos.z, 34, 48);
            npc.dead = false;
            npc.knockedDown = false;
            npc.fallRotX = 0;
            npc.hp = (npc.isSwat ? 165 : 105) + w.wantedLevel * 12;
            npc.x = sx;
            npc.y = 0;
            npc.z = sz;
            npc.fireCooldown = 1.0;
            activeClose++;
            if (activeClose >= maxFootPolice) break;
          }
        }
      }

      // Relocate distant police cruisers only if player is actively spotted at 2★+
      if (w.wantedLevel >= 2) {
        let cruiserIdx = 0;
        for (const v of w.vehicles) {
          if (!v.isPolice || v.occupiedByPlayer) continue;
          cruiserIdx++;
          if (cruiserIdx > activePoliceCarsAllowed) break;
          const d = Math.hypot(pPos.x - v.x, pPos.z - v.z);
          const vb = vehicleBodiesRef.current[v.id];
          if (d > 88 && vb && isBodyAlive(vb)) {
            const [sx, sz] = findSafeRoadSpawn(pPos.x, pPos.z, 42, 58);
            v.x = sx;
            v.z = sz;
            vb.setTranslation({x: sx, y: 0.1, z: sz}, true);
          }
        }
      }
    }

    // 5. Wanted Level Sight & Evade Decay + Police Siren Audio
    w.policeSawPlayer = policeSawPlayer;
    w.wantedEvadeDuration = getEvadeDurationForLevel(w.wantedLevel);
    if (w.wantedLevel > 0) {
      if (w.wantedLevel >= 2 && policeSawPlayer) {
        sirenTimerRef.current -= dt;
        if (sirenTimerRef.current <= 0) {
          sirenTimerRef.current = 1.4;
          gameAudio.playTone({
            type: 'sine',
            freq: 660,
            freqTo: 920,
            dur: 0.45,
            gain: 0.04,
          });
        }
      }

      if (policeSawPlayer) {
        w.wantedTimer = 0;
      } else {
        w.wantedTimer += dt;
        if (w.wantedTimer >= w.wantedEvadeDuration) {
          w.wantedLevel = 0;
          w.wantedHeat = 0;
          w.wantedTimer = 0;
          gameAudio.playConfirmSelect();
          onShowToast('Đã cắt đuôi thành công! Mức truy nã được xóa.');
        }
      }
    } else {
      w.wantedHeat = Math.max(0, w.wantedHeat - 25 * dt);
    }

    // 6. Active Robbery Progress (Police arrive gradually at 50% progress!)
    if (w.robberyActiveId) {
      const spot = ROBBERY_SPOTS.find((s) => s.id === w.robberyActiveId);
      if (spot) {
        const distSpot = Math.hypot(
          pPos.x - spot.triggerPos[0],
          pPos.z - spot.triggerPos[2],
        );
        if (distSpot > 14) {
          w.robberyActiveId = null;
          w.robberyElapsed = 0;
          w.robberyPoliceDispatched = false;
          gameAudio.playErrorBuzz();
          onShowToast('Đã rời khỏi khu vực cướp — hủy phi vụ!');
        } else {
          w.robberyElapsed += dt;
          alarmTimerRef.current -= dt;
          if (alarmTimerRef.current <= 0) {
            alarmTimerRef.current = 0.95;
            gameAudio.playTone({
              type: 'square',
              freq: 740,
              freqTo: 520,
              dur: 0.25,
              gain: 0.06,
            });
          }

          // Dispatch police right when robbery reaches 50% (cướp được 1 nửa thì cảnh sát đến!)
          if (
            !w.robberyPoliceDispatched &&
            w.robberyElapsed >= spot.durationSec * 0.5
          ) {
            w.robberyPoliceDispatched = true;
            if (w.wantedLevel < spot.wantedStars) {
              w.wantedLevel = spot.wantedStars;
              w.wantedHeat = Math.max(w.wantedHeat, spot.wantedStars * 130);
            }
            w.wantedEvadeDuration = getEvadeDurationForLevel(w.wantedLevel);
            w.wantedTimer = 0;

            // Bring 3 police units + 2 cruisers within approach distance (~42m outside)
            let deployedFoot = 0;
            for (const npc of w.npcs) {
              if (!npc.isPolice) continue;
              if (npc.isSwat && w.wantedLevel < 4) continue;
              const [sx, sz] = findSafeRoadSpawn(pPos.x, pPos.z, 36, 48);
              npc.dead = false;
              npc.knockedDown = false;
              npc.fallRotX = 0;
              npc.hp = (npc.isSwat ? 165 : 105) + w.wantedLevel * 12;
              npc.x = sx;
              npc.y = 0;
              npc.z = sz;
              npc.fireCooldown = 1.1;
              deployedFoot++;
              if (deployedFoot >= Math.min(5, spot.wantedStars + 1)) break;
            }
            let deployedCars = 0;
            for (const v of w.vehicles) {
              if (!v.isPolice || v.occupiedByPlayer) continue;
              const [sx, sz] = findSafeRoadSpawn(pPos.x, pPos.z, 40, 56);
              v.x = sx;
              v.z = sz;
              const vb = vehicleBodiesRef.current[v.id];
              if (vb && isBodyAlive(vb)) {
                vb.setTranslation({x: sx, y: 0.15, z: sz}, true);
              }
              deployedCars++;
              if (deployedCars >= 2) break;
            }
            onShowToast(
              `Báo động ${spot.wantedStars}★! Cảnh sát đã đến bao vây bên ngoài!`,
            );
          }

          if (w.robberyElapsed >= spot.durationSec) {
            w.robberyCooldowns[spot.id] = 55;
            w.robberyActiveId = null;
            w.robberyElapsed = 0;
            w.robberyPoliceDispatched = false;
            w.money += spot.rewardMoney;
            w.score += spot.rewardScore;
            gameAudio.playVictoryFanfare();
            onShowToast(
              `Cướp thành công ${spot.name}! +$${spot.rewardMoney.toLocaleString('en-US')} · Hãy tẩu thoát!`,
            );
          }
        }
      }
    }

    // 7. Update Projectiles & Tank Shells with Continuous 3D Segment-vs-Wall Collision (Zero Wall Tunneling!)
    if (bulletInstRef.current) {
      const pool = projectilesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const b = pool[i];
        if (!b.active) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0.01, 0.01, 0.01);
          dummy.updateMatrix();
          bulletInstRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const x0 = b.x;
        const y0 = b.y;
        const z0 = b.z;
        const stepDx = b.vx * dt;
        const stepDy = b.vy * dt;
        const stepDz = b.vz * dt;
        const x1 = x0 + stepDx;
        const y1 = y0 + stepDy;
        const z1 = z0 + stepDz;
        b.life -= dt;

        // 7A. Find earliest wall/roof/barrier intersection along swept segment
        const wallHit = intersectSegmentWithWalls(x0, y0, z0, x1, y1, z1, 0.05);
        const floorY = Math.max(0.05, getBridgeSurfaceY(x1, z1) + 0.04);
        let tFloor = 1.0001;
        if (y1 < floorY && y0 >= floorY - 0.15) {
          tFloor =
            Math.abs(stepDy) > 1e-6
              ? THREE.MathUtils.clamp((y0 - floorY) / -stepDy, 0, 1)
              : 0;
        } else if (y1 < floorY) {
          tFloor = 0;
        }

        const tObstacle = Math.min(
          wallHit ? wallHit.t : 1.0001,
          tFloor,
        );

        // 7B. Check entity hits strictly BEFORE tObstacle so bullets never pierce walls!
        let entityHitT = 1.0001;
        let hitNpcIdx = -1;
        let hitVehIdx = -1;
        let hitPlayer = false;

        if (b.fromPlayer) {
          const npcRad = b.isTankShell ? 1.45 : 0.72;
          for (let n = 0; n < w.npcs.length; n++) {
            const npc = w.npcs[n];
            if (npc.dead) continue;
            const tNpc = segmentHitsCylinder(
              x0,
              y0,
              z0,
              x1,
              y1,
              z1,
              npc.x,
              npc.y - 0.1,
              npc.y + 1.95,
              npc.z,
              npcRad,
            );
            if (tNpc !== null && tNpc <= tObstacle && tNpc < entityHitT) {
              entityHitT = tNpc;
              hitNpcIdx = n;
              hitVehIdx = -1;
            }
          }
          if (b.isTankShell) {
            for (let vi = 0; vi < w.vehicles.length; vi++) {
              const veh = w.vehicles[vi];
              if (veh.occupiedByPlayer) continue;
              const tVeh = segmentHitsCylinder(
                x0,
                y0,
                z0,
                x1,
                y1,
                z1,
                veh.x,
                veh.y - 0.2,
                veh.y + 2.4,
                veh.z,
                2.5,
              );
              if (tVeh !== null && tVeh <= tObstacle && tVeh < entityHitT) {
                entityHitT = tVeh;
                hitVehIdx = vi;
                hitNpcIdx = -1;
              }
            }
          }
        } else {
          const pRad = w.inVehicleId ? 1.75 : 0.68;
          const tP = segmentHitsCylinder(
            x0,
            y0,
            z0,
            x1,
            y1,
            z1,
            pPos.x,
            pPos.y - 0.1,
            pPos.y + 1.95,
            pPos.z,
            pRad,
          );
          if (tP !== null && tP <= tObstacle) {
            entityHitT = tP;
            hitPlayer = true;
          }
        }

        if (hitNpcIdx !== -1 || hitVehIdx !== -1 || hitPlayer) {
          const hx = x0 + stepDx * entityHitT;
          const hy = y0 + stepDy * entityHitT;
          const hz = z0 + stepDz * entityHitT;
          b.x = hx;
          b.y = hy;
          b.z = hz;
          b.active = false;

          if (hitNpcIdx !== -1) {
            const npc = w.npcs[hitNpcIdx];
            if (b.isTankShell) {
              triggerBlast(hx, Math.max(0.5, hy), hz, b.blastRadius ?? 8.5, b.damage);
            } else {
              npc.hp -= b.damage;
              onHitMarker();
              spawnParticle(
                hx,
                Math.max(0.4, hy),
                hz,
                (Math.random() - 0.5) * 3,
                2.5,
                (Math.random() - 0.5) * 3,
                false,
                0.22,
                0.35,
              );
              if (npc.hp <= 0) {
                npc.dead = true;
                npc.respawnTimer = npc.isPolice ? 12 : 14;
                w.money += npc.isPolice ? 120 : 40;
                w.score += npc.isPolice ? 100 : 35;
                addCrimeHeat(npc.isPolice ? 125 : 75, npc.isPolice ? 2 : 1);
              } else {
                if (!npc.isPolice) {
                  npc.fleeing = true;
                  npc.fleeTimer = 10;
                  addCrimeHeat(35, 1);
                } else {
                  addCrimeHeat(55, 1);
                }
              }
            }
          } else if (hitVehIdx !== -1) {
            triggerBlast(hx, Math.max(0.6, hy), hz, b.blastRadius ?? 8.5, b.damage);
          } else if (hitPlayer) {
            onPlayerDamage(b.damage);
          }
        } else if (tObstacle <= 1.0 || b.life <= 0) {
          const tStop = Math.min(1.0, tObstacle);
          const hx = x0 + stepDx * tStop;
          const hy = y0 + stepDy * tStop;
          const hz = z0 + stepDz * tStop;
          b.x = hx;
          b.y = hy;
          b.z = hz;
          b.active = false;
          if (b.isTankShell) {
            triggerBlast(hx, Math.max(0.4, hy), hz, b.blastRadius ?? 8.5, b.damage);
          } else if (tObstacle <= 1.0) {
            spawnParticle(
              hx,
              Math.max(0.2, hy),
              hz,
              (Math.random() - 0.5) * 4,
              2 + Math.random() * 3,
              (Math.random() - 0.5) * 4,
              false,
              0.16,
              0.3,
            );
          }
        } else {
          b.x = x1;
          b.y = y1;
          b.z = z1;
        }

        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, Math.atan2(b.vx, b.vz), 0);
        if (b.isTankShell) {
          dummy.scale.set(0.32, 0.32, 1.5);
        } else {
          dummy.scale.set(0.09, 0.09, 1.0);
        }
        dummy.updateMatrix();
        bulletInstRef.current.setMatrixAt(i, dummy.matrix);
      }
      bulletInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // 8. Update Pooled Sparks & Smoke Particles
    if (particleInstRef.current) {
      const pool = particlesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const pt = pool[i];
        if (!pt.active) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0.01, 0.01, 0.01);
          dummy.updateMatrix();
          particleInstRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        if (!pt.isSmoke) pt.vy -= 9.8 * dt;
        pt.life -= dt;
        if (pt.life <= 0) pt.active = false;

        const lifeFrac = Math.max(0, pt.life / pt.maxLife);
        const s = pt.scale * (pt.isSmoke ? 1.8 - lifeFrac * 0.6 : lifeFrac);
        dummy.position.set(pt.x, pt.y, pt.z);
        dummy.rotation.set(elapsed, elapsed * 0.7, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        particleInstRef.current.setMatrixAt(i, dummy.matrix);
        tempColor.set(pt.isSmoke ? '#94a3b8' : '#fb923c');
        particleInstRef.current.setColorAt(i, tempColor);
      }
      particleInstRef.current.instanceMatrix.needsUpdate = true;
      if (particleInstRef.current.instanceColor) {
        particleInstRef.current.instanceColor.needsUpdate = true;
      }
    }

    // 9. Mission Timer & Checkpoint Detection (Main + Side Missions)
    const activeMain =
      w.activeMissionId !== null
        ? MISSIONS.find((m) => m.id === w.activeMissionId)
        : null;
    const activeSide =
      w.activeSideMissionId !== null
        ? SIDE_MISSIONS.find((m) => m.id === w.activeSideMissionId)
        : null;
    const runningMission = activeMain ?? activeSide;

    if (runningMission) {
      if (w.missionTimer !== null) {
        w.missionTimer -= dt;
        if (w.missionTimer <= 0) {
          w.activeMissionId = null;
          w.activeSideMissionId = null;
          w.missionTimer = null;
          gameAudio.playErrorBuzz();
          onShowToast('Hết giờ! Nhiệm vụ thất bại.');
        }
      }
      if (w.activeMissionId !== null || w.activeSideMissionId !== null) {
        const cp = runningMission.checkpoints[w.missionStep];
        if (cp) {
          const distCp = Math.hypot(pPos.x - cp[0], pPos.z - cp[2]);
          if (distCp < 5.4) {
            if (w.missionStep + 1 < runningMission.checkpoints.length) {
              w.missionStep += 1;
              gameAudio.playCoinPickup();
              onShowToast(
                `Đã qua điểm kiểm tra ${w.missionStep}/${runningMission.checkpoints.length}!`,
              );
            } else {
              const kind: 'main' | 'side' = activeMain ? 'main' : 'side';
              w.activeMissionId = null;
              w.activeSideMissionId = null;
              w.missionTimer = null;
              if (kind === 'main') {
                const mid = (runningMission as (typeof MISSIONS)[number]).id;
                if (!w.completedMissions.includes(mid)) {
                  w.completedMissions.push(mid);
                }
              } else {
                const sid = (runningMission as (typeof SIDE_MISSIONS)[number])
                  .id;
                if (!w.completedSideMissions.includes(sid)) {
                  w.completedSideMissions.push(sid);
                }
              }
              // 5% Bank Interest bonus on every completed mission!
              const interest = Math.round(w.bankBalance * 0.05);
              w.bankBalance += interest;
              w.money += runningMission.rewardMoney;
              w.score += runningMission.rewardScore;
              gameAudio.playVictoryFanfare();
              if (interest > 0) {
                onShowToast(
                  `Xong nhiệm vụ! +$${runningMission.rewardMoney} (Lãi ngân hàng +$${interest})`,
                );
              }
              onMissionComplete(
                kind,
                runningMission.id,
                runningMission.rewardMoney,
                runningMission.rewardScore,
              );
            }
          }
        }
      }
    }

    if (missionBeaconRef.current) {
      missionBeaconRef.current.rotation.y += dt * 1.5;
    }
    if (checkpointRingRef.current) {
      const s = 1 + Math.sin(elapsed * 4) * 0.08;
      checkpointRingRef.current.scale.set(s, 1, s);
      checkpointRingRef.current.rotation.y -= dt * 2;
    }
  });

  const activeMain = MISSIONS.find(
    (m) => m.id === worldRef.current.activeMissionId,
  );
  const activeSide = SIDE_MISSIONS.find(
    (m) => m.id === worldRef.current.activeSideMissionId,
  );
  const runningMission = activeMain ?? activeSide;
  const nextAvailableMission = MISSIONS.find(
    (m) => !worldRef.current.completedMissions.includes(m.id),
  );
  const activeCheckpoint =
    runningMission?.checkpoints[worldRef.current.missionStep];

  return (
    <group>
      {/* Vehicles with Dynamic Colliders */}
      {vehicles.map((v) => {
        const spec = VEHICLE_SPECS[v.kind];
        return (
          <group key={v.id}>
            <RigidBody
              ref={(el) => {
                vehicleBodiesRef.current[v.id] = el;
              }}
              type="dynamic"
              colliders={false}
              mass={spec.mass * 0.01}
              linearDamping={0.5}
              lockRotations
              position={[v.x, v.y, v.z]}>
              <CuboidCollider
                args={[spec.width * 0.48, spec.height * 0.45, spec.length * 0.48]}
                position={[0, spec.height * 0.5, 0]}
              />
            </RigidBody>
            <DetailedVehicleMesh
              vehicle={v}
              quality={quality}
              groupRef={(el) => {
                vehicleGroupRefs.current[v.id] = el;
              }}
            />
          </group>
        );
      })}

      {/* Pedestrians & Patrol/SWAT Officers */}
      {npcs.map((npc) => (
        <NpcActor
          key={npc.id}
          npc={npc}
          castShadow={quality === 'high' || quality === 'ultra'}
          registerRef={registerNpcRef}
        />
      ))}

      {/* World Pickups (Medkit, Armor Vest, Ammo Crate) */}
      {pickups.map((pk) => (
        <group
          key={pk.id}
          ref={(el) => {
            pickupRefs.current[pk.id] = el;
          }}
          position={[pk.x, pk.y, pk.z]}>
          {pk.kind === 'medkit' && (
            <group>
              <mesh castShadow>
                <boxGeometry args={[0.72, 0.52, 0.36]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  roughness={0.3}
                  emissive="#10b981"
                  emissiveIntensity={0.45}
                />
              </mesh>
              <mesh position={[0, 0, 0.2]}>
                <boxGeometry args={[0.4, 0.14, 0.04]} />
                <meshStandardMaterial
                  color="#10b981"
                  emissive="#10b981"
                  emissiveIntensity={1.6}
                />
              </mesh>
              <mesh position={[0, 0, 0.2]}>
                <boxGeometry args={[0.14, 0.4, 0.04]} />
                <meshStandardMaterial
                  color="#10b981"
                  emissive="#10b981"
                  emissiveIntensity={1.6}
                />
              </mesh>
            </group>
          )}
          {pk.kind === 'armor' && (
            <group>
              <mesh castShadow>
                <boxGeometry args={[0.64, 0.72, 0.34]} />
                <meshStandardMaterial
                  color="#0284c7"
                  metalness={0.5}
                  roughness={0.35}
                  emissive="#38bdf8"
                  emissiveIntensity={0.5}
                />
              </mesh>
              <mesh position={[0, 0.08, 0.19]}>
                <boxGeometry args={[0.36, 0.36, 0.04]} />
                <meshStandardMaterial color="#e0f2fe" />
              </mesh>
            </group>
          )}
          {pk.kind === 'ammo' && (
            <group>
              <mesh castShadow>
                <boxGeometry args={[0.7, 0.46, 0.46]} />
                <meshStandardMaterial
                  color="#d97706"
                  metalness={0.6}
                  roughness={0.4}
                  emissive="#f59e0b"
                  emissiveIntensity={0.45}
                />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <boxGeometry args={[0.56, 0.08, 0.2]} />
                <meshStandardMaterial color="#fef08a" />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Pooled Bullet Tracers & Tank Shells */}
      <instancedMesh
        ref={bulletInstRef}
        args={[undefined, undefined, MAX_BULLETS]}
        frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#fde047" />
      </instancedMesh>

      {/* Pooled Sparks, Explosions & Smoke */}
      <instancedMesh
        ref={particleInstRef}
        args={[undefined, undefined, MAX_PARTICLES]}
        frustumCulled={false}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>

      {/* Main Mission Start Marker (Cyan Light Pillar) */}
      {!runningMission && nextAvailableMission && (
        <group position={nextAvailableMission.startPos}>
          <mesh ref={missionBeaconRef} position={[0, 4.5, 0]}>
            <cylinderGeometry args={[1.1, 1.1, 9, 16, 1, true]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.34}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.3, 1.9, 24]} />
            <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Active Mission Checkpoint Ring (Amber Beacon) */}
      {activeCheckpoint && (
        <group position={activeCheckpoint}>
          <mesh ref={checkpointRingRef} position={[0, 3.8, 0]}>
            <cylinderGeometry args={[2.6, 2.6, 7.6, 20, 1, true]} />
            <meshBasicMaterial
              color="#f59e0b"
              transparent
              opacity={0.38}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.5, 3.3, 28]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Active GP Race Sector Arch Marker */}
      <group ref={raceGateGroupRef} visible={false}>
        <mesh position={[-8.0, 3.2, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 6.4, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[8.0, 3.2, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 6.4, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0, 6.4, 0]}>
          <boxGeometry args={[16.8, 0.9, 0.7]} />
          <meshStandardMaterial color="#facc15" emissive="#f97316" emissiveIntensity={1.8} />
        </mesh>
      </group>
    </group>
  );
});
