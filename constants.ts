import {MusicTrack} from './utils/helper';

/** Thematic palette & UI sizing tokens for Port Aurelia. */
export const THEME = {
  fontFamily: "'Rajdhani', 'Be Vietnam Pro', system-ui, sans-serif",
  displayFont: "'Bebas Neue', 'Oswald', system-ui, sans-serif",
  primary: '#f59e0b',
  accent: '#06b6d4',
  danger: '#ef4444',
  success: '#10b981',
  panelBg: 'rgba(10, 14, 22, 0.86)',
  panelBorder: 'rgba(148, 163, 184, 0.25)',
  buttonRadius: '0.5rem',
};

/** Game configuration schema. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'Đô Thị Ngầm',
    type: 'string',
    label: 'Tên Trò Chơi',
    group: 'GAME',
  },
  baseCanvasWidth: {
    value: 1280,
    type: 'number',
    label: 'Chiều rộng Canvas',
    group: 'GAME',
  },
  baseCanvasHeight: {
    value: 720,
    type: 'number',
    label: 'Chiều cao Canvas',
    group: 'GAME',
  },

  // --- Camera ---
  fov: {
    value: 62,
    type: 'number',
    label: 'Góc nhìn (FOV)',
    group: 'Camera',
    min: 45,
    max: 95,
    step: 1,
  },
  cameraX: {
    value: 0,
    type: 'number',
    label: 'Camera Offset X',
    group: 'Camera',
  },
  cameraY: {
    value: 3.4,
    type: 'number',
    label: 'Camera Height',
    group: 'Camera',
  },
  cameraZ: {
    value: 7.5,
    type: 'number',
    label: 'Camera Distance',
    group: 'Camera',
  },

  // --- Visuals & Lighting ---
  backgroundColor: {
    value: '#7ec8f2',
    type: 'color',
    label: 'Màu bầu trời',
    group: 'THEME',
  },
  primaryColor: {
    value: '#f59e0b',
    type: 'color',
    label: 'Màu chủ đạo',
    group: 'THEME',
  },
  fontFamily: {
    value: "'Rajdhani', 'Be Vietnam Pro', sans-serif",
    type: 'string',
    label: 'Phông chữ',
    group: 'THEME',
  },
  ambientColor: {
    value: '#d8e9ff',
    type: 'color',
    label: 'Màu ánh sáng môi trường',
    group: 'Visuals',
  },
  ambientIntensity: {
    value: 1.6,
    type: 'number',
    label: 'Cường độ môi trường',
    group: 'Visuals',
    min: 1.5,
    max: 4.0,
    step: 0.1,
  },
  sunColor: {
    value: '#fff5df',
    type: 'color',
    label: 'Màu mặt trời',
    group: 'Visuals',
  },
  sunIntensity: {
    value: 4.2,
    type: 'number',
    label: 'Cường độ mặt trời',
    group: 'Visuals',
    min: 3.0,
    max: 8.0,
    step: 0.2,
  },
  hemiSkyColor: {
    value: '#87cefa',
    type: 'color',
    label: 'Màu bầu trời bán cầu',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#6d5e4f',
    type: 'color',
    label: 'Màu phản xạ mặt đất',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 1.2,
    type: 'number',
    label: 'Cường độ bán cầu',
    group: 'Visuals',
    min: 0.4,
    max: 2.5,
    step: 0.1,
  },

  // --- Gameplay & Rules ---
  playerSpeed: {
    value: 6.5,
    type: 'number',
    label: 'Tốc độ đi bộ',
    group: 'Rules',
    min: 3,
    max: 12,
    step: 0.5,
  },
  sprintMultiplier: {
    value: 1.7,
    type: 'number',
    label: 'Hệ số chạy nhanh',
    group: 'Rules',
    min: 1.2,
    max: 2.5,
    step: 0.1,
  },
  jumpForce: {
    value: 7.5,
    type: 'number',
    label: 'Lực nhảy',
    group: 'Rules',
    min: 4,
    max: 14,
    step: 0.5,
  },
  maxHealth: {
    value: 100,
    type: 'number',
    label: 'Máu tối đa',
    group: 'Rules',
    min: 50,
    max: 250,
    step: 10,
  },
  maxArmor: {
    value: 100,
    type: 'number',
    label: 'Giáp tối đa',
    group: 'Rules',
    min: 0,
    max: 200,
    step: 10,
  },
  dayCycleMinutes: {
    value: 4,
    type: 'number',
    label: 'Chu kỳ ngày/đêm (phút)',
    group: 'Rules',
    min: 1,
    max: 15,
    step: 1,
  },

  // --- Physics ---
  gravity: {
    value: -20,
    type: 'number',
    label: 'Trọng lực',
    group: 'Physics',
    min: -30,
    max: -5,
    step: 0.5,
  },

  // --- System ---
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'SYSTEM',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'SYSTEM',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'SYSTEM',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.22,
    type: 'number',
    label: 'Âm lượng nhạc nền',
    group: 'AUDIO',
    min: 0,
    max: 1,
    step: 0.05,
  },
  defaultSfxVolume: {
    value: 0.6,
    type: 'number',
    label: 'Âm lượng hiệu ứng',
    group: 'AUDIO',
    min: 0,
    max: 1,
    step: 0.05,
  },
  backgroundMusicUrl: {
    value:
      'https://storage.googleapis.com/assets-gen-playground/musiclibrary/chrome_cobblestone.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'Audio',
  },
};

// Merge customized config values if present (injected by Playground)
const {playgroundConfig} = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const PRESETS = {};

/** World bounds (expanded 2x megacity + wide river map: X -460..960, Z -380..360). */
export const WORLD_MIN_X = -460;
export const WORLD_MAX_X = 960;
export const WORLD_MIN_Z = -380;
export const WORLD_MAX_Z = 360;
export const WORLD_HALF_SIZE = 960;
export const TOTAL_MISSIONS = 6;

export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'chrome_cobblestone',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/chrome_cobblestone.mp3',
    description: 'Nhạc nền đô thị hiện đại pha chất jazz công nghiệp.',
  },
  {
    name: 'acid_bass',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/acid_bass.mp3',
    description: 'Nhịp điện tử tốc độ cao cho những màn rượt đuổi ban đêm.',
  },
  {
    name: 'grid_runner',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/grid_runner.mp3',
    description: 'Nhạc hành động mạnh mẽ.',
  },
  {
    name: 'island_breeze',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/island_breeze.mp3',
    description: 'Giai điệu ven biển Port Aurelia thư giãn.',
  },
];
