import {useFrame, useThree} from '@react-three/fiber';
import {CuboidCollider, RigidBody} from '@react-three/rapier';
import React, {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {
  WORLD_MAX_X,
  WORLD_MAX_Z,
  WORLD_MIN_X,
  WORLD_MIN_Z,
} from '../constants';
import {
  EnterableBuildingDef,
  GraphicsQuality,
  WeatherType,
} from '../types';
import {getCityTextures} from './textures';
import {
  BANK_ATM_SPOTS,
  BRIDGE_DECK_Y,
  BRIDGE_RAMP_LEN,
  BRIDGE_Z_CENTERS,
  BuildingDef,
  CITY_BUILDINGS,
  ENTERABLE_BUILDINGS,
  GARAGE_POS,
  HOUSES,
  RACETRACK_BARRIER_SEGMENTS,
  RACETRACK_HALF_W,
  RACETRACK_PADDOCK_POS,
  RACETRACK_SAMPLES,
  RIVER_MAX_X,
  RIVER_MIN_X,
  ROAD_WIDTH,
  ROAD_X_CENTERS,
  ROAD_Z_CENTERS,
  ROBBERY_SPOTS,
  SHOP_SPOTS,
  SIDE_MISSIONS,
} from './worldData';

export interface TrafficLightState {
  nsGreen: boolean;
  amber: boolean;
}

interface CityEnvironmentProps {
  weather: WeatherType;
  quality: GraphicsQuality;
  timeOfDayRef: React.MutableRefObject<number>;
  trafficLightRef: React.MutableRefObject<TrafficLightState>;
  paused: boolean;
}

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

export const CityEnvironment = React.memo(function CityEnvironment({
  weather,
  quality,
  timeOfDayRef,
  trafficLightRef,
  paused,
}: CityEnvironmentProps): React.ReactElement {
  const textures = useMemo(() => getCityTextures(), []);
  const {camera} = useThree();

  const roadMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glassEmissiveMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const resEmissiveMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const oceanRef = useRef<THREE.Mesh>(null);
  const riverRef = useRef<THREE.Mesh>(null);
  const boatRefs = useRef<(THREE.Group | null)[]>([]);
  const cloudsRef = useRef<THREE.Group>(null);

  const rainMeshRef = useRef<THREE.InstancedMesh>(null);
  const leafMeshRef = useRef<THREE.InstancedMesh>(null);

  const nsBulbRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ewBulbRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lastLightStateRef = useRef<string>('');
  const indoorLight1Ref = useRef<THREE.PointLight>(null);
  const indoorLight2Ref = useRef<THREE.PointLight>(null);
  const fountainRingsRef = useRef<(THREE.Mesh | null)[]>([]);

  // Split West Terrain (-490..110 = 600 wide) and East Terrain (240..990 = 750 wide)
  // so ZERO ground geometry exists inside the River Channel (110..240)!
  const westTerrainGeo = useMemo(() => {
    const geom = new THREE.PlaneGeometry(600, 780, 40, 48);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - 190; // center -190 => X: -490..110
      const z = -pos.getY(i) - 10;
      let y = -0.08;
      if (z < -310) {
        const d = (-310 - z) / 50;
        y += Math.pow(d, 1.35) * 18 + Math.sin(x * 0.04) * 2.8;
      }
      if (x < -420) {
        const d = (-420 - x) / 45;
        y += Math.pow(d, 1.3) * 14 + Math.cos(z * 0.06) * 2.2;
      }
      if (z > 280) {
        const d = Math.min(1, (z - 280) / 28);
        y = Math.min(y, -4.5 * d);
      }
      pos.setZ(i, y);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  const eastTerrainGeo = useMemo(() => {
    const geom = new THREE.PlaneGeometry(750, 780, 48, 48);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + 615; // center +615 => X: 240..990
      const z = -pos.getY(i) - 10;
      let y = -0.08;
      if (z < -310) {
        const d = (-310 - z) / 50;
        y += Math.pow(d, 1.35) * 18 + Math.sin(x * 0.04) * 2.8;
      }
      if (x > 910) {
        const d = (x - 910) / 45;
        y += Math.pow(d, 1.3) * 14 + Math.cos(z * 0.06) * 2.2;
      }
      if (z > 280) {
        const d = Math.min(1, (z - 280) / 28);
        y = Math.min(y, -4.5 * d);
      }
      pos.setZ(i, y);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  const oceanGeo = useMemo(
    () => new THREE.PlaneGeometry(1700, 320, 48, 20),
    [],
  );

  // Rich Parks across every open plot in Port Aurelia & Tân Đô
  const parkDefs = useMemo(
    () =>
      [
        {pos: [-32, 0, 102] as [number, number, number], w: 48, d: 54, kind: 'fountain' as const},
        {pos: [725, 0, 102] as [number, number, number], w: 94, d: 52, kind: 'fountain' as const},
        {pos: [-396, 0, 185] as [number, number, number], w: 48, d: 52, kind: 'sports' as const},
        {pos: [-96, 0, 102] as [number, number, number], w: 44, d: 52, kind: 'sports' as const},
        {pos: [-348, 0, -294] as [number, number, number], w: 78, d: 34, kind: 'botanical' as const},
        {pos: [484, 0, -102] as [number, number, number], w: 42, d: 48, kind: 'zen' as const},
        {pos: [614, 0, 102] as [number, number, number], w: 44, d: 52, kind: 'sports' as const},
        {pos: [264, 0, -102] as [number, number, number], w: 26, d: 48, kind: 'zen' as const},
        {pos: [88, 0, -78] as [number, number, number], w: 24, d: 34, kind: 'botanical' as const},
        {pos: [884, 0, 185] as [number, number, number], w: 44, d: 52, kind: 'coastal' as const},
        {pos: [538, 0, -294] as [number, number, number], w: 78, d: 34, kind: 'botanical' as const},
        {pos: [-396, 0, -160] as [number, number, number], w: 42, d: 22, kind: 'zen' as const},
        {pos: [-96, 0, -238] as [number, number, number], w: 42, d: 22, kind: 'botanical' as const},
      ],
    [],
  );

  // Instanced Trees, Bushes & 3D Grass Tufts across the 2x expanded megacity
  const foliagePositions = useMemo(() => {
    const palms: [number, number, number, number][] = [];
    const oaks: [number, number, number, number][] = [];
    const bushes: [number, number, number, number][] = [];
    const grassTufts: [number, number, number, number][] = [];

    const inRacetrack = (x: number, z: number) =>
      x >= 592 && x <= 918 && z >= -256 && z <= -145;
    const onRoad = (x: number, z: number) =>
      ROAD_X_CENTERS.some((rx) => Math.abs(rx - x) < 9.5) ||
      ROAD_Z_CENTERS.some((rz) => Math.abs(rz - z) < 9.5);
    const inRunway = (x: number, z: number) =>
      x >= -335 && x <= -85 && z >= 160 && z <= 202;

    // 1. Coastal Palms along West & East Beaches
    for (let x = -410; x <= 98; x += 18) {
      palms.push([x, 0, 266, 0.95 + ((Math.abs(x) * 7) % 5) * 0.08]);
      bushes.push([x + 6, 0, 252, 0.9]);
    }
    for (let x = 252; x <= 910; x += 18) {
      palms.push([x, 0, 266, 0.95 + ((Math.abs(x) * 5) % 4) * 0.08]);
      bushes.push([x + 6, 0, 252, 0.9]);
    }

    // 2. Boulevard Palms along Downtown & Tân Đô avenues
    for (let z = -245; z <= 215; z += 22) {
      if (ROAD_Z_CENTERS.some((rz) => Math.abs(rz - z) < 10)) continue;
      palms.push([-9.2, 0, z, 0.95]);
      palms.push([9.2, 0, z, 0.95]);
      palms.push([279, 0, z, 1.0]);
      palms.push([391, 0, z, 1.0]);
      palms.push([511, 0, z, 1.0]);
      palms.push([641, 0, z, 1.0]);
      bushes.push([-9.2, 0, z + 11, 0.75]);
      bushes.push([9.2, 0, z + 11, 0.75]);
      bushes.push([279, 0, z + 11, 0.78]);
      bushes.push([391, 0, z + 11, 0.78]);
    }

    // 3. Riverbank Greenbelts (West X=102, East X=248)
    for (let z = -255; z <= 235; z += 24) {
      if (ROAD_Z_CENTERS.some((rz) => Math.abs(rz - z) < 12)) continue;
      oaks.push([103, 0, z, 1.0]);
      oaks.push([247, 0, z, 1.05]);
      bushes.push([103, 0, z + 10, 0.85]);
      bushes.push([247, 0, z + 10, 0.85]);
    }

    // 4. Oaks & Bushes in West Suburbs, East Suburbs, and Northern Hills
    for (let z = -245; z <= 215; z += 24) {
      if (ROAD_Z_CENTERS.some((rz) => Math.abs(rz - z) < 10)) continue;
      oaks.push([-144, 0, z, 1.05]);
      oaks.push([-258, 0, z, 1.0]);
      oaks.push([-346, 0, z, 0.95]);
      if (!inRacetrack(856, z)) oaks.push([856, 0, z, 1.05]);
      if (!inRacetrack(791, z)) oaks.push([791, 0, z, 0.95]);
      bushes.push([-144, 0, z + 10, 0.8]);
      bushes.push([-258, 0, z + 10, 0.8]);
      if (!inRacetrack(856, z)) bushes.push([856, 0, z + 10, 0.82]);
    }

    // 5. Trees & Bushes framing every Urban Park
    parkDefs.forEach((pk) => {
      const [px, , pz] = pk.pos;
      const hw = pk.w * 0.44;
      const hd = pk.d * 0.44;
      const corners: [number, number][] = [
        [px - hw, pz - hd],
        [px + hw, pz - hd],
        [px - hw, pz + hd],
        [px + hw, pz + hd],
        [px - hw, pz],
        [px + hw, pz],
      ];
      corners.forEach(([tx, tz], ci) => {
        if (pk.kind === 'coastal') palms.push([tx, 0, tz, 1.05]);
        else oaks.push([tx, 0, tz, 1.0 + (ci % 3) * 0.1]);
        bushes.push([tx + (ci % 2 === 0 ? 2.8 : -2.8), 0, tz, 0.85]);
      });
      // Scatter lush 3D grass tufts inside every park
      for (let gx = -hw * 0.85; gx <= hw * 0.85; gx += 7.5) {
        for (let gz = -hd * 0.85; gz <= hd * 0.85; gz += 7.5) {
          if (Math.abs(gx) < 5 && Math.abs(gz) < 5) continue;
          grassTufts.push([
            px + gx + Math.sin(gx + gz) * 1.4,
            0,
            pz + gz + Math.cos(gx - gz) * 1.4,
            0.85 + (Math.abs(gx + gz) % 4) * 0.12,
          ]);
        }
      }
    });

    // 6. Northern Foothills Forest & Grass Meadow (West & East)
    for (let x = -415; x <= 96; x += 22) {
      oaks.push([x, 0.25, -310, 1.25]);
      oaks.push([x + 11, 0.85, -328, 1.35]);
      bushes.push([x + 6, 0.1, -304, 1.05]);
      grassTufts.push([x + 4, 0.05, -296, 1.15]);
      grassTufts.push([x - 5, 0.4, -318, 1.2]);
    }
    for (let x = 256; x <= 905; x += 22) {
      oaks.push([x, 0.25, -310, 1.25]);
      oaks.push([x + 11, 0.85, -328, 1.35]);
      bushes.push([x + 6, 0.1, -304, 1.05]);
      grassTufts.push([x + 4, 0.05, -296, 1.15]);
      grassTufts.push([x - 5, 0.4, -318, 1.2]);
    }

    // 7. Roadside & Racetrack Infield Grass Tufts
    for (let x = -390; x <= 880; x += 36) {
      if (x >= 102 && x <= 248) continue;
      for (let z = -245; z <= 235; z += 36) {
        if (onRoad(x, z) || inRunway(x, z)) continue;
        if (inRacetrack(x, z) && Math.hypot(x - 754, z + 201) > 45) continue;
        grassTufts.push([x, 0, z, 0.95]);
      }
    }

    return {palms, oaks, bushes, grassTufts};
  }, [parkDefs]);

  const streetlightPositions = useMemo(() => {
    const list: [number, number, number, number][] = [];
    for (const rx of ROAD_X_CENTERS) {
      const startZ = rx >= 650 ? -130 : -250;
      for (let z = startZ; z <= 220; z += 40) {
        if (ROAD_Z_CENTERS.some((rz) => Math.abs(rz - z) < 12)) continue;
        list.push([rx - 7.2, 0, z, 0]);
        list.push([rx + 7.2, 0, z, Math.PI]);
      }
    }
    for (const rz of ROAD_Z_CENTERS) {
      for (let x = -380; x <= 84; x += 40) {
        if (ROAD_X_CENTERS.some((rx) => Math.abs(rx - x) < 12)) continue;
        list.push([x, 0, rz - 7.2, Math.PI / 2]);
      }
      for (let x = 270; x <= 880; x += 40) {
        if (ROAD_X_CENTERS.some((rx) => Math.abs(rx - x) < 12)) continue;
        list.push([x, 0, rz - 7.2, Math.PI / 2]);
      }
    }
    // Bridge deck streetlights at BRIDGE_DECK_Y
    for (const bz of BRIDGE_Z_CENTERS) {
      for (let bx = 126; bx <= 224; bx += 26) {
        list.push([bx, BRIDGE_DECK_Y, bz - 7.4, Math.PI / 2]);
        list.push([bx, BRIDGE_DECK_Y, bz + 7.4, -Math.PI / 2]);
      }
    }
    return list;
  }, []);

  const containers = useMemo(
    () => [
      {pos: [74, 1.3, 86] as [number, number, number], color: '#dc2626', rot: 0},
      {pos: [74, 1.3, 90] as [number, number, number], color: '#2563eb', rot: 0},
      {pos: [74, 3.9, 88] as [number, number, number], color: '#ea580c', rot: 0},
      {pos: [86, 1.3, 108] as [number, number, number], color: '#16a34a', rot: Math.PI / 2},
      {pos: [92, 1.3, 108] as [number, number, number], color: '#ca8a04', rot: Math.PI / 2},
      {pos: [760, 1.3, -120] as [number, number, number], color: '#4b5a3c', rot: 0},
      {pos: [760, 1.3, -112] as [number, number, number], color: '#3f4d36', rot: 0},
    ],
    [],
  );

  const palmTrunkRef = useRef<THREE.InstancedMesh>(null);
  const palmCrownRef = useRef<THREE.InstancedMesh>(null);
  const oakTrunkRef = useRef<THREE.InstancedMesh>(null);
  const oakCrownRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const grassTuftRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const {palms, oaks, bushes, grassTufts} = foliagePositions;
    if (palmTrunkRef.current && palmCrownRef.current) {
      palms.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y + 3.2 * s, z);
        dummy.rotation.set(0.05 * Math.sin(i), i * 1.1, 0.04);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        palmTrunkRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, y + 6.4 * s, z);
        dummy.rotation.set(0, i * 0.7, 0);
        dummy.scale.set(s * 1.4, s * 0.7, s * 1.4);
        dummy.updateMatrix();
        palmCrownRef.current!.setMatrixAt(i, dummy.matrix);

        tempColor.set('#228b22').offsetHSL((i % 5) * 0.01 - 0.02, 0, 0);
        palmCrownRef.current!.setColorAt(i, tempColor);
      });
      palmTrunkRef.current.instanceMatrix.needsUpdate = true;
      palmCrownRef.current.instanceMatrix.needsUpdate = true;
      palmTrunkRef.current.computeBoundingSphere();
      palmCrownRef.current.computeBoundingSphere();
      if (palmCrownRef.current.instanceColor) {
        palmCrownRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (oakTrunkRef.current && oakCrownRef.current) {
      oaks.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y + 1.8 * s, z);
        dummy.rotation.set(0, i * 0.9, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        oakTrunkRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, y + 4.3 * s, z);
        dummy.scale.set(s, s * 1.15, s);
        dummy.updateMatrix();
        oakCrownRef.current!.setMatrixAt(i, dummy.matrix);

        tempColor.set('#38762c').offsetHSL((i % 7) * 0.012 - 0.03, 0, 0);
        oakCrownRef.current!.setColorAt(i, tempColor);
      });
      oakTrunkRef.current.instanceMatrix.needsUpdate = true;
      oakCrownRef.current.instanceMatrix.needsUpdate = true;
      oakTrunkRef.current.computeBoundingSphere();
      oakCrownRef.current.computeBoundingSphere();
      if (oakCrownRef.current.instanceColor) {
        oakCrownRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (bushRef.current) {
      bushes.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y + 0.55 * s, z);
        dummy.rotation.set(0, i * 0.85, 0);
        dummy.scale.set(s * 1.15, s * 0.85, s * 1.15);
        dummy.updateMatrix();
        bushRef.current!.setMatrixAt(i, dummy.matrix);

        tempColor.set('#2e7d32').offsetHSL((i % 6) * 0.014 - 0.03, 0.04, (i % 3) * 0.03);
        bushRef.current!.setColorAt(i, tempColor);
      });
      bushRef.current.instanceMatrix.needsUpdate = true;
      bushRef.current.computeBoundingSphere();
      if (bushRef.current.instanceColor) {
        bushRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (grassTuftRef.current) {
      grassTufts.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y + 0.25 * s, z);
        dummy.rotation.set(0.06 * Math.sin(i), i * 1.37, 0);
        dummy.scale.set(s * 1.1, s * 0.9, s * 1.1);
        dummy.updateMatrix();
        grassTuftRef.current!.setMatrixAt(i, dummy.matrix);

        tempColor
          .set(i % 9 === 0 ? '#84cc16' : i % 13 === 0 ? '#eab308' : '#4d7c0f')
          .offsetHSL((i % 5) * 0.01, 0, 0);
        grassTuftRef.current!.setColorAt(i, tempColor);
      });
      grassTuftRef.current.instanceMatrix.needsUpdate = true;
      grassTuftRef.current.computeBoundingSphere();
      if (grassTuftRef.current.instanceColor) {
        grassTuftRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (poleRef.current && bulbRef.current) {
      streetlightPositions.forEach(([x, y, z, rot], i) => {
        dummy.position.set(x, y + 3.0, z);
        dummy.rotation.set(0, rot, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleRef.current!.setMatrixAt(i, dummy.matrix);

        const armX = x + Math.cos(rot) * 0.9;
        const armZ = z - Math.sin(rot) * 0.9;
        dummy.position.set(armX, y + 5.9, armZ);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbRef.current!.setMatrixAt(i, dummy.matrix);
      });
      poleRef.current.instanceMatrix.needsUpdate = true;
      bulbRef.current.instanceMatrix.needsUpdate = true;
      poleRef.current.computeBoundingSphere();
      bulbRef.current.computeBoundingSphere();
    }
  }, [foliagePositions, streetlightPositions]);

  const rainCount = quality === 'low' ? 120 : quality === 'medium' ? 280 : 520;
  const rainDrops = useMemo(
    () =>
      Array.from({length: 520}, () => ({
        ox: (Math.random() - 0.5) * 65,
        oy: Math.random() * 28,
        oz: (Math.random() - 0.5) * 65,
        speed: 26 + Math.random() * 10,
      })),
    [],
  );

  const leafCount = quality === 'low' ? 16 : 42;
  const leaves = useMemo(
    () =>
      Array.from({length: 42}, () => ({
        ox: (Math.random() - 0.5) * 55,
        oy: 0.4 + Math.random() * 8,
        oz: (Math.random() - 0.5) * 55,
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  );

  const trafficTimerRef = useRef(0);

  useFrame(({clock}, delta) => {
    if (paused) return;
    const dt = Math.min(delta, 0.1);
    const elapsed = clock.getElapsedTime();

    const sunHeight = Math.sin((timeOfDayRef.current - 0.25) * Math.PI * 2);
    const nightGlow = THREE.MathUtils.clamp((-sunHeight + 0.15) * 1.4, 0, 1);

    if (roadMatRef.current) {
      roadMatRef.current.roughness = weather === 'rain' ? 0.16 : 0.78;
      roadMatRef.current.metalness = weather === 'rain' ? 0.35 : 0.08;
    }
    if (glassEmissiveMatRef.current) {
      glassEmissiveMatRef.current.emissiveIntensity = 0.15 + nightGlow * 1.25;
    }
    if (resEmissiveMatRef.current) {
      resEmissiveMatRef.current.emissiveIntensity = 0.08 + nightGlow * 1.1;
    }

    if (oceanRef.current) {
      oceanRef.current.position.y = -0.65 + Math.sin(elapsed * 1.4) * 0.12;
      oceanRef.current.position.z = 445 + Math.cos(elapsed * 0.9) * 0.8;
    }
    if (riverRef.current) {
      riverRef.current.position.y = -0.55 + Math.sin(elapsed * 1.7) * 0.07;
    }

    // Animate 6 River Boats & Ships sailing under the 3 bridges!
    const boatConfigs = [
      {speed: 7.5, dir: 1, span: 620, phase: 0},
      {speed: 11.0, dir: -1, span: 620, phase: 120},
      {speed: 6.2, dir: 1, span: 620, phase: 240},
      {speed: 14.5, dir: -1, span: 620, phase: 360},
      {speed: 8.5, dir: 1, span: 620, phase: 470},
      {speed: 9.8, dir: -1, span: 620, phase: 540},
    ];
    for (let bi = 0; bi < boatConfigs.length; bi++) {
      const grp = boatRefs.current[bi];
      if (!grp) continue;
      const cfg = boatConfigs[bi];
      const prog = (elapsed * cfg.speed + cfg.phase) % cfg.span;
      grp.position.z =
        cfg.dir === 1 ? prog - cfg.span / 2 : cfg.span / 2 - prog;
      grp.position.y = -0.5 + Math.sin(elapsed * 2.1 + bi) * 0.08;
      grp.rotation.z = Math.sin(elapsed * 1.5 + bi) * 0.03;
    }

    if (cloudsRef.current) {
      cloudsRef.current.position.x = ((elapsed * 1.6) % 720) - 120;
    }

    trafficTimerRef.current = (trafficTimerRef.current + dt) % 20;
    const cycle = trafficTimerRef.current;
    const nsGreen = cycle < 10;
    const amber = (cycle >= 8 && cycle < 10) || cycle >= 18;
    trafficLightRef.current.nsGreen = nsGreen && !amber;
    trafficLightRef.current.amber = amber;

    const nsColor = amber ? '#f59e0b' : nsGreen ? '#22c55e' : '#ef4444';
    const ewColor = amber ? '#f59e0b' : !nsGreen ? '#22c55e' : '#ef4444';
    const lightKey = `${nsColor}|${ewColor}`;
    if (lastLightStateRef.current !== lightKey) {
      lastLightStateRef.current = lightKey;
      for (const mat of nsBulbRefs.current) {
        if (mat) {
          mat.color.set(nsColor);
          mat.emissive.set(nsColor);
        }
      }
      for (const mat of ewBulbRefs.current) {
        if (mat) {
          mat.color.set(ewColor);
          mat.emissive.set(ewColor);
        }
      }
    }

    // Animate all Park Fountains in a single loop (zero extra React useFrame hooks!)
    for (let fi = 0; fi < fountainRingsRef.current.length; fi++) {
      const mesh = fountainRingsRef.current[fi];
      if (mesh) {
        const s = 1 + Math.sin(elapsed * 3.2 + fi) * 0.12;
        mesh.scale.set(s, 1, s);
      }
    }

    // Snap 2 pooled indoor PointLights to nearest Enterable Buildings (cuts shader cost by 6x!)
    if (indoorLight1Ref.current && indoorLight2Ref.current) {
      let best1 = ENTERABLE_BUILDINGS[0];
      let best2 = ENTERABLE_BUILDINGS[1];
      let d1 = Infinity;
      let d2 = Infinity;
      for (let i = 0; i < ENTERABLE_BUILDINGS.length; i++) {
        const eb = ENTERABLE_BUILDINGS[i];
        const distSq =
          (eb.x - camera.position.x) * (eb.x - camera.position.x) +
          (eb.z - camera.position.z) * (eb.z - camera.position.z);
        if (distSq < d1) {
          d2 = d1;
          best2 = best1;
          d1 = distSq;
          best1 = eb;
        } else if (distSq < d2) {
          d2 = distSq;
          best2 = eb;
        }
      }
      if (best1) {
        indoorLight1Ref.current.position.set(
          best1.x,
          (best1.baseY ?? 0) + Math.min(best1.h - 1, 4.8),
          best1.z,
        );
      }
      if (best2) {
        indoorLight2Ref.current.position.set(
          best2.x,
          (best2.baseY ?? 0) + Math.min(best2.h - 1, 4.8),
          best2.z,
        );
      }
    }

    if (rainMeshRef.current && weather === 'rain') {
      for (let i = 0; i < rainCount; i++) {
        const drop = rainDrops[i];
        drop.oy -= drop.speed * dt;
        if (drop.oy < 0) drop.oy += 28;
        dummy.position.set(
          camera.position.x + drop.ox,
          drop.oy,
          camera.position.z + drop.oz,
        );
        dummy.rotation.set(0, 0, 0.12);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rainMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      rainMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (leafMeshRef.current) {
      for (let i = 0; i < leafCount; i++) {
        const lf = leaves[i];
        const x =
          camera.position.x +
          ((lf.ox + elapsed * 2.4 + Math.sin(elapsed + lf.phase) * 2) % 55) -
          27.5;
        const y = lf.oy + Math.sin(elapsed * 1.7 + lf.phase) * 0.6;
        const z =
          camera.position.z +
          ((lf.oz + Math.cos(elapsed * 0.8 + lf.phase) * 3) % 55) -
          27.5;
        dummy.position.set(x, Math.max(0.2, y), z);
        dummy.rotation.set(elapsed + lf.phase, elapsed * 1.4, lf.phase);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        leafMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      leafMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const intersections = useMemo(() => {
    const list: [number, number][] = [];
    for (const rx of ROAD_X_CENTERS) {
      for (const rz of ROAD_Z_CENTERS) {
        // Roads x=650 and x=800 terminate at Z=-140 to keep the Racetrack clear
        if (rx >= 650 && rz < -140) continue;
        list.push([rx, rz]);
      }
    }
    return list;
  }, []);

  return (
    <group>
      {/* Solid Ground Physics Colliders Split Strictly by Wide Aurelia River (X: 110..240) */}
      <RigidBody type="fixed" friction={1} name="ground_west_and_east">
        {/* West Landmass (X: -480 .. +110, center -185, halfX 295) */}
        <CuboidCollider args={[295, 0.5, 390]} position={[-185, -0.5, -10]} />
        {/* East Landmass New City (X: +240 .. +980, center 610, halfX 370) */}
        <CuboidCollider args={[370, 0.5, 390]} position={[610, -0.5, -10]} />
        {/* Deep Riverbed Floor at Y = -5.5 */}
        <CuboidCollider args={[66, 0.5, 400]} position={[175, -6.0, -10]} />
      </RigidBody>

      {/* River Retaining Quay Walls along West (X=110) & East (X=240) Banks leaving gaps at 3 Bridges (-140, 0, 140) */}
      <RigidBody type="fixed" name="river_banks">
        {/* West Bank wall segments */}
        <CuboidCollider args={[1, 2.2, 112]} position={[109.5, 0.5, -262]} />
        <CuboidCollider args={[1, 2.2, 60]} position={[109.5, 0.5, -70]} />
        <CuboidCollider args={[1, 2.2, 60]} position={[109.5, 0.5, 70]} />
        <CuboidCollider args={[1, 2.2, 62]} position={[109.5, 0.5, 212]} />
        {/* East Bank wall segments */}
        <CuboidCollider args={[1, 2.2, 112]} position={[240.5, 0.5, -262]} />
        <CuboidCollider args={[1, 2.2, 60]} position={[240.5, 0.5, -70]} />
        <CuboidCollider args={[1, 2.2, 60]} position={[240.5, 0.5, 70]} />
        <CuboidCollider args={[1, 2.2, 62]} position={[240.5, 0.5, 212]} />
      </RigidBody>

      {/* World Perimeter Boundary Colliders */}
      <RigidBody type="fixed" name="world_bounds">
        <CuboidCollider
          args={[740, 16, 2]}
          position={[250, 8, WORLD_MIN_Z + 4]}
        />
        <CuboidCollider
          args={[740, 16, 2]}
          position={[250, 8, WORLD_MAX_Z - 14]}
        />
        <CuboidCollider
          args={[2, 16, 400]}
          position={[WORLD_MIN_X + 4, 8, -10]}
        />
        <CuboidCollider
          args={[2, 16, 400]}
          position={[WORLD_MAX_X - 4, 8, -10]}
        />
      </RigidBody>

      {/* Split West & East Terrain (ZERO triangles inside River X: 110..240!) */}
      <mesh
        geometry={westTerrainGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-190, 0, -10]}
        receiveShadow>
        <meshStandardMaterial
          map={textures.grassMap}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
      <mesh
        geometry={eastTerrainGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[615, 0, -10]}
        receiveShadow>
        <meshStandardMaterial
          map={textures.grassMap}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Deep Riverbed Dark Sand Bottom */}
      <mesh
        position={[175, -5.4, -10]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[136, 760]} />
        <meshStandardMaterial color="#0b2942" roughness={0.95} />
      </mesh>

      {/* Golden Sandy Beaches along South Coast (West & East) */}
      <mesh
        position={[-160, -0.025, 268]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <planeGeometry args={[540, 36]} />
        <meshStandardMaterial map={textures.sandMap} roughness={0.9} />
      </mesh>
      <mesh
        position={[585, -0.025, 268]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <planeGeometry args={[690, 36]} />
        <meshStandardMaterial map={textures.sandMap} roughness={0.9} />
      </mesh>

      {/* === WIDE SHIMMERING AURELIA RIVER WATER (X: 110..240 = 130 units wide!) === */}
      <mesh
        ref={riverRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[175, -0.55, -10]}>
        <planeGeometry args={[132, 760]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.08}
          metalness={0.68}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Concrete Quay Embankments plunging into the River */}
      <mesh position={[109.2, -2.5, -10]}>
        <boxGeometry args={[2.0, 5.4, 720]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>
      <mesh position={[240.8, -2.5, -10]}>
        <boxGeometry args={[2.0, 5.4, 720]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>

      {/* === 6 DIVERSE ANIMATED VESSELS IN THE RIVER === */}
      {/* 1. Large Container Cargo Ship */}
      <group
        ref={(el) => {
          boatRefs.current[0] = el;
        }}
        position={[136, -0.5, -60]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[6.2, 1.8, 22]} />
          <meshStandardMaterial color="#991b1b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.2, 6.5]} castShadow>
          <boxGeometry args={[5.0, 2.4, 4.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[-1.3, 2.1, -2.5]}>
          <boxGeometry args={[2.3, 1.8, 6.2]} />
          <meshStandardMaterial color="#0284c7" roughness={0.6} />
        </mesh>
        <mesh position={[1.3, 2.1, -2.5]}>
          <boxGeometry args={[2.3, 1.8, 6.2]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.1, -8.5]}>
          <boxGeometry args={[4.6, 1.8, 4.4]} />
          <meshStandardMaterial color="#16a34a" roughness={0.6} />
        </mesh>
      </group>

      {/* 2. Luxury White River Yacht */}
      <group
        ref={(el) => {
          boatRefs.current[1] = el;
        }}
        position={[164, -0.5, 80]}
        rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[4.2, 1.2, 13.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.22} />
        </mesh>
        <mesh position={[0, 1.45, 1.0]} castShadow>
          <boxGeometry args={[3.2, 1.1, 6.2]} />
          <meshStandardMaterial
            color="#38bdf8"
            roughness={0.1}
            metalness={0.75}
          />
        </mesh>
        <mesh position={[0, 2.2, 1.5]}>
          <boxGeometry args={[2.6, 0.5, 3.6]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
        </mesh>
      </group>

      {/* 3. River Tugboat & Barge */}
      <group
        ref={(el) => {
          boatRefs.current[2] = el;
        }}
        position={[188, -0.5, -180]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[3.8, 1.3, 9.0]} />
          <meshStandardMaterial color="#d97706" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.65, 0.5]} castShadow>
          <boxGeometry args={[2.6, 1.5, 3.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.4, -10.5]} castShadow>
          <boxGeometry args={[5.2, 1.0, 10.0]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      </group>

      {/* 4. Coast Guard Patrol Boat */}
      <group
        ref={(el) => {
          boatRefs.current[3] = el;
        }}
        position={[214, -0.5, 160]}
        rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[3.0, 1.0, 8.8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.25, 0.5]}>
          <boxGeometry args={[2.1, 0.9, 3.2]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 1.8, 0.5]}>
          <boxGeometry args={[1.1, 0.2, 0.3]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#ef4444"
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>

      {/* 5. Fast Sport Speedboat */}
      <group
        ref={(el) => {
          boatRefs.current[4] = el;
        }}
        position={[152, -0.5, 220]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[2.4, 0.8, 6.8]} />
          <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 0.2]}>
          <boxGeometry args={[1.9, 0.5, 2.2]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* 6. Fishing Trawler */}
      <group
        ref={(el) => {
          boatRefs.current[5] = el;
        }}
        position={[202, -0.5, -260]}
        rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[3.6, 1.2, 10.5]} />
          <meshStandardMaterial color="#15803d" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.5, -1.5]} castShadow>
          <boxGeometry args={[2.5, 1.4, 3.0]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.6} />
        </mesh>
      </group>

      {/* Southern Ocean */}
      <mesh
        ref={oceanRef}
        geometry={oceanGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[250, -0.65, 445]}>
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.14}
          metalness={0.55}
          transparent
          opacity={0.94}
        />
      </mesh>

      {/* Urban Concrete Plaza Bases (Strictly West X: -430..110 and East X: 240..930) */}
      <mesh
        position={[-160, -0.015, -24]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <planeGeometry args={[540, 560]} />
        <meshStandardMaterial
          map={textures.sidewalkMap}
          color="#cbd5e1"
          roughness={0.85}
        />
      </mesh>
      <mesh
        position={[585, -0.015, -24]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <planeGeometry args={[690, 560]} />
        <meshStandardMaterial
          map={textures.sidewalkMap}
          color="#cbd5e1"
          roughness={0.85}
        />
      </mesh>

      {/* Asphalt Road Network (North-South; x=650 & x=800 terminate at Z=-140 for the Racetrack!) */}
      {ROAD_X_CENTERS.map((rx) => {
        const stopsAtHighway = rx >= 650;
        const roadLen = stopsAtHighway ? 392 : 550;
        const roadZCenter = stopsAtHighway ? 55 : -24;
        return (
          <mesh
            key={`road-x-${rx}`}
            position={[rx, 0.01, roadZCenter]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow>
            <planeGeometry args={[ROAD_WIDTH, roadLen]} />
            <meshStandardMaterial
              ref={rx === 0 ? roadMatRef : undefined}
              map={textures.asphaltMap}
              roughnessMap={textures.asphaltRoughness}
              roughness={0.78}
              metalness={0.08}
            />
          </mesh>
        );
      })}
      {/* Asphalt Road Network (East-West on West Bank & East Bank, stopping at Riverbanks) */}
      {ROAD_Z_CENTERS.map((rz) => (
        <React.Fragment key={`road-z-grp-${rz}`}>
          <mesh
            position={[-160, 0.015, rz]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            receiveShadow>
            <planeGeometry args={[rz === -140 ? 15 : ROAD_WIDTH, 540]} />
            <meshStandardMaterial
              map={textures.asphaltMap}
              roughnessMap={textures.asphaltRoughness}
              roughness={weather === 'rain' ? 0.16 : 0.78}
              metalness={weather === 'rain' ? 0.35 : 0.08}
            />
          </mesh>
          <mesh
            position={[585, 0.015, rz]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            receiveShadow>
            <planeGeometry args={[rz === -140 ? 15 : ROAD_WIDTH, 690]} />
            <meshStandardMaterial
              map={textures.asphaltMap}
              roughnessMap={textures.asphaltRoughness}
              roughness={weather === 'rain' ? 0.16 : 0.78}
              metalness={weather === 'rain' ? 0.35 : 0.08}
            />
          </mesh>
        </React.Fragment>
      ))}

      {/* === THREE ELEVATED BRIDGES SPANNING OVER AURELIA RIVER WATER === */}
      <SuspensionBridge zCenter={0} textures={textures} style="suspension" />
      <SuspensionBridge zCenter={-140} textures={textures} style="arch" />
      <SuspensionBridge zCenter={140} textures={textures} style="truss" />

      {/* Intersections & Traffic Signals */}
      {intersections.map(([ix, iz], idx) => (
        <group key={`inter-${idx}`} position={[ix, 0, iz]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12.4, 12.4]} />
            <meshStandardMaterial
              color="#252932"
              roughness={weather === 'rain' ? 0.16 : 0.8}
            />
          </mesh>
          <group position={[7.4, 0, 7.4]}>
            <mesh position={[0, 2.6, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.13, 5.2, 8]} />
              <meshStandardMaterial
                color="#334155"
                metalness={0.7}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[-0.4, 4.6, 0]}>
              <boxGeometry args={[0.45, 1.0, 0.45]} />
              <meshStandardMaterial color="#0f172a" roughness={0.6} />
            </mesh>
            <mesh position={[-0.4, 4.75, -0.25]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshStandardMaterial
                ref={(el) => {
                  nsBulbRefs.current[idx] = el;
                }}
                color="#22c55e"
                emissive="#22c55e"
                emissiveIntensity={2.2}
              />
            </mesh>
            <mesh position={[-0.65, 4.75, 0]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshStandardMaterial
                ref={(el) => {
                  ewBulbRefs.current[idx] = el;
                }}
                color="#ef4444"
                emissive="#ef4444"
                emissiveIntensity={2.2}
              />
            </mesh>
          </group>
        </group>
      ))}

      {/* Extended International Airport Runway (South-West District) */}
      <group position={[-210, 0.02, 180]}>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
          <planeGeometry args={[24, 230]} />
          <meshStandardMaterial map={textures.runwayMap} roughness={0.8} />
        </mesh>
        <RigidBody type="fixed" colliders="cuboid" position={[-96, 0, -22]}>
          <mesh position={[0, 10.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.0, 3.8, 21, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
          <mesh position={[0, 22, 0]} castShadow>
            <cylinderGeometry args={[5.5, 4.0, 3.6, 8]} />
            <meshStandardMaterial
              color="#0ea5e9"
              metalness={0.85}
              roughness={0.15}
            />
          </mesh>
        </RigidBody>
      </group>

      {/* Harbor & Port Pier + Shipping Containers */}
      <group position={[84, 0, 102]}>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[58, 0.25, 44]} />
          <meshStandardMaterial
            map={textures.sidewalkMap}
            color="#64748b"
            roughness={0.88}
          />
        </mesh>
        {containers.map((c, idx) => (
          <RigidBody
            key={`cont-${idx}`}
            type="fixed"
            colliders="cuboid"
            position={[c.pos[0] - 84, c.pos[1], c.pos[2] - 102]}
            rotation={[0, c.rot, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[6.0, 2.6, 2.5]} />
              <meshStandardMaterial
                map={textures.containerMap}
                color={c.color}
                roughness={0.55}
                metalness={0.45}
              />
            </mesh>
          </RigidBody>
        ))}
        <group position={[10, 0, 14]}>
          <mesh position={[0, 7, 0]} castShadow>
            <boxGeometry args={[1.4, 14, 1.4]} />
            <meshStandardMaterial color="#eab308" roughness={0.5} />
          </mesh>
          <mesh position={[0, 13.5, 4]} castShadow>
            <boxGeometry args={[1.2, 1.0, 14]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* === 2 POOLED INDOOR POINT LIGHTS (REPLACES 13 INDIVIDUAL POINT LIGHTS FOR SMOOTH 60FPS!) === */}
      <pointLight
        ref={indoorLight1Ref}
        color="#fff7ed"
        intensity={quality === 'low' ? 14 : 28}
        distance={28}
        decay={1.1}
        castShadow={false}
      />
      <pointLight
        ref={indoorLight2Ref}
        color="#fff7ed"
        intensity={quality === 'low' ? 14 : 28}
        distance={28}
        decay={1.1}
        castShadow={false}
      />

      {/* === 13 DIVERSE URBAN PARKS FILLING EMPTY BLOCKS ACROSS THE MEGACITY === */}
      {parkDefs.map((pk, idx) => (
        <UrbanPark
          key={`park-${idx}`}
          pos={pk.pos}
          w={pk.w}
          d={pk.d}
          kind={pk.kind}
          setWaterRingRef={(el) => {
            fountainRingsRef.current[idx] = el;
          }}
        />
      ))}

      {/* === PARKED AIRCRAFT AT INTERNATIONAL AIRPORT TARMAC === */}
      <ParkedJet pos={[-150, 0, 152]} rotY={Math.PI * 0.15} color="#f8fafc" accent="#0284c7" />
      <ParkedJet pos={[-250, 0, 152]} rotY={-Math.PI * 0.1} color="#e2e8f0" accent="#ef4444" />

      {/* === ROADSIDE NEON BILLBOARDS === */}
      <BillboardSign pos={[18, 0, -68]} rotY={0} color="#06b6d4" />
      <BillboardSign pos={[268, 0, -68]} rotY={Math.PI / 2} color="#f59e0b" />
      <BillboardSign pos={[535, 0, -155]} rotY={-Math.PI / 4} color="#ef4444" />
      <BillboardSign pos={[-115, 0, -152]} rotY={Math.PI / 4} color="#a855f7" />

      {/* === PORT AURELIA INTERNATIONAL SPEEDWAY (TRƯỜNG ĐUA Ô TÔ GP) === */}
      <RacetrackComplex textures={textures} />

      {/* Highway Overpass Gantry Sign */}
      <group position={[0, 0, -140]}>
        <mesh position={[-8.5, 3.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.28, 7, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh position={[8.5, 3.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.28, 7, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh position={[0, 6.8, 0]} castShadow>
          <boxGeometry args={[17.5, 1.6, 0.35]} />
          <meshStandardMaterial color="#15803d" roughness={0.45} />
        </mesh>
      </group>

      {/* Solid City Towers & Commercial Buildings */}
      {CITY_BUILDINGS.map((b) => (
        <CityBuilding
          key={b.id}
          def={b}
          textures={textures}
          glassEmissiveRef={b.id === 'dt-1' ? glassEmissiveMatRef : undefined}
          resEmissiveRef={b.id === 'res-1' ? resEmissiveMatRef : undefined}
        />
      ))}

      {/* Walkable Enterable Buildings with Rich Interiors (Banks, Jewelry, Shops, Sky Condos) */}
      {ENTERABLE_BUILDINGS.map((eb) => (
        <EnterableBuildingMesh
          key={eb.id}
          def={eb}
          textures={textures}
          quality={quality}
        />
      ))}

      {/* Aurelia Petrol Gas Station Canopy & Fuel Pumps */}
      <group position={[38, 0, -55]}>
        <mesh position={[0, 5.2, 0]} castShadow>
          <boxGeometry args={[16, 0.7, 9]} />
          <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 5.6, 4.55]}>
          <boxGeometry args={[15.5, 0.4, 0.14]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#fb923c"
            emissiveIntensity={2.2}
          />
        </mesh>
        {[-6.0, 6.0].map((cx, i) => (
          <mesh key={`gas-col-${i}`} position={[cx, 2.6, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.3, 5.2, 10]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}
        {[-3.4, 0, 3.4].map((px, i) => (
          <group key={`pump-${i}`} position={[px, 0, 0]}>
            <mesh position={[0, 0.95, 0]} castShadow>
              <boxGeometry args={[0.9, 1.9, 0.65]} />
              <meshStandardMaterial color="#dc2626" roughness={0.45} />
            </mesh>
            <mesh position={[0, 1.35, 0.34]}>
              <boxGeometry args={[0.6, 0.45, 0.05]} />
              <meshStandardMaterial
                color="#7dd3fc"
                emissive="#38bdf8"
                emissiveIntensity={1.4}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Bank ATM, Shop, Garage & Sky Elevator Rings */}
      {BANK_ATM_SPOTS.map((pos, idx) => (
        <group key={`atm-ring-${idx}`} position={pos}>
          <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.1, 1.65, 24]} />
            <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {SHOP_SPOTS.map((pos, idx) => (
        <group key={`shop-ring-${idx}`} position={pos}>
          <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.3, 1.85, 24]} />
            <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <group position={GARAGE_POS}>
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.5, 24]} />
          <meshBasicMaterial color="#eab308" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Purchasable Houses + High-Rise Condo Lobby & Rooftop Elevator Pads */}
      {HOUSES.map((h) => {
        if (h.isHighRise && h.lobbyElevatorPos && h.apartmentElevatorPos) {
          return (
            <React.Fragment key={h.id}>
              {/* Ground Lobby Elevator Pad */}
              <group position={h.lobbyElevatorPos}>
                <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.3, 2.0, 24]} />
                  <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 2.0, 0]}>
                  <cylinderGeometry args={[0.9, 0.9, 4.0, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.22}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
              {/* Rooftop Apartment Elevator Pad */}
              <group position={h.apartmentElevatorPos}>
                <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.1, 1.7, 24]} />
                  <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
                </mesh>
              </group>
            </React.Fragment>
          );
        }
        if (h.id === 'house-neo') {
          return (
            <group key={h.id} position={[426, 0.08, -24]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.3, 1.9, 24]} />
                <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={h.id} position={h.pos}>
            <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
              <boxGeometry args={[9.5, 5.2, 7.5]} />
              <meshStandardMaterial color="#e7d7c1" roughness={0.75} />
            </mesh>
            <mesh position={[0, 6.2, 0]} castShadow>
              <coneGeometry args={[7.2, 2.2, 4]} />
              <meshStandardMaterial color="#9a3412" roughness={0.7} />
            </mesh>
            <mesh position={[4.2, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.4, 2.0, 24]} />
              <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Side Mission Start Beacons */}
      {SIDE_MISSIONS.map((sm) => (
        <group key={sm.id} position={sm.startPos}>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.75, 22]} />
            <meshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 5.2, 12, 1, true]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.24}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Robbery Spot Trigger Rings */}
      {ROBBERY_SPOTS.map((spot) => {
        const ringColor =
          spot.kind === 'bank'
            ? '#f59e0b'
            : spot.kind === 'jewelry'
              ? '#38bdf8'
              : spot.kind === 'gas_station'
                ? '#fb923c'
                : '#22c55e';
        return (
          <group key={spot.id} position={spot.triggerPos}>
            <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.3, 1.9, 24]} />
              <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.85, 0.85, 4.4, 16, 1, true]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={0.22}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Beach Umbrellas along West & East Coastlines */}
      {[-340, -240, -140, -40, 40, 280, 400, 520, 680, 820].map((bx, i) => (
        <group key={`umb-${i}`} position={[bx, 0, 268]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.6, 6]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[1.8, 0.7, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#ef4444' : '#0ea5e9'}
              roughness={0.75}
            />
          </mesh>
        </group>
      ))}

      {/* Instanced Palm Trees */}
      <instancedMesh
        ref={palmTrunkRef}
        args={[undefined, undefined, foliagePositions.palms.length]}
        frustumCulled={false}
        castShadow={quality !== 'low'}>
        <cylinderGeometry args={[0.2, 0.38, 6.5, 7]} />
        <meshStandardMaterial color="#78553a" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={palmCrownRef}
        args={[undefined, undefined, foliagePositions.palms.length]}
        frustumCulled={false}
        castShadow={quality !== 'low'}>
        <dodecahedronGeometry args={[2.1, 1]} />
        <meshStandardMaterial roughness={0.82} flatShading />
      </instancedMesh>

      {/* Instanced Oak Trees */}
      <instancedMesh
        ref={oakTrunkRef}
        args={[undefined, undefined, foliagePositions.oaks.length]}
        frustumCulled={false}
        castShadow={quality !== 'low'}>
        <cylinderGeometry args={[0.22, 0.42, 3.8, 7]} />
        <meshStandardMaterial color="#5a4332" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={oakCrownRef}
        args={[undefined, undefined, foliagePositions.oaks.length]}
        frustumCulled={false}
        castShadow={quality !== 'low'}>
        <dodecahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>

      {/* Instanced Bushes & Decorative Hedges */}
      <instancedMesh
        ref={bushRef}
        args={[undefined, undefined, foliagePositions.bushes.length]}
        frustumCulled={false}>
        <dodecahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial roughness={0.88} flatShading />
      </instancedMesh>

      {/* Instanced 3D Grass Tufts & Wildflowers */}
      <instancedMesh
        ref={grassTuftRef}
        args={[undefined, undefined, foliagePositions.grassTufts.length]}
        frustumCulled={false}>
        <coneGeometry args={[0.45, 0.72, 5]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>

      {/* Instanced Streetlights */}
      <instancedMesh
        ref={poleRef}
        args={[undefined, undefined, streetlightPositions.length]}
        frustumCulled={false}>
        <cylinderGeometry args={[0.09, 0.14, 6.0, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.35} />
      </instancedMesh>
      <instancedMesh
        ref={bulbRef}
        args={[undefined, undefined, streetlightPositions.length]}
        frustumCulled={false}>
        <boxGeometry args={[0.9, 0.18, 0.35]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fde047"
          emissiveIntensity={1.6}
        />
      </instancedMesh>

      {/* Moving Sky Clouds */}
      <group ref={cloudsRef} position={[120, 105, 0]}>
        {[
          [-260, 0, -90, 30],
          [-20, 4, -140, 32],
          [180, -2, 30, 28],
          [460, 3, -85, 32],
          [720, 2, 110, 28],
        ].map(([cx, cy, cz, cs], i) => (
          <mesh key={`cloud-${i}`} position={[cx, cy, cz]} scale={[cs, 5.5, cs * 0.65]}>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color={weather === 'rain' ? '#64748b' : '#f8fafc'}
              roughness={0.95}
              transparent
              opacity={weather === 'sunny' ? 0.72 : 0.88}
            />
          </mesh>
        ))}
      </group>

      {/* 3D Rain Particles */}
      {weather === 'rain' && (
        <instancedMesh
          ref={rainMeshRef}
          args={[undefined, undefined, rainCount]}
          frustumCulled={false}>
          <boxGeometry args={[0.03, 0.9, 0.03]} />
          <meshBasicMaterial color="#bae6fd" transparent opacity={0.55} />
        </instancedMesh>
      )}

      {/* Wind-drifted Leaves */}
      <instancedMesh
        ref={leafMeshRef}
        args={[undefined, undefined, leafCount]}
        frustumCulled={false}>
        <planeGeometry args={[0.16, 0.12]} />
        <meshStandardMaterial
          color="#84cc16"
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </instancedMesh>
    </group>
  );
});

function SuspensionBridge({
  zCenter,
  textures,
  style,
}: {
  zCenter: number;
  textures: ReturnType<typeof getCityTextures>;
  style: 'suspension' | 'arch' | 'truss';
}) {
  const spanLen = RIVER_MAX_X - RIVER_MIN_X; // 130 units over river (110..240)
  const centerX = (RIVER_MIN_X + RIVER_MAX_X) / 2; // 175
  const deckWidth = 15.6;
  const rampLen = BRIDGE_RAMP_LEN; // 36 units
  const rampHyp = Math.hypot(rampLen, BRIDGE_DECK_Y);
  const rampSlope = Math.atan2(BRIDGE_DECK_Y, rampLen);
  const pylonX = [142, 208];

  return (
    <group position={[centerX, 0, zCenter]}>
      <RigidBody type="fixed" friction={1}>
        <CuboidCollider
          args={[spanLen / 2 + 1, 0.4, deckWidth / 2]}
          position={[0, BRIDGE_DECK_Y - 0.35, 0]}
        />
        <CuboidCollider
          args={[rampHyp / 2 + 0.5, 0.35, deckWidth / 2]}
          position={[
            -(spanLen / 2 + rampLen / 2),
            BRIDGE_DECK_Y / 2 - 0.32,
            0,
          ]}
          rotation={[0, 0, rampSlope]}
        />
        <CuboidCollider
          args={[rampHyp / 2 + 0.5, 0.35, deckWidth / 2]}
          position={[spanLen / 2 + rampLen / 2, BRIDGE_DECK_Y / 2 - 0.32, 0]}
          rotation={[0, 0, -rampSlope]}
        />
        <CuboidCollider
          args={[(spanLen + rampLen * 2) / 2, 0.9, 0.35]}
          position={[0, BRIDGE_DECK_Y + 0.4, -deckWidth / 2 + 0.25]}
        />
        <CuboidCollider
          args={[(spanLen + rampLen * 2) / 2, 0.9, 0.35]}
          position={[0, BRIDGE_DECK_Y + 0.4, deckWidth / 2 - 0.25]}
        />
      </RigidBody>

      {/* Elevated Road Deck */}
      <mesh
        position={[0, BRIDGE_DECK_Y + 0.03, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        receiveShadow>
        <planeGeometry args={[12.8, spanLen + 1]} />
        <meshStandardMaterial
          map={textures.asphaltMap}
          roughnessMap={textures.asphaltRoughness}
          roughness={0.72}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, BRIDGE_DECK_Y - 0.45, 0]} receiveShadow>
        <boxGeometry args={[spanLen + 1, 0.85, deckWidth]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Approach Ramps */}
      <group
        position={[-(spanLen / 2 + rampLen / 2), BRIDGE_DECK_Y / 2, 0]}
        rotation={[0, 0, rampSlope]}>
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          receiveShadow>
          <planeGeometry args={[12.8, rampHyp + 1]} />
          <meshStandardMaterial map={textures.asphaltMap} roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[rampHyp + 1, 0.75, deckWidth]} />
          <meshStandardMaterial color="#64748b" roughness={0.82} />
        </mesh>
      </group>
      <group
        position={[spanLen / 2 + rampLen / 2, BRIDGE_DECK_Y / 2, 0]}
        rotation={[0, 0, -rampSlope]}>
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          receiveShadow>
          <planeGeometry args={[12.8, rampHyp + 1]} />
          <meshStandardMaterial map={textures.asphaltMap} roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[rampHyp + 1, 0.75, deckWidth]} />
          <meshStandardMaterial color="#64748b" roughness={0.82} />
        </mesh>
      </group>

      {[-deckWidth / 2 + 0.25, deckWidth / 2 - 0.25].map((rz, idx) => (
        <mesh key={`rail-${idx}`} position={[0, BRIDGE_DECK_Y + 0.65, rz]} castShadow>
          <boxGeometry args={[spanLen, 0.9, 0.45]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}

      {/* Concrete Piers standing in the River Water */}
      {pylonX.map((px, idx) => {
        const lx = px - centerX;
        return (
          <group key={`pier-${idx}`} position={[lx, 0, 0]}>
            <mesh position={[0, -1.2, -5.5]}>
              <boxGeometry args={[3.8, 9.2, 3.0]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
            <mesh position={[0, -1.2, 5.5]}>
              <boxGeometry args={[3.8, 9.2, 3.0]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      {style === 'suspension' &&
        pylonX.map((px, idx) => {
          const lx = px - centerX;
          return (
            <group key={`tower-${idx}`} position={[lx, BRIDGE_DECK_Y, 0]}>
              {[-7.2, 7.2].map((tz, ti) => (
                <mesh key={`pt-${ti}`} position={[0, 14, tz]} castShadow>
                  <boxGeometry args={[1.9, 28, 1.5]} />
                  <meshStandardMaterial
                    color="#dc2626"
                    metalness={0.55}
                    roughness={0.35}
                  />
                </mesh>
              ))}
              <mesh position={[0, 26.5, 0]} castShadow>
                <boxGeometry args={[1.7, 1.7, 15.8]} />
                <meshStandardMaterial color="#dc2626" metalness={0.55} />
              </mesh>
              <mesh position={[0, 28.4, 0]}>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#f59e0b"
                  emissiveIntensity={2.6}
                />
              </mesh>
              {[-22, -11, 11, 22].map((dx, ci) => {
                const len = Math.hypot(dx, 24);
                const angle = Math.atan2(dx, 24);
                return (
                  <React.Fragment key={`cab-${ci}`}>
                    <mesh
                      position={[dx * 0.5, 13.5, -7.2]}
                      rotation={[0, 0, -angle]}>
                      <cylinderGeometry args={[0.07, 0.07, len, 6]} />
                      <meshStandardMaterial color="#e2e8f0" metalness={0.85} />
                    </mesh>
                    <mesh
                      position={[dx * 0.5, 13.5, 7.2]}
                      rotation={[0, 0, -angle]}>
                      <cylinderGeometry args={[0.07, 0.07, len, 6]} />
                      <meshStandardMaterial color="#e2e8f0" metalness={0.85} />
                    </mesh>
                  </React.Fragment>
                );
              })}
            </group>
          );
        })}

      {style !== 'suspension' && (
        <group position={[0, BRIDGE_DECK_Y, 0]}>
          {[-7.2, 7.2].map((az, i) => (
            <mesh key={`arch-${i}`} position={[0, 5.2, az]} castShadow>
              <boxGeometry args={[spanLen * 0.88, 1.2, 0.85]} />
              <meshStandardMaterial
                color={style === 'arch' ? '#0284c7' : '#eab308'}
                metalness={0.6}
                roughness={0.35}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function EnterableBuildingMesh({
  def,
  textures,
  quality,
}: {
  def: EnterableBuildingDef;
  textures: ReturnType<typeof getCityTextures>;
  quality: GraphicsQuality;
}) {
  const {
    x,
    baseY = 0,
    z,
    w,
    d,
    h,
    kind,
    doorSide,
    exteriorColor,
    interiorFloorColor,
    interiorWallColor,
    accentColor,
    wallBoxes,
  } = def;

  const signPos: [number, number, number] =
    doorSide === 'east'
      ? [x + w / 2 + 0.25, baseY + 5.2, z]
      : doorSide === 'west'
        ? [x - w / 2 - 0.25, baseY + 5.2, z]
        : doorSide === 'north'
          ? [x, baseY + 5.2, z - d / 2 - 0.25]
          : [x, baseY + 5.2, z + d / 2 + 0.25];
  const signArgs: [number, number, number] =
    doorSide === 'east' || doorSide === 'west'
      ? [0.25, 1.2, 7.0]
      : [7.0, 1.2, 0.25];

  const isFurnishedHome = kind === 'house' || kind === 'penthouse';

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {wallBoxes.map((wb, idx) => (
          <CuboidCollider
            key={`wb-${idx}`}
            args={[wb.w / 2, wb.h / 2, wb.d / 2]}
            position={[wb.x, wb.y, wb.z]}
          />
        ))}
        {/* Solid Walkable Floor Slab for High-Rise Penthouses */}
        {baseY > 0 && (
          <CuboidCollider
            args={[w / 2 + 0.4, 0.4, d / 2 + 0.4]}
            position={[x, baseY - 0.4, z]}
          />
        )}
        {/* Roof Slab */}
        <CuboidCollider
          args={[w / 2, 0.4, d / 2]}
          position={[x, baseY + h + 0.4, z]}
        />
      </RigidBody>

      {/* Walls */}
      {wallBoxes.map((wb, idx) => (
        <mesh
          key={`wm-${idx}`}
          position={[wb.x, wb.y, wb.z]}
          castShadow={quality !== 'low'}
          receiveShadow>
          <boxGeometry args={[wb.w, wb.h, wb.d]} />
          <meshStandardMaterial
            map={
              kind === 'bank'
                ? textures.glassTowerMap
                : kind === 'minimart'
                  ? textures.commercialMap
                  : undefined
            }
            color={exteriorColor}
            roughness={0.52}
            metalness={kind === 'bank' || kind === 'jewelry' ? 0.35 : 0.15}
          />
        </mesh>
      ))}

      {/* Interior Floor & Ceiling */}
      <mesh
        position={[x, baseY + 0.04, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <planeGeometry args={[w - 0.6, d - 0.6]} />
        <meshStandardMaterial
          map={textures.sidewalkMap}
          color={interiorFloorColor}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[x, baseY + h + 0.35, z]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.6, 0.7, d + 0.6]} />
        <meshStandardMaterial color={interiorWallColor} roughness={0.65} />
      </mesh>

      {/* Signboard */}
      <mesh position={signPos}>
        <boxGeometry args={signArgs} />
        <meshStandardMaterial
          color="#fef08a"
          emissive={accentColor}
          emissiveIntensity={2.2}
        />
      </mesh>

      {/* === BANK INTERIOR: Cash Teller Counters, Cash Bundles, Stanchions & Gold Vault === */}
      {kind === 'bank' && (
        <group position={[x, baseY, z]}>
          {/* Long Teller Counter with Glass Divider */}
          <mesh position={[doorSide === 'east' ? -2 : 2, 0.7, -5.8]} castShadow>
            <boxGeometry args={[10.5, 1.4, 1.3]} />
            <meshStandardMaterial color="#334155" roughness={0.45} />
          </mesh>
          <mesh position={[doorSide === 'east' ? -2 : 2, 2.0, -5.8]}>
            <boxGeometry args={[10.3, 1.2, 0.1]} />
            <meshStandardMaterial
              color="#7dd3fc"
              transparent
              opacity={0.42}
              roughness={0.1}
            />
          </mesh>
          {/* Green Cash Stacks (Quầy đựng tiền!) on the Counter */}
          {[-4.2, -1.4, 1.4, 4.2].map((cx, idx) => (
            <group
              key={`cash-tray-${idx}`}
              position={[(doorSide === 'east' ? -2 : 2) + cx * 0.85, 1.48, -5.5]}>
              <mesh>
                <boxGeometry args={[0.9, 0.18, 0.55]} />
                <meshStandardMaterial color="#16a34a" roughness={0.5} />
              </mesh>
              <mesh position={[0.12, 0.14, 0]}>
                <boxGeometry args={[0.55, 0.12, 0.35]} />
                <meshStandardMaterial color="#22c55e" roughness={0.4} />
              </mesh>
            </group>
          ))}
          {/* Velvet Queue Stanchions */}
          {[-3.5, 0, 3.5].map((qx, i) => (
            <mesh key={`stanch-${i}`} position={[qx, 0.55, 2.2]}>
              <cylinderGeometry args={[0.12, 0.18, 1.1, 8]} />
              <meshStandardMaterial color="#eab308" metalness={0.85} />
            </mesh>
          ))}
          {/* Steel Vault Door & Gold/Cash Pallets */}
          <mesh position={[doorSide === 'east' ? -8.5 : 8.5, 2.2, 0]}>
            <boxGeometry args={[1.4, 4.4, 5.2]} />
            <meshStandardMaterial
              color="#64748b"
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[doorSide === 'east' ? -6.2 : 6.2, 0.55, 0]}>
            <boxGeometry args={[1.8, 1.1, 2.4]} />
            <meshStandardMaterial
              color="#facc15"
              metalness={0.9}
              roughness={0.2}
              emissive="#ca8a04"
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      )}

      {/* === JEWELRY STORE INTERIOR: Glass Display Cases with Gold & Diamonds === */}
      {kind === 'jewelry' && (
        <group position={[x, baseY, z]}>
          {/* Main Jeweler Counter at Back */}
          <mesh position={[doorSide === 'east' ? -5.5 : 5.5, 0.65, 0]} castShadow>
            <boxGeometry args={[1.5, 1.3, 10.5]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.35} />
          </mesh>
          {/* 4 Glass Display Cases with Glowing Diamonds & Gold Bars */}
          {[
            [-1.2, -3.6],
            [-1.2, 3.6],
            [2.4, -3.6],
            [2.4, 3.6],
          ].map(([jx, jz], idx) => (
            <group key={`jcase-${idx}`} position={[jx, 0, jz]}>
              {/* Pedestal */}
              <mesh position={[0, 0.55, 0]} castShadow>
                <boxGeometry args={[1.6, 1.1, 2.6]} />
                <meshStandardMaterial color="#0f172a" roughness={0.3} />
              </mesh>
              {/* Glass Case Cube */}
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.5, 0.85, 2.5]} />
                <meshStandardMaterial
                  color="#bae6fd"
                  transparent
                  opacity={0.38}
                  roughness={0.05}
                  metalness={0.85}
                />
              </mesh>
              {/* Sparkling Diamond Octahedron inside Case */}
              <mesh position={[0, 1.42, -0.55]}>
                <octahedronGeometry args={[0.26, 0]} />
                <meshStandardMaterial
                  color="#e0f2fe"
                  emissive="#38bdf8"
                  emissiveIntensity={2.2}
                  metalness={0.9}
                  roughness={0.05}
                />
              </mesh>
              {/* Gold Ingot Stack inside Case */}
              <mesh position={[0, 1.32, 0.55]}>
                <boxGeometry args={[0.62, 0.24, 0.9]} />
                <meshStandardMaterial
                  color="#facc15"
                  metalness={0.95}
                  roughness={0.15}
                  emissive="#eab308"
                  emissiveIntensity={0.6}
                />
              </mesh>
            </group>
          ))}
          {/* Crystal Chandelier Overhead */}
          <mesh position={[0, h - 1.4, 0]}>
            <octahedronGeometry args={[0.9, 1]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fde047"
              emissiveIntensity={2.4}
            />
          </mesh>
        </group>
      )}

      {/* === ARMORY SHOP INTERIOR === */}
      {kind === 'shop' && (
        <group position={[x, baseY, z]}>
          <mesh position={[doorSide === 'east' ? -2.2 : 2.2, 0.65, 0]} castShadow>
            <boxGeometry args={[1.4, 1.3, 8.2]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
          <mesh position={[doorSide === 'east' ? -7.5 : 7.5, 2.2, 0]}>
            <boxGeometry args={[0.4, 3.2, 11]} />
            <meshStandardMaterial
              color="#1e293b"
              emissive="#06b6d4"
              emissiveIntensity={0.55}
            />
          </mesh>
          {/* Display Rifles mounted on Rack */}
          {[-3.2, -1.0, 1.2, 3.4].map((rz, i) => (
            <mesh
              key={`rack-gun-${i}`}
              position={[doorSide === 'east' ? -7.1 : 7.1, 2.3, rz]}>
              <boxGeometry args={[0.18, 0.24, 1.35]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} />
            </mesh>
          ))}
        </group>
      )}

      {/* === MINIMART INTERIOR: Cashier, Drink Coolers (Tủ lạnh) & Stocked Shelves === */}
      {kind === 'minimart' && (
        <group position={[x, baseY, z]}>
          {/* Checkout Counter */}
          <mesh position={[doorSide === 'east' ? -4.8 : 4.8, 0.6, 0]}>
            <boxGeometry args={[1.4, 1.2, 5.5]} />
            <meshStandardMaterial color="#16a34a" roughness={0.5} />
          </mesh>
          {/* Glowing Beverage Coolers (Tủ lạnh siêu thị) along Back Wall */}
          <mesh position={[doorSide === 'east' ? -7.6 : 7.6, 1.5, -3.2]}>
            <boxGeometry args={[1.1, 2.8, 4.2]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={0.7}
            />
          </mesh>
          <mesh position={[doorSide === 'east' ? -7.6 : 7.6, 1.5, 3.2]}>
            <boxGeometry args={[1.1, 2.8, 4.2]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={0.7}
            />
          </mesh>
          {/* Product Aisles */}
          <mesh position={[0, 1.0, -4.0]}>
            <boxGeometry args={[7.5, 2.0, 1.2]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.0, 4.0]}>
            <boxGeometry args={[7.5, 2.0, 1.2]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* === GARAGE INTERIOR === */}
      {kind === 'garage' && (
        <group position={[x, baseY, z]}>
          <mesh position={[-6.5, 0.9, 4.5]}>
            <boxGeometry args={[1.4, 1.8, 3.2]} />
            <meshStandardMaterial color="#dc2626" metalness={0.5} />
          </mesh>
          <mesh position={[-3.2, 2.0, 1.5]}>
            <boxGeometry args={[0.35, 4.0, 0.35]} />
            <meshStandardMaterial color="#eab308" metalness={0.6} />
          </mesh>
          <mesh position={[3.2, 2.0, 1.5]}>
            <boxGeometry args={[0.35, 4.0, 0.35]} />
            <meshStandardMaterial color="#eab308" metalness={0.6} />
          </mesh>
        </group>
      )}

      {/* === FULL HOUSE & SKY APARTMENT FURNITURE (Bàn ghế, Giường, Tủ, Tivi, Tủ lạnh) === */}
      {isFurnishedHome && (
        <group position={[x, baseY, z]}>
          {/* 1. Double Bed with Headboard & Pillows (Giường ngủ) */}
          <group position={[4.5, 0, -5.2]}>
            <mesh position={[0, 0.32, 0]} castShadow>
              <boxGeometry args={[3.6, 0.64, 2.6]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.72, -1.15]}>
              <boxGeometry args={[3.7, 1.0, 0.25]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
            <mesh position={[-0.85, 0.7, -0.7]}>
              <boxGeometry args={[1.1, 0.22, 0.6]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.7} />
            </mesh>
            <mesh position={[0.85, 0.7, -0.7]}>
              <boxGeometry args={[1.1, 0.22, 0.6]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.7} />
            </mesh>
          </group>

          {/* 2. Tall Wooden Wardrobe Closet (Tủ quần áo) */}
          <group position={[-4.5, 0, -5.8]}>
            <mesh position={[0, 1.3, 0]} castShadow>
              <boxGeometry args={[2.6, 2.6, 1.0]} />
              <meshStandardMaterial color="#92400e" roughness={0.55} />
            </mesh>
            <mesh position={[-0.12, 1.3, 0.52]}>
              <boxGeometry args={[0.06, 0.6, 0.06]} />
              <meshStandardMaterial color="#facc15" metalness={0.9} />
            </mesh>
            <mesh position={[0.12, 1.3, 0.52]}>
              <boxGeometry args={[0.06, 0.6, 0.06]} />
              <meshStandardMaterial color="#facc15" metalness={0.9} />
            </mesh>
          </group>

          {/* 3. Large 2-Door Refrigerator (Tủ lạnh) & Kitchen Counter */}
          <group position={[-6.8, 0, 4.8]}>
            <mesh position={[0, 1.25, 0]} castShadow>
              <boxGeometry args={[1.4, 2.5, 1.2]} />
              <meshStandardMaterial
                color="#cbd5e1"
                metalness={0.72}
                roughness={0.22}
              />
            </mesh>
            <mesh position={[0.3, 1.3, 0.62]}>
              <boxGeometry args={[0.06, 1.1, 0.06]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[2.2, 0.55, 0]}>
              <boxGeometry args={[2.6, 1.1, 1.1]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
            </mesh>
          </group>

          {/* 4. Living Room Sofa, Coffee Table & Flat-Screen TV (Sofa, Bàn trà, Tivi) */}
          <group position={[0.6, 0, 4.2]}>
            {/* Sofa */}
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[4.4, 0.84, 1.6]} />
              <meshStandardMaterial color="#334155" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.95, 0.55]}>
              <boxGeometry args={[4.4, 0.75, 0.45]} />
              <meshStandardMaterial color="#1e293b" roughness={0.75} />
            </mesh>
            {/* Coffee Table */}
            <mesh position={[0, 0.35, -2.1]} castShadow>
              <boxGeometry args={[2.5, 0.45, 1.3]} />
              <meshStandardMaterial color="#78350f" roughness={0.45} />
            </mesh>
            {/* TV Stand & Glowing Flat-Screen TV */}
            <mesh position={[0, 0.42, -4.1]}>
              <boxGeometry args={[3.4, 0.8, 0.8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 1.75, -4.15]}>
              <boxGeometry args={[3.2, 1.65, 0.12]} />
              <meshStandardMaterial color="#09090b" roughness={0.2} />
            </mesh>
            <mesh position={[0, 1.75, -4.08]}>
              <boxGeometry args={[2.95, 1.45, 0.04]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0ea5e9"
                emissiveIntensity={1.1}
              />
            </mesh>
          </group>

          {/* 5. Dining Table + 4 Chairs (Bàn ăn & Ghế) */}
          <group position={[6.2, 0, 1.5]}>
            <mesh position={[0, 0.82, 0]} castShadow>
              <boxGeometry args={[2.4, 0.12, 1.6]} />
              <meshStandardMaterial color="#92400e" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {[
              [-1.4, 0],
              [1.4, 0],
              [0, -1.1],
              [0, 1.1],
            ].map(([cx, cz], ci) => (
              <mesh key={`chair-${ci}`} position={[cx, 0.45, cz]}>
                <boxGeometry args={[0.6, 0.9, 0.6]} />
                <meshStandardMaterial color="#d97706" roughness={0.65} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  );
}

function CityBuilding({
  def,
  textures,
  glassEmissiveRef,
  resEmissiveRef,
}: {
  def: BuildingDef;
  textures: ReturnType<typeof getCityTextures>;
  glassEmissiveRef?: React.Ref<THREE.MeshStandardMaterial>;
  resEmissiveRef?: React.Ref<THREE.MeshStandardMaterial>;
}) {
  const {
    x,
    z,
    w,
    d,
    h,
    style,
    archType = 'box',
    color,
    accentColor = '#38bdf8',
    hasBalconies,
    hasAwning,
    awningColor,
  } = def;
  const isGlass = style === 'glass';
  const isRes = style === 'residential';
  const isCom = style === 'commercial';

  const map = isGlass
    ? textures.glassTowerMap
    : isRes
      ? textures.residentialMap
      : isCom
        ? textures.commercialMap
        : textures.containerMap;

  const emissiveMap = isGlass
    ? textures.glassTowerEmissive
    : isRes
      ? textures.residentialEmissive
      : undefined;

  const facadeMatProps = {
    map,
    emissiveMap,
    emissive: emissiveMap ? '#ffffff' : '#000000',
    emissiveIntensity: emissiveMap ? 0.35 : 0,
    color: isGlass ? '#cbd5e1' : color,
    roughness: isGlass ? 0.16 : 0.78,
    metalness: isGlass ? 0.82 : 0.12,
  };

  return (
    <RigidBody type="fixed" colliders={false} position={[x, 0, z]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />

      {/* Podium Lobby Base */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.4, 3.0, d + 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.2} />
      </mesh>

      {archType === 'cylinder' ? (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[Math.min(w, d) * 0.46, Math.min(w, d) * 0.5, h, 14]} />
            <meshStandardMaterial
              ref={isGlass ? glassEmissiveRef : undefined}
              {...facadeMatProps}
            />
          </mesh>
          {[0.38, 0.72, 0.98].map((frac, ri) => (
            <mesh key={`cring-${ri}`} position={[0, h * frac, 0]}>
              <cylinderGeometry args={[Math.min(w, d) * 0.48, Math.min(w, d) * 0.48, 0.45, 14]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
            </mesh>
          ))}
          <mesh position={[0, h + 1.8, 0]}>
            <sphereGeometry args={[Math.min(w, d) * 0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ) : archType === 'twin' ? (
        <group>
          <mesh position={[-w * 0.27, h * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.4, h, d * 0.88]} />
            <meshStandardMaterial
              ref={isGlass ? glassEmissiveRef : undefined}
              {...facadeMatProps}
            />
          </mesh>
          <mesh position={[w * 0.27, h * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.4, h, d * 0.88]} />
            <meshStandardMaterial {...facadeMatProps} />
          </mesh>
          {/* Illuminated Skybridge */}
          <mesh position={[0, h * 0.62, 0]} castShadow>
            <boxGeometry args={[w * 0.28, 3.2, d * 0.42]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.95} metalness={0.7} />
          </mesh>
          {/* Twin Helipad & Crown Trim */}
          <mesh position={[-w * 0.27, h + 0.25, 0]}>
            <cylinderGeometry args={[3.2, 3.2, 0.3, 12]} />
            <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[w * 0.27, h + 2.2, 0]}>
            <cylinderGeometry args={[0.14, 0.28, 4.5, 6]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      ) : archType === 'stepped' ? (
        <group>
          <mesh position={[0, h * 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.48, d]} />
            <meshStandardMaterial
              ref={isGlass ? glassEmissiveRef : undefined}
              {...facadeMatProps}
            />
          </mesh>
          <mesh position={[0, h * 0.64, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.78, h * 0.32, d * 0.78]} />
            <meshStandardMaterial {...facadeMatProps} />
          </mesh>
          <mesh position={[0, h * 0.9, 0]} castShadow>
            <boxGeometry args={[w * 0.54, h * 0.2, d * 0.54]} />
            <meshStandardMaterial {...facadeMatProps} />
          </mesh>
          <mesh position={[0, h * 0.8, 0]}>
            <boxGeometry args={[w * 0.8, 0.45, d * 0.8]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.1} />
          </mesh>
          <mesh position={[0, h + 3.5, 0]}>
            <cylinderGeometry args={[0.16, 0.38, 7, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
          </mesh>
        </group>
      ) : archType === 'cantilever' ? (
        <group>
          <mesh position={[0, h * 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.76, h * 0.68, d * 0.86]} />
            <meshStandardMaterial
              ref={isGlass ? glassEmissiveRef : undefined}
              {...facadeMatProps}
            />
          </mesh>
          <mesh position={[w * 0.12, h * 0.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.98, h * 0.36, d * 0.94]} />
            <meshStandardMaterial {...facadeMatProps} />
          </mesh>
          <mesh position={[w * 0.12, h * 0.64, 0]}>
            <boxGeometry args={[w * 1.0, 0.45, d * 0.96]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.3} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              ref={isGlass ? glassEmissiveRef : isRes ? resEmissiveRef : undefined}
              {...facadeMatProps}
            />
          </mesh>
          {archType === 'spire' && (
            <group position={[0, h, 0]}>
              <mesh position={[0, 3.8, 0]} castShadow>
                <coneGeometry args={[Math.min(w, d) * 0.42, 7.6, 4]} />
                <meshStandardMaterial color={accentColor} metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[0, 10.5, 0]}>
                <cylinderGeometry args={[0.12, 0.32, 9, 8]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.85} />
              </mesh>
              <mesh position={[0, 15.2, 0]}>
                <sphereGeometry args={[0.42, 8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.6} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {archType === 'box' && h > 50 && (
        <group position={[0, h, 0]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <boxGeometry args={[w * 0.72, 7, d * 0.72]} />
            <meshStandardMaterial
              map={textures.glassTowerMap}
              color="#94a3b8"
              metalness={0.85}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0, 11, 0]}>
            <cylinderGeometry args={[0.14, 0.36, 8, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
          </mesh>
          <mesh position={[0, 15.2, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={2.5}
            />
          </mesh>
        </group>
      )}

      {h <= 32 && (
        <mesh position={[w * 0.2, h + 0.7, d * 0.15]} castShadow>
          <boxGeometry args={[w * 0.28, 1.4, d * 0.28]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
      )}

      {hasBalconies &&
        [0.35, 0.65].map((frac, bi) => (
          <mesh key={`bal-${bi}`} position={[0, h * frac, d / 2 + 0.55]} castShadow>
            <boxGeometry args={[w * 0.62, 0.32, 1.1]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
          </mesh>
        ))}

      {hasAwning && (
        <group position={[0, 3.2, d / 2 + 0.85]}>
          <mesh rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.78, 0.16, 1.8]} />
            <meshStandardMaterial
              color={awningColor || '#dc2626'}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.9, -0.6]}>
            <boxGeometry args={[w * 0.55, 0.7, 0.2]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive={awningColor || '#f59e0b'}
              emissiveIntensity={1.4}
            />
          </mesh>
        </group>
      )}
    </RigidBody>
  );
}

function UrbanPark({
  pos,
  w,
  d,
  kind,
  setWaterRingRef,
}: {
  pos: [number, number, number];
  w: number;
  d: number;
  kind: 'fountain' | 'sports' | 'zen' | 'botanical' | 'coastal';
  setWaterRingRef?: (el: THREE.Mesh | null) => void;
}) {
  return (
    <group position={pos}>
      {/* Lush Green Park Turf */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={kind === 'coastal' ? '#eab308' : kind === 'zen' ? '#2c6b3b' : '#2f6f31'}
          roughness={0.94}
        />
      </mesh>
      {kind === 'coastal' && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w * 0.82, d * 0.72]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.4} />
        </mesh>
      )}

      {/* Walkways */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.8, d]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, 3.8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {kind === 'fountain' && (
        <>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <cylinderGeometry args={[6.0, 6.4, 0.3, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[4.1, 4.3, 0.55, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[3.6, 3.6, 0.15, 16]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.55} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.75, 1.8, 10]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh ref={setWaterRingRef} position={[0, 2.55, 0]}>
            <coneGeometry args={[1.4, 0.85, 12]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.75} roughness={0.15} />
          </mesh>
        </>
      )}

      {kind === 'sports' && (
        <group>
          {/* Painted Streetball / Sports Court */}
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[Math.min(w * 0.6, 22), Math.min(d * 0.55, 14)]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.75} />
          </mesh>
          {[-Math.min(w * 0.26, 9.5), Math.min(w * 0.26, 9.5)].map((hx, hi) => (
            <group key={`hoop-${hi}`} position={[hx, 0, 0]}>
              <mesh position={[0, 1.8, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.14, 3.6, 8]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.7} />
              </mesh>
              <mesh position={[hx < 0 ? 0.5 : -0.5, 3.3, 0]}>
                <boxGeometry args={[0.12, 1.1, 1.6]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {kind === 'zen' && (
        <group>
          {/* Koi Pond + Arched Red Bridge */}
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[Math.min(w, d) * 0.24, 18]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.65} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[8.5, 0.35, 2.4]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>
          {[-4.8, 4.8].map((lx, li) => (
            <mesh key={`lan-${li}`} position={[lx, 0.9, 4.2]}>
              <boxGeometry args={[0.7, 1.8, 0.7]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          ))}
        </group>
      )}

      {kind === 'botanical' && (
        <group>
          {/* Central Monument Obelisk + Colorful Flower Beds */}
          <mesh position={[0, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.45, 1.0, 4.8, 4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
          </mesh>
          {[
            [-5.5, -4.5, '#f43f5e'],
            [5.5, -4.5, '#facc15'],
            [-5.5, 4.5, '#a855f7'],
            [5.5, 4.5, '#fb923c'],
          ].map(([fx, fz, fc], fi) => (
            <mesh key={`flw-${fi}`} position={[fx as number, 0.16, fz as number]}>
              <boxGeometry args={[4.2, 0.26, 2.8]} />
              <meshStandardMaterial color={fc as string} roughness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {kind === 'coastal' && (
        <group>
          {/* Volleyball Net + Beachside Loungers */}
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.15, 1.2, 9.5]} />
            <meshStandardMaterial color="#f8fafc" transparent opacity={0.7} />
          </mesh>
          {[-6.5, 6.5].map((vx, vi) => (
            <mesh key={`vl-${vi}`} position={[vx, 0.2, 5.5]}>
              <boxGeometry args={[2.4, 0.35, 1.1]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          ))}
        </group>
      )}

      {/* Park Benches */}
      {[
        [-Math.min(w * 0.25, 8.5), -Math.min(d * 0.25, 8.5), Math.PI / 4],
        [Math.min(w * 0.25, 8.5), -Math.min(d * 0.25, 8.5), -Math.PI / 4],
      ].map(([bx, bz, brot], i) => (
        <group key={`bench-${i}`} position={[bx, 0, bz]} rotation={[0, brot, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[2.2, 0.14, 0.7]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.78, -0.28]}>
            <boxGeometry args={[2.2, 0.52, 0.12]} />
            <meshStandardMaterial color="#92400e" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Corner Gazebo */}
      {d >= 34 && (
        <group position={[w * 0.28, 0, -d * 0.26]}>
          {[
            [-1.8, -1.8],
            [1.8, -1.8],
            [-1.8, 1.8],
            [1.8, 1.8],
          ].map(([gx, gz], gi) => (
            <mesh key={`gz-${gi}`} position={[gx, 1.5, gz]} castShadow>
              <cylinderGeometry args={[0.13, 0.15, 3.0, 8]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          ))}
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[3.5, 1.5, 4]} />
            <meshStandardMaterial color="#b45309" roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ParkedJet({
  pos,
  rotY,
  color,
  accent,
}: {
  pos: [number, number, number];
  rotY: number;
  color: string;
  accent: string;
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={pos} rotation={[0, rotY, 0]}>
      {/* Fuselage */}
      <mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.35, 16, 12]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Nose Cone */}
      <mesh position={[0, 2.2, -9.2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[1.35, 2.6, 12]} />
        <meshStandardMaterial color={accent} roughness={0.35} />
      </mesh>
      {/* Cockpit Windshield */}
      <mesh position={[0, 2.65, -7.4]}>
        <boxGeometry args={[1.6, 0.6, 1.6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.12} />
      </mesh>
      {/* Main Wings */}
      <mesh position={[0, 1.8, -0.5]} castShadow>
        <boxGeometry args={[19, 0.25, 3.4]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Twin Jet Engines */}
      {[-4.2, 4.2].map((ex, i) => (
        <mesh key={`eng-${i}`} position={[ex, 1.2, -1.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.56, 2.4, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
      ))}
      {/* Tail Fin */}
      <mesh position={[0, 4.4, 6.6]} castShadow>
        <boxGeometry args={[0.28, 3.6, 2.8]} />
        <meshStandardMaterial color={accent} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 6.8]}>
        <boxGeometry args={[6.4, 0.2, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

function BillboardSign({
  pos,
  rotY,
  color,
}: {
  pos: [number, number, number];
  rotY: number;
  color: string;
}) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 9, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.75} />
      </mesh>
      <mesh position={[0, 8.8, 0]} castShadow>
        <boxGeometry args={[9.5, 4.2, 0.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 8.8, 0.3]}>
        <boxGeometry args={[8.8, 3.5, 0.08]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.45}
        />
      </mesh>
    </group>
  );
}

function RacetrackComplex({
  textures,
}: {
  textures: ReturnType<typeof getCityTextures>;
}) {
  // Build pure visual closed-loop ribbon geometries (NO trimesh colliders!)
  const {trackGeo, innerCurbGeo, outerCurbGeo} = useMemo(() => {
    const n = RACETRACK_SAMPLES.length;
    const buildRibbon = (innerOffset: number, outerOffset: number, y: number) => {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= n; i++) {
        const s = RACETRACK_SAMPLES[i % n];
        const ix = s.x + s.nx * innerOffset;
        const iz = s.z + s.nz * innerOffset;
        const ox = s.x + s.nx * outerOffset;
        const oz = s.z + s.nz * outerOffset;
        positions.push(ix, y, iz, ox, y, oz);
        const vCoord = (i / n) * 24;
        uvs.push(0, vCoord, 1, vCoord);
        if (i < n) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    return {
      trackGeo: buildRibbon(-RACETRACK_HALF_W, RACETRACK_HALF_W, 0.03),
      innerCurbGeo: buildRibbon(-RACETRACK_HALF_W - 0.85, -RACETRACK_HALF_W, 0.045),
      outerCurbGeo: buildRibbon(RACETRACK_HALF_W, RACETRACK_HALF_W + 0.85, 0.045),
    };
  }, []);

  const curbTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 64, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      {/* Infield Lush Motorsport Turf */}
      <mesh position={[754, 0.005, -201]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[286, 86]} />
        <meshStandardMaterial color="#346830" roughness={0.95} />
      </mesh>

      {/* Pure Visual Asphalt Racing Ribbon (Flat East CuboidCollider serves as physics surface!) */}
      <mesh geometry={trackGeo} receiveShadow>
        <meshStandardMaterial
          map={textures.asphaltMap}
          roughnessMap={textures.asphaltRoughness}
          color="#1e222b"
          roughness={0.62}
          metalness={0.12}
        />
      </mesh>
      <mesh geometry={innerCurbGeo} receiveShadow>
        <meshStandardMaterial map={curbTex} roughness={0.7} />
      </mesh>
      <mesh geometry={outerCurbGeo} receiveShadow>
        <meshStandardMaterial map={curbTex} roughness={0.7} />
      </mesh>

      {/* Paddock Entry Apron connecting Highway Z=-140 to Track */}
      <mesh position={[708, 0.02, -153]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[34, 24]} />
        <meshStandardMaterial color="#334155" roughness={0.82} />
      </mesh>

      {/* Paddock Race Trigger Beacon Ring */}
      <group position={RACETRACK_PADDOCK_POS}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.6, 28]} />
          <meshBasicMaterial color="#f97316" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 5.6, 16, 1, true]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Start / Finish Checkerboard Line & Overhead GP Gantry (X = 735, Z = -168) */}
      <group position={[735, 0, -168]}>
        <mesh position={[0, 0.048, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, RACETRACK_HALF_W * 2 - 0.6]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        {[-6.4, -3.2, 0, 3.2, 6.4].map((cz, ci) => (
          <mesh
            key={`chk-${ci}`}
            position={[0.85 * (ci % 2 === 0 ? 1 : -1), 0.052, cz]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 3.0]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} />
          </mesh>
        ))}
        {/* Gantry Pillars */}
        <mesh position={[0, 3.5, -RACETRACK_HALF_W - 0.8]} castShadow>
          <boxGeometry args={[0.8, 7.0, 0.8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} />
        </mesh>
        <mesh position={[0, 3.5, RACETRACK_HALF_W + 0.8]} castShadow>
          <boxGeometry args={[0.8, 7.0, 0.8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} />
        </mesh>
        {/* Gantry Banner Beam */}
        <mesh position={[0, 6.6, 0]} castShadow>
          <boxGeometry args={[1.4, 1.6, RACETRACK_HALF_W * 2 + 2.4]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-0.75, 6.6, 0]}>
          <boxGeometry args={[0.1, 1.1, RACETRACK_HALF_W * 1.6]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#f97316"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>

      {/* Pit Lane Garages & Race Control Tower in Infield */}
      <RigidBody type="fixed" colliders="cuboid" position={[742, 0, -190]}>
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[34, 4.4, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[35, 0.5, 9]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
        <mesh position={[12, 7.5, 0]} castShadow>
          <boxGeometry args={[6, 6.5, 6]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.75}
            roughness={0.18}
          />
        </mesh>
      </RigidBody>

      {/* North Covered Spectator Grandstand */}
      <RigidBody type="fixed" colliders="cuboid" position={[740, 0, -249]}>
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[68, 2.8, 7.5]} />
          <meshStandardMaterial color="#475569" roughness={0.75} />
        </mesh>
        <mesh position={[0, 3.2, -1.2]} castShadow>
          <boxGeometry args={[68, 1.8, 4.8]} />
          <meshStandardMaterial color="#334155" roughness={0.75} />
        </mesh>
        <mesh position={[0, 5.6, -1.2]} rotation={[0.16, 0, 0]} castShadow>
          <boxGeometry args={[70, 0.4, 8.2]} />
          <meshStandardMaterial color="#ef4444" roughness={0.45} />
        </mesh>
      </RigidBody>

      {/* South-East Spectator Grandstand */}
      <RigidBody type="fixed" colliders="cuboid" position={[815, 0, -153]}>
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[56, 2.8, 6.8]} />
          <meshStandardMaterial color="#475569" roughness={0.75} />
        </mesh>
        <mesh position={[0, 3.2, 1.0]} castShadow>
          <boxGeometry args={[56, 1.8, 4.2]} />
          <meshStandardMaterial color="#334155" roughness={0.75} />
        </mesh>
        <mesh position={[0, 5.5, 1.0]} rotation={[-0.16, 0, 0]} castShadow>
          <boxGeometry args={[58, 0.4, 7.4]} />
          <meshStandardMaterial color="#0284c7" roughness={0.45} />
        </mesh>
      </RigidBody>

      {/* Outer & Inner Track Safety Barriers (with CuboidColliders) */}
      <RigidBody type="fixed" colliders={false} name="racetrack_barriers">
        {RACETRACK_BARRIER_SEGMENTS.map((seg, i) => (
          <React.Fragment key={`rb-${i}`}>
            <CuboidCollider
              args={[seg.w * 0.5, 0.65, seg.d * 0.5]}
              position={[seg.x, 0.65, seg.z]}
              rotation={[0, seg.rotY, 0]}
            />
            <mesh
              position={[seg.x, 0.55, seg.z]}
              rotation={[0, seg.rotY, 0]}
              castShadow
              receiveShadow>
              <boxGeometry args={[seg.w, 1.1, seg.d]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#e2e8f0' : '#ef4444'}
                roughness={0.65}
              />
            </mesh>
          </React.Fragment>
        ))}
      </RigidBody>
    </group>
  );
}
