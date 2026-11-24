import * as THREE from 'three';
import {
  EnterableBuildingDef,
  HouseDef,
  MissionDef,
  PickupItem,
  RobberySpotDef,
  SideMissionDef,
  VehicleInstance,
  VehicleKind,
  VehicleShopItem,
  VehicleSpec,
  WallBoxDef,
  WeaponId,
  WeaponSpec,
} from '../types';

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: 'fists',
    name: 'Cận chiến',
    damage: 30,
    fireRate: 2.5,
    range: 2.8,
    magSize: 0,
    startReserve: 0,
    maxReserve: 0,
    reloadSec: 0,
    spread: 0,
    recoil: 0,
    pellets: 1,
    automatic: false,
  },
  pistol: {
    id: 'pistol',
    name: 'Súng Lục 9mm',
    damage: 36,
    fireRate: 4.5,
    range: 75,
    magSize: 12,
    startReserve: 72,
    maxReserve: 144,
    reloadSec: 1.0,
    spread: 0.015,
    recoil: 0.016,
    pellets: 1,
    automatic: false,
  },
  smg: {
    id: 'smg',
    name: 'Tiểu Liên Vector',
    damage: 22,
    fireRate: 11.5,
    range: 65,
    magSize: 30,
    startReserve: 150,
    maxReserve: 300,
    reloadSec: 1.3,
    spread: 0.032,
    recoil: 0.011,
    pellets: 1,
    automatic: true,
  },
  rifle: {
    id: 'rifle',
    name: 'Súng Trường Carbine',
    damage: 34,
    fireRate: 8.8,
    range: 105,
    magSize: 30,
    startReserve: 120,
    maxReserve: 240,
    reloadSec: 1.5,
    spread: 0.016,
    recoil: 0.018,
    pellets: 1,
    automatic: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun Chiến Thuật',
    damage: 22,
    fireRate: 1.5,
    range: 34,
    magSize: 8,
    startReserve: 32,
    maxReserve: 64,
    reloadSec: 1.7,
    spread: 0.075,
    recoil: 0.038,
    pellets: 6,
    automatic: false,
  },
};

export const INITIAL_PICKUPS: PickupItem[] = [
  {id: 'pk-med-1', kind: 'medkit', x: -12, y: 0.6, z: 12, active: true, respawnTimer: 0},
  {id: 'pk-arm-1', kind: 'armor', x: 14, y: 0.6, z: -12, active: true, respawnTimer: 0},
  {id: 'pk-amm-1', kind: 'ammo', x: -14, y: 0.6, z: -26, active: true, respawnTimer: 0},
  {id: 'pk-med-2', kind: 'medkit', x: 56, y: 0.6, z: -42, active: true, respawnTimer: 0},
  {id: 'pk-arm-2', kind: 'armor', x: -72, y: 0.6, z: 12, active: true, respawnTimer: 0},
  {id: 'pk-amm-2', kind: 'ammo', x: 52, y: 0.6, z: 54, active: true, respawnTimer: 0},
  {id: 'pk-med-3', kind: 'medkit', x: -240, y: 0.6, z: 16, active: true, respawnTimer: 0},
  {id: 'pk-arm-3', kind: 'armor', x: 64, y: 0.6, z: -180, active: true, respawnTimer: 0},
  // East New City Pickups
  {id: 'pk-med-4', kind: 'medkit', x: 288, y: 0.6, z: 14, active: true, respawnTimer: 0},
  {id: 'pk-arm-4', kind: 'armor', x: 400, y: 0.6, z: -14, active: true, respawnTimer: 0},
  {id: 'pk-amm-4', kind: 'ammo', x: 650, y: 0.6, z: -140, active: true, respawnTimer: 0},
  {id: 'pk-med-5', kind: 'medkit', x: 520, y: 0.6, z: 220, active: true, respawnTimer: 0},
  {id: 'pk-arm-5', kind: 'armor', x: 800, y: 0.6, z: 0, active: true, respawnTimer: 0},
];

export const WEAPON_ORDER: WeaponId[] = [
  'fists',
  'pistol',
  'smg',
  'rifle',
  'shotgun',
];

export const VEHICLE_SPECS: Record<VehicleKind, VehicleSpec> = {
  sedan: {
    kind: 'sedan',
    name: 'Metro Sedan',
    color: '#3b82f6',
    accentColor: '#1e293b',
    maxSpeed: 29,
    reverseSpeed: 10,
    accel: 16,
    brake: 28,
    turnRate: 2.3,
    grip: 7.5,
    mass: 1350,
    length: 4.4,
    width: 1.9,
    height: 1.35,
  },
  suv: {
    kind: 'suv',
    name: 'Titan SUV',
    color: '#1e293b',
    accentColor: '#94a3b8',
    maxSpeed: 26,
    reverseSpeed: 9,
    accel: 14,
    brake: 24,
    turnRate: 2.0,
    grip: 8.2,
    mass: 2100,
    length: 4.8,
    width: 2.1,
    height: 1.75,
  },
  sports: {
    kind: 'sports',
    name: 'Vortex GT',
    color: '#ef4444',
    accentColor: '#0f172a',
    maxSpeed: 44,
    reverseSpeed: 12,
    accel: 27,
    brake: 36,
    turnRate: 2.75,
    grip: 8.5,
    mass: 1200,
    length: 4.3,
    width: 2.0,
    height: 1.15,
  },
  muscle: {
    kind: 'muscle',
    name: 'Viper Muscle',
    color: '#f59e0b',
    accentColor: '#111827',
    maxSpeed: 38,
    reverseSpeed: 11,
    accel: 24,
    brake: 30,
    turnRate: 2.4,
    grip: 6.2,
    mass: 1550,
    length: 4.6,
    width: 2.05,
    height: 1.28,
  },
  motorcycle: {
    kind: 'motorcycle',
    name: 'Apex Moto',
    color: '#10b981',
    accentColor: '#0f172a',
    maxSpeed: 42,
    reverseSpeed: 6,
    accel: 29,
    brake: 34,
    turnRate: 3.1,
    grip: 8.0,
    mass: 260,
    length: 2.2,
    width: 0.78,
    height: 1.05,
  },
  police: {
    kind: 'police',
    name: 'Aegis Tuần Tra',
    color: '#0f172a',
    accentColor: '#f8fafc',
    maxSpeed: 36,
    reverseSpeed: 11,
    accel: 21,
    brake: 32,
    turnRate: 2.5,
    grip: 8.0,
    mass: 1400,
    length: 4.5,
    width: 1.95,
    height: 1.42,
  },
  tank: {
    kind: 'tank',
    name: 'Chiến Xa Rhino X1',
    color: '#4b5a3c',
    accentColor: '#1f261b',
    maxSpeed: 28,
    reverseSpeed: 13,
    accel: 20,
    brake: 32,
    turnRate: 1.95,
    grip: 9.8,
    mass: 95000,
    length: 6.2,
    width: 3.3,
    height: 2.35,
  },
};

export const VEHICLE_SHOP_CATALOG: VehicleShopItem[] = [
  {
    kind: 'sedan',
    name: 'Metro Sedan',
    price: 1200,
    description: 'Xe sedan đô thị cân bằng, bền bỉ trên mọi tuyến phố.',
    topSpeedKmh: 122,
    armorLabel: 'Tiêu chuẩn',
  },
  {
    kind: 'motorcycle',
    name: 'Apex Moto',
    price: 1800,
    description: 'Mô tô phân khối lớn luồn lách siêu nhanh khi cắt đuôi cảnh sát.',
    topSpeedKmh: 176,
    armorLabel: 'Nhẹ',
  },
  {
    kind: 'suv',
    name: 'Titan SUV',
    price: 2200,
    description: 'SUV hạng nặng đâm húc tốt, gầm cao vững chắc.',
    topSpeedKmh: 109,
    armorLabel: 'Khá',
  },
  {
    kind: 'muscle',
    name: 'Viper Muscle',
    price: 2900,
    description: 'Xe cơ bắp V8 gia tốc mạnh, drift cực mượt.',
    topSpeedKmh: 160,
    armorLabel: 'Tiêu chuẩn',
  },
  {
    kind: 'sports',
    name: 'Vortex GT',
    price: 4500,
    description: 'Siêu xe thể thao tốc độ cao nhất Port Aurelia.',
    topSpeedKmh: 185,
    armorLabel: 'Nhẹ',
  },
  {
    kind: 'tank',
    name: 'Chiến Xa Rhino X1',
    price: 12000,
    description:
      'Xe tăng siêu giáp miễn nhiễm đạn súng thường, húc văng mọi xe cảnh sát & bắn pháo 120mm!',
    topSpeedKmh: 118,
    armorLabel: 'Bất Tử Đạn',
  },
];

