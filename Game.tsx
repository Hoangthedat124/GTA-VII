import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Bloom, EffectComposer} from '@react-three/postprocessing';
import {Physics, type RapierRigidBody} from '@react-three/rapier';
import type {MutableRefObject} from 'react';
import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import {getConfig, TOTAL_MISSIONS} from './constants';
import {InputSnapshot, useInput} from './input';
import {CityEnvironment, TrafficLightState} from './src/CityEnvironment';
import {DefaultLighting} from './src/lighting';
import {PlayerAndCamera, WeaponRuntimeState} from './src/PlayerRig';
import {
  BANK_ATM_SPOTS,
  GARAGE_POS,
  getDistrictName,
  HOUSES,
  MISSIONS,
  RACETRACK_PADDOCK_POS,
  RACETRACK_SAMPLES,
  RIVER_MAX_X,
  RIVER_MIN_X,
  ROBBERY_SPOTS,
  SHOP_SPOTS,
  SIDE_MISSIONS,
  TOTAL_RACE_LAPS,
  VEHICLE_SHOP_CATALOG,
  VEHICLE_SPECS,
  WEAPONS,
} from './src/worldData';
import {
  createInitialWorldState,
  ProjectileTrace,
  SharedWorldState,
  SparkParticle,
  WorldSim,
} from './src/WorldSim';
import {
  GraphicsQuality,
  HubTab,
  HudTelemetry,
  MinimapBlip,
  PickupItem,
  SaveDataPayload,
  VehicleKind,
  WeaponId,
  WeatherType,
} from './types';
import {gameAudio, isBodyAlive} from './utils';
import {GameState} from './utils/helper';

export interface SceneCommandApi {
  selectWeapon: (id: WeaponId) => void;
  triggerReload: () => void;
  togglePointerLock: () => void;
  setWeather: (w: WeatherType) => void;
  setTimeOfDay: (t: number) => void;
  adjustZoom: (delta: number) => void;
  startMission: (id: number) => void;
  startSideMission: (id: string) => void;
  cancelActiveMission: () => void;
  startRace: () => void;
  cancelRace: () => void;
  buySupply: (kind: 'ammo' | 'armor' | 'medkit') => void;
  upgradeWeapon: (id: WeaponId) => void;
  bankDeposit: (amount: number) => void;
  bankWithdraw: (amount: number) => void;
  payBail: () => void;
  buyVehicle: (kind: VehicleKind) => void;
  spawnOwnedVehicle: (kind: VehicleKind) => void;
  paintVehicle: (kind: VehicleKind, colorHex: string) => void;
  repairAllVehicles: () => void;
  buyHouse: (houseId: string) => void;
  restAtHouse: (houseId: string) => void;
  teleportToHouse: (houseId: string) => void;
  teleportHome: (houseId?: string) => void;
  saveGame: () => SaveDataPayload;
  loadGame: (data: SaveDataPayload) => void;
}

const CANVAS_CAMERA_PROPS = {
  fov: getConfig('fov'),
  near: 0.1,
  far: 1850,
  position: [
    getConfig('cameraX'),
    getConfig('cameraY'),
    getConfig('cameraZ'),
  ] as [number, number, number],
};

const CANVAS_SCENE_PROPS = {
  background: new THREE.Color(getConfig('backgroundColor')),
};

interface GameProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  exitChat: (payload: Record<string, unknown>) => Promise<void>;
  gameStateRef: MutableRefObject<GameState>;
  externalInputRef?: MutableRefObject<InputSnapshot>;
  paused: boolean;
  quality: GraphicsQuality;
  weather: WeatherType;
  onTogglePauseMenu: () => void;
  onToggleWeaponWheel: () => void;
  onOpenHub: (tab?: HubTab) => void;
  onTelemetry: (hud: HudTelemetry) => void;
  commandApiRef: MutableRefObject<SceneCommandApi | null>;
}

function getTimeLabel(t: number): string {
  const hour = Math.floor(t * 24) % 24;
  const min = Math.floor(((t * 24) % 1) * 60);
  const hh = String(hour).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  const phase =
    hour >= 5 && hour < 8
      ? 'Bình minh'
      : hour >= 8 && hour < 17
        ? 'Ban ngày'
        : hour >= 17 && hour < 20
          ? 'Hoàng hôn'
          : 'Ban đêm';
  return `${hh}:${mm} · ${phase}`;
}

