// tslint:disable
/* eslint-disable */
import {
  Activity,
  Gamepad,
  Home,
  Info,
  Pause,
  Play,
  RotateCw,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getConfig, THEME, TOTAL_MISSIONS} from './constants';
import {Game, SceneCommandApi} from './Game';
import {createInitialInputSnapshot, type InputSnapshot} from './input';
import {CityHubModal} from './src/CityHubModal';
import {MinimapCanvas} from './src/MinimapCanvas';
import {PhoneAppPanel} from './src/PhoneAppModal';
import {MISSIONS, WEAPONS, WEAPON_ORDER} from './src/worldData';
import {
  GraphicsQuality,
  HubTab,
  HudTelemetry,
  SaveDataPayload,
  WeaponId,
  WeatherType,
} from './types';
import {gameAudio} from './utils';
import BackgroundMusic from './utils/BackgroundMusic';
import {
  formatTime,
  GameState,
  MenuOverlay,
  Overlay,
  useIsMobile,
} from './utils/helper';
import {
  usePlayground,
  usePlaygroundGameLifecycle,
  usePlaygroundResume,
  useRpc,
} from './utils/usePlayground';

interface CustomWindow extends Window {
  canHandleBackKey?: boolean;
}

const SAVE_STORAGE_KEY = 'port_aurelia_openworld_save_v1';
const JOYSTICK_RADIUS_PX = 36;

const INITIAL_HUD: HudTelemetry = {
  health: 100,
  maxHealth: 100,
  armor: 100,
  maxArmor: 100,
  stamina: 100,
  money: 500,
  bankBalance: 1000,
  wantedLevel: 0,
  wantedEvadeProgress: 0,
  district: 'Trung Tâm Downtown',
  inVehicle: false,
  inTank: false,
  vehicleName: 'Đi bộ',
  speedKmh: 0,
  nearbyPrompt: null,
  weaponId: 'pistol',
  weaponName: 'Súng Lục 9mm',
  ammoInMag: 12,
  magSize: 12,
  reserveAmmo: 72,
  reloading: false,
  reloadProgress: 0,
  isAiming: false,
  crosshairSpread: 0,
  hitMarkerActive: false,
  damageFlashActive: false,
  policeSightActive: false,
  activeMissionId: null,
  activeSideMissionId: null,
  activeMissionCategory: null,
  activeMissionTitle: '',
  activeMissionObjective: 'Đến cột sáng xanh để nhận nhiệm vụ',
  activeMissionStep: 1,
  activeMissionTotalSteps: 0,
  missionTimerSec: null,
  completedMissions: [],
  completedSideMissions: [],
  ownedVehicles: ['sedan'],
  vehicleColors: {},
  ownedHouses: ['house-starter'],
  weaponUpgrades: {fists: 0, pistol: 0, smg: 0, rifle: 0, shotgun: 0},
  robberyActiveName: null,
  robberyProgress: null,
  robberyPoliceDispatched: false,
  cameraMode: 'third',
  cameraDistance: 8.5,
  pointerLocked: false,
  playerX: 0,
  playerZ: 4,
  playerRotY: 0,
  targetX: 10,
  targetZ: 4,
  timeOfDayLabel: '10:00 · Ban ngày',
  timeNormalized: 0.42,
  weather: 'sunny',
  raceActive: false,
  raceCountdown: 0,
  raceLap: 1,
  raceTotalLaps: 3,
  racePosition: 1,
  raceTotalRacers: 6,
  raceElapsedSec: 0,
  raceFinishedPos: null,
  blips: [],
  toastMessage: null,
};