export const PAINT_OPTIONS = [
  {label: 'Đỏ Đua', hex: '#ef4444'},
  {label: 'Xanh Dương', hex: '#2563eb'},
  {label: 'Vàng Cam', hex: '#f59e0b'},
  {label: 'Đen Nhám', hex: '#1e293b'},
  {label: 'Trắng Ngọc', hex: '#e2e8f0'},
  {label: 'Xanh Lính', hex: '#4b5a3c'},
];

export const RIVER_MIN_X = 110;
export const RIVER_MAX_X = 240; // 130 units wide deep river!
export const BRIDGE_DECK_Y = 3.6;
export const BRIDGE_RAMP_LEN = 36;
export const BRIDGE_Z_CENTERS = [-140, 0, 140];

export const ROAD_X_WEST = [-360, -240, -128, -64, 0, 64];
export const ROAD_X_EAST = [288, 400, 520, 650, 800];
export const ROAD_X_CENTERS = [...ROAD_X_WEST, ...ROAD_X_EAST];
export const ROAD_Z_CENTERS = [-260, -140, 0, 64, 140, 230];
export const ROAD_WIDTH = 12;

// === PORT AURELIA INTERNATIONAL SPEEDWAY (TRƯỜNG ĐUA Ô TÔ GP) ===
export const TOTAL_RACE_LAPS = 3;
export const RACETRACK_WIDTH = 17;
export const RACETRACK_HALF_W = RACETRACK_WIDTH * 0.5;
export const RACETRACK_PADDOCK_POS: [number, number, number] = [715, 0, -151];

export const RACETRACK_CONTROL_POINTS: [number, number][] = [
  [735, -168], // 0: Start/Finish Line (heading +X)
  [785, -168],
  [835, -168],
  [874, -172],
  [894, -186],
  [899, -201], // East Hairpin Apex
  [894, -217],
  [874, -230],
  [835, -234],
  [795, -233],
  [765, -216], // Technical S-Chicane
  [735, -213],
  [705, -229],
  [670, -234],
  [635, -230],
  [615, -217],
  [610, -201], // West Hairpin Apex
  [615, -186],
  [635, -172],
  [680, -168],
];

export interface RacetrackSample {
  x: number;
  z: number;
  tx: number; // unit forward tangent X
  tz: number; // unit forward tangent Z
  nx: number; // unit outward-right normal X
  nz: number; // unit outward-right normal Z
}

export const RACETRACK_SAMPLE_COUNT = 96;

export const RACETRACK_SAMPLES: RacetrackSample[] = (() => {
  const curvePts = RACETRACK_CONTROL_POINTS.map(
    ([x, z]) => new THREE.Vector3(x, 0, z),
  );
  const curve = new THREE.CatmullRomCurve3(curvePts, true, 'catmullrom', 0.45);
  const out: RacetrackSample[] = [];
  for (let i = 0; i < RACETRACK_SAMPLE_COUNT; i++) {
    const u = i / RACETRACK_SAMPLE_COUNT;
    const pt = curve.getPointAt(u);
    const tan = curve.getTangentAt(u).normalize();
    // Right-hand outward normal in XZ plane when heading clockwise (+X at bottom, -X at top)
    // Wait: at bottom straight tan = (+1, 0), outward (South, +Z) is (-tan.z, tan.x) = (0, +1)!
    const nx = -tan.z;
    const nz = tan.x;
    out.push({
      x: pt.x,
      z: pt.z,
      tx: tan.x,
      tz: tan.z,
      nx,
      nz,
    });
  }
  return out;
})();

export interface BarrierSegmentDef {
  x: number;
  z: number;
  w: number;
  d: number;
  rotY: number;
}

export const RACETRACK_BARRIER_SEGMENTS: BarrierSegmentDef[] = (() => {
  const segs: BarrierSegmentDef[] = [];
  const outerOffset = RACETRACK_HALF_W + 1.5;
  const innerOffset = -RACETRACK_HALF_W - 1.5;
  const n = RACETRACK_SAMPLES.length;

  for (let i = 0; i < n; i++) {
    const a = RACETRACK_SAMPLES[i];
    const b = RACETRACK_SAMPLES[(i + 1) % n];

    // Outer barrier (leave paddock entrance opening around X: 690..726, Z > -164)
    const oxA = a.x + a.nx * outerOffset;
    const ozA = a.z + a.nz * outerOffset;
    const oxB = b.x + b.nx * outerOffset;
    const ozB = b.z + b.nz * outerOffset;
    const omx = (oxA + oxB) * 0.5;
    const omz = (ozA + ozB) * 0.5;
    const isPaddockGate = omx > 690 && omx < 726 && omz > -164;
    if (!isPaddockGate) {
      const len = Math.hypot(oxB - oxA, ozB - ozA) + 0.35;
      const rotY = Math.atan2(oxB - oxA, ozB - ozA);
      segs.push({x: omx, z: omz, w: 0.9, d: len, rotY});
    }

    // Inner infield barrier
    const ixA = a.x + a.nx * innerOffset;
    const izA = a.z + a.nz * innerOffset;
    const ixB = b.x + b.nx * innerOffset;
    const izB = b.z + b.nz * innerOffset;
    const imx = (ixA + ixB) * 0.5;
    const imz = (izA + izB) * 0.5;
    const ilen = Math.hypot(ixB - ixA, izB - izA) + 0.35;
    const irotY = Math.atan2(ixB - ixA, izB - izA);
    segs.push({x: imx, z: imz, w: 0.9, d: ilen, rotY: irotY});
  }
  return segs;
})();

export function getBridgeSurfaceY(x: number, z: number): number {
  const onBridgeCorridor = BRIDGE_Z_CENTERS.some(
    (bz) => Math.abs(z - bz) <= 8.2,
  );
  if (!onBridgeCorridor) return 0;
  if (x >= RIVER_MIN_X && x <= RIVER_MAX_X) return BRIDGE_DECK_Y;
  if (x >= RIVER_MIN_X - BRIDGE_RAMP_LEN && x < RIVER_MIN_X) {
    return (
      ((x - (RIVER_MIN_X - BRIDGE_RAMP_LEN)) / BRIDGE_RAMP_LEN) * BRIDGE_DECK_Y
    );
  }
  if (x > RIVER_MAX_X && x <= RIVER_MAX_X + BRIDGE_RAMP_LEN) {
    return (
      ((RIVER_MAX_X + BRIDGE_RAMP_LEN - x) / BRIDGE_RAMP_LEN) * BRIDGE_DECK_Y
    );
  }
  return 0;
}

function buildEnterableShell(params: {
  x: number;
  baseY?: number;
  z: number;
  w: number;
  d: number;
  h: number;
  doorSide: 'north' | 'south' | 'east' | 'west';
  doorWidth: number;
  doorHeight: number;
  openBalconySide?: 'north' | 'south' | 'east' | 'west';
}): WallBoxDef[] {
  const {
    x,
    baseY = 0,
    z,
    w,
    d,
    h,
    doorSide,
    doorWidth,
    doorHeight,
    openBalconySide,
  } = params;
  const t = 0.7;
  const boxes: WallBoxDef[] = [];

  const addSolidWall = (wx: number, wz: number, ww: number, wd: number) => {
    boxes.push({x: wx, y: baseY + h / 2, z: wz, w: ww, h, d: wd});
  };

  const addBalconyRailingNS = (wz: number) => {
    boxes.push({x, y: baseY + 0.65, z: wz, w, h: 1.3, d: 0.4});
  };

  const addBalconyRailingEW = (wx: number) => {
    boxes.push({x: wx, y: baseY + 0.65, z, w: 0.4, h: 1.3, d});
  };

  const addDoorWallNS = (wz: number) => {
    const segW = Math.max(1, (w - doorWidth) / 2);
    boxes.push({
      x: x - w / 2 + segW / 2,
      y: baseY + h / 2,
      z: wz,
      w: segW,
      h,
      d: t,
    });
    boxes.push({
      x: x + w / 2 - segW / 2,
      y: baseY + h / 2,
      z: wz,
      w: segW,
      h,
      d: t,
    });
    const lintelH = Math.max(0.8, h - doorHeight);
    boxes.push({
      x,
      y: baseY + doorHeight + lintelH / 2,
      z: wz,
      w: doorWidth,
      h: lintelH,
      d: t,
    });
  };

  const addDoorWallEW = (wx: number) => {
    const segD = Math.max(1, (d - doorWidth) / 2);
    boxes.push({
      x: wx,
      y: baseY + h / 2,
      z: z - d / 2 + segD / 2,
      w: t,
      h,
      d: segD,
    });
    boxes.push({
      x: wx,
      y: baseY + h / 2,
      z: z + d / 2 - segD / 2,
      w: t,
      h,
      d: segD,
    });
    const lintelH = Math.max(0.8, h - doorHeight);
    boxes.push({
      x: wx,
      y: baseY + doorHeight + lintelH / 2,
      z,
      w: t,
      h: lintelH,
      d: doorWidth,
    });
  };

  if (openBalconySide === 'north') addBalconyRailingNS(z - d / 2 + 0.25);
  else if (doorSide === 'north') addDoorWallNS(z - d / 2 + t / 2);
  else addSolidWall(x, z - d / 2 + t / 2, w, t);

  if (openBalconySide === 'south') addBalconyRailingNS(z + d / 2 - 0.25);
  else if (doorSide === 'south') addDoorWallNS(z + d / 2 - t / 2);
  else addSolidWall(x, z + d / 2 - t / 2, w, t);

  if (openBalconySide === 'west') addBalconyRailingEW(x - w / 2 + 0.25);
  else if (doorSide === 'west') addDoorWallEW(x - w / 2 + t / 2);
  else addSolidWall(x - w / 2 + t / 2, z, t, d);

  if (openBalconySide === 'east') addBalconyRailingEW(x + w / 2 - 0.25);
  else if (doorSide === 'east') addDoorWallEW(x + w / 2 - t / 2);
  else addSolidWall(x + w / 2 - t / 2, z, t, d);

  return boxes;
}