const Scene = React.memo(function Scene({
  gameState,
  setGameState,
  inputRef,
  toggleLockRef,
  gameStateRef,
  paused,
  quality,
  weather,
  onTogglePauseMenu,
  onToggleWeaponWheel,
  onOpenHub,
  onTelemetry,
  commandApiRef,
}: Omit<GameProps, 'exitChat' | 'externalInputRef'> & {
  inputRef: MutableRefObject<InputSnapshot>;
  toggleLockRef: MutableRefObject<(() => void) | null>;
}): React.ReactElement {
  const {camera} = useThree();

  const worldRef = useRef<SharedWorldState>(
    createInitialWorldState(getConfig('maxHealth'), getConfig('maxArmor')),
  );
  const playerBodyRef = useRef<RapierRigidBody | null>(null);
  const playerPosRef = useRef(new THREE.Vector3(0, 0.1, 4));
  const playerRotRef = useRef(0);
  const vehicleBodiesRef = useRef<Record<string, RapierRigidBody | null>>({});
  const vehicleGroupRefs = useRef<Record<string, THREE.Group | null>>({});
  const projectilesRef = useRef<ProjectileTrace[]>([]);
  const particlesRef = useRef<SparkParticle[]>([]);
  const trafficLightRef = useRef<TrafficLightState>({
    nsGreen: true,
    amber: false,
  });
  const timeOfDayRef = useRef(0.42);
  const cameraModeRef = useRef<'third' | 'first'>('third');
  const cameraDistRef = useRef(8.5);
  const externalShakeRef = useRef(0);
  const nearbyPromptRef = useRef<string | null>(null);
  const hitMarkerTimerRef = useRef(0);
  const damageFlashTimerRef = useRef(0);

  const weaponStateRef = useRef<WeaponRuntimeState>({
    weaponId: 'pistol',
    ammo: {
      fists: 0,
      pistol: WEAPONS.pistol.magSize,
      smg: WEAPONS.smg.magSize,
      rifle: WEAPONS.rifle.magSize,
      shotgun: WEAPONS.shotgun.magSize,
    },
    reserve: {
      fists: 0,
      pistol: WEAPONS.pistol.startReserve,
      smg: WEAPONS.smg.startReserve,
      rifle: WEAPONS.rifle.startReserve,
      shotgun: WEAPONS.shotgun.startReserve,
    },
    reloading: false,
    reloadTimer: 0,
    reloadDuration: 1.0,
    fireCooldown: 0,
    isAiming: false,
    crosshairSpread: 0,
  });

  const weatherRef = useRef<WeatherType>(weather);
  weatherRef.current = weather;

  useEffect(() => {
    camera.position.set(
      getConfig('cameraX'),
      getConfig('cameraY'),
      getConfig('cameraZ') + 4,
    );
    camera.lookAt(0, 1, 4);
  }, [camera]);

  const showToast = useCallback((msg: string) => {
    worldRef.current.toastMessage = msg;
    worldRef.current.toastTimer = 4.0;
  }, []);

  const handleHitMarker = useCallback(() => {
    hitMarkerTimerRef.current = 0.16;
    gameAudio.playCrispClick();
  }, []);

  const handleCameraShake = useCallback((amount: number) => {
    externalShakeRef.current = Math.max(externalShakeRef.current, amount);
  }, []);

  const handlePlayerDamage = useCallback(
    (dmg: number) => {
      const w = worldRef.current;
      if (w.health <= 0) return;

      // Tank is immune to small-arms gunfire (0 damage to player inside!)
      const activeVeh = w.inVehicleId
        ? w.vehicles.find((vv) => vv.id === w.inVehicleId)
        : null;
      if (activeVeh?.kind === 'tank') return;
      const effectiveDmg = dmg;

      damageFlashTimerRef.current = 0.28;
      let remaining = effectiveDmg;
      if (w.armor > 0) {
        const absorbed = Math.min(w.armor, remaining * 0.75);
        w.armor -= absorbed;
        remaining -= absorbed;
      }
      w.health = Math.max(0, w.health - remaining);
      if (w.health <= 0 && gameStateRef.current.status === 'PLAYING') {
        gameAudio.playDefeatMotif();
        setGameState((prev) => ({
          ...prev,
          status: 'GAME_OVER',
          score: w.score,
        }));
      }
    },
    [gameStateRef, setGameState],
  );

  const handlePickupCollected = useCallback(
    (kind: PickupItem['kind']) => {
      const w = worldRef.current;
      const ws = weaponStateRef.current;
      if (kind === 'medkit') {
        w.health = Math.min(w.maxHealth, w.health + 45);
        gameAudio.playPowerupChime();
        showToast('+45 Máu (Hộp Y Tế)');
      } else if (kind === 'armor') {
        w.armor = Math.min(w.maxArmor, w.armor + 50);
        gameAudio.playPowerupChime();
        showToast('+50 Giáp (Áo Chống Đạn)');
      } else {
        ws.reserve.pistol = Math.min(
          WEAPONS.pistol.maxReserve,
          ws.reserve.pistol + 36,
        );
        ws.reserve.smg = Math.min(WEAPONS.smg.maxReserve, ws.reserve.smg + 60);
        ws.reserve.rifle = Math.min(
          WEAPONS.rifle.maxReserve,
          ws.reserve.rifle + 60,
        );
        ws.reserve.shotgun = Math.min(
          WEAPONS.shotgun.maxReserve,
          ws.reserve.shotgun + 16,
        );
        gameAudio.playCoinPickup();
        showToast('Đã tiếp tế đạn dự trữ cho tất cả vũ khí!');
      }
    },
    [showToast],
  );

  const startMission = useCallback(
    (missionId: number) => {
      const mission = MISSIONS.find((m) => m.id === missionId);
      if (!mission) return;
      const w = worldRef.current;
      w.activeSideMissionId = null;
      w.activeMissionId = mission.id;
      w.missionStep = 0;
      w.missionTimer = mission.timeLimitSec ?? null;
      if (mission.wantedTrigger && w.wantedLevel < mission.wantedTrigger) {
        w.wantedLevel = mission.wantedTrigger;
        w.wantedHeat = Math.max(w.wantedHeat, mission.wantedTrigger * 110);
        w.wantedTimer = 0;
      }
      showToast(`Nhiệm vụ chính: ${mission.title}`);
    },
    [showToast],
  );

  const startSideMission = useCallback(
    (sideId: string) => {
      const sm = SIDE_MISSIONS.find((s) => s.id === sideId);
      if (!sm) return;
      const w = worldRef.current;
      w.activeMissionId = null;
      w.activeSideMissionId = sm.id;
      w.missionStep = 0;
      w.missionTimer = sm.timeLimitSec;
      if (sm.wantedTrigger && w.wantedLevel < sm.wantedTrigger) {
        w.wantedLevel = sm.wantedTrigger;
        w.wantedHeat = Math.max(w.wantedHeat, sm.wantedTrigger * 110);
        w.wantedTimer = 0;
      }
      showToast(`Nhiệm vụ phụ: ${sm.title}`);
    },
    [showToast],
  );

  const startRobbery = useCallback(
    (spotId: string) => {
      const spot = ROBBERY_SPOTS.find((s) => s.id === spotId);
      if (!spot) return;
      const w = worldRef.current;
      w.robberyActiveId = spot.id;
      w.robberyElapsed = 0;
      w.robberyPoliceDispatched = false;
      gameAudio.playErrorBuzz();
      showToast(
        `Đang cướp ${spot.name}! Chuông báo động reo — Cảnh sát sẽ đến sau ít giây!`,
      );
    },
    [showToast],
  );

  const startRace = useCallback(() => {
    const w = worldRef.current;
    w.activeMissionId = null;
    w.activeSideMissionId = null;
    w.missionTimer = null;

    // 5 staggered grid slots for AI racers + slot 6 for player
    const gridSlots: [number, number][] = [
      [728, -172],
      [728, -164],
      [719, -172],
      [719, -164],
      [710, -172],
      [710, -164],
    ];
    const startRotY = -Math.PI / 2; // Facing +X down the start straight

    // Choose player's race car (auto-assign Vortex GT paddock car if on foot or in tank)
    let playerVeh = w.inVehicleId
      ? w.vehicles.find((v) => v.id === w.inVehicleId)
      : undefined;
    if (!playerVeh || playerVeh.kind === 'tank' || playerVeh.isRacer) {
      if (playerVeh) playerVeh.occupiedByPlayer = false;
      const trackCar =
        w.vehicles.find((v) => v.id === 'veh-sports-track') ??
        w.vehicles.find((v) => v.kind === 'sports' && !v.id.startsWith('racer-'));
      if (trackCar) {
        trackCar.occupiedByPlayer = true;
        trackCar.headlightsOn = true;
        w.inVehicleId = trackCar.id;
        playerVeh = trackCar;
      }
    }

    if (playerVeh) {
      const [px, pz] = gridSlots[5];
      playerVeh.x = px;
      playerVeh.y = 0.08;
      playerVeh.z = pz;
      playerVeh.rotY = startRotY;
      playerVeh.speed = 0;
      playerVeh.braking = true;
      const pvb = vehicleBodiesRef.current[playerVeh.id];
      if (pvb && isBodyAlive(pvb)) {
        pvb.setTranslation({x: px, y: 0.14, z: pz}, true);
        pvb.setLinvel({x: 0, y: 0, z: 0}, true);
      }
      const pvg = vehicleGroupRefs.current[playerVeh.id];
      if (pvg) {
        pvg.position.set(px, 0.08, pz);
        pvg.rotation.y = startRotY;
      }
      const pb = playerBodyRef.current;
      if (pb && isBodyAlive(pb)) {
        pb.setGravityScale(0, true);
        pb.setLinvel({x: 0, y: 0, z: 0}, true);
        pb.setTranslation({x: px, y: 42, z: pz}, true);
      }
      playerPosRef.current.set(px, 0.08, pz);
      playerRotRef.current = startRotY;
    }

    // Place 5 AI racers on grid slots 0..4
    for (let idx = 0; idx < 5; idx++) {
      const aiId = `racer-${idx}`;
      const aiVeh = w.vehicles.find((v) => v.id === aiId);
      const [gx, gz] = gridSlots[idx];
      if (aiVeh) {
        aiVeh.occupiedByPlayer = false;
        aiVeh.x = gx;
        aiVeh.y = 0.08;
        aiVeh.z = gz;
        aiVeh.rotY = startRotY;
        aiVeh.speed = 0;
        aiVeh.braking = true;
        aiVeh.headlightsOn = true;
        const vb = vehicleBodiesRef.current[aiVeh.id];
        if (vb && isBodyAlive(vb)) {
          vb.setTranslation({x: gx, y: 0.14, z: gz}, true);
          vb.setLinvel({x: 0, y: 0, z: 0}, true);
        }
        const vg = vehicleGroupRefs.current[aiVeh.id];
        if (vg) {
          vg.position.set(gx, 0.08, gz);
          vg.rotation.y = startRotY;
        }
      }
      const ap = w.race.aiProgress[aiId];
      if (ap) {
        ap.lap = 1;
        ap.sampleIdx = 0;
        ap.gateStage = 0;
        ap.finished = false;
        ap.finishOrder = null;
      }
    }

    w.race.active = true;
    w.race.countdown = 3.4;
    w.race.lastCountdownBeep = 4;
    w.race.elapsedSec = 0;
    w.race.totalLaps = TOTAL_RACE_LAPS;
    w.race.playerRank = 6;
    w.race.finishCounter = 0;
    w.race.lastFinishedPos = null;
    w.race.playerProgress.lap = 1;
    w.race.playerProgress.sampleIdx = 0;
    w.race.playerProgress.gateStage = 0;
    w.race.playerProgress.finished = false;
    w.race.playerProgress.finishOrder = null;

    gameAudio.playConfirmSelect();
    showToast('Giải Đua Port Aurelia GP: Sẵn sàng trên vạch xuất phát!');
  }, [showToast]);

  const cancelRace = useCallback(() => {
    worldRef.current.race.active = false;
    worldRef.current.race.countdown = 0;
    showToast('Đã thoát khỏi cuộc đua GP.');
  }, [showToast]);

  const handleMissionComplete = useCallback(
    (
      kind: 'main' | 'side',
      id: number | string,
      rewardMoney: number,
      rewardScore: number,
    ) => {
      const w = worldRef.current;
      if (kind === 'main') {
        const completedCount = w.completedMissions.length;
        const nextLevel = Math.min(TOTAL_MISSIONS, completedCount + 1);
        if (completedCount >= TOTAL_MISSIONS) {
          setGameState((prev) => ({
            ...prev,
            status: 'VICTORY',
            score: w.score,
            level: TOTAL_MISSIONS,
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            score: w.score,
            level: nextLevel,
          }));
        }
      } else {
        setGameState((prev) => ({...prev, score: w.score}));
      }
      showToast(`Hoàn thành! +$${rewardMoney} · +${rewardScore} điểm`);
      void id;
    },
    [setGameState, showToast],
  );

  // Spend helper: draws from Cash first, then Bank Account seamlessly if allowed
  const spendFunds = (amount: number, allowBank = true): boolean => {
    const w = worldRef.current;
    const totalAvail = w.money + (allowBank ? w.bankBalance : 0);
    if (totalAvail < amount) {
      gameAudio.playErrorBuzz();
      showToast(`Không đủ tiền! Cần $${amount.toLocaleString('en-US')}.`);
      return false;
    }
    if (w.money >= amount) {
      w.money -= amount;
    } else {
      const rem = amount - w.money;
      w.money = 0;
      w.bankBalance -= rem;
    }
    return true;
  };

  useEffect(() => {
    commandApiRef.current = {
      selectWeapon: (id: WeaponId) => {
        weaponStateRef.current.weaponId = id;
        weaponStateRef.current.reloading = false;
        gameAudio.playCrispClick();
      },
      triggerReload: () => {
        const ws = weaponStateRef.current;
        const wSpec = WEAPONS[ws.weaponId];
        if (
          wSpec.magSize > 0 &&
          !ws.reloading &&
          ws.ammo[ws.weaponId] < wSpec.magSize
        ) {
          ws.reloading = true;
          ws.reloadDuration = wSpec.reloadSec;
          ws.reloadTimer = wSpec.reloadSec;
          gameAudio.playCrispClick();
        }
      },
      togglePointerLock: () => {
        toggleLockRef.current?.();
      },
      setWeather: (nextW: WeatherType) => {
        weatherRef.current = nextW;
      },
      setTimeOfDay: (t: number) => {
        timeOfDayRef.current = ((t % 1) + 1) % 1;
      },
      adjustZoom: (delta: number) => {
        cameraDistRef.current = THREE.MathUtils.clamp(
          cameraDistRef.current + delta,
          2.6,
          28.0,
        );
      },
      startMission,
      startSideMission,
      cancelActiveMission: () => {
        const w = worldRef.current;
        w.activeMissionId = null;
        w.activeSideMissionId = null;
        w.missionTimer = null;
        showToast('Đã hủy nhiệm vụ hiện tại.');
      },
      startRace,
      cancelRace,
      buySupply: (kind: 'ammo' | 'armor' | 'medkit') => {
        const w = worldRef.current;
        const ws = weaponStateRef.current;
        if (kind === 'ammo') {
          if (!spendFunds(120)) return;
          ws.reserve.pistol = WEAPONS.pistol.maxReserve;
          ws.reserve.smg = WEAPONS.smg.maxReserve;
          ws.reserve.rifle = WEAPONS.rifle.maxReserve;
          ws.reserve.shotgun = WEAPONS.shotgun.maxReserve;
          gameAudio.playCoinPickup();
          showToast('Đã nạp đầy đạn dự trữ toàn bộ vũ khí!');
        } else if (kind === 'armor') {
          if (w.armor >= w.maxArmor) {
            showToast('Giáp đã đầy!');
            return;
          }
          if (!spendFunds(250)) return;
          w.armor = w.maxArmor;
          gameAudio.playPowerupChime();
          showToast('Đã trang bị Áo Giáp Đầy (100%)!');
        } else {
          if (w.health >= w.maxHealth) {
            showToast('Máu đã đầy!');
            return;
          }
          if (!spendFunds(180)) return;
          w.health = w.maxHealth;
          gameAudio.playPowerupChime();
          showToast('Đã hồi phục Máu Đầy (100%)!');
        }
      },
      upgradeWeapon: (id: WeaponId) => {
        const w = worldRef.current;
        const cur = w.weaponUpgrades[id] ?? 0;
        if (cur >= 3) {
          showToast('Vũ khí này đã đạt cấp tối đa (Lv.3)!');
          return;
        }
        const cost = 450 + cur * 350;
        if (!spendFunds(cost)) return;
        w.weaponUpgrades[id] = cur + 1;
        gameAudio.playPowerupChime();
        showToast(`Đã nâng cấp ${WEAPONS[id].name} lên Lv.${cur + 1}!`);
      },
      bankDeposit: (amount: number) => {
        const w = worldRef.current;
        const val = Math.min(w.money, Math.max(0, Math.floor(amount)));
        if (val <= 0) {
          gameAudio.playErrorBuzz();
          showToast('Không có tiền mặt để gửi.');
          return;
        }
        w.money -= val;
        w.bankBalance += val;
        gameAudio.playCoinPickup();
        showToast(`Đã gửi $${val.toLocaleString('en-US')} vào Ngân hàng.`);
      },
      bankWithdraw: (amount: number) => {
        const w = worldRef.current;
        const val = Math.min(w.bankBalance, Math.max(0, Math.floor(amount)));
        if (val <= 0) {
          gameAudio.playErrorBuzz();
          showToast('Số dư Ngân hàng không đủ.');
          return;
        }
        w.bankBalance -= val;
        w.money += val;
        gameAudio.playCoinPickup();
        showToast(`Đã rút $${val.toLocaleString('en-US')} tiền mặt.`);
      },
      payBail: () => {
        const w = worldRef.current;
        if (w.wantedLevel <= 0) {
          showToast('Bạn hiện không bị truy nã.');
          return;
        }
        const cost = w.wantedLevel * 300;
        if (!spendFunds(cost)) return;
        w.wantedLevel = 0;
        w.wantedHeat = 0;
        w.wantedTimer = 0;
        gameAudio.playConfirmSelect();
        showToast(`Đã nộp $${cost} bảo lãnh — Xóa toàn bộ sao truy nã!`);
      },
      buyVehicle: (kind: VehicleKind) => {
        const w = worldRef.current;
        if (w.ownedVehicles.includes(kind)) {
          showToast('Bạn đã sở hữu mẫu xe này trong Gara!');
          return;
        }
        const item = VEHICLE_SHOP_CATALOG.find((c) => c.kind === kind);
        if (!item || !spendFunds(item.price)) return;
        w.ownedVehicles.push(kind);
        gameAudio.playVictoryFanfare();
        showToast(`Đã mua ${item.name}! Mở Gara để triệu hồi xe.`);
      },
      spawnOwnedVehicle: (kind: VehicleKind) => {
        const w = worldRef.current;
        if (!w.ownedVehicles.includes(kind)) {
          gameAudio.playErrorBuzz();
          return;
        }
        // Reposition an existing matching vehicle (or personal vehicle) right beside the player!
        let spawnX = THREE.MathUtils.clamp(
          playerPosRef.current.x + 6.0,
          -410,
          900,
        );
        if (spawnX >= RIVER_MIN_X - 3 && spawnX <= RIVER_MAX_X + 3) {
          spawnX = playerPosRef.current.x < 175 ? RIVER_MIN_X - 10 : RIVER_MAX_X + 10;
        }
        const spawnZ = THREE.MathUtils.clamp(
          playerPosRef.current.z + 2.5,
          -290,
          245,
        );
        const existing = w.vehicles.find(
          (v) => v.kind === kind && !v.occupiedByPlayer && !v.isPolice,
        );
        if (existing) {
          existing.x = spawnX;
          existing.y = 0.08;
          existing.z = spawnZ;
          existing.speed = 0;
          existing.customColor = w.vehicleColors[kind];
          const vb = vehicleBodiesRef.current[existing.id];
          if (vb && isBodyAlive(vb)) {
            vb.setTranslation({x: spawnX, y: 0.12, z: spawnZ}, true);
            vb.setLinvel({x: 0, y: 0, z: 0}, true);
          }
          gameAudio.playConfirmSelect();
          showToast(`Đã triệu hồi ${VEHICLE_SPECS[kind].name} ngay cạnh bạn!`);
        } else {
          showToast(`Xe ${VEHICLE_SPECS[kind].name} đang sẵn sàng trên bản đồ.`);
        }
      },
      paintVehicle: (kind: VehicleKind, colorHex: string) => {
        const w = worldRef.current;
        if (!spendFunds(150)) return;
        w.vehicleColors[kind] = colorHex;
        for (const v of w.vehicles) {
          if (v.kind === kind && !v.isPolice) {
            v.customColor = colorHex;
          }
        }
        gameAudio.playPowerupChime();
        showToast(`Đã sơn mới ${VEHICLE_SPECS[kind].name}!`);
      },
      repairAllVehicles: () => {
        const w = worldRef.current;
        if (!spendFunds(200)) return;
        for (const v of w.vehicles) {
          if (!v.isPolice) v.health = v.kind === 'tank' ? 400 : 100;
        }
        gameAudio.playConfirmSelect();
        showToast('Đã bảo dưỡng toàn bộ xe trong Gara!');
      },
      buyHouse: (houseId: string) => {
        const w = worldRef.current;
        const h = HOUSES.find((hh) => hh.id === houseId);
        if (!h) return;
        if (w.ownedHouses.includes(houseId)) {
          showToast('Bạn đã sở hữu căn nhà này!');
          return;
        }
        if (!spendFunds(h.price)) return;
        w.ownedHouses.push(houseId);
        gameAudio.playVictoryFanfare();
        showToast(`Chúc mừng! Đã sở hữu ${h.name}!`);
      },
      restAtHouse: (houseId: string) => {
        const w = worldRef.current;
        const h = HOUSES.find((hh) => hh.id === houseId);
        if (!h || !w.ownedHouses.includes(houseId)) {
          gameAudio.playErrorBuzz();
          showToast('Bạn cần mua căn nhà này trước khi nghỉ ngơi.');
          return;
        }
        w.health = w.maxHealth;
        w.stamina = 100;
        w.wantedLevel = 0;
        w.wantedHeat = 0;
        w.wantedTimer = 0;
        timeOfDayRef.current = (timeOfDayRef.current + 0.25) % 1;
        gameAudio.playPowerupChime();
        showToast(
          `Đã nghỉ ngơi tại ${h.name}: Đầy máu, qua 6 giờ & xóa sao truy nã!`,
        );
      },
      teleportToHouse: (houseId: string) => {
        const w = worldRef.current;
        if (w.wantedLevel > 0) {
          gameAudio.playErrorBuzz();
          showToast('Đang bị truy nã! Phải hết truy nã mới biến về nhà được.');
          return;
        }
        const h = HOUSES.find((hh) => hh.id === houseId);
        if (!h || !w.ownedHouses.includes(houseId)) return;
        if (w.inVehicleId) {
          const veh = w.vehicles.find((vv) => vv.id === w.inVehicleId);
          if (veh) veh.occupiedByPlayer = false;
          w.inVehicleId = null;
        }
        const pb = playerBodyRef.current;
        if (pb && isBodyAlive(pb)) {
          pb.setGravityScale(1, true);
          pb.setTranslation(
            {x: h.spawnPos[0], y: h.spawnPos[1], z: h.spawnPos[2]},
            true,
          );
          pb.setLinvel({x: 0, y: 0, z: 0}, true);
        }
        playerPosRef.current.set(h.spawnPos[0], h.spawnPos[1], h.spawnPos[2]);
        gameAudio.playConfirmSelect();
        showToast(`Đã dịch chuyển về ${h.name}`);
      },
      teleportHome: (houseId?: string) => {
        const w = worldRef.current;
        if (w.wantedLevel > 0) {
          gameAudio.playErrorBuzz();
          showToast('Đang bị truy nã! Phải hết truy nã mới biến về nhà được.');
          return;
        }
        if (w.race.active) {
          w.race.active = false;
          w.race.countdown = 0;
        }
        if (!w.ownedHouses.includes('house-starter')) {
          w.ownedHouses.unshift('house-starter');
        }
        const targetId =
          houseId && w.ownedHouses.includes(houseId)
            ? houseId
            : w.ownedHouses[w.ownedHouses.length - 1] ?? 'house-starter';
        const h =
          HOUSES.find((hh) => hh.id === targetId) ??
          HOUSES.find((hh) => hh.id === 'house-starter') ??
          HOUSES[0];
        if (!h) return;
        if (w.inVehicleId) {
          const veh = w.vehicles.find((vv) => vv.id === w.inVehicleId);
          if (veh) veh.occupiedByPlayer = false;
          w.inVehicleId = null;
        }
        const pb = playerBodyRef.current;
        if (pb && isBodyAlive(pb)) {
          pb.setGravityScale(1, true);
          pb.setTranslation(
            {x: h.spawnPos[0], y: h.spawnPos[1], z: h.spawnPos[2]},
            true,
          );
          pb.setLinvel({x: 0, y: 0, z: 0}, true);
        }
        playerPosRef.current.set(h.spawnPos[0], h.spawnPos[1], h.spawnPos[2]);
        gameAudio.playPowerupChime();
        showToast(`Đã biến về ${h.name}!`);
      },
      saveGame: (): SaveDataPayload => {
        const w = worldRef.current;
        const ws = weaponStateRef.current;
        return {
          money: w.money,
          bankBalance: w.bankBalance,
          score: w.score,
          health: w.health,
          armor: w.armor,
          playerPos: [
            playerPosRef.current.x,
            playerPosRef.current.y,
            playerPosRef.current.z,
          ],
          completedMissions: [...w.completedMissions],
          completedSideMissions: [...w.completedSideMissions],
          ownedVehicles: [...w.ownedVehicles],
          vehicleColors: {...w.vehicleColors},
          ownedHouses: [...w.ownedHouses],
          weaponUpgrades: {...w.weaponUpgrades},
          weaponAmmo: {...ws.ammo},
          weaponReserve: {...ws.reserve},
          weaponId: ws.weaponId,
          timeOfDay: timeOfDayRef.current,
          weather: weatherRef.current,
          savedAt: new Date().toLocaleTimeString('vi-VN'),
        };
      },
      loadGame: (data: SaveDataPayload) => {
        const w = worldRef.current;
        const ws = weaponStateRef.current;
        w.money = data.money ?? 500;
        w.bankBalance = data.bankBalance ?? 1000;
        w.score = data.score ?? 0;
        w.health = data.health ?? w.maxHealth;
        w.armor = data.armor ?? w.maxArmor;
        w.completedMissions = [...(data.completedMissions ?? [])];
        w.completedSideMissions = [...(data.completedSideMissions ?? [])];
        w.ownedVehicles = [...(data.ownedVehicles ?? ['sedan'])];
        w.vehicleColors = {...(data.vehicleColors ?? {})};
        w.ownedHouses = [...(data.ownedHouses ?? [])];
        if (!w.ownedHouses.includes('house-starter')) {
          w.ownedHouses.unshift('house-starter');
        }
        if (data.weaponUpgrades) w.weaponUpgrades = {...data.weaponUpgrades};
        if (data.weaponAmmo) ws.ammo = {...data.weaponAmmo};
        if (data.weaponReserve) ws.reserve = {...data.weaponReserve};
        w.activeMissionId = null;
        w.activeSideMissionId = null;
        w.missionTimer = null;
        ws.weaponId = data.weaponId ?? 'pistol';
        timeOfDayRef.current = data.timeOfDay ?? 0.42;

        // Re-apply saved vehicle colors
        for (const v of w.vehicles) {
          if (!v.isPolice && w.vehicleColors[v.kind]) {
            v.customColor = w.vehicleColors[v.kind];
          }
        }

        if (w.inVehicleId) {
          const cur = w.vehicles.find((vv) => vv.id === w.inVehicleId);
          if (cur) cur.occupiedByPlayer = false;
          w.inVehicleId = null;
        }

        const pb = playerBodyRef.current;
        if (pb && isBodyAlive(pb)) {
          pb.setGravityScale(1, true);
          pb.setTranslation(
            {
              x: data.playerPos[0],
              y: Math.max(0.15, data.playerPos[1]),
              z: data.playerPos[2],
            },
            true,
          );
          pb.setLinvel({x: 0, y: 0, z: 0}, true);
        }
        playerPosRef.current.set(
          data.playerPos[0],
          data.playerPos[1],
          data.playerPos[2],
        );

        setGameState((prev) => ({
          ...prev,
          score: w.score,
          level: Math.min(TOTAL_MISSIONS, w.completedMissions.length + 1),
        }));
        showToast(`Đã tải toàn bộ tiến trình lưu lúc ${data.savedAt}`);
      },
    };
  }, [commandApiRef, setGameState, showToast, startMission, startSideMission, startRace, cancelRace]);

  const lastCancelRef = useRef(false);
  const lastWheelRef = useRef(false);
  const lastHubRef = useRef(false);
  const telemetryAccRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const input = inputRef.current;

    hitMarkerTimerRef.current = Math.max(0, hitMarkerTimerRef.current - dt);
    damageFlashTimerRef.current = Math.max(0, damageFlashTimerRef.current - dt);

    if (input) {
      const cancelPressed = input.actions.cancel;
      if (cancelPressed && !lastCancelRef.current) {
        if (gameStateRef.current.status === 'PLAYING') {
          onTogglePauseMenu();
        }
      }
      lastCancelRef.current = cancelPressed;

      const wheelPressed = input.weaponWheel;
      if (wheelPressed && !lastWheelRef.current) {
        if (gameStateRef.current.status === 'PLAYING') {
          onToggleWeaponWheel();
        }
      }
      lastWheelRef.current = wheelPressed;

      const hubPressed = input.hubToggle;
      if (hubPressed && !lastHubRef.current) {
        if (gameStateRef.current.status === 'PLAYING') {
          onOpenHub();
        }
      }
      lastHubRef.current = hubPressed;
    }

    if (paused || gameState.status !== 'PLAYING') return;

    const cycleSec = Math.max(30, getConfig('dayCycleMinutes') * 60);
    timeOfDayRef.current = (timeOfDayRef.current + dt / cycleSec) % 1;

    telemetryAccRef.current += dt;
    if (telemetryAccRef.current >= 0.1) {
      telemetryAccRef.current = 0;
      const w = worldRef.current;
      const ws = weaponStateRef.current;
      const wSpec = WEAPONS[ws.weaponId];
      const activeVeh = w.inVehicleId
        ? w.vehicles.find((vv) => vv.id === w.inVehicleId)
        : null;
      const activeMain =
        w.activeMissionId !== null
          ? MISSIONS.find((m) => m.id === w.activeMissionId)
          : null;
      const activeSide =
        w.activeSideMissionId !== null
          ? SIDE_MISSIONS.find((s) => s.id === w.activeSideMissionId)
          : null;
      const runningMission = activeMain ?? activeSide;

      const nextMission = !runningMission
        ? MISSIONS.find((m) => !w.completedMissions.includes(m.id))
        : null;

      let targetX: number | null = null;
      let targetZ: number | null = null;
      if (w.race.active) {
        const st = w.race.playerProgress.gateStage;
        const gateIdx = st === 0 ? 24 : st === 1 ? 48 : st === 2 ? 72 : 0;
        const gs = RACETRACK_SAMPLES[gateIdx];
        targetX = gs.x;
        targetZ = gs.z;
      } else if (runningMission) {
        const cp = runningMission.checkpoints[w.missionStep];
        if (cp) {
          targetX = cp[0];
          targetZ = cp[2];
        }
      } else if (nextMission) {
        targetX = nextMission.startPos[0];
        targetZ = nextMission.startPos[2];
      }

      const blips: MinimapBlip[] = [];
      for (const v of w.vehicles) {
        if (v.occupiedByPlayer) continue;
        blips.push({
          x: v.x,
          z: v.z,
          type:
            v.isRacer && v.id.startsWith('racer-')
              ? 'racer'
              : v.kind === 'tank'
                ? 'tank'
                : v.isPolice && w.wantedLevel > 0
                  ? 'police'
                  : 'vehicle',
        });
      }
      blips.push({
        x: RACETRACK_PADDOCK_POS[0],
        z: RACETRACK_PADDOCK_POS[2],
        type: 'racetrack',
      });
      if (w.wantedLevel > 0) {
        for (const npc of w.npcs) {
          if (npc.isPolice && !npc.dead) {
            blips.push({x: npc.x, z: npc.z, type: 'police'});
          }
        }
      }
      for (const pk of w.pickups) {
        if (pk.active) {
          blips.push({x: pk.x, z: pk.z, type: pk.kind});
        }
      }
      for (const spot of ROBBERY_SPOTS) {
        blips.push({
          x: spot.triggerPos[0],
          z: spot.triggerPos[2],
          type: spot.kind,
        });
      }
      for (const sp of SHOP_SPOTS) {
        blips.push({x: sp[0], z: sp[2], type: 'shop'});
      }
      blips.push({x: GARAGE_POS[0], z: GARAGE_POS[2], type: 'garage'});
      for (const atm of BANK_ATM_SPOTS) {
        blips.push({x: atm[0], z: atm[2], type: 'bank_atm'});
      }
      for (const h of HOUSES) {
        blips.push({x: h.pos[0], z: h.pos[2], type: 'house'});
      }
      for (const sm of SIDE_MISSIONS) {
        blips.push({
          x: sm.startPos[0],
          z: sm.startPos[2],
          type: 'side_mission',
        });
      }
      if (targetX !== null && targetZ !== null) {
        blips.push({
          x: targetX,
          z: targetZ,
          type: runningMission ? 'checkpoint' : 'mission',
        });
      }

      const activeRobberySpot = w.robberyActiveId
        ? ROBBERY_SPOTS.find((s) => s.id === w.robberyActiveId)
        : null;

      onTelemetry({
        health: Math.round(w.health),
        maxHealth: w.maxHealth,
        armor: Math.round(w.armor),
        maxArmor: w.maxArmor,
        stamina: Math.round(w.stamina),
        money: w.money,
        bankBalance: w.bankBalance,
        wantedLevel: w.wantedLevel,
        policeSightActive: w.policeSawPlayer,
        wantedEvadeProgress:
          w.wantedLevel > 0
            ? Math.min(1, w.wantedTimer / Math.max(1, w.wantedEvadeDuration))
            : 0,
        district: getDistrictName(
          playerPosRef.current.x,
          playerPosRef.current.z,
        ),
        inVehicle: Boolean(activeVeh),
        inTank: activeVeh?.kind === 'tank',
        vehicleName: activeVeh ? VEHICLE_SPECS[activeVeh.kind].name : 'Đi bộ',
        speedKmh: activeVeh ? Math.round(Math.abs(activeVeh.speed) * 4.2) : 0,
        nearbyPrompt: nearbyPromptRef.current,
        weaponId: ws.weaponId,
        weaponName: wSpec.name,
        ammoInMag: ws.ammo[ws.weaponId],
        magSize: wSpec.magSize,
        reserveAmmo: ws.reserve[ws.weaponId],
        reloading: ws.reloading,
        reloadProgress: ws.reloading
          ? Math.min(1, 1 - ws.reloadTimer / Math.max(0.1, ws.reloadDuration))
          : 0,
        isAiming: ws.isAiming,
        crosshairSpread: ws.crosshairSpread,
        hitMarkerActive: hitMarkerTimerRef.current > 0,
        damageFlashActive: damageFlashTimerRef.current > 0,
        activeMissionId: w.activeMissionId,
        activeSideMissionId: w.activeSideMissionId,
        activeMissionCategory: activeMain ? 'main' : activeSide ? 'side' : null,
        activeMissionTitle: runningMission?.title ?? '',
        activeMissionObjective: runningMission
          ? runningMission.objectiveText
          : nextMission
            ? `Nhiệm vụ chính: ${nextMission.title} · Hoặc mở [B] Trung Tâm Đô Thị`
            : 'Tự do khám phá · Nhiệm vụ phụ · Xe tăng & Ngân hàng [B]',
        activeMissionStep: w.missionStep + 1,
        activeMissionTotalSteps: runningMission?.checkpoints.length ?? 0,
        missionTimerSec:
          w.missionTimer !== null ? Math.ceil(w.missionTimer) : null,
        completedMissions: [...w.completedMissions],
        completedSideMissions: [...w.completedSideMissions],
        ownedVehicles: [...w.ownedVehicles],
        vehicleColors: {...w.vehicleColors},
        ownedHouses: [...w.ownedHouses],
        weaponUpgrades: {...w.weaponUpgrades},
        robberyActiveName: activeRobberySpot?.name ?? null,
        robberyProgress: activeRobberySpot
          ? Math.min(1, w.robberyElapsed / activeRobberySpot.durationSec)
          : null,
        robberyPoliceDispatched: w.robberyPoliceDispatched,
        cameraMode: cameraModeRef.current,
        cameraDistance: Number(cameraDistRef.current.toFixed(1)),
        pointerLocked: Boolean(input?.pointerLocked),
        playerX: playerPosRef.current.x,
        playerZ: playerPosRef.current.z,
        playerRotY: playerRotRef.current,
        targetX,
        targetZ,
        timeOfDayLabel: getTimeLabel(timeOfDayRef.current),
        timeNormalized: timeOfDayRef.current,
        weather: weatherRef.current,
        raceActive: w.race.active,
        raceCountdown: Math.ceil(w.race.countdown),
        raceLap: w.race.playerProgress.lap,
        raceTotalLaps: w.race.totalLaps,
        racePosition: w.race.playerRank,
        raceTotalRacers: 6,
        raceElapsedSec: w.race.elapsedSec,
        raceFinishedPos: w.race.lastFinishedPos,
        blips,
        toastMessage: w.toastMessage,
      });
    }
  });

  const simEnabled = gameState.status === 'PLAYING' && !paused;

  return (
    <group>
      <DefaultLighting
        timeOfDayRef={timeOfDayRef}
        weather={weather}
        quality={quality}
        playerPosRef={playerPosRef}
      />

      <CityEnvironment
        weather={weather}
        quality={quality}
        timeOfDayRef={timeOfDayRef}
        trafficLightRef={trafficLightRef}
        paused={paused}
      />

      <PlayerAndCamera
        inputRef={inputRef}
        enabled={simEnabled}
        worldRef={worldRef}
        playerBodyRef={playerBodyRef}
        playerPosRef={playerPosRef}
        playerRotRef={playerRotRef}
        vehicleBodiesRef={vehicleBodiesRef}
        vehicleGroupRefs={vehicleGroupRefs}
        projectilesRef={projectilesRef}
        particlesRef={particlesRef}
        weaponStateRef={weaponStateRef}
        cameraModeRef={cameraModeRef}
        cameraDistRef={cameraDistRef}
        externalShakeRef={externalShakeRef}
        weather={weather}
        nearbyPromptRef={nearbyPromptRef}
        onHitMarker={handleHitMarker}
        onStartMission={startMission}
        onStartSideMission={startSideMission}
        onStartRobbery={startRobbery}
        onStartRace={startRace}
        onOpenHub={onOpenHub}
        onShowToast={showToast}
      />

      <WorldSim
        worldRef={worldRef}
        playerPosRef={playerPosRef}
        playerRotRef={playerRotRef}
        vehicleBodiesRef={vehicleBodiesRef}
        vehicleGroupRefs={vehicleGroupRefs}
        trafficLightRef={trafficLightRef}
        projectilesRef={projectilesRef}
        particlesRef={particlesRef}
        weather={weather}
        quality={quality}
        paused={!simEnabled}
        onPlayerDamage={handlePlayerDamage}
        onPickupCollected={handlePickupCollected}
        onHitMarker={handleHitMarker}
        onCameraShake={handleCameraShake}
        onMissionComplete={handleMissionComplete}
        onShowToast={showToast}
      />
    </group>
  );
});

