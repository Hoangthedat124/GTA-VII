import {useFrame, useThree} from '@react-three/fiber';
import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import React, {useRef, useState} from 'react';
import * as THREE from 'three';
import {HumanoidCharacter} from '../components/HumanoidCharacter';
import {getConfig} from '../constants';
import {InputSnapshot} from '../input';
import {HubTab, WeaponId, WeatherType} from '../types';
import {gameAudio, isBodyAlive, toVec3} from '../utils';
import {
  ProjectileTrace,
  SharedWorldState,
  SparkParticle,
} from './WorldSim';
import {
  BANK_ATM_SPOTS,
  ENTERABLE_BUILDINGS,
  GARAGE_POS,
  getAllCollisionBoxes,
  getBridgeSurfaceY,
  HOUSES,
  intersectSegmentWithWalls,
  MISSIONS,
  RACETRACK_PADDOCK_POS,
  RIVER_MAX_X,
  RIVER_MIN_X,
  ROBBERY_SPOTS,
  SHOP_SPOTS,
  SIDE_MISSIONS,
  TOTAL_RACE_LAPS,
  VEHICLE_SPECS,
  WEAPONS,
  WEAPON_ORDER,
} from './worldData';

export interface WeaponRuntimeState {
  weaponId: WeaponId;
  ammo: Record<WeaponId, number>;
  reserve: Record<WeaponId, number>;
  reloading: boolean;
  reloadTimer: number;
  reloadDuration: number;
  fireCooldown: number;
  isAiming: boolean;
  crosshairSpread: number;
}

interface PlayerRigProps {
  inputRef: React.MutableRefObject<InputSnapshot>;
  enabled: boolean;
  worldRef: React.MutableRefObject<SharedWorldState>;
  playerBodyRef: React.MutableRefObject<RapierRigidBody | null>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  playerRotRef: React.MutableRefObject<number>;
  vehicleBodiesRef: React.MutableRefObject<
    Record<string, RapierRigidBody | null>
  >;
  vehicleGroupRefs: React.MutableRefObject<Record<string, THREE.Group | null>>;
  projectilesRef: React.MutableRefObject<ProjectileTrace[]>;
  particlesRef: React.MutableRefObject<SparkParticle[]>;
  weaponStateRef: React.MutableRefObject<WeaponRuntimeState>;
  cameraModeRef: React.MutableRefObject<'third' | 'first'>;
  cameraDistRef: React.MutableRefObject<number>;
  externalShakeRef: React.MutableRefObject<number>;
  weather: WeatherType;
  nearbyPromptRef: React.MutableRefObject<string | null>;
  onHitMarker: () => void;
  onStartMission: (missionId: number) => void;
  onStartSideMission: (sideId: string) => void;
  onStartRobbery: (spotId: string) => void;
  onStartRace: () => void;
  onOpenHub: (tab: HubTab) => void;
  onShowToast: (msg: string) => void;
}

const moveDir = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const camLookAt = new THREE.Vector3();
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const aimTarget = new THREE.Vector3();
const muzzleOrigin = new THREE.Vector3();
const shotVec = new THREE.Vector3();
const rayDir = new THREE.Vector3();

const JOYSTICK_DEADZONE = 0.06;
const MOVE_EPSILON_SQ = 1e-4;
const PLAYER_TURN_RATE = 10.5;
const PLAYER_SPAWN: [number, number, number] = [0, 0.1, 4];
const ZOOM_PRESETS = [4.5, 8.5, 14.5, 23.0];

function clampCameraAgainstBuildings(
  focus: THREE.Vector3,
  desired: THREE.Vector3,
): void {
  rayDir.subVectors(desired, focus);
  const fullDist = rayDir.length();
  if (fullDist < 0.5) return;

  // Exact continuous ray-AABB slab intersection so camera pullback never snaps or stutters
  const hit = intersectSegmentWithWalls(
    focus.x,
    focus.y,
    focus.z,
    desired.x,
    desired.y,
    desired.z,
    0.35,
  );
  if (hit) {
    const clampedT = Math.max(1.2 / fullDist, hit.t - 0.35 / fullDist);
    desired.copy(focus).addScaledVector(rayDir, Math.min(1, clampedT));
  }
  desired.y = Math.max(0.65, desired.y);
}