export const ENTERABLE_BUILDINGS: EnterableBuildingDef[] = [
  {
    id: 'ent-bank-west',
    kind: 'bank',
    name: 'Ngân Hàng Trung Ương Port Aurelia',
    x: -34,
    z: -18,
    w: 24,
    d: 20,
    h: 16,
    doorSide: 'east',
    doorWidth: 6.4,
    doorHeight: 4.8,
    exteriorColor: '#e2e8f0',
    interiorFloorColor: '#cbd5e1',
    interiorWallColor: '#f8fafc',
    accentColor: '#f59e0b',
    wallBoxes: buildEnterableShell({
      x: -34,
      z: -18,
      w: 24,
      d: 20,
      h: 16,
      doorSide: 'east',
      doorWidth: 6.4,
      doorHeight: 4.8,
    }),
  },
  {
    id: 'ent-jewelry-west',
    kind: 'jewelry',
    name: 'Tiệm Kim Hoàn Aurelia Diamond',
    x: 42,
    z: -42,
    w: 20,
    d: 18,
    h: 9.5,
    doorSide: 'east',
    doorWidth: 5.8,
    doorHeight: 4.5,
    exteriorColor: '#1e1b4b',
    interiorFloorColor: '#f8fafc',
    interiorWallColor: '#e0e7ff',
    accentColor: '#38bdf8',
    wallBoxes: buildEnterableShell({
      x: 42,
      z: -42,
      w: 20,
      d: 18,
      h: 9.5,
      doorSide: 'east',
      doorWidth: 5.8,
      doorHeight: 4.5,
    }),
  },
  {
    id: 'ent-shop-west',
    kind: 'shop',
    name: 'Cửa Hàng Vũ Khí & Xe Ammu-Aurelia',
    x: 42,
    z: -18,
    w: 20,
    d: 18,
    h: 9,
    doorSide: 'east',
    doorWidth: 5.6,
    doorHeight: 4.4,
    exteriorColor: '#1e293b',
    interiorFloorColor: '#334155',
    interiorWallColor: '#475569',
    accentColor: '#06b6d4',
    wallBoxes: buildEnterableShell({
      x: 42,
      z: -18,
      w: 20,
      d: 18,
      h: 9,
      doorSide: 'east',
      doorWidth: 5.6,
      doorHeight: 4.4,
    }),
  },
  {
    id: 'ent-mart-west',
    kind: 'minimart',
    name: 'Siêu Thị Tiện Lợi 24/7 Đồi Tây',
    x: -88,
    z: 18,
    w: 18,
    d: 16,
    h: 7.5,
    doorSide: 'east',
    doorWidth: 5.2,
    doorHeight: 4.2,
    exteriorColor: '#166534',
    interiorFloorColor: '#e2e8f0',
    interiorWallColor: '#f1f5f9',
    accentColor: '#22c55e',
    wallBoxes: buildEnterableShell({
      x: -88,
      z: 18,
      w: 18,
      d: 16,
      h: 7.5,
      doorSide: 'east',
      doorWidth: 5.2,
      doorHeight: 4.2,
    }),
  },
  {
    id: 'ent-garage-west',
    kind: 'garage',
    name: 'Gara Độ Xe Port Aurelia',
    x: -48,
    z: 22,
    w: 18,
    d: 18,
    h: 8,
    doorSide: 'north',
    doorWidth: 8.2,
    doorHeight: 5.0,
    exteriorColor: '#334155',
    interiorFloorColor: '#475569',
    interiorWallColor: '#64748b',
    accentColor: '#eab308',
    wallBoxes: buildEnterableShell({
      x: -48,
      z: 22,
      w: 18,
      d: 18,
      h: 8,
      doorSide: 'north',
      doorWidth: 8.2,
      doorHeight: 5.0,
    }),
  },
  // --- SKY HIGH-RISE APARTMENT #1: Atop Downtown Tower (38m high!) ---
  {
    id: 'ent-sky-apt-downtown',
    kind: 'penthouse',
    name: 'Chung Cư Skyview Tầng 18 (Nhìn Toàn Thành Phố)',
    x: 28,
    baseY: 38,
    z: 36,
    w: 24,
    d: 22,
    h: 5.8,
    doorSide: 'west',
    doorWidth: 5.0,
    doorHeight: 4.0,
    exteriorColor: '#334155',
    interiorFloorColor: '#cbd5e1',
    interiorWallColor: '#f8fafc',
    accentColor: '#38bdf8',
    wallBoxes: buildEnterableShell({
      x: 28,
      baseY: 38,
      z: 36,
      w: 24,
      d: 22,
      h: 5.8,
      doorSide: 'west',
      doorWidth: 5.0,
      doorHeight: 4.0,
      openBalconySide: 'east',
    }),
  },
  // --- EAST BANK: NEW CITY (TÂN ĐÔ) ENTERABLE BUILDINGS ---
  {
    id: 'ent-bank-east',
    kind: 'bank',
    name: 'Ngân Hàng Quốc Tế Tân Đô',
    x: 320,
    z: 28,
    w: 26,
    d: 22,
    h: 22,
    doorSide: 'west',
    doorWidth: 6.8,
    doorHeight: 5.0,
    exteriorColor: '#dbeafe',
    interiorFloorColor: '#e2e8f0',
    interiorWallColor: '#f8fafc',
    accentColor: '#f59e0b',
    wallBoxes: buildEnterableShell({
      x: 320,
      z: 28,
      w: 26,
      d: 22,
      h: 22,
      doorSide: 'west',
      doorWidth: 6.8,
      doorHeight: 5.0,
    }),
  },
  {
    id: 'ent-jewelry-east',
    kind: 'jewelry',
    name: 'Tiệm Kim Hoàn Hoàng Gia Tân Đô',
    x: 320,
    z: -48,
    w: 22,
    d: 18,
    h: 10,
    doorSide: 'west',
    doorWidth: 6.0,
    doorHeight: 4.5,
    exteriorColor: '#312e81',
    interiorFloorColor: '#f8fafc',
    interiorWallColor: '#e0e7ff',
    accentColor: '#facc15',
    wallBoxes: buildEnterableShell({
      x: 320,
      z: -48,
      w: 22,
      d: 18,
      h: 10,
      doorSide: 'west',
      doorWidth: 6.0,
      doorHeight: 4.5,
    }),
  },
  {
    id: 'ent-shop-east',
    kind: 'shop',
    name: 'Showroom & Kho Vũ Khí Tân Đô',
    x: 320,
    z: -24,
    w: 22,
    d: 18,
    h: 10,
    doorSide: 'west',
    doorWidth: 6.0,
    doorHeight: 4.5,
    exteriorColor: '#0f172a',
    interiorFloorColor: '#334155',
    interiorWallColor: '#475569',
    accentColor: '#06b6d4',
    wallBoxes: buildEnterableShell({
      x: 320,
      z: -24,
      w: 22,
      d: 18,
      h: 10,
      doorSide: 'west',
      doorWidth: 6.0,
      doorHeight: 4.5,
    }),
  },
  {
    id: 'ent-house-east',
    kind: 'house',
    name: 'Biệt Thự Tân Đô (Đầy Đủ Nội Thất)',
    x: 432,
    z: -24,
    w: 22,
    d: 20,
    h: 9,
    doorSide: 'west',
    doorWidth: 5.0,
    doorHeight: 4.2,
    exteriorColor: '#f3e8d2',
    interiorFloorColor: '#d6c7b2',
    interiorWallColor: '#fef3c7',
    accentColor: '#facc15',
    wallBoxes: buildEnterableShell({
      x: 432,
      z: -24,
      w: 22,
      d: 20,
      h: 9,
      doorSide: 'west',
      doorWidth: 5.0,
      doorHeight: 4.2,
    }),
  },
  {
    id: 'ent-mart-east',
    kind: 'minimart',
    name: 'Siêu Thị 24/7 Tân Đô',
    x: 432,
    z: 24,
    w: 18,
    d: 16,
    h: 7.5,
    doorSide: 'west',
    doorWidth: 5.2,
    doorHeight: 4.2,
    exteriorColor: '#15803d',
    interiorFloorColor: '#e2e8f0',
    interiorWallColor: '#f1f5f9',
    accentColor: '#4ade80',
    wallBoxes: buildEnterableShell({
      x: 432,
      z: 24,
      w: 18,
      d: 16,
      h: 7.5,
      doorSide: 'west',
      doorWidth: 5.2,
      doorHeight: 4.2,
    }),
  },
  // --- SKY HIGH-RISE APARTMENT #2: Atop Neo Aurelia Skyscraper (48m high!) ---
  {
    id: 'ent-sky-apt-neo',
    kind: 'penthouse',
    name: 'Căn Hộ Bầu Trời Tân Đô Tầng 22',
    x: 436,
    baseY: 48,
    z: -102,
    w: 26,
    d: 22,
    h: 6.0,
    doorSide: 'south',
    doorWidth: 5.2,
    doorHeight: 4.2,
    exteriorColor: '#1e293b',
    interiorFloorColor: '#e2e8f0',
    interiorWallColor: '#f8fafc',
    accentColor: '#f59e0b',
    wallBoxes: buildEnterableShell({
      x: 436,
      baseY: 48,
      z: -102,
      w: 26,
      d: 22,
      h: 6.0,
      doorSide: 'south',
      doorWidth: 5.2,
      doorHeight: 4.2,
      openBalconySide: 'west',
    }),
  },
];

