// tslint:disable
/* eslint-disable */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Position3D = [number, number, number];

export interface Entity3D {
  id: string | number;
  type?: string;
  position: Vec3 | Position3D;
  rotation?: Vec3 | Position3D;
  scale?: Vec3 | Position3D;
  velocity?: Vec3;
  active?: boolean;
  [key: string]: any;
}

export interface Particle {
  id: string | number;
  position: Vec3 | Position3D;
  velocity?: Vec3 | Position3D;
  life: number;
  maxLife: number;
  color?: string;
  size?: number;
  [key: string]: any;
}

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'fog';

export type VehicleKind =
  | 'sedan'
  | 'suv'
  | 'sports'
  | 'muscle'
  | 'motorcycle'
  | 'police'
  | 'tank';

export type WeaponId = 'fists' | 'pistol' | 'smg' | 'rifle' | 'shotgun';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  magSize: number;
  startReserve: number;
  maxReserve: number;
  reloadSec: number;
  spread: number;
  recoil: number;
  pellets: number;
  automatic: boolean;
}

export interface VehicleSpec {
  kind: VehicleKind;
  name: string;
  color: string;
  accentColor: string;
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  grip: number;
  mass: number;
  length: number;
  width: number;
  height: number;
}

export interface VehicleInstance {
  id: string;
  kind: VehicleKind;
  x: number;
  y: number;
  z: number;
  rotY: number;
  turretYaw?: number;
  customColor?: string;
  speed: number;
  steerAngle: number;
  pitch: number;
  roll: number;
  health: number;
  headlightsOn: boolean;
  braking: boolean;
  occupiedByPlayer: boolean;
  isPolice?: boolean;
  isRacer?: boolean;
  racerName?: string;
  racerNumber?: number;
}

export type RobberyTargetKind = 'bank' | 'gas_station' | 'minimart' | 'jewelry';

export interface RobberySpotDef {
  id: string;
  kind: RobberyTargetKind;
  name: string;
  buildingPos: [number, number, number];
  triggerPos: [number, number, number];
  rewardMoney: number;
  rewardScore: number;
  durationSec: number;
  wantedStars: number;
}

export type PickupKind = 'medkit' | 'armor' | 'ammo';

export interface PickupItem {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
}

export interface MissionDef {
  id: number;
  title: string;
  description: string;
  objectiveText: string;
  startPos: [number, number, number];
  checkpoints: [number, number, number][];
  rewardMoney: number;
  rewardScore: number;
  timeLimitSec?: number;
  wantedTrigger?: number;
}

export interface SideMissionDef {
  id: string;
  category: 'delivery' | 'taxi' | 'bounty' | 'race';
  title: string;
  description: string;
  objectiveText: string;
  startPos: [number, number, number];
  checkpoints: [number, number, number][];
  rewardMoney: number;
  rewardScore: number;
  timeLimitSec: number;
  wantedTrigger?: number;
}

export interface WallBoxDef {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

export interface EnterableBuildingDef {
  id: string;
  kind: 'bank' | 'shop' | 'minimart' | 'garage' | 'house' | 'jewelry' | 'penthouse';
  name: string;
  x: number;
  baseY?: number;
  z: number;
  w: number;
  d: number;
  h: number;
  doorSide: 'north' | 'south' | 'east' | 'west';
  doorWidth: number;
  doorHeight: number;
  exteriorColor: string;
  interiorFloorColor: string;
  interiorWallColor: string;
  accentColor: string;
  wallBoxes: WallBoxDef[];
}

export interface HouseDef {
  id: string;
  name: string;
  district: string;
  description: string;
  price: number;
  isHighRise?: boolean;
  pos: [number, number, number];
  spawnPos: [number, number, number];
  lobbyElevatorPos?: [number, number, number];
  apartmentElevatorPos?: [number, number, number];
}

export interface VehicleShopItem {
  kind: VehicleKind;
  name: string;
  price: number;
  description: string;
  topSpeedKmh: number;
  armorLabel: string;
}

export type HubTab = 'missions' | 'shop' | 'bank' | 'garage' | 'houses';

export interface MinimapBlip {
  x: number;
  z: number;
  type:
    | 'vehicle'
    | 'tank'
    | 'mission'
    | 'side_mission'
    | 'checkpoint'
    | 'police'
    | 'npc'
    | 'bank'
    | 'bank_atm'
    | 'gas_station'
    | 'minimart'
    | 'jewelry'
    | 'shop'
    | 'garage'
    | 'house'
    | 'medkit'
    | 'armor'
    | 'ammo'
    | 'racetrack'
    | 'racer';
}

export interface HudTelemetry {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  money: number;
  bankBalance: number;
  wantedLevel: number;
  policeSightActive: boolean;
  wantedEvadeProgress: number; // 0..1 when hiding
  district: string;
  inVehicle: boolean;
  inTank: boolean;
  vehicleName: string;
  speedKmh: number;
  nearbyPrompt: string | null;
  weaponId: WeaponId;
  weaponName: string;
  ammoInMag: number;
  magSize: number;
  reserveAmmo: number;
  reloading: boolean;
  reloadProgress: number; // 0..1
  isAiming: boolean;
  crosshairSpread: number;
  hitMarkerActive: boolean;
  damageFlashActive: boolean;
  activeMissionId: number | null;
  activeSideMissionId: string | null;
  activeMissionCategory: 'main' | 'side' | null;
  activeMissionTitle: string;
  activeMissionObjective: string;
  activeMissionStep: number;
  activeMissionTotalSteps: number;
  missionTimerSec: number | null;
  completedMissions: number[];
  completedSideMissions: string[];
  ownedVehicles: VehicleKind[];
  vehicleColors: Partial<Record<VehicleKind, string>>;
  ownedHouses: string[];
  weaponUpgrades: Record<WeaponId, number>;
  robberyActiveName: string | null;
  robberyProgress: number | null; // 0..1
  robberyPoliceDispatched: boolean;
  cameraMode: 'third' | 'first';
  cameraDistance: number;
  pointerLocked: boolean;
  playerX: number;
  playerZ: number;
  playerRotY: number;
  targetX: number | null;
  targetZ: number | null;
  timeOfDayLabel: string;
  timeNormalized: number; // 0..1
  weather: WeatherType;
  raceActive: boolean;
  raceCountdown: number;
  raceLap: number;
  raceTotalLaps: number;
  racePosition: number;
  raceTotalRacers: number;
  raceElapsedSec: number;
  raceFinishedPos: number | null;
  blips: MinimapBlip[];
  toastMessage: string | null;
}

export interface SaveDataPayload {
  money: number;
  bankBalance: number;
  score: number;
  health: number;
  armor: number;
  playerPos: [number, number, number];
  completedMissions: number[];
  completedSideMissions: string[];
  ownedVehicles: VehicleKind[];
  vehicleColors: Partial<Record<VehicleKind, string>>;
  ownedHouses: string[];
  weaponUpgrades: Record<WeaponId, number>;
  weaponAmmo: Record<WeaponId, number>;
  weaponReserve: Record<WeaponId, number>;
  weaponId: WeaponId;
  timeOfDay: number;
  weather: WeatherType;
  savedAt: string;
}