function isInsideEnterableBuilding(x: number, y: number, z: number): boolean {
  for (let i = 0; i < ENTERABLE_BUILDINGS.length; i++) {
    const eb = ENTERABLE_BUILDINGS[i];
    const by = eb.baseY ?? 0;
    if (
      y >= by - 0.5 &&
      y <= by + eb.h + 0.5 &&
      Math.abs(x - eb.x) < eb.w / 2 - 0.4 &&
      Math.abs(z - eb.z) < eb.d / 2 - 0.4
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the exact 3D point along the camera center crosshair ray so 3rd-person
 * over-the-shoulder shots hit dead-center at any distance (zero parallax).
 */
function findCrosshairAimPoint(
  camPos: THREE.Vector3,
  dir: THREE.Vector3,
  maxRange: number,
  world: SharedWorldState,
  outPoint: THREE.Vector3,
): void {
  // 1. Exact continuous 3D ray-AABB intersection against all walls/buildings FIRST
  const wallHit = intersectSegmentWithWalls(
    camPos.x,
    camPos.y,
    camPos.z,
    camPos.x + dir.x * maxRange,
    camPos.y + dir.y * maxRange,
    camPos.z + dir.z * maxRange,
    0.02,
  );
  let bestT = wallHit ? wallHit.t * maxRange : maxRange;

  // 2. Check ground intersection (y = 0.2) if looking downward
  if (dir.y < -0.02) {
    const tGround = (0.2 - camPos.y) / dir.y;
    if (tGround > 2 && tGround < bestT) {
      bestT = tGround;
    }
  }

  // 3. Check NPCs strictly in front of any intervening wall
  for (let i = 0; i < world.npcs.length; i++) {
    const npc = world.npcs[i];
    if (npc.dead) continue;
    const tx = npc.x - camPos.x;
    const ty = npc.y + 1.15 - camPos.y;
    const tz = npc.z - camPos.z;
    const proj = tx * dir.x + ty * dir.y + tz * dir.z;
    if (proj < 1.5 || proj > bestT) continue;
    const cx = camPos.x + dir.x * proj - npc.x;
    const cy = camPos.y + dir.y * proj - (npc.y + 1.15);
    const cz = camPos.z + dir.z * proj - npc.z;
    if (cx * cx + cz * cz < 0.72 && Math.abs(cy) < 1.05) {
      bestT = proj;
    }
  }

  // 4. Check non-player vehicles strictly in front of any intervening wall
  for (let i = 0; i < world.vehicles.length; i++) {
    const veh = world.vehicles[i];
    if (veh.occupiedByPlayer) continue;
    const tx = veh.x - camPos.x;
    const ty = veh.y + 0.9 - camPos.y;
    const tz = veh.z - camPos.z;
    const proj = tx * dir.x + ty * dir.y + tz * dir.z;
    if (proj < 2.0 || proj > bestT) continue;
    const cx = camPos.x + dir.x * proj - veh.x;
    const cy = camPos.y + dir.y * proj - (veh.y + 0.9);
    const cz = camPos.z + dir.z * proj - veh.z;
    if (cx * cx + cz * cz < 3.6 && Math.abs(cy) < 1.3) {
      bestT = proj;
    }
  }

  outPoint.copy(camPos).addScaledVector(dir, bestT);
}

export const PlayerAndCamera = React.memo(function PlayerAndCamera({
  inputRef,
  enabled,
  worldRef,
  playerBodyRef,
  playerPosRef,
  playerRotRef,
  vehicleBodiesRef,
  vehicleGroupRefs,
  projectilesRef,
  particlesRef,
  weaponStateRef,
  cameraModeRef,
  cameraDistRef,
  externalShakeRef,
  weather,
  nearbyPromptRef,
  onHitMarker,
  onStartMission,
  onStartSideMission,
  onStartRobbery,
  onStartRace,
  onOpenHub,
  onShowToast,
}: PlayerRigProps): React.ReactElement {
  const bodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const {camera} = useThree();

  const [animState, setAnimState] = useState<'idle' | 'walk' | 'run' | 'action'>(
    'idle',
  );
  const [inVehicle, setInVehicle] = useState(false);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [activeWeapon, setActiveWeapon] = useState<WeaponId>('pistol');

  const camOrbit = useRef({
    yaw: 0,
    pitch: 0.32,
    dist: 8.5,
  });

  const prevInteractRef = useRef(false);
  const prevCamToggleRef = useRef(false);
  const prevZoomCycleRef = useRef(false);
  const prevHornRef = useRef(false);
  const prevReloadRef = useRef(false);
  const prevFireRef = useRef(false);
  const footstepTimerRef = useRef(0);
  const engineAudioTimerRef = useRef(0);
  const tankCooldownRef = useRef(0);
  const shakeRef = useRef(0);
  const muzzleFlashTimerRef = useRef(0);
  const manualLookCooldownRef = useRef(0);
  const smoothedFocusRef = useRef(new THREE.Vector3(0, 1.4, 4));
  const smoothInitializedRef = useRef(false);

  const beginReload = () => {
    const ws = weaponStateRef.current;
    const wSpec = WEAPONS[ws.weaponId];
    if (wSpec.magSize <= 0 || ws.reloading) return;
    if (ws.ammo[ws.weaponId] >= wSpec.magSize) return;
    if (ws.reserve[ws.weaponId] <= 0 && ws.weaponId !== 'pistol') {
      gameAudio.playErrorBuzz();
      onShowToast('Hết đạn dự trữ! Mua thêm tại Cửa Hàng [B] hoặc nhặt hòm đạn.');
      return;
    }
    ws.reloading = true;
    ws.reloadDuration = wSpec.reloadSec;
    ws.reloadTimer = wSpec.reloadSec;
    gameAudio.playCrispClick();
  };

  useFrame((_, delta) => {
    const body = bodyRef.current;
    playerBodyRef.current = body;
    const group = groupRef.current;
    if (!body || !group || !isBodyAlive(body)) return;

    const dt = Math.min(delta, 0.1);
    const snap = inputRef.current;
    const w = worldRef.current;
    const actions = snap.actions;
    const analog = snap.analogMove;

    if (externalShakeRef.current > 0) {
      shakeRef.current = Math.max(shakeRef.current, externalShakeRef.current);
      externalShakeRef.current = 0;
    }

    manualLookCooldownRef.current = Math.max(
      0,
      manualLookCooldownRef.current - dt,
    );
    tankCooldownRef.current = Math.max(0, tankCooldownRef.current - dt);

    if (muzzleFlashTimerRef.current > 0) {
      muzzleFlashTimerRef.current = Math.max(0, muzzleFlashTimerRef.current - dt);
    }
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = muzzleFlashTimerRef.current > 0;
    }

    const shiftLockActive = Boolean(snap?.pointerLocked);

    // 1. Camera Orbit & Smooth Zoom (incl. Roblox Shift-Lock Edge Turn Fallback)
    if (enabled && snap) {
      const sensMul = weaponStateRef.current.isAiming ? 0.65 : 1.0;
      if (snap.lookDeltaX !== 0 || snap.lookDeltaY !== 0) {
        camOrbit.current.yaw -= snap.lookDeltaX * 0.0052 * sensMul;
        camOrbit.current.pitch = THREE.MathUtils.clamp(
          camOrbit.current.pitch + snap.lookDeltaY * 0.0042 * sensMul,
          -0.32,
          1.22,
        );
        snap.lookDeltaX = 0;
        snap.lookDeltaY = 0;
        manualLookCooldownRef.current = 1.8;
      }
      if (shiftLockActive && snap.edgeTurnRate !== 0) {
        camOrbit.current.yaw += snap.edgeTurnRate * dt;
        manualLookCooldownRef.current = 1.8;
      }
      if (snap.zoomDelta !== 0) {
        cameraDistRef.current = THREE.MathUtils.clamp(
          cameraDistRef.current + snap.zoomDelta * 1.15,
          2.6,
          28.0,
        );
        snap.zoomDelta = 0;
      }
      const zoomCyclePressed = Boolean(snap.zoomCycle);
      if (zoomCyclePressed && !prevZoomCycleRef.current) {
        const cur = cameraDistRef.current;
        const nextPreset =
          ZOOM_PRESETS.find((p) => p > cur + 1.0) ?? ZOOM_PRESETS[0];
        cameraDistRef.current = nextPreset;
        gameAudio.playCrispClick();
        onShowToast(
          `Tầm nhìn camera: ${nextPreset < 6 ? 'Rất gần' : nextPreset < 11 ? 'Tiêu chuẩn' : nextPreset < 18 ? 'Xa' : 'Toàn cảnh'}`,
        );
      }
      prevZoomCycleRef.current = zoomCyclePressed;
    }

    camOrbit.current.dist = THREE.MathUtils.lerp(
      camOrbit.current.dist,
      cameraDistRef.current,
      1 - Math.exp(-12 * dt),
    );

    // 2. Toggle 1st/3rd Person Camera (C)
    const camToggle = Boolean(snap?.cameraToggle);
    if (enabled && camToggle && !prevCamToggleRef.current) {
      const next = cameraModeRef.current === 'third' ? 'first' : 'third';
      cameraModeRef.current = next;
      setIsFirstPerson(next === 'first');
      gameAudio.playCrispClick();
    }
    prevCamToggleRef.current = camToggle;

    // 3. Weapon Slot, Aiming & Reload
    if (
      enabled &&
      snap?.weaponSlot !== null &&
      snap?.weaponSlot !== undefined
    ) {
      const nextW = WEAPON_ORDER[snap.weaponSlot];
      if (nextW && nextW !== weaponStateRef.current.weaponId) {
        weaponStateRef.current.weaponId = nextW;
        weaponStateRef.current.reloading = false;
        setActiveWeapon(nextW);
        gameAudio.playCrispClick();
      }
      snap.weaponSlot = null;
    } else if (weaponStateRef.current.weaponId !== activeWeapon) {
      setActiveWeapon(weaponStateRef.current.weaponId);
    }

    const ws = weaponStateRef.current;
    const wSpec = WEAPONS[ws.weaponId];
    ws.fireCooldown = Math.max(0, ws.fireCooldown - dt);
    ws.crosshairSpread = Math.max(0, ws.crosshairSpread - 18 * dt);

    if (ws.reloading) {
      ws.reloadTimer -= dt;
      if (ws.reloadTimer <= 0) {
        ws.reloading = false;
        const needed = wSpec.magSize - ws.ammo[ws.weaponId];
        if (ws.weaponId === 'pistol' && ws.reserve.pistol <= 0) {
          ws.ammo.pistol = wSpec.magSize;
        } else {
          const take = Math.min(needed, ws.reserve[ws.weaponId]);
          ws.ammo[ws.weaponId] += take;
          ws.reserve[ws.weaponId] -= take;
        }
        gameAudio.playConfirmSelect();
      }
    }

    const reloadPressed = Boolean(snap?.reload);
    if (enabled && reloadPressed && !prevReloadRef.current) {
      beginReload();
    }
    prevReloadRef.current = reloadPressed;

    // 4. Nearby Landmarks & Vehicles
    let nearestVehIdx = -1;
    let nearestVehDist = 4.8;
    if (!w.inVehicleId) {
      for (let i = 0; i < w.vehicles.length; i++) {
        const veh = w.vehicles[i];
        const d = Math.hypot(
          veh.x - playerPosRef.current.x,
          veh.z - playerPosRef.current.z,
        );
        if (d < nearestVehDist) {
          nearestVehDist = d;
          nearestVehIdx = i;
        }
      }
    }

    const px = playerPosRef.current.x;
    const py = playerPosRef.current.y;
    const pz = playerPosRef.current.z;
    const noActiveQuest =
      w.activeMissionId === null && w.activeSideMissionId === null;

    const nextMission = noActiveQuest
      ? MISSIONS.find((m) => !w.completedMissions.includes(m.id))
      : null;
    const nearMission =
      nextMission &&
      Math.hypot(nextMission.startPos[0] - px, nextMission.startPos[2] - pz) <
        4.5;

    let nearSideMission = null as (typeof SIDE_MISSIONS)[number] | null;
    if (noActiveQuest && !w.inVehicleId) {
      for (const sm of SIDE_MISSIONS) {
        if (Math.hypot(sm.startPos[0] - px, sm.startPos[2] - pz) < 4.5) {
          nearSideMission = sm;
          break;
        }
      }
    }

    let nearRobbery = null as (typeof ROBBERY_SPOTS)[number] | null;
    if (!w.inVehicleId && !w.robberyActiveId) {
      for (const spot of ROBBERY_SPOTS) {
        if (Math.hypot(spot.triggerPos[0] - px, spot.triggerPos[2] - pz) < 4.8) {
          nearRobbery = spot;
          break;
        }
      }
    }

    const nearShop =
      !w.inVehicleId &&
      py < 4 &&
      SHOP_SPOTS.some((sp) => Math.hypot(sp[0] - px, sp[2] - pz) < 4.8);
    const nearBankAtm =
      !w.inVehicleId &&
      py < 4 &&
      BANK_ATM_SPOTS.some((atm) => Math.hypot(atm[0] - px, atm[2] - pz) < 4.4);
    const nearGarage =
      !w.inVehicleId &&
      py < 4 &&
      Math.hypot(GARAGE_POS[0] - px, GARAGE_POS[2] - pz) < 5.5;
    const nearRacePaddock =
      !w.race.active &&
      py < 4 &&
      Math.hypot(RACETRACK_PADDOCK_POS[0] - px, RACETRACK_PADDOCK_POS[2] - pz) <
        5.8;

    const nearLobbyElevator = !w.inVehicleId
      ? HOUSES.find(
          (h) =>
            h.isHighRise &&
            h.lobbyElevatorPos &&
            py < 4 &&
            Math.hypot(
              h.lobbyElevatorPos[0] - px,
              h.lobbyElevatorPos[2] - pz,
            ) < 4.5,
        )
      : undefined;

    const nearAptElevator = !w.inVehicleId
      ? HOUSES.find(
          (h) =>
            h.isHighRise &&
            h.apartmentElevatorPos &&
            Math.abs(h.apartmentElevatorPos[1] - py) < 4 &&
            Math.hypot(
              h.apartmentElevatorPos[0] - px,
              h.apartmentElevatorPos[2] - pz,
            ) < 4.2,
        )
      : undefined;

    const nearHouse = !w.inVehicleId
      ? HOUSES.find((h) => {
          if (h.isHighRise) return false;
          const triggerX = h.id === 'house-neo' ? 426 : h.pos[0] + 4.2;
          return py < 4 && Math.hypot(triggerX - px, h.pos[2] - pz) < 5.0;
        })
      : undefined;

    if (nearRacePaddock) {
      nearbyPromptRef.current = `[E] Tham gia Giải Đua Port Aurelia GP (${TOTAL_RACE_LAPS} Vòng · 5 Đối Thủ AI)`;
    } else if (w.inVehicleId) {
      const curVeh = w.vehicles.find((vv) => vv.id === w.inVehicleId);
      nearbyPromptRef.current =
        curVeh?.kind === 'tank'
          ? '[Click / F] Bắn pháo 120mm · [E] Xuống xe tăng · [V/Cuộn] Zoom'
          : '[E] Xuống xe · [H] Còi · [Space] Phanh tay · [V/Cuộn] Zoom';
    } else if (nearAptElevator) {
      nearbyPromptRef.current = `[E] Thang máy xuống Sảnh · [B] Nghỉ ngơi tại ${nearAptElevator.name}`;
    } else if (nearLobbyElevator) {
      const owned = w.ownedHouses.includes(nearLobbyElevator.id);
      nearbyPromptRef.current = owned
        ? `[E] Đi thang máy lên ${nearLobbyElevator.name}`
        : `[E] Mua & Tham quan ${nearLobbyElevator.name} ($${nearLobbyElevator.price.toLocaleString('en-US')})`;
    } else if (nearBankAtm) {
      nearbyPromptRef.current = '[E] Giao dịch Ngân Hàng (Gửi / Rút tiền)';
    } else if (nearShop) {
      nearbyPromptRef.current = '[E] Vào Cửa Hàng Vũ Khí & Xe';
    } else if (nearGarage) {
      nearbyPromptRef.current = '[E] Mở Gara Cá Nhân & Độ Sơn Xe';
    } else if (nearHouse) {
      nearbyPromptRef.current = `[E] ${nearHouse.name} (Nhà ở & Nghỉ ngơi)`;
    } else if (nearRobbery) {
      const cd = Math.ceil(w.robberyCooldowns[nearRobbery.id] ?? 0);
      nearbyPromptRef.current =
        cd > 0
          ? `${nearRobbery.name} đang đóng băng an ninh (${cd}s)`
          : `[E] Cướp ${nearRobbery.name} (+$${nearRobbery.rewardMoney.toLocaleString('en-US')})`;
    } else if (nearMission && nextMission) {
      nearbyPromptRef.current = `[E] Nhiệm vụ chính: ${nextMission.title}`;
    } else if (nearSideMission) {
      nearbyPromptRef.current = `[E] Nhiệm vụ phụ: ${nearSideMission.title} (+$${nearSideMission.rewardMoney})`;
    } else if (nearestVehIdx !== -1) {
      const spec = VEHICLE_SPECS[w.vehicles[nearestVehIdx].kind];
      nearbyPromptRef.current = `[E] Lên ${spec.name}`;
    } else {
      nearbyPromptRef.current = null;
    }

    // 5. Interact (E)
    const interactPressed = Boolean(snap?.interact);
    if (enabled && interactPressed && !prevInteractRef.current) {
      if (nearRacePaddock) {
        onStartRace();
        gameAudio.playConfirmSelect();
      } else if (w.inVehicleId) {
        const veh = w.vehicles.find((vv) => vv.id === w.inVehicleId);
        if (veh) {
          veh.occupiedByPlayer = false;
          veh.braking = false;
          const exitOffset = veh.kind === 'tank' ? 3.1 : 2.2;
          const exitX = veh.x - Math.cos(veh.rotY) * exitOffset;
          const exitZ = veh.z + Math.sin(veh.rotY) * exitOffset;
          const deckY = getBridgeSurfaceY(exitX, exitZ);
          body.setGravityScale(1, true);
          body.setTranslation({x: exitX, y: deckY + 0.25, z: exitZ}, true);
          body.setLinvel({x: 0, y: 0, z: 0}, true);
          playerPosRef.current.set(exitX, deckY + 0.25, exitZ);
        }
        w.inVehicleId = null;
        setInVehicle(false);
        gameAudio.playConfirmSelect();
      } else if (nearAptElevator && nearAptElevator.lobbyElevatorPos) {
        const [lx, ly, lz] = nearAptElevator.lobbyElevatorPos;
        body.setTranslation({x: lx, y: ly + 0.25, z: lz}, true);
        body.setLinvel({x: 0, y: 0, z: 0}, true);
        playerPosRef.current.set(lx, ly + 0.25, lz);
        gameAudio.playConfirmSelect();
        onShowToast('Thang máy đã xuống sảnh tầng trệt.');
      } else if (nearLobbyElevator) {
        if (w.ownedHouses.includes(nearLobbyElevator.id)) {
          const [sx, sy, sz] = nearLobbyElevator.spawnPos;
          body.setTranslation({x: sx, y: sy + 0.25, z: sz}, true);
          body.setLinvel({x: 0, y: 0, z: 0}, true);
          playerPosRef.current.set(sx, sy + 0.25, sz);
          gameAudio.playConfirmSelect();
          onShowToast(
            `Đã lên ${nearLobbyElevator.name} — Ra ban công ngắm toàn cảnh thành phố!`,
          );
        } else {
          onOpenHub('houses');
          gameAudio.playCrispClick();
        }
      } else if (nearBankAtm) {
        onOpenHub('bank');
        gameAudio.playCrispClick();
      } else if (nearShop) {
        onOpenHub('shop');
        gameAudio.playCrispClick();
      } else if (nearGarage) {
        onOpenHub('garage');
        gameAudio.playCrispClick();
      } else if (nearHouse) {
        onOpenHub('houses');
        gameAudio.playCrispClick();
      } else if (nearRobbery) {
        const cd = w.robberyCooldowns[nearRobbery.id] ?? 0;
        if (cd <= 0) {
          onStartRobbery(nearRobbery.id);
        } else {
          gameAudio.playErrorBuzz();
        }
      } else if (nearMission && nextMission) {
        onStartMission(nextMission.id);
        gameAudio.playConfirmSelect();
      } else if (nearSideMission) {
        onStartSideMission(nearSideMission.id);
        gameAudio.playConfirmSelect();
      } else if (nearestVehIdx !== -1) {
        const veh = w.vehicles[nearestVehIdx];
        veh.occupiedByPlayer = true;
        veh.headlightsOn = true;
        w.inVehicleId = veh.id;
        ws.isAiming = false;
        setInVehicle(true);
        if (veh.kind === 'tank' && w.wantedLevel < 2) {
          w.wantedLevel = 2;
          w.wantedHeat = Math.max(w.wantedHeat, 140);
          w.wantedTimer = 0;
          onShowToast('2★ Đã chiếm Chiến Xa Rhino X1! Click / F để bắn pháo!');
        } else if (veh.isPolice && w.wantedLevel < 2) {
          w.wantedLevel = 2;
          w.wantedHeat = Math.max(w.wantedHeat, 110);
          w.wantedTimer = 0;
          onShowToast('2★ Cảnh báo: Đã chiếm dụng xe tuần tra!');
        } else if (veh.id.startsWith('traffic-') && w.wantedLevel < 1) {
          w.wantedLevel = 1;
          w.wantedHeat = Math.max(w.wantedHeat, 40);
          w.wantedTimer = 0;
        }
        body.setGravityScale(0, true);
        body.setLinvel({x: 0, y: 0, z: 0}, true);
        body.setTranslation({x: veh.x, y: 42, z: veh.z}, true);
        camOrbit.current.yaw = veh.rotY;
        gameAudio.playConfirmSelect();
      }
    }
    prevInteractRef.current = interactPressed;

    // 6. DRIVING MODE (INCLUDING TANK CANNON & ELEVATED BRIDGES)
    if (w.inVehicleId) {
      ws.isAiming = false;
      const veh = w.vehicles.find((vv) => vv.id === w.inVehicleId);
      const vehBody = veh ? vehicleBodiesRef.current[veh.id] : null;
      const vehGroup = veh ? vehicleGroupRefs.current[veh.id] : null;

      if (veh && vehBody && isBodyAlive(vehBody)) {
        const spec = VEHICLE_SPECS[veh.kind];
        const throttleInput =
          (actions.up ? 1 : 0) -
          (actions.down ? 1 : 0) -
          (analog && Math.abs(analog.y) > JOYSTICK_DEADZONE ? analog.y : 0);
        const steerInput =
          (actions.left ? 1 : 0) -
          (actions.right ? 1 : 0) -
          (analog && Math.abs(analog.x) > JOYSTICK_DEADZONE ? analog.x : 0);

        const boost = Boolean(snap?.sprint) && throttleInput > 0.1;
        const handbrake = Boolean(snap?.jump);
        const maxSpd = spec.maxSpeed * (boost ? 1.32 : 1.0);
        const gripMul = weather === 'rain' ? 0.68 : 1.0;

        if (w.race.active && w.race.countdown > 0) {
          veh.speed = 0;
          veh.braking = true;
          veh.steerAngle = THREE.MathUtils.lerp(veh.steerAngle, steerInput * 0.3, 8 * dt);
        } else if (enabled) {
          if (handbrake) {
            veh.speed = THREE.MathUtils.lerp(veh.speed, 0, 4.5 * dt);
            veh.braking = true;
          } else if (throttleInput > 0.05) {
            if (veh.speed < -0.5) {
              veh.speed += spec.brake * dt;
              veh.braking = true;
            } else {
              veh.speed = Math.min(
                maxSpd,
                veh.speed +
                  spec.accel * (boost ? 1.45 : 1.0) * throttleInput * dt,
              );
              veh.braking = false;
            }
          } else if (throttleInput < -0.05) {
            if (veh.speed > 0.5) {
              veh.speed -= spec.brake * dt;
              veh.braking = true;
            } else {
              veh.speed = Math.max(
                -spec.reverseSpeed,
                veh.speed + spec.accel * 0.7 * throttleInput * dt,
              );
              veh.braking = false;
            }
          } else {
            veh.speed = THREE.MathUtils.lerp(veh.speed, 0, 1.8 * dt);
            veh.braking = false;
          }

          const speedRatio =
            veh.kind === 'tank'
              ? 1.0
              : Math.min(1, Math.abs(veh.speed) / 6);
          const steerSign = veh.speed >= -0.2 ? 1 : -1;
          const turnMul = handbrake ? 1.35 : 1.0;
          veh.rotY +=
            steerInput *
            spec.turnRate *
            turnMul *
            gripMul *
            speedRatio *
            steerSign *
            dt;
          veh.steerAngle = THREE.MathUtils.lerp(
            veh.steerAngle,
            steerInput * 0.42,
            10 * dt,
          );
          veh.pitch =
            (throttleInput > 0.1 ? -0.035 : veh.braking ? 0.045 : 0) *
            (boost ? 1.5 : 1) *
            (veh.kind === 'tank' ? 0.4 : 1);
          veh.roll =
            -steerInput * speedRatio * 0.065 * (veh.kind === 'tank' ? 0.3 : 1);

          if (Math.abs(veh.speed) > 4 && Math.abs(throttleInput) > 0.1) {
            engineAudioTimerRef.current -= dt;
            if (engineAudioTimerRef.current <= 0) {
              engineAudioTimerRef.current = 0.22;
              const spdFrac = Math.min(1, Math.abs(veh.speed) / spec.maxSpeed);
              gameAudio.playTone({
                type: veh.kind === 'tank' ? 'sawtooth' : 'triangle',
                freq: (veh.kind === 'tank' ? 58 : 72) + spdFrac * 78,
                dur: 0.18,
                gain: 0.025,
              });
            }
          }

          if (veh.kind === 'tank') {
            veh.turretYaw = camOrbit.current.yaw;
            const pulseFire = Boolean(snap?.pulseFire);
            if (snap?.pulseFire) snap.pulseFire = false;
            const wantsCannon = Boolean(
              snap?.firing || snap?.contextAction || pulseFire,
            );
            if (wantsCannon && tankCooldownRef.current <= 0) {
              tankCooldownRef.current = 0.65;
              shakeRef.current = 0.28;
              gameAudio.playChiptuneExplosion();

              const tYaw = veh.turretYaw ?? veh.rotY;
              const aimPitch = THREE.MathUtils.clamp(
                -camOrbit.current.pitch * 0.35 + 0.05,
                -0.15,
                0.35,
              );
              const dirX = -Math.sin(tYaw) * Math.cos(aimPitch);
              const dirY = Math.sin(aimPitch);
              const dirZ = -Math.cos(tYaw) * Math.cos(aimPitch);

              const spawnX = veh.x + dirX * 4.8;
              const spawnY = veh.y + 1.92;
              const spawnZ = veh.z + dirZ * 4.8;
              const barrelWall = intersectSegmentWithWalls(
                veh.x,
                spawnY,
                veh.z,
                spawnX,
                spawnY,
                spawnZ,
                0.08,
              );

              for (let b = 0; b < projectilesRef.current.length; b++) {
                const pr = projectilesRef.current[b];
                if (!pr.active) {
                  pr.active = true;
                  pr.isTankShell = true;
                  pr.blastRadius = 11.5;
                  if (barrelWall) {
                    const safeT = Math.max(0.1, barrelWall.t * 0.85);
                    pr.x = veh.x + (spawnX - veh.x) * safeT;
                    pr.y = spawnY;
                    pr.z = veh.z + (spawnZ - veh.z) * safeT;
                    pr.life = 0.04;
                  } else {
                    pr.x = spawnX;
                    pr.y = spawnY;
                    pr.z = spawnZ;
                    pr.life = 2.0;
                  }
                  pr.vx = dirX * 78;
                  pr.vy = dirY * 78;
                  pr.vz = dirZ * 78;
                  pr.fromPlayer = true;
                  pr.damage = 300;
                  break;
                }
              }

              for (let k = 0; k < 5; k++) {
                for (let i = 0; i < particlesRef.current.length; i++) {
                  const pt = particlesRef.current[i];
                  if (!pt.active) {
                    pt.active = true;
                    pt.x = spawnX;
                    pt.y = spawnY;
                    pt.z = spawnZ;
                    pt.vx = dirX * 6 + (Math.random() - 0.5) * 3;
                    pt.vy = 1.5 + Math.random() * 2;
                    pt.vz = dirZ * 6 + (Math.random() - 0.5) * 3;
                    pt.life = 0.38;
                    pt.maxLife = 0.38;
                    pt.scale = k === 0 ? 0.55 : 0.75;
                    pt.isSmoke = k > 0;
                    break;
                  }
                }
              }
            }
          }

          const hornPressed = Boolean(snap?.horn);
          if (hornPressed && !prevHornRef.current) {
            gameAudio.playTone({
              type: 'sawtooth',
              freq: 360,
              freqTo: 355,
              dur: 0.22,
              gain: 0.12,
            });
            gameAudio.playTone({
              type: 'sawtooth',
              freq: 450,
              freqTo: 445,
              dur: 0.22,
              gain: 0.1,
            });
          }
          prevHornRef.current = hornPressed;
        } else {
          veh.speed = THREE.MathUtils.lerp(veh.speed, 0, 4 * dt);
        }

        const curV = vehBody.linvel();
        const vx = -Math.sin(veh.rotY) * veh.speed;
        const vz = -Math.cos(veh.rotY) * veh.speed;
        vehBody.setLinvel(
          toVec3({
            x: vx,
            y: curV.y,
            z: vz,
          }),
          true,
        );

        const vt = vehBody.translation();
        if (vt.y < -2.2 && vt.x >= RIVER_MIN_X && vt.x <= RIVER_MAX_X) {
          const safeX = vt.x < 175 ? 98 : 252;
          vehBody.setTranslation({x: safeX, y: 0.2, z: 0}, true);
          vehBody.setLinvel({x: 0, y: 0, z: 0}, true);
          veh.x = safeX;
          veh.y = 0.2;
          veh.z = 0;
          veh.speed = 0;
          onShowToast('Xe đã được kéo lên bờ gần cầu sông Aurelia!');
        } else {
          veh.x = vt.x;
          veh.y = Math.max(0, vt.y);
          veh.z = vt.z;
        }

        if (vehGroup) {
          vehGroup.position.set(veh.x, veh.y, veh.z);
          vehGroup.rotation.y = veh.rotY;
        }

        playerPosRef.current.set(veh.x, veh.y, veh.z);
        playerRotRef.current = veh.rotY;

        shakeRef.current = Math.max(0, shakeRef.current - dt * 1.2);
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;

        if (cameraModeRef.current === 'first') {
          const eyeH = veh.kind === 'tank' ? 2.4 : 1.28;
          const lookYaw =
            veh.kind === 'tank' ? (veh.turretYaw ?? veh.rotY) : veh.rotY;
          camLookAt.set(
            veh.x - Math.sin(lookYaw) * 14,
            veh.y + eyeH - 0.15,
            veh.z - Math.cos(lookYaw) * 14,
          );
          camera.position.set(
            veh.x + Math.sin(veh.rotY) * 0.1 + sx,
            veh.y + eyeH + sy,
            veh.z + Math.cos(veh.rotY) * 0.1,
          );
          camera.lookAt(camLookAt);
        } else {
          if (
            veh.kind !== 'tank' &&
            !shiftLockActive &&
            !snap.pointer.down &&
            manualLookCooldownRef.current <= 0
          ) {
            const yawDiff =
              THREE.MathUtils.euclideanModulo(
                veh.rotY - camOrbit.current.yaw + Math.PI,
                Math.PI * 2,
              ) - Math.PI;
            camOrbit.current.yaw += yawDiff * Math.min(1, 2.2 * dt);
          }
          const focusY = veh.y + (veh.kind === 'tank' ? 1.8 : 1.2);
          if (
            !smoothInitializedRef.current ||
            smoothedFocusRef.current.distanceToSquared(playerPosRef.current) > 16
          ) {
            smoothedFocusRef.current.set(veh.x, focusY, veh.z);
            smoothInitializedRef.current = true;
          } else {
            const focusAlpha = 1 - Math.exp(-26 * dt);
            smoothedFocusRef.current.x += (veh.x - smoothedFocusRef.current.x) * focusAlpha;
            smoothedFocusRef.current.y += (focusY - smoothedFocusRef.current.y) * focusAlpha;
            smoothedFocusRef.current.z += (veh.z - smoothedFocusRef.current.z) * focusAlpha;
          }
          const fx = smoothedFocusRef.current.x;
          const fy = smoothedFocusRef.current.y;
          const fz = smoothedFocusRef.current.z;

          const dist =
            camOrbit.current.dist +
            (veh.kind === 'tank' ? 2.4 : 0) +
            Math.abs(veh.speed) * 0.08;
          const cy =
            fy + 0.3 + Math.sin(camOrbit.current.pitch) * dist * 0.85;
          const horiz = Math.cos(camOrbit.current.pitch) * dist;
          camDesired.set(
            fx + Math.sin(camOrbit.current.yaw) * horiz + sx,
            cy + sy,
            fz + Math.cos(camOrbit.current.yaw) * horiz,
          );
          camLookAt.set(fx, fy, fz);
          clampCameraAgainstBuildings(camLookAt, camDesired);
          camera.position.lerp(camDesired, 1 - Math.exp(-15 * dt));
          camera.lookAt(camLookAt);
        }

        if (camera instanceof THREE.PerspectiveCamera) {
          const targetFov =
            getConfig('fov') + (boost ? 10 : Math.abs(veh.speed) * 0.18);
          if (Math.abs(camera.fov - targetFov) > 0.2) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * dt);
            camera.updateProjectionMatrix();
          }
        }
      }
      return;
    }

    // 7. ON-FOOT MOVEMENT & ROBLOX SHIFT-LOCK COMBAT
    let inputX = 0;
    let inputZ = 0;
    if (enabled && actions) {
      if (actions.left) inputX -= 1;
      if (actions.right) inputX += 1;
      if (actions.up) inputZ -= 1;
      if (actions.down) inputZ += 1;
      if (analog && Math.hypot(analog.x, analog.y) > JOYSTICK_DEADZONE) {
        inputX += analog.x;
        inputZ += analog.y;
      }
    }

    const sinY = Math.sin(camOrbit.current.yaw);
    const cosY = Math.cos(camOrbit.current.yaw);
    moveDir.set(
      inputX * cosY + inputZ * sinY,
      0,
      -inputX * sinY + inputZ * cosY,
    );

    const moveLenSq = moveDir.lengthSq();
    const isMoving = moveLenSq > MOVE_EPSILON_SQ;
    if (isMoving && moveLenSq > 1) {
      moveDir.normalize();
    }

    // Holding Right-Click ALWAYS engages ADS aiming (both normal & Shift-Lock modes)
    // AND lets you fire immediately with Left-Click!
    const isAiming = Boolean(snap?.aiming) && ws.weaponId !== 'fists';
    ws.isAiming = isAiming;

    const wantsSprint =
      Boolean(snap?.sprint) && isMoving && !isAiming && w.stamina > 2;
    if (wantsSprint) {
      w.stamina = Math.max(0, w.stamina - 22 * dt);
    } else {
      w.stamina = Math.min(100, w.stamina + 16 * dt);
    }

    const baseSpeed = getConfig('playerSpeed');
    const moveSpeed = isAiming
      ? baseSpeed * 0.65
      : wantsSprint
        ? baseSpeed * getConfig('sprintMultiplier')
        : baseSpeed;

    const currentVel = body.linvel();
    let nextVy = currentVel.y;

    const t = body.translation();
    const expectedFloorY = getBridgeSurfaceY(t.x, t.z);
    const grounded =
      (t.y <= expectedFloorY + 0.35 || t.y > 10) &&
      Math.abs(currentVel.y) < 0.6;
    if (enabled && snap?.jump && grounded) {
      nextVy = getConfig('jumpForce');
      gameAudio.playRetroJump();
    }

    body.setLinvel(
      toVec3({
        x: isMoving ? moveDir.x * moveSpeed : 0,
        y: nextVy,
        z: isMoving ? moveDir.z * moveSpeed : 0,
      }),
      true,
    );

    const updatedT = body.translation();
    if (updatedT.y < -1.85) {
      const safeX = updatedT.x < 175 ? 100 : 250;
      body.setTranslation({x: safeX, y: 0.25, z: 0}, true);
      body.setLinvel({x: 0, y: 0, z: 0}, true);
      playerPosRef.current.set(safeX, 0.25, 0);
      onShowToast('Đã cứu hộ bạn lên bờ gần Cầu Sông Aurelia!');
    } else {
      playerPosRef.current.set(updatedT.x, updatedT.y, updatedT.z);
    }

    const pulseFire = Boolean(snap?.pulseFire);
    if (snap?.pulseFire) {
      snap.pulseFire = false;
    }
    const isFiring = Boolean(snap?.firing || snap?.contextAction || pulseFire);

    // ROBLOX SHIFT-LOCK BEHAVIOR:
    // While Shift-Lock (Ctrl) is ON, character ALWAYS aligns smoothly to camera look yaw!
    if (shiftLockActive || isAiming || isFiring) {
      const targetRotY = camOrbit.current.yaw;
      const turn =
        THREE.MathUtils.euclideanModulo(
          targetRotY - playerRotRef.current + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      const maxTurn = PLAYER_TURN_RATE * 2.5 * dt;
      playerRotRef.current += THREE.MathUtils.clamp(turn, -maxTurn, maxTurn);
    } else if (isMoving) {
      const targetRotY = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
      const turn =
        THREE.MathUtils.euclideanModulo(
          targetRotY - playerRotRef.current + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      const maxTurn = PLAYER_TURN_RATE * dt;
      playerRotRef.current += THREE.MathUtils.clamp(turn, -maxTurn, maxTurn);
    }
    group.rotation.y = playerRotRef.current;

    if (isMoving && grounded) {
      footstepTimerRef.current -= dt * (wantsSprint ? 1.6 : 1.0);
      if (footstepTimerRef.current <= 0) {
        footstepTimerRef.current = 0.38;
        gameAudio.playFootstepStone();
      }
    }

    // 8. Firing / Melee Combat with Exact Zero-Parallax Crosshair Aim
    const upgradeLvl = w.weaponUpgrades[ws.weaponId] ?? 0;
    const damageMultiplier = 1 + upgradeLvl * 0.25;

    const triggerFire =
      enabled &&
      isFiring &&
      (wSpec.automatic || pulseFire ? true : !prevFireRef.current) &&
      ws.fireCooldown <= 0 &&
      !ws.reloading;
    prevFireRef.current = Boolean(snap?.firing || snap?.contextAction);

    if (triggerFire) {
      if (ws.weaponId === 'fists') {
        ws.fireCooldown = 1 / wSpec.fireRate;
        gameAudio.playMeleePunch();
        const fx = -Math.sin(playerRotRef.current);
        const fz = -Math.cos(playerRotRef.current);
        for (const npc of w.npcs) {
          if (npc.dead) continue;
          const dx = npc.x - playerPosRef.current.x;
          const dz = npc.z - playerPosRef.current.z;
          const dist = Math.hypot(dx, dz);
          if (dist < wSpec.range && dx * fx + dz * fz > -0.25) {
            npc.hp -= wSpec.damage * damageMultiplier;
            npc.knockedDown = true;
            npc.knockdownTimer = 2.0;
            npc.knockVx = fx * 5.5;
            npc.knockVz = fz * 5.5;
            npc.knockVy = 2.5;
            onHitMarker();
            if (npc.hp <= 0) {
              npc.dead = true;
              npc.respawnTimer = npc.isPolice ? 12 : 14;
              w.money += npc.isPolice ? 120 : 40;
              w.score += npc.isPolice ? 100 : 35;
              w.wantedHeat = Math.min(950, w.wantedHeat + 85);
              w.wantedLevel = Math.max(w.wantedLevel, npc.isPolice ? 2 : 1);
              w.wantedTimer = 0;
            } else {
              if (!npc.isPolice) {
                npc.fleeing = true;
                npc.fleeTimer = 9;
                w.wantedHeat = Math.min(950, w.wantedHeat + 35);
                w.wantedLevel = Math.max(1, w.wantedLevel);
                w.wantedTimer = 0;
              } else {
                w.wantedHeat = Math.min(950, w.wantedHeat + 65);
                w.wantedLevel = Math.max(1, w.wantedLevel);
                w.wantedTimer = 0;
              }
            }
          }
        }
      } else if (ws.ammo[ws.weaponId] > 0) {
        ws.ammo[ws.weaponId] -= 1;
        ws.fireCooldown = 1 / wSpec.fireRate;
        shakeRef.current = isAiming ? 0.06 : 0.11;
        muzzleFlashTimerRef.current = 0.06;
        ws.crosshairSpread = Math.min(
          16,
          ws.crosshairSpread + (isAiming ? 2.5 : 5.5),
        );
        camOrbit.current.pitch = THREE.MathUtils.clamp(
          camOrbit.current.pitch - wSpec.recoil * (isAiming ? 0.45 : 0.8),
          -0.32,
          1.22,
        );

        gameAudio.playGunshotBlast();

        for (const npc of w.npcs) {
          if (!npc.dead && !npc.isPolice) {
            if (
              Math.hypot(
                npc.x - playerPosRef.current.x,
                npc.z - playerPosRef.current.z,
              ) < 34
            ) {
              npc.fleeing = true;
              npc.fleeTimer = 10;
            }
          }
        }
        if (w.wantedLevel === 0) {
          w.wantedHeat = Math.max(w.wantedHeat, 45);
          w.wantedLevel = 1;
          w.wantedTimer = 0;
        }

        camera.getWorldDirection(camForward);
        findCrosshairAimPoint(
          camera.position,
          camForward,
          wSpec.range,
          w,
          aimTarget,
        );

        const chestX = playerPosRef.current.x;
        const chestY = playerPosRef.current.y + 1.32;
        const chestZ = playerPosRef.current.z;
        muzzleOrigin.set(
          chestX - Math.sin(playerRotRef.current) * 0.72,
          chestY,
          chestZ - Math.cos(playerRotRef.current) * 0.72,
        );
        // Prevent muzzle from poking inside/through a nearby wall
        const muzzleWallHit = intersectSegmentWithWalls(
          chestX,
          chestY,
          chestZ,
          muzzleOrigin.x,
          muzzleOrigin.y,
          muzzleOrigin.z,
          0.04,
        );
        if (muzzleWallHit) {
          for (let i = 0; i < particlesRef.current.length; i++) {
            const pt = particlesRef.current[i];
            if (!pt.active) {
              pt.active = true;
              pt.x = muzzleWallHit.x;
              pt.y = muzzleWallHit.y;
              pt.z = muzzleWallHit.z;
              pt.vx = (Math.random() - 0.5) * 3;
              pt.vy = 1.8;
              pt.vz = (Math.random() - 0.5) * 3;
              pt.life = 0.25;
              pt.maxLife = 0.25;
              pt.scale = 0.16;
              pt.isSmoke = false;
              break;
            }
          }
        } else {
          shotVec.subVectors(aimTarget, muzzleOrigin).normalize();

          const effectiveSpread =
            wSpec.spread * (isAiming ? 0.35 : shiftLockActive ? 0.6 : 1.0);
          const baseYaw = Math.atan2(-shotVec.x, -shotVec.z);
          const basePitch = Math.asin(THREE.MathUtils.clamp(shotVec.y, -0.8, 0.8));

          for (let p = 0; p < wSpec.pellets; p++) {
            const spreadYaw = baseYaw + (Math.random() - 0.5) * effectiveSpread;
            const spreadPitch =
              basePitch + (Math.random() - 0.5) * effectiveSpread;
            const dirX = -Math.sin(spreadYaw) * Math.cos(spreadPitch);
            const dirY = Math.sin(spreadPitch);
            const dirZ = -Math.cos(spreadYaw) * Math.cos(spreadPitch);

            for (let b = 0; b < projectilesRef.current.length; b++) {
              const pr = projectilesRef.current[b];
              if (!pr.active) {
                pr.active = true;
                pr.isTankShell = false;
                pr.x = muzzleOrigin.x;
                pr.y = muzzleOrigin.y;
                pr.z = muzzleOrigin.z;
                pr.vx = dirX * 82;
                pr.vy = dirY * 82;
                pr.vz = dirZ * 82;
                pr.life = wSpec.range / 82;
                pr.fromPlayer = true;
                pr.damage = wSpec.damage * damageMultiplier;
                break;
              }
            }
          }
        }

        for (let i = 0; i < particlesRef.current.length; i++) {
          const pt = particlesRef.current[i];
          if (!pt.active) {
            pt.active = true;
            pt.x = muzzleOrigin.x;
            pt.y = muzzleOrigin.y;
            pt.z = muzzleOrigin.z;
            pt.vx = 0;
            pt.vy = 0.5;
            pt.vz = 0;
            pt.life = 0.08;
            pt.maxLife = 0.08;
            pt.scale = 0.28;
            pt.isSmoke = false;
            break;
          }
        }

        if (ws.ammo[ws.weaponId] === 0) {
          beginReload();
        }
      } else {
        beginReload();
      }
    }

    const nextAnim: 'idle' | 'walk' | 'run' | 'action' = isFiring
      ? 'action'
      : isMoving
        ? wantsSprint
          ? 'run'
          : 'walk'
        : 'idle';
    if (nextAnim !== animState) setAnimState(nextAnim);

    // 9. Third-Person (Roblox Shift-Lock Over-Shoulder) or First-Person Camera
    shakeRef.current = Math.max(0, shakeRef.current - dt * 1.2);
    const sx = (Math.random() - 0.5) * shakeRef.current;
    const sy = (Math.random() - 0.5) * shakeRef.current;

    if (cameraModeRef.current === 'first') {
      const p = playerPosRef.current;
      camera.position.set(p.x + sx, p.y + 1.72 + sy, p.z);
      camLookAt.set(
        p.x - Math.sin(camOrbit.current.yaw) * 14,
        p.y + 1.72 - Math.sin(camOrbit.current.pitch) * 10,
        p.z - Math.cos(camOrbit.current.yaw) * 14,
      );
      camera.lookAt(camLookAt);
    } else {
      const p = playerPosRef.current;
      if (
        !smoothInitializedRef.current ||
        smoothedFocusRef.current.distanceToSquared(p) > 16
      ) {
        smoothedFocusRef.current.set(p.x, p.y + 1.42, p.z);
        smoothInitializedRef.current = true;
      } else {
        const focusAlpha = 1 - Math.exp(-28 * dt);
        smoothedFocusRef.current.x += (p.x - smoothedFocusRef.current.x) * focusAlpha;
        smoothedFocusRef.current.y += (p.y + 1.42 - smoothedFocusRef.current.y) * focusAlpha;
        smoothedFocusRef.current.z += (p.z - smoothedFocusRef.current.z) * focusAlpha;
      }
      // Keep character mesh locked to smoothed position so avatar never micro-jitters relative to camera
      group.position.set(
        smoothedFocusRef.current.x - p.x,
        smoothedFocusRef.current.y - 1.42 - p.y,
        smoothedFocusRef.current.z - p.z,
      );

      const indoors = isInsideEnterableBuilding(p.x, p.y, p.z);
      const rawDist = isAiming
        ? 3.4
        : shiftLockActive
          ? Math.min(camOrbit.current.dist, 6.2)
          : camOrbit.current.dist;
      const dist = indoors ? Math.min(rawDist, 4.0) : rawDist;
      const horiz = Math.cos(camOrbit.current.pitch) * dist;
      const vert = 0.06 + Math.sin(camOrbit.current.pitch) * dist;

      camRight.set(
        Math.cos(camOrbit.current.yaw),
        0,
        -Math.sin(camOrbit.current.yaw),
      );
      // Clean Roblox Shift-Lock right-shoulder offset so crosshair is completely unobstructed
      const shoulderOffset = isAiming ? 0.88 : shiftLockActive ? 0.72 : 0.2;

      const fx = smoothedFocusRef.current.x;
      const fy = smoothedFocusRef.current.y;
      const fz = smoothedFocusRef.current.z;

      camDesired.set(
        fx +
          Math.sin(camOrbit.current.yaw) * horiz +
          camRight.x * shoulderOffset +
          sx,
        fy + vert + sy,
        fz +
          Math.cos(camOrbit.current.yaw) * horiz +
          camRight.z * shoulderOffset,
      );
      camLookAt.set(
        fx + camRight.x * shoulderOffset,
        fy,
        fz + camRight.z * shoulderOffset,
      );
      clampCameraAgainstBuildings(camLookAt, camDesired);
      // Tighter exponential damping when Shift-Locked for crisp Roblox-style responsiveness
      camera.position.lerp(
        camDesired,
        1 - Math.exp(-(shiftLockActive ? 24 : 16) * dt),
      );
      camera.lookAt(camLookAt);
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = isAiming
        ? getConfig('fov') - 16
        : wantsSprint
          ? getConfig('fov') + 5
          : getConfig('fov');
      if (Math.abs(camera.fov - targetFov) > 0.2) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 9 * dt);
        camera.updateProjectionMatrix();
      }
    }
  });

  const barrelLen =
    activeWeapon === 'pistol'
      ? 0.28
      : activeWeapon === 'smg'
        ? 0.44
        : activeWeapon === 'shotgun'
          ? 0.62
          : 0.68;

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      mass={1}
      type="dynamic"
      position={PLAYER_SPAWN}
      lockRotations>
      <CapsuleCollider
        args={[0.45, 0.4]}
        position={[0, 0.85, 0]}
        friction={0}
      />
      <group ref={groupRef} visible={!inVehicle && !isFirstPerson}>
        <HumanoidCharacter
          state={animState}
          skinColor="#f1c29b"
          clothesColor="#334155"
          pantsColor="#0f172a"
        />
        {activeWeapon !== 'fists' && (
          <group position={[0.36, 1.18, -0.34]}>
            <mesh castShadow>
              <boxGeometry args={[0.075, 0.11, barrelLen]} />
              <meshStandardMaterial
                color={activeWeapon === 'shotgun' ? '#475569' : '#1e293b'}
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, -0.09, barrelLen * 0.22]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.06, 0.14, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            {(activeWeapon === 'smg' || activeWeapon === 'rifle') && (
              <mesh position={[0, -0.12, -0.04]} rotation={[-0.18, 0, 0]}>
                <boxGeometry args={[0.05, 0.18, 0.08]} />
                <meshStandardMaterial color="#334155" metalness={0.7} />
              </mesh>
            )}
            <mesh
              ref={muzzleFlashRef}
              visible={false}
              position={[0, 0.02, -barrelLen * 0.5 - 0.12]}>
              <dodecahedronGeometry args={[0.13, 0]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
});