export const HOUSES: HouseDef[] = [
  {
    id: 'house-starter',
    name: 'Nhà Trú Ẩn Trung Tâm (Khởi Đầu)',
    district: 'Trung Tâm Port Aurelia',
    description:
      'Căn nhà trú ẩn mặc định của bạn ngay gần trung tâm Downtown — nơi an toàn để biến về khi hết truy nã.',
    price: 0,
    pos: [-84, 0, -24],
    spawnPos: [-77, 0.2, -24],
  },
  {
    id: 'house-west',
    name: 'Nhà Phố Đồi Tây',
    district: 'Khu Dân Cư Đồi Tây',
    description:
      'Căn nhà phố ấm cúng gần khu dân cư yên tĩnh, thích hợp nghỉ ngơi xóa truy nã.',
    price: 2500,
    pos: [-164, 0, -24],
    spawnPos: [-152, 0.2, -24],
  },
  {
    id: 'apt-sky-downtown',
    name: 'Chung Cư Skyview Tầng 18 (Trên Cao)',
    district: 'Trung Tâm Downtown · Tầng 18',
    description:
      'Căn hộ chung cư cao tầng đầy đủ bàn ghế, giường, tủ, tivi, tủ lạnh & ban công kính nhìn xuống toàn thành phố!',
    price: 5500,
    isHighRise: true,
    pos: [28, 38, 36],
    spawnPos: [25, 38.4, 36],
    lobbyElevatorPos: [14, 0, 36],
    apartmentElevatorPos: [19, 38, 36],
  },
  {
    id: 'house-beach',
    name: 'Biệt Thự Bãi Biển Aurelia',
    district: 'Bãi Biển Aurelia',
    description:
      'Biệt thự hướng đại dương đẳng cấp nhất bờ Tây Port Aurelia.',
    price: 9500,
    pos: [-26, 0, 220],
    spawnPos: [-18, 0.2, 220],
  },
  {
    id: 'house-neo',
    name: 'Dinh Thự Tân Đô (Đầy Đủ Nội Thất)',
    district: 'Thành Phố Mới Tân Đô',
    description:
      'Dinh thự rộng lớn bên kia cầu sông Aurelia, đi bộ vào trong có đầy đủ bàn ghế, giường, tủ, tivi & tủ lạnh!',
    price: 11000,
    pos: [432, 0, -24],
    spawnPos: [418, 0.2, -24],
  },
  {
    id: 'apt-sky-neo',
    name: 'Penthouse Bầu Trời Tân Đô Tầng 22',
    district: 'Thành Phố Mới Tân Đô · Tầng 22',
    description:
      'Căn hộ chung cư đỉnh tháp cao nhất bờ Đông (độ cao 48m), ngắm trọn sông Aurelia, 3 cây cầu và đường chân trời!',
    price: 14500,
    isHighRise: true,
    pos: [436, 48, -102],
    spawnPos: [436, 48.4, -102],
    lobbyElevatorPos: [436, 0, -88],
    apartmentElevatorPos: [436, 48, -94],
  },
];

export const SHOP_SPOTS: [number, number, number][] = [
  [42, 0, -18], // Inside West Armory
  [320, 0, -24], // Inside East Armory
];
export const GARAGE_POS: [number, number, number] = [-48, 0, 22]; // Inside West Garage
export const BANK_ATM_SPOTS: [number, number, number][] = [
  [-28, 0, -23], // Inside West Bank lobby
  [314, 0, 23], // Inside East Bank lobby
];

export type BuildingArchType =
  | 'box'
  | 'stepped'
  | 'twin'
  | 'cylinder'
  | 'spire'
  | 'cantilever';

export interface BuildingDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  style: 'glass' | 'commercial' | 'residential' | 'warehouse';
  archType?: BuildingArchType;
  color: string;
  accentColor?: string;
  hasBalconies?: boolean;
  hasAwning?: boolean;
  awningColor?: string;
}

export const ROBBERY_SPOTS: RobberySpotDef[] = [
  {
    id: 'bank-downtown',
    kind: 'bank',
    name: 'Két Sắt Ngân Hàng Trung Ương',
    buildingPos: [-34, 0, -18],
    triggerPos: [-40, 0, -18],
    rewardMoney: 5500,
    rewardScore: 1300,
    durationSec: 10,
    wantedStars: 3,
  },
  {
    id: 'jewelry-downtown',
    kind: 'jewelry',
    name: 'Tiệm Kim Hoàn Aurelia Diamond',
    buildingPos: [42, 0, -42],
    triggerPos: [38, 0, -42],
    rewardMoney: 4200,
    rewardScore: 1050,
    durationSec: 8,
    wantedStars: 3,
  },
  {
    id: 'bank-neo-city',
    kind: 'bank',
    name: 'Két Sắt Ngân Hàng Quốc Tế Tân Đô',
    buildingPos: [320, 0, 28],
    triggerPos: [327, 0, 28],
    rewardMoney: 7500,
    rewardScore: 1800,
    durationSec: 11,
    wantedStars: 4,
  },
  {
    id: 'jewelry-neo-city',
    kind: 'jewelry',
    name: 'Tiệm Kim Hoàn Hoàng Gia Tân Đô',
    buildingPos: [320, 0, -48],
    triggerPos: [324, 0, -48],
    rewardMoney: 6200,
    rewardScore: 1500,
    durationSec: 9,
    wantedStars: 3,
  },
  {
    id: 'gas-highway',
    kind: 'gas_station',
    name: 'Cây Xăng Aurelia Petrol',
    buildingPos: [38, 0, -60],
    triggerPos: [38, 0, -52],
    rewardMoney: 1400,
    rewardScore: 450,
    durationSec: 6,
    wantedStars: 2,
  },
  {
    id: 'mart-west',
    kind: 'minimart',
    name: 'Siêu Thị 24/7 Đồi Tây',
    buildingPos: [-88, 0, 18],
    triggerPos: [-92, 0, 18],
    rewardMoney: 950,
    rewardScore: 320,
    durationSec: 5,
    wantedStars: 1,
  },
  {
    id: 'mart-east',
    kind: 'minimart',
    name: 'Siêu Thị 24/7 Tân Đô',
    buildingPos: [432, 0, 24],
    triggerPos: [436, 0, 24],
    rewardMoney: 1200,
    rewardScore: 380,
    durationSec: 5.5,
    wantedStars: 2,
  },
];