function CameraSetup(): null {
  const {camera} = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = getConfig('fov');
      camera.updateProjectionMatrix();
    }
  }, [camera]);
  return null;
}

function canCreateWebGLContext(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    probeCanvas.width = 0;
    probeCanvas.height = 0;
    return true;
  } catch {
    return false;
  }
}

function WebGlUnavailableFallback(): React.ReactElement {
  return (
    <div
      role="alert"
      className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-300 p-6 text-center text-sm">
      Đồ họa WebGL2 không khả dụng trên thiết bị hoặc trình duyệt này.
    </div>
  );
}

const WEBGL_CONTEXT_ERROR_RE = /webgl2? context/i;

class CanvasErrorBoundary extends Component {
  declare readonly props: {readonly children: React.ReactNode};
  state: {readonly error: Error | null} = {error: null};

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  componentDidCatch(error: Error): void {
    if (WEBGL_CONTEXT_ERROR_RE.test(error?.message ?? '')) {
      console.error(error);
    }
  }

  render(): React.ReactNode {
    const {error} = this.state;
    if (error) {
      if (!WEBGL_CONTEXT_ERROR_RE.test(error.message ?? '')) {
        throw error;
      }
      return <WebGlUnavailableFallback />;
    }
    return this.props.children;
  }
}