function MobileControls({
  inputRef,
  inVehicle,
  onOpenWeaponWheel,
  onOpenHub,
}: {
  inputRef: React.MutableRefObject<InputSnapshot>;
  inVehicle: boolean;
  onOpenWeaponWheel: () => void;
  onOpenHub: () => void;
}): React.ReactElement {
  const activePointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{x: number; y: number}>({
    x: 0,
    y: 0,
  });

  const resetJoystick = useCallback(() => {
    activePointerIdRef.current = null;
    inputRef.current.analogMove = {x: 0, y: 0};
    setKnobOffset({x: 0, y: 0});
  }, [inputRef]);

  useEffect(() => {
    window.addEventListener('blur', resetJoystick);
    return () => {
      window.removeEventListener('blur', resetJoystick);
      inputRef.current.analogMove = {x: 0, y: 0};
      inputRef.current.firing = false;
      inputRef.current.jump = false;
      inputRef.current.sprint = false;
      inputRef.current.interact = false;
      inputRef.current.cameraToggle = false;
    };
  }, [inputRef, resetJoystick]);

  const updateStickFromEvent = (
    e: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rawDx = e.clientX - cx;
    const rawDy = e.clientY - cy;
    const dist = Math.hypot(rawDx, rawDy);
    const scale = dist > JOYSTICK_RADIUS_PX ? JOYSTICK_RADIUS_PX / dist : 1;
    const clampedX = rawDx * scale;
    const clampedY = rawDy * scale;
    inputRef.current.analogMove = {
      x: clampedX / JOYSTICK_RADIUS_PX,
      y: clampedY / JOYSTICK_RADIUS_PX,
    };
    setKnobOffset({x: clampedX, y: clampedY});
  };

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    if (
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== e.pointerId
    ) {
      return;
    }
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateStickFromEvent(e);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateStickFromEvent(e);
  };

  const handleStickEnd = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  };

  const bindHold = (
    field: 'firing' | 'aiming' | 'jump' | 'sprint' | 'interact' | 'cameraToggle' | 'reload',
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      inputRef.current[field] = true;
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      inputRef.current[field] = false;
    },
    onPointerLeave: () => {
      inputRef.current[field] = false;
    },
    onPointerCancel: () => {
      inputRef.current[field] = false;
    },
  });

  const btnClass =
    'w-12 h-12 min-w-[48px] min-h-[48px] rounded-full font-bold text-[10px] pointer-events-auto touch-none flex items-center justify-center shadow-lg border transition-colors';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {/* Left Virtual Analog Joystick */}
      <div
        aria-label="Cần điều khiển di chuyển"
        data-testid="mobile-joystick"
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickEnd}
        onPointerCancel={handleStickEnd}
        onLostPointerCapture={handleStickEnd}
        className="absolute left-8 bottom-6 w-24 h-24 rounded-full bg-slate-900/55 border border-white/30 pointer-events-auto touch-none flex items-center justify-center">
        <div
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
          className="w-10 h-10 rounded-full bg-amber-400/85 shadow-md pointer-events-none"
        />
      </div>

      {/* Right Uniform Action Cluster */}
      <div className="absolute right-8 bottom-6 grid grid-cols-4 gap-1.5 pointer-events-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenHub();
          }}
          className={`${btnClass} bg-emerald-800/85 border-emerald-300/60 text-white active:bg-emerald-600`}>
          ĐÔ THỊ
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenWeaponWheel();
          }}
          className={`${btnClass} bg-slate-900/75 border-slate-400/50 text-slate-100 active:bg-slate-700`}>
          SÚNG
        </button>
        {!inVehicle && (
          <button
            type="button"
            {...bindHold('aiming')}
            className={`${btnClass} bg-indigo-700/85 border-indigo-300/60 text-white active:bg-indigo-500`}>
            NGẮM
          </button>
        )}
        <button
          type="button"
          {...bindHold('cameraToggle')}
          className={`${btnClass} bg-slate-900/75 border-slate-400/50 text-slate-100 active:bg-slate-700`}>
          CAM
        </button>
        <button
          type="button"
          {...bindHold('interact')}
          className={`${btnClass} bg-cyan-600/85 border-cyan-300/60 text-white active:bg-cyan-500`}>
          {inVehicle ? 'XUỐNG' : 'LÊN XE'}
        </button>
        <button
          type="button"
          {...bindHold('sprint')}
          className={`${btnClass} bg-amber-600/85 border-amber-300/60 text-white active:bg-amber-500`}>
          {inVehicle ? 'NITRO' : 'CHẠY'}
        </button>
        <button
          type="button"
          {...bindHold('jump')}
          className={`${btnClass} bg-slate-800/85 border-white/40 text-white active:bg-slate-600`}>
          {inVehicle ? 'PHANH' : 'NHẢY'}
        </button>
        <button
          type="button"
          {...bindHold('firing')}
          className={`${btnClass} bg-red-600/85 border-red-300/70 text-white active:bg-red-500`}>
          BẮN
        </button>
        {!inVehicle && (
          <button
            type="button"
            {...bindHold('reload')}
            className={`${btnClass} bg-amber-700/85 border-amber-300/60 text-white active:bg-amber-500`}>
            NẠP
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const {sdk, isReady} = usePlayground();
  const [exitChat] = useRpc<Record<string, unknown>, void>('ExitChat');
  const isMobile = useIsMobile();
  const sharedInputRef = useRef<InputSnapshot>(createInitialInputSnapshot());
  const commandApiRef = useRef<SceneCommandApi | null>(null);

  // Do not remove: Playground save/resume
  const {initialLevel, initialScore, persistenceEnabled, autoStartPending} =
    usePlaygroundResume({
      isReady,
      onAutoStart: () => {
        if (gameStateRef.current.status === 'START') {
          initGame();
        }
      },
    });

  const startLevel = Math.min(initialLevel, TOTAL_MISSIONS);
  const startScore = initialScore;

  const levelStartScoreRef = useRef(startScore);
  const prevLevelRef = useRef(startLevel);
  const runWonRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: startScore,
    level: startLevel,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [gameKey, setGameKey] = useState(0);

  // Separate overlay states so opening Game Menu keeps gameState.status === 'PLAYING'
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isWeaponWheelOpen, setIsWeaponWheelOpen] = useState(false);
  const [isCityHubOpen, setIsCityHubOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [cityHubTab, setCityHubTab] = useState<HubTab>('missions');
  const [howToOrigin, setHowToOrigin] = useState<'start' | 'pause'>('start');

  // Audio & Visual Preferences
  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [graphicsQuality, setGraphicsQuality] =
    useState<GraphicsQuality>('high');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [hud, setHud] = useState<HudTelemetry>(INITIAL_HUD);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [showControlHint, setShowControlHint] = useState(true);

  useEffect(() => {
    if (gameState.level !== prevLevelRef.current) {
      prevLevelRef.current = gameState.level;
      levelStartScoreRef.current = gameStateRef.current.score;
    }
  }, [gameState.level]);

  useEffect(() => {
    if (gameState.status === 'VICTORY') {
      runWonRef.current = true;
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      setShowControlHint(true);
      const timer = window.setTimeout(() => setShowControlHint(false), 6000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [gameState.status, gameKey]);

  useEffect(() => {
    const canHandleBackKey = ['PLAYING', 'PAUSED'].includes(gameState.status);
    (window as unknown as Record<string, unknown>).canHandleBackKey =
      canHandleBackKey;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'PLAYGROUND_CAN_HANDLE_BACK_KEY',
          value: canHandleBackKey,
        },
        '*',
      );
    }
  }, [gameState.status]);

  const startRun = useCallback(
    (level: number, score: number) => {
      levelStartScoreRef.current = score;
      prevLevelRef.current = level;
      runWonRef.current = false;
      Object.assign(sharedInputRef.current, createInitialInputSnapshot());
      setIsGameMenuOpen(false);
      setIsHowToPlayOpen(false);
      setIsMapOpen(false);
      setIsWeaponWheelOpen(false);
      setIsCityHubOpen(false);
      setIsPhoneOpen(false);
      setHud(INITIAL_HUD);
      setGameState((prev) => ({
        ...prev,
        status: 'PLAYING',
        level,
        score,
      }));
      setGameKey((prev) => prev + 1);

      if (sdk) {
        sdk.startGame();
      }
    },
    [sdk],
  );

  const initGame = useCallback(() => {
    if (persistenceEnabled && !runWonRef.current) {
      startRun(gameStateRef.current.level, levelStartScoreRef.current);
    } else {
      startRun(1, 0);
    }
  }, [startRun, persistenceEnabled]);

  const resetGame = useCallback(() => {
    startRun(1, 0);
  }, [startRun]);

  usePlaygroundGameLifecycle(gameState, sdk);

  const hasAutoplayed = useRef(false);
  useEffect(() => {
    if (
      !hasAutoplayed.current &&
      new URLSearchParams(window.location.search).has('autoplay')
    ) {
      hasAutoplayed.current = true;
      initGame();
    }
  }, [initGame]);

  const togglePauseMenu = useCallback(() => {
    if (gameStateRef.current.status !== 'PLAYING') return;
    gameAudio.playCrispClick();
    setIsPhoneOpen(false);
    if (isHowToPlayOpen) {
      setIsHowToPlayOpen(false);
      return;
    }
    if (isMapOpen) {
      setIsMapOpen(false);
      return;
    }
    if (isWeaponWheelOpen) {
      setIsWeaponWheelOpen(false);
      return;
    }
    if (isCityHubOpen) {
      setIsCityHubOpen(false);
      return;
    }
    setIsGameMenuOpen((prev) => !prev);
  }, [isCityHubOpen, isHowToPlayOpen, isMapOpen, isWeaponWheelOpen]);

  const toggleWeaponWheel = useCallback(() => {
    if (gameStateRef.current.status !== 'PLAYING' || isGameMenuOpen) return;
    gameAudio.playCrispClick();
    setIsCityHubOpen(false);
    setIsWeaponWheelOpen((prev) => !prev);
  }, [isGameMenuOpen]);

  const togglePhonePanel = useCallback(() => {
    setIsPhoneOpen((prev) => !prev);
  }, []);

  const openCityHub = useCallback(
    (tab?: HubTab) => {
      if (gameStateRef.current.status !== 'PLAYING' || isGameMenuOpen) return;
      gameAudio.playCrispClick();
      setIsWeaponWheelOpen(false);
      setIsPhoneOpen(false);
      if (tab) {
        setCityHubTab(tab);
        setIsCityHubOpen(true);
      } else {
        setIsCityHubOpen((prev) => !prev);
      }
    },
    [isGameMenuOpen],
  );

  const handleSaveProgress = () => {
    if (!commandApiRef.current) return;
    try {
      const data = commandApiRef.current.saveGame();
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
      gameAudio.playConfirmSelect();
      setSaveNotice(`Đã lưu tiến trình (${data.savedAt})`);
    } catch {
      gameAudio.playErrorBuzz();
      setSaveNotice('Không thể lưu vào trình duyệt.');
    }
  };

  const handleLoadProgress = () => {
    if (!commandApiRef.current) return;
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        gameAudio.playErrorBuzz();
        setSaveNotice('Chưa có dữ liệu đã lưu.');
        return;
      }
      const parsed = JSON.parse(raw) as SaveDataPayload;
      setWeather(parsed.weather);
      commandApiRef.current.setWeather(parsed.weather);
      commandApiRef.current.loadGame(parsed);
      gameAudio.playConfirmSelect();
      setSaveNotice(`Đã tải bản lưu lúc ${parsed.savedAt}`);
      setIsGameMenuOpen(false);
    } catch {
      gameAudio.playErrorBuzz();
      setSaveNotice('Dữ liệu lưu không hợp lệ.');
    }
  };

  const anyModalOpen =
    isGameMenuOpen ||
    isHowToPlayOpen ||
    isMapOpen ||
    isWeaponWheelOpen ||
    isCityHubOpen;
  const isMusicPlaying = gameState.status === 'PLAYING' && !isGameMenuOpen;

  return (
    <div
      style={{fontFamily: THEME.fontFamily}}
      className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-zinc-950 text-white select-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;600;700&display=swap');
      `}</style>

      <BackgroundMusic
        url={getConfig('backgroundMusicUrl')}
        isPlaying={isMusicPlaying}
        isMuted={musicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* Main 3D Viewport */}
      <div className="flex-1 w-full min-h-0 relative flex items-center justify-center bg-slate-950 overflow-hidden">
        <Game
          key={gameKey}
          gameState={gameState}
          setGameState={setGameState}
          exitChat={exitChat}
          gameStateRef={gameStateRef}
          externalInputRef={sharedInputRef}
          paused={anyModalOpen}
          quality={graphicsQuality}
          weather={weather}
          onTogglePauseMenu={togglePauseMenu}
          onToggleWeaponWheel={toggleWeaponWheel}
          onOpenHub={openCityHub}
          onTelemetry={setHud}
          commandApiRef={commandApiRef}
        />

        {/* PLAYING HUD (Non-obstructive edges, strict safe zones) */}
        {gameState.status === 'PLAYING' && (
          <>
            {/* Top-Right EXCLUSIVE Menu Button (Reserved Corner) */}
            <div
              className={`absolute top-3 ${isMobile ? 'right-8' : 'right-4'} z-30 pointer-events-none`}>
              <button
                type="button"
                aria-label="Mở Menu"
                onClick={togglePauseMenu}
                className="pointer-events-auto min-w-[48px] min-h-[48px] px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-600/60 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg">
                <Pause size={15} />
                <span>MENU</span>
              </button>
            </div>

            {/* Right-Side Smartphone App Store ("Kho Ứng Dụng") */}
            {!anyModalOpen && (
              <PhoneAppPanel
                hud={hud}
                isOpen={isPhoneOpen}
                onToggleOpen={togglePhonePanel}
                onOpenHub={openCityHub}
                api={commandApiRef.current}
                isMobile={isMobile}
              />
            )}

            {/* Top-Left Status Cluster: Money, Wanted Stars, Weapon/Ammo, Time & Weather */}
            <div
              className={`absolute top-3 ${isMobile ? 'left-8' : 'left-4'} z-20 pointer-events-none flex flex-wrap items-start gap-2 max-w-[74vw]`}>
              <button
                type="button"
                onClick={() => openCityHub('bank')}
                title="Mở Ngân Hàng & Tài Sản [B]"
                className="pointer-events-auto text-left bg-slate-950/80 hover:bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                <div className="text-emerald-400 font-bold text-xs leading-tight">
                  Mặt: ${hud.money.toLocaleString('en-US')}
                </div>
                <div className="text-[10px] text-cyan-300 leading-tight">
                  Bank: ${hud.bankBalance.toLocaleString('en-US')} · Điểm:{' '}
                  {gameState.score}
                </div>
              </button>

              <button
                type="button"
                onClick={() => openCityHub('missions')}
                className="pointer-events-auto bg-cyan-600/85 hover:bg-cyan-500 border border-cyan-300/60 text-slate-950 font-extrabold text-[11px] rounded-lg px-2.5 py-2 shadow">
                ĐÔ THỊ [B]
              </button>

              {/* Wanted Stars (1-5) with Sight & Evade Progress */}
              <div
                className={`border rounded-lg px-2.5 py-1.5 backdrop-blur-sm ${
                  hud.wantedLevel > 0
                    ? hud.policeSightActive
                      ? 'bg-red-950/85 border-red-500/80'
                      : 'bg-amber-950/80 border-amber-500/70'
                    : 'bg-slate-950/75 border-slate-700/60'
                }`}>
                <div className="flex items-center gap-1 text-xs leading-tight">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <= hud.wantedLevel
                          ? hud.policeSightActive
                            ? 'text-red-400 animate-pulse'
                            : 'text-amber-300 animate-pulse'
                          : 'text-slate-600'
                      }>
                      ★
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-200 leading-tight">
                  {hud.wantedLevel > 0
                    ? hud.policeSightActive
                      ? `Cấp ${hud.wantedLevel} · Bị phát hiện!`
                      : `Cắt đuôi ${Math.round(hud.wantedEvadeProgress * 100)}%`
                    : 'An toàn'}
                </div>
                {hud.wantedLevel > 0 && !hud.policeSightActive && (
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{
                        width: `${Math.round(hud.wantedEvadeProgress * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Weapon & Ammo Card (Clickable Wheel + Reserve + Reload Progress) */}
              <div className="pointer-events-auto flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={toggleWeaponWheel}
                  title="Mở kho vũ khí (Tab hoặc phím 1-5)"
                  className="text-left bg-slate-950/80 hover:bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 backdrop-blur-sm transition-colors">
                  <div className="text-amber-300 font-bold text-xs leading-tight flex items-center gap-1.5">
                    <span>{hud.weaponName}</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-200 px-1 rounded">
                      1-5 / Tab
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-tight">
                    {hud.magSize > 0
                      ? hud.reloading
                        ? `Đang nạp đạn ${Math.round(hud.reloadProgress * 100)}%`
                        : `${hud.ammoInMag}/${hud.magSize} (Dự trữ: ${hud.reserveAmmo}) · [R] Nạp`
                      : 'Đánh gần · [F/Click] Đấm'}
                  </div>
                  {hud.reloading && (
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{
                          width: `${Math.round(hud.reloadProgress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </button>
                {hud.magSize > 0 &&
                  !hud.reloading &&
                  hud.ammoInMag < hud.magSize && (
                    <button
                      type="button"
                      onClick={() => commandApiRef.current?.triggerReload()}
                      className="px-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] border border-amber-300">
                      NẠP
                    </button>
                  )}
              </div>

              {/* Time & Weather */}
              <div className="bg-slate-950/75 border border-slate-700/60 rounded-lg px-2.5 py-1.5 backdrop-blur-sm hidden sm:block">
                <div className="text-sky-300 font-semibold text-xs leading-tight">
                  {hud.timeOfDayLabel}
                </div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  {weather === 'sunny'
                    ? 'Nắng đẹp'
                    : weather === 'cloudy'
                      ? 'Nhiều mây'
                      : weather === 'rain'
                        ? 'Mưa rào'
                        : 'Sương mù'}
                </div>
              </div>
            </div>

            {/* Slim Top-Center Mission Objective Banner (or Live GP Race HUD) */}
            {hud.raceActive ? (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5 max-w-[88vw]">
                <div className="pointer-events-auto bg-slate-950/85 border border-orange-500/70 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-xl backdrop-blur-sm">
                  <span className="text-xs font-black text-orange-400">
                    HẠNG {hud.racePosition}/{hud.raceTotalRacers}
                  </span>
                  <span className="text-xs font-bold text-white">
                    VÒNG {hud.raceLap}/{hud.raceTotalLaps}
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-bold">
                    {hud.raceElapsedSec.toFixed(1)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => commandApiRef.current?.cancelRace()}
                    className="px-2 py-0.5 rounded-full bg-red-600/85 hover:bg-red-500 text-white text-[10px] font-bold">
                    Rời đua
                  </button>
                </div>
                {hud.raceCountdown > 0 && (
                  <div className="bg-orange-500/95 text-slate-950 font-black text-2xl px-6 py-1.5 rounded-2xl shadow-2xl animate-pulse">
                    {hud.raceCountdown}
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[82vw]">
                <div className="bg-slate-950/65 border border-cyan-500/35 rounded-full px-3 py-1 text-center backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-cyan-300">
                    {hud.activeMissionId !== null
                      ? `${hud.activeMissionTitle} (${hud.activeMissionStep}/${hud.activeMissionTotalSteps}): ${hud.activeMissionObjective}`
                      : hud.activeMissionObjective}
                  </span>
                  {hud.missionTimerSec !== null && (
                    <span className="ml-2 text-[11px] font-bold text-amber-400">
                      {formatTime(hud.missionTimerSec)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Screen Edge Damage Vignette */}
            {hud.damageFlashActive && (
              <div className="absolute inset-0 pointer-events-none z-10 border-[14px] border-red-600/55 bg-red-600/10" />
            )}

            {/* Tank Cannon Reticle when driving Rhino Tank */}
            {hud.inTank && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-8 h-8 rounded-full border-2 border-lime-400/75 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-300" />
                </div>
              </div>
            )}

            {/* Dynamic Tactical Center Reticle when on foot */}
            {!hud.inVehicle && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="relative flex items-center justify-center">
                  {/* Center Dot */}
                  <div
                    className={`rounded-full transition-all ${
                      hud.isAiming
                        ? 'w-1.5 h-1.5 bg-red-400'
                        : hud.pointerLocked
                          ? 'w-1.5 h-1.5 bg-cyan-300'
                          : 'w-1.5 h-1.5 bg-white/85'
                    }`}
                  />
                  {/* 4 Dynamic Crosshair Ticks (Tighten on Aim, Expand on Recoil) */}
                  {hud.weaponId !== 'fists' && (
                    <>
                      <div
                        style={{
                          transform: `translateY(${-(hud.isAiming ? 6 : 10) - hud.crosshairSpread}px)`,
                        }}
                        className={`absolute w-0.5 h-2 rounded-full ${hud.isAiming ? 'bg-red-400' : 'bg-white/80'}`}
                      />
                      <div
                        style={{
                          transform: `translateY(${(hud.isAiming ? 6 : 10) + hud.crosshairSpread}px)`,
                        }}
                        className={`absolute w-0.5 h-2 rounded-full ${hud.isAiming ? 'bg-red-400' : 'bg-white/80'}`}
                      />
                      <div
                        style={{
                          transform: `translateX(${-(hud.isAiming ? 6 : 10) - hud.crosshairSpread}px)`,
                        }}
                        className={`absolute h-0.5 w-2 rounded-full ${hud.isAiming ? 'bg-red-400' : 'bg-white/80'}`}
                      />
                      <div
                        style={{
                          transform: `translateX(${(hud.isAiming ? 6 : 10) + hud.crosshairSpread}px)`,
                        }}
                        className={`absolute h-0.5 w-2 rounded-full ${hud.isAiming ? 'bg-red-400' : 'bg-white/80'}`}
                      />
                    </>
                  )}
                  {/* Hit Marker X */}
                  {hud.hitMarkerActive && (
                    <div className="absolute text-amber-300 font-black text-base leading-none drop-shadow">
                      ✕
                    </div>
                  )}
                  {/* Reload Ring/Label under Reticle */}
                  {hud.reloading && (
                    <div className="absolute top-6 w-16 bg-slate-950/85 border border-cyan-400/50 rounded-full p-0.5">
                      <div
                        className="h-1 bg-cyan-400 rounded-full"
                        style={{
                          width: `${Math.round(hud.reloadProgress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Roblox-style Shift-Lock Toggle Pill & Indicator */}
            {!isMobile && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                {hud.pointerLocked && !hud.toastMessage && (
                  <button
                    type="button"
                    onClick={() => commandApiRef.current?.togglePointerLock()}
                    className="pointer-events-auto bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 font-bold text-[11px] px-3 py-1 rounded-full shadow">
                    Khóa Tâm (Shift-Lock) ĐANG BẬT · Nhân vật xoay theo tâm · Click
                    bắn · Ctrl thoát
                  </button>
                )}
              </div>
            )}

            {/* Active Robbery Progress Bar */}
            {hud.robberyActiveName && hud.robberyProgress !== null && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-80 max-w-[88vw]">
                <div className="bg-slate-950/90 border border-amber-400/70 rounded-xl px-3 py-2 shadow-xl">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-0.5">
                    <span>ĐANG CƯỚP: {hud.robberyActiveName}</span>
                    <span>{Math.round(hud.robberyProgress * 100)}%</span>
                  </div>
                  <div className="text-[10px] font-semibold mb-1 text-slate-300">
                    {hud.robberyPoliceDispatched ? (
                      <span className="text-red-400 animate-pulse">
                        Cảnh sát đã đến bao vây bên ngoài!
                      </span>
                    ) : (
                      <span className="text-cyan-300">
                        Đang vét két... Cảnh sát sẽ ập đến ở mốc 50%!
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        hud.robberyPoliceDispatched
                          ? 'bg-gradient-to-r from-red-500 to-amber-400'
                          : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      }`}
                      style={{width: `${Math.round(hud.robberyProgress * 100)}%`}}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Toast Notification */}
            {hud.toastMessage && !hud.robberyActiveName && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-amber-500/90 text-slate-950 font-bold text-xs px-3 py-1 rounded-md shadow-lg">
                  {hud.toastMessage}
                </div>
              </div>
            )}

            {/* Bottom-Left: Minimap + Health / Armor / Stamina */}
            <div
              className={`absolute ${isMobile ? 'bottom-36 left-8' : 'bottom-4 left-4'} z-20 pointer-events-none flex flex-col gap-1.5`}>
              <MinimapCanvas
                hud={hud}
                size={isMobile ? 88 : 116}
                zoomScale={isMobile ? 0.56 : 0.72}
              />
              <div className="bg-slate-950/80 border border-slate-700/60 rounded-lg p-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 w-7">
                    MÁU
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.max(0, (hud.health / hud.maxHealth) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-emerald-200 w-8 text-right">
                    {hud.health}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-sky-400 w-7">
                    GIÁP
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all"
                      style={{
                        width: `${Math.max(0, (hud.armor / Math.max(1, hud.maxArmor)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-sky-200 w-8 text-right">
                    {hud.armor}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-amber-400 w-7">
                    LỰC
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{width: `${Math.max(0, hud.stamina)}%`}}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-amber-200 w-8 text-right">
                    {hud.stamina}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom-Right: District, Vehicle Name, Speedometer, Zoom Controls & Context Prompt */}
            <div
              className={`absolute ${isMobile ? 'bottom-40 right-8' : 'bottom-4 right-4'} z-20 pointer-events-none flex flex-col items-end gap-1.5`}>
              {hud.nearbyPrompt && (
                <div className="bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 font-bold text-xs px-2.5 py-1 rounded-md shadow">
                  {hud.nearbyPrompt}
                </div>
              )}

              {/* Quick Camera Zoom Controls */}
              <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/80 border border-slate-700/60 rounded-lg px-2 py-1 text-[10px]">
                <span className="text-slate-400 mr-1">Tầm nhìn [V]:</span>
                <button
                  type="button"
                  onClick={() => commandApiRef.current?.adjustZoom(-3.0)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-600">
                  Gần -
                </button>
                <span className="text-slate-200 font-semibold min-w-[28px] text-center">
                  {hud.cameraDistance}m
                </span>
                <button
                  type="button"
                  onClick={() => commandApiRef.current?.adjustZoom(3.0)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-600">
                  Xa +
                </button>
              </div>

              <div className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-right backdrop-blur-sm">
                <div className="text-amber-400 font-bold text-xs leading-tight">
                  {hud.district}
                </div>
                <div className="text-[11px] text-slate-200 leading-tight flex items-center justify-end gap-2">
                  <span>{hud.vehicleName}</span>
                  {hud.inVehicle && (
                    <span className="text-cyan-300 font-bold">
                      {hud.speedKmh} km/h
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Persistent Compact Desktop Control Strip */}
            {!isMobile && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div
                  className={`bg-slate-950/75 border border-slate-700/50 rounded-full px-3 py-1 text-[11px] text-slate-200 transition-opacity flex items-center gap-2 ${
                    showControlHint ? 'opacity-100' : 'opacity-80'
                  }`}>
                  <span>
                    <span className="text-cyan-300 font-bold">B</span> Đô thị ·{' '}
                    <span className="text-amber-300 font-bold">1-5/Tab</span> Vũ
                    khí · <span className="text-red-300 font-bold">F/Click</span>{' '}
                    Bắn · <span className="text-cyan-300 font-bold">E</span> Tương
                    tác
                  </span>
                  <button
                    type="button"
                    onClick={() => commandApiRef.current?.togglePointerLock()}
                    className={`pointer-events-auto px-2 py-0.5 rounded-full font-bold border ${
                      hud.pointerLocked
                        ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                        : 'bg-slate-800 text-cyan-300 border-slate-600 hover:bg-slate-700'
                    }`}>
                    Ctrl: {hud.pointerLocked ? 'Đang Khóa Tâm' : 'Khóa Tâm'}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Virtual Touch Controls */}
            {isMobile && (
              <MobileControls
                inputRef={sharedInputRef}
                inVehicle={hud.inVehicle}
                onOpenWeaponWheel={toggleWeaponWheel}
                onOpenHub={() => openCityHub('missions')}
              />
            )}
          </>
        )}
      </div>

      {/* START SCREEN */}
      {gameState.status === 'START' && !autoStartPending && (
        <MenuOverlay tone="neutral" zIndex={40}>
          <div className="bg-slate-900/95 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center w-full max-w-md border border-amber-500/35">
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold mb-1">
              Port Aurelia · Open World 3D
            </div>
            <h1
              style={{fontFamily: THEME.displayFont}}
              className="text-4xl md:text-5xl font-black tracking-wider mb-3 text-amber-400 text-center">
              {getConfig('title')}
            </h1>
            <p className="text-slate-300 text-sm text-center mb-5 leading-relaxed">
              Khám phá 2 thành phố ven sông Port Aurelia &amp; Tân Đô nối liền
              qua Cầu Dây Văng, đi bộ vào bên trong các công trình, càn quét
              bằng Chiến Xa Rhino X1 và chinh phục hệ thống nhiệm vụ, cửa hàng,
              ngân hàng, gara &amp; nhà ở.
            </p>

            {/* Quick Graphics Quality Picker on Start Screen */}
            <div className="w-full mb-5">
              <div className="text-xs text-slate-400 font-semibold mb-1.5 text-center">
                Chất lượng đồ họa 3D
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map(
                  (q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setGraphicsQuality(q);
                      }}
                      className={`min-h-[40px] rounded-lg text-xs font-bold uppercase border transition-colors ${
                        graphicsQuality === q
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}>
                      {q}
                    </button>
                  ),
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={initGame}
              autoFocus
              data-testid="start-button"
              className="w-full min-h-[48px] bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-extrabold text-lg hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 shadow-lg mb-3">
              <Play size={22} />
              VÀO THÀNH PHỐ
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setHowToOrigin('start');
                setIsHowToPlayOpen(true);
              }}
              className="w-full min-h-[48px] bg-slate-800 text-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-2">
              <Info size={18} />
              HƯỚNG DẪN ĐIỀU KHIỂN
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* GAME MENU / PAUSE OVERLAY (keeps gameState.status === 'PLAYING') */}
      {gameState.status === 'PLAYING' && isGameMenuOpen && (
        <MenuOverlay tone="neutral" zIndex={45}>
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 m-4 shadow-2xl flex flex-col gap-3">
            <h2
              style={{fontFamily: THEME.displayFont}}
              className="text-3xl font-black tracking-wider text-amber-400 text-center">
              MENU PORT AURELIA
            </h2>

            <button
              type="button"
              autoFocus
              onClick={() => {
                gameAudio.playCrispClick();
                setIsGameMenuOpen(false);
              }}
              className="w-full min-h-[48px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl py-2.5 px-4 flex items-center justify-center gap-2">
              <Play size={18} />
              Tiếp tục chơi
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsMapOpen(true);
                }}
                className="min-h-[48px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5">
                <Activity size={16} />
                Bản đồ lớn
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setHowToOrigin('pause');
                  setIsHowToPlayOpen(true);
                }}
                className="min-h-[48px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5">
                <Info size={16} />
                Hướng dẫn
              </button>
            </div>

            {/* Independent Music & SFX Toggles (Strictly inside Game Menu only) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = gameAudio.toggleMute();
                  setSfxMuted(next);
                  if (!next) gameAudio.playCrispClick();
                }}
                className="min-h-[48px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                {sfxMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                Hiệu ứng: {sfxMuted ? 'TẮT' : 'BẬT'}
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setMusicMuted((m) => !m);
                }}
                className="min-h-[48px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                {musicMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                Nhạc nền: {musicMuted ? 'TẮT' : 'BẬT'}
              </button>
            </div>

            {/* Graphics Quality Presets */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Settings size={14} />
                Cấu hình Đồ họa 3D
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map(
                  (q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setGraphicsQuality(q);
                      }}
                      className={`min-h-[40px] rounded-lg text-[11px] font-bold uppercase border ${
                        graphicsQuality === q
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                      {q}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Time & Weather Switcher */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
              <div className="text-xs font-bold text-slate-300 mb-1.5">
                Thời tiết & Chu kỳ Ngày/Đêm
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {(
                  [
                    ['sunny', 'Nắng'],
                    ['cloudy', 'Mây'],
                    ['rain', 'Mưa'],
                    ['fog', 'Sương'],
                  ] as [WeatherType, string][]
                ).map(([wKey, label]) => (
                  <button
                    key={wKey}
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setWeather(wKey);
                      commandApiRef.current?.setWeather(wKey);
                    }}
                    className={`min-h-[38px] rounded-lg text-[11px] font-bold border ${
                      weather === wKey
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['Bình minh', 0.27],
                  ['Ban ngày', 0.48],
                  ['Hoàng hôn', 0.74],
                  ['Ban đêm', 0.04],
                ].map(([label, tVal]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      commandApiRef.current?.setTimeOfDay(Number(tVal));
                    }}
                    className="min-h-[36px] rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save / Load Game */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveProgress}
                className="min-h-[48px] bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs">
                Lưu tiến trình
              </button>
              <button
                type="button"
                onClick={handleLoadProgress}
                className="min-h-[48px] bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-xl text-xs">
                Tải bản lưu
              </button>
            </div>
            {saveNotice && (
              <div className="text-center text-xs text-emerald-300 font-semibold">
                {saveNotice}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                  startRun(
                    gameStateRef.current.level,
                    levelStartScoreRef.current,
                  );
                }}
                className="min-h-[48px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                <RotateCw size={15} />
                Thử lại màn này
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                  setIsHowToPlayOpen(false);
                  setIsMapOpen(false);
                  setIsWeaponWheelOpen(false);
                  setIsCityHubOpen(false);
                  setGameState((prev) => ({...prev, status: 'START'}));
                }}
                className="min-h-[48px] bg-red-900/70 hover:bg-red-800 border border-red-600/50 text-red-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                <Home size={15} />
                Về màn chính
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* CITY HUB MODAL (Missions / Shop / Bank / Garage / Houses) */}
      {gameState.status === 'PLAYING' && isCityHubOpen && (
        <CityHubModal
          hud={hud}
          activeTab={cityHubTab}
          onChangeTab={setCityHubTab}
          onClose={() => setIsCityHubOpen(false)}
          api={commandApiRef.current}
        />
      )}

      {/* WEAPON WHEEL / INVENTORY OVERLAY (Tab or Mobile Button) */}
      {gameState.status === 'PLAYING' && isWeaponWheelOpen && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-sm bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-5 m-4 shadow-2xl flex flex-col gap-3">
            <h3 className="text-xl font-extrabold text-cyan-400 text-center">
              KHO VŨ KHÍ CHIẾN ĐẤU
            </h3>
            <div className="flex flex-col gap-2">
              {WEAPON_ORDER.map((wId, idx) => {
                const spec = WEAPONS[wId];
                const active = hud.weaponId === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    autoFocus={idx === 0}
                    onClick={() => {
                      commandApiRef.current?.selectWeapon(wId);
                      setIsWeaponWheelOpen(false);
                    }}
                    className={`min-h-[48px] px-4 py-2 rounded-xl border flex items-center justify-between text-sm font-bold ${
                      active
                        ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                        : 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                    }`}>
                    <span>
                      [{idx + 1}] {spec.name}
                    </span>
                    <span className="text-xs opacity-80">
                      Sát thương {spec.damage}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setIsWeaponWheelOpen(false)}
              className="min-h-[48px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm">
              Đóng (Tab)
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* FULL CITY MAP OVERLAY */}
      {gameState.status === 'PLAYING' && isMapOpen && (
        <MenuOverlay tone="neutral" zIndex={55}>
          <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-5 m-4 shadow-2xl flex flex-col items-center gap-3">
            <h3 className="text-2xl font-black text-cyan-400">
              BẢN ĐỒ PORT AURELIA
            </h3>
            <MinimapCanvas hud={hud} size={280} fullMap />
            <div className="w-full text-xs text-slate-300 bg-slate-950/70 rounded-xl p-3 border border-slate-800">
              <div className="font-bold text-amber-400 mb-1">
                Khu vực hiện tại: {hud.district}
              </div>
              <div>
                Nhiệm vụ đã xong: {hud.completedMissions.length}/
                {MISSIONS.length}
              </div>
              <div className="text-cyan-300 mt-1">
                Xanh dương: NV Chính · Tím: NV Phụ · Cam: Trường Đua GP &amp;
                Tay Đua AI · Kim cương xanh: Tiệm Kim Hoàn · Ô xanh mạ: Xe Tăng ·
                Tam giác vàng: Nhà &amp; Chung cư · Đỏ/Xanh: Cảnh sát
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => {
                gameAudio.playCrispClick();
                setIsMapOpen(false);
              }}
              className="w-full min-h-[48px] bg-amber-400 text-slate-950 font-extrabold rounded-xl text-sm">
              Quay lại Menu
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* HOW TO PLAY OVERLAY (zIndex=60, high-alpha dim backdrop, returns to exact origin) */}
      {isHowToPlayOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 overflow-y-auto touch-auto">
          <div className="min-h-full flex flex-col items-center p-4">
            <div className="m-auto w-full max-w-md bg-slate-900 border-2 border-amber-400/50 rounded-2xl p-6 shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Gamepad size={24} />
                <h2 className="text-2xl font-black">HƯỚNG DẪN CHƠI</h2>
              </div>

              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-200 space-y-2">
                <div>
                  <span className="font-bold text-amber-400">
                    WASD / Mũi tên:
                  </span>{' '}
                  Đi bộ hoặc điều khiển lái xe.
                </div>
                <div>
                  <span className="font-bold text-amber-400">Shift:</span> Chạy
                  nhanh hoặc kích hoạt tăng tốc Nitro trên xe.
                </div>
                <div>
                  <span className="font-bold text-amber-400">Space:</span> Nhảy
                  (khi đi bộ) hoặc kéo phanh tay drift (khi lái xe).
                </div>
                <div>
                  <span className="font-bold text-cyan-400">E / B:</span>{' '}
                  Lên/xuống xe (kể cả{' '}
                  <span className="text-lime-300 font-bold">Xe Tăng</span>), đi
                  vào bên trong Ngân Hàng / Tiệm Kim Hoàn / Cửa Hàng / Siêu Thị
                  / Gara, lên thang máy Chung Cư Trên Cao hoặc nhấn{' '}
                  <span className="text-white font-bold">B</span> để mở Trung
                  Tâm Đô Thị!
                </div>
                <div>
                  <span className="font-bold text-cyan-400">
                    Ctrl (Khóa Tâm kiểu Roblox) / Chuột / Zoom:
                  </span>{' '}
                  Nhấn <span className="font-bold text-white">Ctrl</span> để
                  bật/tắt chế độ Shift-Lock — nhân vật tự xoay hướng theo tâm
                  ngắm, di chuột tự do 360° và Click trái bắn tức thì (hoặc giữ
                  chuột phải để xoay khi tắt Khóa Tâm). Cuộn chuột /{' '}
                  <span className="font-bold text-white">+/-</span> /{' '}
                  <span className="font-bold text-white">V</span> để zoom.
                </div>
                <div>
                  <span className="font-bold text-red-400">
                    Chiến đấu &amp; Vũ khí:
                  </span>{' '}
                  Nhấn <span className="font-bold text-white">1–5</span> hoặc{' '}
                  <span className="font-bold text-white">Tab</span> để lấy súng /
                  đổi vũ khí · Nhấn <span className="font-bold text-white">F</span>{' '}
                  hoặc <span className="font-bold text-white">Click chuột trái</span>{' '}
                  để bắn/đánh · Chuột phải để ngắm · <span className="font-bold text-white">R</span> nạp đạn.
                </div>
                <div>
                  <span className="font-bold text-cyan-400">C / H:</span> Đổi
                  góc nhìn thứ 3 / thứ 1 và bấm còi xe.
                </div>
                <div>
                  <span className="font-bold text-emerald-400">Mục tiêu:</span>{' '}
                  Hoàn thành {TOTAL_MISSIONS} hợp đồng khắp Port Aurelia và cắt
                  đuôi lực lượng tuần tra khi bị truy nã!
                </div>
              </div>

              <button
                type="button"
                autoFocus
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsHowToPlayOpen(false);
                  if (howToOrigin === 'pause') {
                    setIsGameMenuOpen(true);
                  }
                }}
                className="w-full min-h-[48px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-base">
                ĐÓNG HƯỚNG DẪN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState.status === 'GAME_OVER' && (
        <Overlay
          title="BỊ ÁP CHẾ"
          description={`Điểm đạt được: ${gameState.score} · Tiền: $${hud.money}`}
          actionLabel="THỬ LẠI"
          onAction={initGame}
          icon={<RotateCw size={22} />}
          tone="danger"
        />
      )}

      {/* VICTORY */}
      {gameState.status === 'VICTORY' && (
        <Overlay
          title="LÀM CHỦ THÀNH PHỐ"
          description={`Bạn đã hoàn thành toàn bộ hợp đồng Port Aurelia! Điểm: ${gameState.score}`}
          actionLabel="CHƠI LẠI TỪ ĐẦU"
          onAction={resetGame}
          icon={<Trophy size={22} />}
          tone="victory">
          <div className="mt-4 flex items-center gap-2 text-emerald-200 text-sm font-bold">
            <Zap size={16} />
            <span>Tổng tài sản tích lũy: ${hud.money}</span>
          </div>
        </Overlay>
      )}
    </div>
  );
}