export const CITY_BUILDINGS: BuildingDef[] = [
  // --- WEST CITY: DOWNTOWN CORE (DIVERSE SKYSCRAPER ARCHITECTURES) ---
  {
    id: 'dt-1',
    x: -32,
    z: -48,
    w: 26,
    d: 24,
    h: 64,
    style: 'glass',
    archType: 'spire',
    color: '#38bdf8',
    accentColor: '#f59e0b',
    hasBalconies: true,
  },
  {
    id: 'dt-2',
    x: -24,
    z: 42,
    w: 24,
    d: 24,
    h: 46,
    style: 'glass',
    archType: 'cantilever',
    color: '#60a5fa',
    accentColor: '#22d3ee',
    hasBalconies: true,
  },
  // Downtown Skyview Condo Tower Base (Height 38m — Skyview Penthouse sits right on top!)
  {
    id: 'dt-3',
    x: 28,
    z: 36,
    w: 24,
    d: 22,
    h: 38,
    style: 'glass',
    color: '#0ea5e9',
    hasBalconies: true,
  },
  {
    id: 'dt-4',
    x: -30,
    z: -116,
    w: 28,
    d: 24,
    h: 54,
    style: 'glass',
    archType: 'twin',
    color: '#818cf8',
    accentColor: '#38bdf8',
    hasBalconies: true,
  },
  {
    id: 'dt-5',
    x: 32,
    z: -116,
    w: 28,
    d: 24,
    h: 58,
    style: 'glass',
    archType: 'cylinder',
    color: '#2dd4bf',
    accentColor: '#a7f3d0',
  },
  {
    id: 'dt-6',
    x: 88,
    z: -116,
    w: 24,
    d: 22,
    h: 42,
    style: 'glass',
    archType: 'stepped',
    color: '#38bdf8',
    accentColor: '#facc15',
  },
  {
    id: 'dt-7',
    x: -32,
    z: -210,
    w: 30,
    d: 24,
    h: 52,
    style: 'glass',
    archType: 'stepped',
    color: '#0284c7',
    accentColor: '#38bdf8',
    hasBalconies: true,
  },
  {
    id: 'dt-8',
    x: 34,
    z: -210,
    w: 28,
    d: 24,
    h: 58,
    style: 'glass',
    archType: 'cantilever',
    color: '#6366f1',
    accentColor: '#f472b6',
  },

  // --- WEST CITY: COMMERCIAL & NORTH INDUSTRIAL ---
  {
    id: 'com-1',
    x: 88,
    z: -42,
    w: 22,
    d: 20,
    h: 22,
    style: 'commercial',
    color: '#b45309',
    hasAwning: true,
    awningColor: '#dc2626',
  },
  {
    id: 'com-2',
    x: 88,
    z: 30,
    w: 22,
    d: 22,
    h: 24,
    style: 'commercial',
    color: '#78350f',
    hasAwning: true,
    awningColor: '#16a34a',
  },
  {
    id: 'com-3',
    x: -30,
    z: -300,
    w: 32,
    d: 24,
    h: 26,
    style: 'glass',
    color: '#f472b6',
  },
  {
    id: 'com-4',
    x: 32,
    z: -300,
    w: 30,
    d: 24,
    h: 28,
    style: 'commercial',
    color: '#9a3412',
    hasAwning: true,
    awningColor: '#0284c7',
  },

  // --- WEST CITY: RESIDENTIAL & FAR WEST SUBURBS (DOUBLED!) ---
  {
    id: 'res-1',
    x: -94,
    z: -44,
    w: 20,
    d: 18,
    h: 12,
    style: 'residential',
    color: '#e7d7c1',
    hasBalconies: true,
  },
  {
    id: 'res-2',
    x: -176,
    z: -44,
    w: 24,
    d: 20,
    h: 14,
    style: 'residential',
    color: '#f3e8d2',
    hasBalconies: true,
  },
  {
    id: 'res-3',
    x: -94,
    z: 42,
    w: 22,
    d: 18,
    h: 14,
    style: 'residential',
    color: '#d6c7b2',
    hasBalconies: true,
  },
  {
    id: 'res-4',
    x: -96,
    z: -116,
    w: 22,
    d: 20,
    h: 15,
    style: 'residential',
    color: '#e2d4be',
    hasBalconies: true,
  },
  {
    id: 'res-5',
    x: -176,
    z: 32,
    w: 24,
    d: 22,
    h: 16,
    style: 'residential',
    color: '#e7d7c1',
    hasBalconies: true,
  },
  {
    id: 'res-6',
    x: -296,
    z: -36,
    w: 24,
    d: 22,
    h: 15,
    style: 'residential',
    color: '#f3e8d2',
    hasBalconies: true,
  },
  {
    id: 'res-7',
    x: -296,
    z: 36,
    w: 24,
    d: 22,
    h: 14,
    style: 'residential',
    color: '#d6c7b2',
    hasBalconies: true,
  },
  {
    id: 'res-8',
    x: -396,
    z: -40,
    w: 24,
    d: 24,
    h: 16,
    style: 'residential',
    color: '#e7d7c1',
    hasBalconies: true,
  },
  {
    id: 'res-9',
    x: -396,
    z: 40,
    w: 24,
    d: 24,
    h: 14,
    style: 'residential',
    color: '#f3e8d2',
    hasBalconies: true,
  },
  {
    id: 'res-10',
    x: -296,
    z: -180,
    w: 26,
    d: 24,
    h: 18,
    style: 'commercial',
    color: '#b45309',
    hasAwning: true,
    awningColor: '#16a34a',
  },

  // --- WEST PORT WAREHOUSES & GAS KIOSK ---
  {
    id: 'port-1',
    x: 88,
    z: 96,
    w: 24,
    d: 22,
    h: 13,
    style: 'warehouse',
    color: '#475569',
  },
  {
    id: 'port-2',
    x: 34,
    z: 96,
    w: 24,
    d: 20,
    h: 12,
    style: 'warehouse',
    color: '#334155',
  },
  {
    id: 'gas-kiosk',
    x: 38,
    z: -62,
    w: 14,
    d: 8,
    h: 5.5,
    style: 'commercial',
    color: '#f97316',
  },

  // === EAST BANK: NEW CITY (TÂN ĐÔ NEO AURELIA - DOUBLED TO X=900!) ===
  {
    id: 'neo-tower-1',
    x: 336,
    z: -102,
    w: 28,
    d: 22,
    h: 68,
    style: 'glass',
    archType: 'spire',
    color: '#22d3ee',
    accentColor: '#06b6d4',
    hasBalconies: true,
  },
  // Neo Sky Penthouse Base Tower (Height 48m — Penthouse Tầng 22 sits on top!)
  {
    id: 'neo-tower-2',
    x: 436,
    z: -102,
    w: 26,
    d: 22,
    h: 48,
    style: 'glass',
    color: '#3b82f6',
    hasBalconies: true,
  },
  {
    id: 'neo-tower-3',
    x: 560,
    z: -102,
    w: 30,
    d: 24,
    h: 74,
    style: 'glass',
    archType: 'twin',
    color: '#a855f7',
    accentColor: '#e879f9',
    hasBalconies: true,
  },
  {
    id: 'neo-tower-4',
    x: 560,
    z: -36,
    w: 28,
    d: 22,
    h: 56,
    style: 'glass',
    archType: 'cylinder',
    color: '#0ea5e9',
    accentColor: '#38bdf8',
    hasBalconies: true,
  },
  {
    id: 'neo-tower-5',
    x: 560,
    z: -200,
    w: 32,
    d: 24,
    h: 64,
    style: 'glass',
    archType: 'stepped',
    color: '#38bdf8',
    accentColor: '#facc15',
    hasBalconies: true,
  },
  {
    id: 'neo-com-1',
    x: 336,
    z: 96,
    w: 28,
    d: 22,
    h: 26,
    style: 'commercial',
    color: '#b45309',
    hasAwning: true,
    awningColor: '#0284c7',
  },
  {
    id: 'neo-com-2',
    x: 440,
    z: 96,
    w: 28,
    d: 22,
    h: 22,
    style: 'commercial',
    color: '#9a3412',
    hasAwning: true,
    awningColor: '#dc2626',
  },
  {
    id: 'neo-base-1',
    x: 720,
    z: -102,
    w: 28,
    d: 28,
    h: 18,
    style: 'warehouse',
    color: '#3f4d36',
  },
  {
    id: 'neo-base-2',
    x: 840,
    z: -102,
    w: 28,
    d: 26,
    h: 16,
    style: 'warehouse',
    color: '#36452e',
  },
  {
    id: 'neo-res-1',
    x: 560,
    z: 36,
    w: 24,
    d: 24,
    h: 18,
    style: 'residential',
    color: '#f3e8d2',
    hasBalconies: true,
  },
  {
    id: 'neo-res-2',
    x: 720,
    z: 36,
    w: 24,
    d: 24,
    h: 18,
    style: 'residential',
    color: '#e7d7c1',
    hasBalconies: true,
  },
  {
    id: 'neo-res-3',
    x: 840,
    z: 36,
    w: 24,
    d: 24,
    h: 16,
    style: 'residential',
    color: '#f3e8d2',
    hasBalconies: true,
  },
  {
    id: 'neo-port-1',
    x: 560,
    z: 102,
    w: 28,
    d: 22,
    h: 14,
    style: 'warehouse',
    color: '#475569',
  },
  {
    id: 'neo-resort-1',
    x: 720,
    z: 185,
    w: 30,
    d: 22,
    h: 34,
    style: 'glass',
    color: '#2dd4bf',
    hasBalconies: true,
  },
  {
    id: 'neo-resort-2',
    x: 840,
    z: 185,
    w: 28,
    d: 22,
    h: 30,
    style: 'glass',
    color: '#38bdf8',
    hasBalconies: true,
  },

  // === DENSE WEST CITY EXPANSION (FILLING EMPTY BLOCKS) ===
  {id: 'w-north-1', x: -96, z: -200, w: 26, d: 24, h: 28, style: 'commercial', color: '#9a3412', hasAwning: true, awningColor: '#0284c7'},
  {id: 'w-north-2', x: -184, z: -214, w: 28, d: 22, h: 42, style: 'glass', color: '#38bdf8', hasBalconies: true},
  {id: 'w-north-3', x: -184, z: -172, w: 26, d: 20, h: 18, style: 'residential', color: '#e7d7c1', hasBalconies: true},
  {id: 'w-north-4', x: -300, z: -222, w: 26, d: 22, h: 16, style: 'residential', color: '#f3e8d2', hasBalconies: true},
  {id: 'w-north-5', x: -396, z: -200, w: 26, d: 24, h: 20, style: 'residential', color: '#d6c7b2', hasBalconies: true},
  {id: 'w-north-6', x: 88, z: -200, w: 24, d: 24, h: 44, style: 'glass', color: '#0ea5e9', hasBalconies: true},
  {id: 'w-mid-1', x: -184, z: -102, w: 24, d: 22, h: 22, style: 'commercial', color: '#b45309', hasAwning: true, awningColor: '#16a34a'},
  {id: 'w-mid-2', x: -300, z: -102, w: 26, d: 22, h: 16, style: 'residential', color: '#e2d4be', hasBalconies: true},
  {id: 'w-mid-3', x: -396, z: -102, w: 26, d: 22, h: 18, style: 'warehouse', color: '#475569'},
  {id: 'w-mid-4', x: -300, z: 102, w: 30, d: 24, h: 12, style: 'warehouse', color: '#334155'}, // Airport Hangar 1
  {id: 'w-mid-5', x: -396, z: 102, w: 28, d: 24, h: 12, style: 'warehouse', color: '#3f4d36'}, // Airport Hangar 2
  {id: 'w-ap-term', x: -184, z: 102, w: 46, d: 22, h: 11, style: 'glass', color: '#60a5fa'}, // Airport Terminal
  {id: 'w-beach-1', x: -32, z: 185, w: 26, d: 22, h: 30, style: 'glass', color: '#2dd4bf', hasBalconies: true},
  {id: 'w-beach-2', x: 32, z: 185, w: 24, d: 22, h: 22, style: 'commercial', color: '#78350f', hasAwning: true, awningColor: '#eab308'},
  {id: 'w-beach-3', x: 88, z: 185, w: 22, d: 22, h: 16, style: 'warehouse', color: '#334155'},
  {id: 'w-hill-1', x: -96, z: -294, w: 24, d: 22, h: 20, style: 'residential', color: '#e7d7c1', hasBalconies: true},
  {id: 'w-hill-2', x: -184, z: -294, w: 26, d: 22, h: 22, style: 'commercial', color: '#9a3412', hasAwning: true, awningColor: '#dc2626'},
  {id: 'w-hill-3', x: 88, z: -294, w: 24, d: 22, h: 32, style: 'glass', color: '#818cf8'},

  // === DENSE EAST CITY (TÂN ĐÔ) EXPANSION ===
  {id: 'e-north-1', x: 344, z: -206, w: 28, d: 24, h: 50, style: 'glass', color: '#38bdf8', hasBalconies: true},
  {id: 'e-north-2', x: 460, z: -206, w: 28, d: 24, h: 56, style: 'glass', color: '#6366f1', hasBalconies: true},
  {id: 'e-north-3', x: 344, z: -168, w: 26, d: 18, h: 20, style: 'commercial', color: '#b45309', hasAwning: true, awningColor: '#0284c7'},
  {id: 'e-north-4', x: 460, z: -168, w: 26, d: 18, h: 22, style: 'commercial', color: '#9a3412', hasAwning: true, awningColor: '#16a34a'},
  {id: 'e-mid-1', x: 368, z: -38, w: 20, d: 22, h: 26, style: 'commercial', color: '#78350f', hasAwning: true, awningColor: '#dc2626'},
  {id: 'e-mid-2', x: 484, z: -38, w: 20, d: 22, h: 18, style: 'residential', color: '#f3e8d2', hasBalconies: true},
  {id: 'e-mid-3', x: 368, z: 32, w: 20, d: 22, h: 36, style: 'glass', color: '#0ea5e9', hasBalconies: true},
  {id: 'e-mid-4', x: 484, z: 32, w: 20, d: 20, h: 20, style: 'commercial', color: '#b45309', hasAwning: true, awningColor: '#eab308'},
  {id: 'e-mid-5', x: 616, z: -38, w: 22, d: 22, h: 32, style: 'glass', color: '#2dd4bf', hasBalconies: true},
  {id: 'e-mid-6', x: 616, z: 32, w: 22, d: 22, h: 24, style: 'residential', color: '#e7d7c1', hasBalconies: true},
  {id: 'e-camp-1', x: 704, z: -36, w: 26, d: 24, h: 20, style: 'warehouse', color: '#334155'},
  {id: 'e-camp-2', x: 766, z: -36, w: 22, d: 24, h: 18, style: 'warehouse', color: '#475569'},
  {id: 'e-sub-1', x: 855, z: -36, w: 26, d: 24, h: 20, style: 'residential', color: '#f3e8d2', hasBalconies: true},
  {id: 'e-sub-2', x: 855, z: 102, w: 26, d: 24, h: 18, style: 'residential', color: '#d6c7b2', hasBalconies: true},
  {id: 'e-south-1', x: 344, z: 185, w: 28, d: 24, h: 34, style: 'glass', color: '#38bdf8', hasBalconies: true},
  {id: 'e-south-2', x: 460, z: 185, w: 26, d: 22, h: 22, style: 'commercial', color: '#9a3412', hasAwning: true, awningColor: '#0284c7'},
  {id: 'e-south-3', x: 585, z: 185, w: 28, d: 22, h: 28, style: 'glass', color: '#60a5fa', hasBalconies: true},
  {id: 'e-hill-1', x: 344, z: -294, w: 26, d: 22, h: 24, style: 'residential', color: '#e7d7c1', hasBalconies: true},
  {id: 'e-hill-2', x: 460, z: -294, w: 26, d: 22, h: 28, style: 'glass', color: '#38bdf8'},
  {id: 'e-hill-3', x: 616, z: -294, w: 28, d: 22, h: 20, style: 'commercial', color: '#78350f'},
  {id: 'e-hill-4', x: 780, z: -294, w: 28, d: 22, h: 18, style: 'warehouse', color: '#475569'},

  // === SIGNATURE MULTI-STYLE HIGH-RISES ACROSS BOTH CITIES ===
  {id: 'w-hi-1', x: -96, z: -162, w: 22, d: 20, h: 46, style: 'glass', archType: 'cylinder', color: '#38bdf8', accentColor: '#f59e0b'},
  {id: 'w-hi-2', x: -184, z: -240, w: 24, d: 18, h: 50, style: 'glass', archType: 'spire', color: '#818cf8', accentColor: '#22d3ee'},
  {id: 'w-hi-3', x: 32, z: -168, w: 24, d: 20, h: 54, style: 'glass', archType: 'twin', color: '#2dd4bf', accentColor: '#facc15'},
  {id: 'w-hi-4', x: -32, z: -168, w: 24, d: 20, h: 48, style: 'glass', archType: 'stepped', color: '#60a5fa', accentColor: '#fb923c'},
  {id: 'w-hi-5', x: 88, z: -242, w: 24, d: 18, h: 40, style: 'glass', archType: 'cantilever', color: '#0ea5e9', accentColor: '#f43f5e'},
  {id: 'e-hi-1', x: 344, z: -242, w: 26, d: 18, h: 56, style: 'glass', archType: 'spire', color: '#38bdf8', accentColor: '#f59e0b'},
  {id: 'e-hi-2', x: 460, z: -242, w: 26, d: 18, h: 62, style: 'glass', archType: 'twin', color: '#6366f1', accentColor: '#38bdf8'},
  {id: 'e-hi-3', x: 374, z: -102, w: 22, d: 22, h: 46, style: 'glass', archType: 'stepped', color: '#0284c7', accentColor: '#4ade80'},
  {id: 'e-hi-4', x: 486, z: 102, w: 22, d: 22, h: 44, style: 'glass', archType: 'cantilever', color: '#2dd4bf', accentColor: '#eab308'},
  {id: 'e-hi-5', x: 616, z: -102, w: 24, d: 22, h: 58, style: 'glass', archType: 'cylinder', color: '#a855f7', accentColor: '#f472b6'},
];