export const Game = React.memo(function Game({
  gameState,
  setGameState,
  exitChat,
  gameStateRef,
  externalInputRef,
  paused,
  quality,
  weather,
  onTogglePauseMenu,
  onToggleWeaponWheel,
  onOpenHub,
  onTelemetry,
  commandApiRef,
}: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleLockRef = useRef<(() => void) | null>(null);
  const inputRef = useInput(containerRef, {
    enabled: true,
    allowPointerLock: gameState.status === 'PLAYING' && !paused,
    externalInputRef,
    onToggleLockRef: toggleLockRef,
  });
  const [webGlAvailable, setWebGlAvailable] = useState(canCreateWebGLContext);

  const dprRange: [number, number] =
    quality === 'low'
      ? [0.75, 1]
      : quality === 'medium'
        ? [1, 1.25]
        : quality === 'high'
          ? [1, 1.5]
          : [1, 2];

  const createGlRenderer = useCallback(
    (defaultProps: Record<string, unknown>) => {
      try {
        const renderer = new THREE.WebGLRenderer({
          ...defaultProps,
          antialias: quality !== 'low',
          powerPreference: 'high-performance',
        });
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        return renderer;
      } catch (err) {
        console.error(err);
        setWebGlAvailable(false);
        return new Promise<never>(() => {});
      }
    },
    [quality],
  );

  return (
    <div ref={containerRef} className="w-full h-full canvas-wrapper">
      {webGlAvailable ? (
        <CanvasErrorBoundary>
          <Canvas
            shadows={quality !== 'low'}
            dpr={dprRange}
            camera={CANVAS_CAMERA_PROPS}
            gl={createGlRenderer}
            scene={CANVAS_SCENE_PROPS}>
            <Suspense fallback={null}>
              <CameraSetup />

              <Physics
                gravity={[0, getConfig('gravity'), 0]}
                timeStep={1 / 60}
                interpolate
                paused={paused || gameState.status !== 'PLAYING'}>
                <Scene
                  gameState={gameState}
                  setGameState={setGameState}
                  inputRef={inputRef}
                  toggleLockRef={toggleLockRef}
                  gameStateRef={gameStateRef}
                  paused={paused}
                  quality={quality}
                  weather={weather}
                  onTogglePauseMenu={onTogglePauseMenu}
                  onToggleWeaponWheel={onToggleWeaponWheel}
                  onOpenHub={onOpenHub}
                  onTelemetry={onTelemetry}
                  commandApiRef={commandApiRef}
                />
              </Physics>

              {quality !== 'low' && (
                <EffectComposer>
                  <Bloom
                    luminanceThreshold={1.05}
                    luminanceSmoothing={0.85}
                    intensity={quality === 'ultra' ? 0.65 : 0.45}
                    mipmapBlur
                  />
                </EffectComposer>
              )}
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      ) : (
        <WebGlUnavailableFallback />
      )}
    </div>
  );
});