let cachedCollisionBoxes: WallBoxDef[] | null = null;
export function getAllCollisionBoxes(): WallBoxDef[] {
  if (cachedCollisionBoxes) return cachedCollisionBoxes;
  const boxes: WallBoxDef[] = CITY_BUILDINGS.map((b) => ({
    x: b.x,
    y: b.h / 2,
    z: b.z,
    w: b.w,
    h: b.h,
    d: b.d,
  }));
  for (const eb of ENTERABLE_BUILDINGS) {
    boxes.push(...eb.wallBoxes);
    const by = eb.baseY ?? 0;
    // Include roof slab & elevated floor slab so bullets cannot pierce roofs/floors
    boxes.push({
      x: eb.x,
      y: by + eb.h + 0.35,
      z: eb.z,
      w: eb.w + 0.6,
      h: 0.7,
      d: eb.d + 0.6,
    });
    if (by > 0) {
      boxes.push({
        x: eb.x,
        y: by - 0.35,
        z: eb.z,
        w: eb.w + 0.8,
        h: 0.7,
        d: eb.d + 0.8,
      });
    }
  }
  // Racetrack concrete/tire barriers (axis-aligned approximation for bullet blocking)
  for (const seg of RACETRACK_BARRIER_SEGMENTS) {
    const absCos = Math.abs(Math.cos(seg.rotY));
    const absSin = Math.abs(Math.sin(seg.rotY));
    boxes.push({
      x: seg.x,
      y: 0.65,
      z: seg.z,
      w: seg.w * absCos + seg.d * absSin,
      h: 1.3,
      d: seg.w * absSin + seg.d * absCos,
    });
  }
  cachedCollisionBoxes = boxes;
  return boxes;
}

export interface RayHitResult {
  t: number; // normalized [0..1] along segment
  x: number;
  y: number;
  z: number;
}

/**
 * Exact 3D continuous ray-segment vs AABB slab intersection against every
 * building, enterable wall, roof/floor, and track barrier. Prevents all bullet tunneling.
 */
export function intersectSegmentWithWalls(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  pad = 0.04,
): RayHitResult | null {
  const boxes = getAllCollisionBoxes();
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  let bestT = 1.0001;
  let hit = false;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const halfW = b.w * 0.5 + pad;
    const halfH = b.h * 0.5 + pad;
    const halfD = b.d * 0.5 + pad;
    const minX = b.x - halfW;
    const maxX = b.x + halfW;
    const minY = b.y - halfH;
    const maxY = b.y + halfH;
    const minZ = b.z - halfD;
    const maxZ = b.z + halfD;

    let tMin = 0;
    let tMax = bestT;

    if (Math.abs(dx) < 1e-8) {
      if (x0 < minX || x0 > maxX) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (minX - x0) * inv;
      let t2 = (maxX - x0) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) continue;
    }

    if (Math.abs(dy) < 1e-8) {
      if (y0 < minY || y0 > maxY) continue;
    } else {
      const inv = 1 / dy;
      let t1 = (minY - y0) * inv;
      let t2 = (maxY - y0) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) continue;
    }

    if (Math.abs(dz) < 1e-8) {
      if (z0 < minZ || z0 > maxZ) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (minZ - z0) * inv;
      let t2 = (maxZ - z0) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) continue;
    }

    if (tMin >= 0 && tMin < bestT) {
      bestT = tMin;
      hit = true;
    }
  }

  if (!hit || bestT > 1.0) return null;
  return {
    t: bestT,
    x: x0 + dx * bestT,
    y: y0 + dy * bestT,
    z: z0 + dz * bestT,
  };
}

export function hasLineOfSight(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): boolean {
  return intersectSegmentWithWalls(x0, y0, z0, x1, y1, z1, 0.02) === null;
}

export const INITIAL_VEHICLES: VehicleInstance[] = [
  {
    id: 'veh-sports-1',
    kind: 'sports',
    x: 8,
    y: 0.05,
    z: -8,
    rotY: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-sedan-1',
    kind: 'sedan',
    x: -8,
    y: 0.05,
    z: 10,
    rotY: Math.PI,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: false,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-tank-plaza',
    kind: 'tank',
    x: 16,
    y: 0.05,
    z: -52,
    rotY: Math.PI * 0.5,
    turretYaw: Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 1000,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-tank-airport',
    kind: 'tank',
    x: -140,
    y: 0.05,
    z: 112,
    rotY: 0,
    turretYaw: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 1000,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-tank-neo',
    kind: 'tank',
    x: 760,
    y: 0.05,
    z: -84,
    rotY: Math.PI * 0.5,
    turretYaw: Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 1000,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-suv-1',
    kind: 'suv',
    x: 56,
    y: 0.05,
    z: -14,
    rotY: Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: false,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-muscle-1',
    kind: 'muscle',
    x: -56,
    y: 0.05,
    z: 22,
    rotY: -Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: false,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-moto-1',
    kind: 'motorcycle',
    x: 10,
    y: 0.05,
    z: 16,
    rotY: 0.4,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-sports-neo',
    kind: 'sports',
    x: 288,
    y: 0.05,
    z: -10,
    rotY: -Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
  },
  {
    id: 'veh-muscle-farwest',
    kind: 'muscle',
    x: -350,
    y: 0.05,
    z: 8,
    rotY: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: false,
    braking: false,
    occupiedByPlayer: false,
  },
  // 6 Police Cruisers distributed across West & East cities
  {
    id: 'veh-police-1',
    kind: 'police',
    x: 6,
    y: 0.05,
    z: -56,
    rotY: Math.PI,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  {
    id: 'veh-police-2',
    kind: 'police',
    x: -58,
    y: 0.05,
    z: -6,
    rotY: Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  {
    id: 'veh-police-3',
    kind: 'police',
    x: 288,
    y: 0.05,
    z: 32,
    rotY: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  {
    id: 'veh-police-4',
    kind: 'police',
    x: 520,
    y: 0.05,
    z: -64,
    rotY: -Math.PI * 0.5,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  {
    id: 'veh-police-5',
    kind: 'police',
    x: -240,
    y: 0.05,
    z: 64,
    rotY: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  {
    id: 'veh-police-6',
    kind: 'police',
    x: 650,
    y: 0.05,
    z: 140,
    rotY: Math.PI,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isPolice: true,
  },
  // === PADDOCK SUPERCAR FOR PLAYER AT THE RACETRACK ===
  {
    id: 'veh-sports-track',
    kind: 'sports',
    x: 702,
    y: 0.05,
    z: -151,
    rotY: 0,
    customColor: '#f97316',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Vortex GT #00',
    racerNumber: 0,
  },
  // === 5 AI NPC RACE CARS AT PORT AURELIA INTERNATIONAL SPEEDWAY ===
  {
    id: 'racer-0',
    kind: 'sports',
    x: 728,
    y: 0.05,
    z: -172,
    rotY: -Math.PI / 2,
    customColor: '#ef4444',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Kai · Red Fury #01',
    racerNumber: 1,
  },
  {
    id: 'racer-1',
    kind: 'sports',
    x: 728,
    y: 0.05,
    z: -164,
    rotY: -Math.PI / 2,
    customColor: '#3b82f6',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Minh · Cobalt Apex #07',
    racerNumber: 7,
  },
  {
    id: 'racer-2',
    kind: 'muscle',
    x: 719,
    y: 0.05,
    z: -172,
    rotY: -Math.PI / 2,
    customColor: '#f59e0b',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Linh · Solar Viper #14',
    racerNumber: 14,
  },
  {
    id: 'racer-3',
    kind: 'sports',
    x: 719,
    y: 0.05,
    z: -164,
    rotY: -Math.PI / 2,
    customColor: '#10b981',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Hùng · Emerald GT #23',
    racerNumber: 23,
  },
  {
    id: 'racer-4',
    kind: 'muscle',
    x: 710,
    y: 0.05,
    z: -172,
    rotY: -Math.PI / 2,
    customColor: '#a855f7',
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    health: 100,
    headlightsOn: true,
    braking: false,
    occupiedByPlayer: false,
    isRacer: true,
    racerName: 'Vũ · Neon Phantom #88',
    racerNumber: 88,
  },
];

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    title: 'Hợp Đồng Khởi Đầu',
    description:
      'Lên chiếc Vortex GT ở gần đó và giao kiện hàng mật từ Quảng Trường Downtown đến Khu Thương Mại phía Đông.',
    objectiveText: 'Lái xe đến điểm giao hàng tại Khu Thương Mại',
    startPos: [10, 0, 4],
    checkpoints: [
      [64, 0, 0],
      [64, 0, -28],
    ],
    rewardMoney: 500,
    rewardScore: 250,
    timeLimitSec: 90,
  },
  {
    id: 2,
    title: 'Đua Tốc Độ Cao Tốc',
    description:
      'Chứng minh kỹ năng lái xe qua các trạm kiểm soát dọc Đại Lộ Bắc và Khu Dân Cư Đồi Tây.',
    objectiveText: 'Vượt qua tất cả các Checkpoint trên cao tốc',
    startPos: [64, 0, -45],
    checkpoints: [
      [0, 0, -72],
      [-240, 0, -72],
      [-240, 0, 0],
    ],
    rewardMoney: 900,
    rewardScore: 450,
    timeLimitSec: 110,
  },
  {
    id: 3,
    title: 'Thu Hồi Kiện Hàng Cảng',
    description:
      'Tiếp cận Bến Cảng Port Aurelia, thu hồi thùng dữ liệu tại cầu tàu và đưa về điểm hẹn bãi biển.',
    objectiveText: 'Đến Bến Cảng lấy hàng rồi di chuyển ra Bãi Biển',
    startPos: [-52, 0, 8],
    checkpoints: [
      [64, 0, 64],
      [64, 0, 140],
      [-12, 0, 230],
    ],
    rewardMoney: 1200,
    rewardScore: 600,
    timeLimitSec: 130,
    wantedTrigger: 1,
  },
  {
    id: 4,
    title: 'Vượt Cầu Sông Aurelia Sang Tân Đô',
    description:
      'Lái xe qua Cầu Dây Văng Sông Aurelia (Z=0) để tiến sang Thành Phố Mới Tân Đô bên kia sông!',
    objectiveText: 'Chạy qua Cầu Sông Aurelia sang Quảng Trường Tân Đô',
    startPos: [64, 0, 0],
    checkpoints: [
      [175, BRIDGE_DECK_Y, 0],
      [288, 0, 0],
      [520, 0, 0],
    ],
    rewardMoney: 1800,
    rewardScore: 900,
    timeLimitSec: 120,
  },
  {
    id: 5,
    title: 'Đường Băng Sân Bay Quốc Tế',
    description:
      'Chạy đua dọc đường băng sân bay mở rộng phía Tây và cắt đuôi lực lượng tuần tra.',
    objectiveText: 'Hoàn thành chặng đường băng và thoát về trung tâm',
    startPos: [-12, 0, 140],
    checkpoints: [
      [-128, 0, 140],
      [-360, 0, 140],
      [0, 0, 0],
    ],
    rewardMoney: 2200,
    rewardScore: 1100,
    timeLimitSec: 130,
    wantedTrigger: 2,
  },
  {
    id: 6,
    title: 'Chinh Phục Đại Đô Thị Hai Bờ Sông',
    description:
      'Chiến dịch tổng lực nối liền hai thành phố siêu lớn từ Căn Cứ Quân Sự Tân Đô qua 2 cây cầu về Downtown.',
    objectiveText: 'Hoàn thành đường đua liên thành phố qua các cây cầu',
    startPos: [800, 0, -140],
    checkpoints: [
      [520, 0, -140],
      [175, BRIDGE_DECK_Y, -140],
      [0, 0, -140],
      [0, 0, 140],
      [175, BRIDGE_DECK_Y, 140],
      [520, 0, 0],
    ],
    rewardMoney: 5000,
    rewardScore: 2500,
    timeLimitSec: 210,
    wantedTrigger: 2,
  },
];

export const SIDE_MISSIONS: SideMissionDef[] = [
  {
    id: 'side-delivery',
    category: 'delivery',
    title: 'Giao Hàng Siêu Tốc',
    description:
      'Nhận bưu kiện tại Khu Thương Mại và giao gấp đến Bến Cảng Port Aurelia.',
    objectiveText: 'Giao hàng đến cầu tàu Bến Cảng đúng giờ',
    startPos: [68, 0, -18],
    checkpoints: [
      [64, 0, 64],
      [64, 0, 140],
    ],
    rewardMoney: 750,
    rewardScore: 300,
    timeLimitSec: 80,
  },
  {
    id: 'side-bridge-taxi',
    category: 'taxi',
    title: 'Taxi Liên Thành Phố',
    description:
      'Đưa khách VIP từ Downtown vượt Cầu Dây Văng sang Bờ Biển Đông Tân Đô.',
    objectiveText: 'Vượt Cầu Sông Aurelia đưa khách sang Tân Đô',
    startPos: [-12, 0, 10],
    checkpoints: [
      [175, BRIDGE_DECK_Y, 0],
      [288, 0, 64],
      [520, 0, 230],
    ],
    rewardMoney: 1650,
    rewardScore: 620,
    timeLimitSec: 110,
  },
  {
    id: 'side-race',
    category: 'race',
    title: 'Thử Thách Đường Băng',
    description:
      'Bứt tốc tối đa trên đường băng sân bay Aurelia qua 3 cổng tốc độ.',
    objectiveText: 'Hoàn thành vòng đua Sân Bay tốc độ cao',
    startPos: [-64, 0, 140],
    checkpoints: [
      [-280, 0, 140],
      [-240, 0, 64],
      [-64, 0, 140],
    ],
    rewardMoney: 1400,
    rewardScore: 560,
    timeLimitSec: 85,
  },
  {
    id: 'side-tank-rampage',
    category: 'bounty',
    title: 'Chiến Xa Càn Quét Tân Đô',
    description:
      'Lái Chiến Xa Rhino X1 tại căn cứ Tân Đô càn quét tuyến cao tốc qua cầu Bắc!',
    objectiveText: 'Tiến qua các chốt kiểm soát trên đại lộ Tân Đô',
    startPos: [752, 0, -76],
    checkpoints: [
      [650, 0, -140],
      [400, 0, -140],
      [175, BRIDGE_DECK_Y, -140],
    ],
    rewardMoney: 2200,
    rewardScore: 900,
    timeLimitSec: 120,
    wantedTrigger: 3,
  },
];

export function getDistrictName(x: number, z: number): string {
  if (x >= RIVER_MIN_X && x <= RIVER_MAX_X) {
    return 'Cầu Vượt Sông Aurelia';
  }
  if (x > RIVER_MAX_X) {
    if (x >= 596 && x <= 916 && z >= -254 && z <= -146) {
      return 'Trường Đua Port Aurelia GP';
    }
    if (z > 250) return 'Bãi Biển Đông Tân Đô';
    if (z < -120 && z > -160) return 'Cao Tốc Bắc Tân Đô';
    if (x > 680) return 'Căn Cứ & Ngoại Ô Đông Tân Đô';
    return 'Thành Phố Mới Tân Đô';
  }
  if (z > 250) return 'Bãi Biển Aurelia & Đại Dương';
  if (x > 48 && z > 54) return 'Bến Cảng Port Aurelia';
  if (x < -56 && z > 84) return 'Sân Bay Quốc Tế Aurelia';
  if (z < -120 && z > -160) return 'Đại Lộ Cao Tốc Bắc';
  if (z <= -220 || x < -310) return 'Đồi Ngoại Ô Tây Bắc';
  if (x > 52) return 'Khu Thương Mại Đông';
  if (x < -52) return 'Khu Dân Cư Đồi Tây';
  return 'Trung Tâm Downtown';
}
