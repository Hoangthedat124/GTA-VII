import {useEffect, useRef, type MutableRefObject, type RefObject} from 'react';

export type InputAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'confirm'
  | 'cancel'
  | 'tap';

export interface PointerState {
  nx: number;
  ny: number;
  clientX: number;
  clientY: number;
  down: boolean;
}

export interface InputSnapshot {
  actions: Record<InputAction, boolean>;
  pointer: PointerState;
  analogMove?: {x: number; y: number};
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  contextAction: boolean;
  cameraToggle: boolean;
  zoomCycle: boolean;
  horn: boolean;
  reload: boolean;
  weaponWheel: boolean;
  hubToggle: boolean;
  aiming: boolean;
  firing: boolean;
  pulseFire: boolean;
  pointerLocked: boolean;
  edgeTurnRate: number; // smooth continuous edge-pan fallback if browser blocks pointerLock
  weaponSlot: number | null;
  lookDeltaX: number;
  lookDeltaY: number;
  zoomDelta: number;
}

const ACTION_KEYS: Record<string, InputAction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  A: 'left',
  KeyA: 'left',
  d: 'right',
  D: 'right',
  KeyD: 'right',
  w: 'up',
  W: 'up',
  KeyW: 'up',
  s: 'down',
  S: 'down',
  KeyS: 'down',
  Enter: 'confirm',
  Escape: 'cancel',
};

function createEmptyActions(): Record<InputAction, boolean> {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false,
    tap: false,
  };
}

export function createInitialInputSnapshot(): InputSnapshot {
  return {
    actions: createEmptyActions(),
    pointer: {nx: 0, ny: 0, clientX: 0, clientY: 0, down: false},
    analogMove: {x: 0, y: 0},
    sprint: false,
    jump: false,
    interact: false,
    contextAction: false,
    cameraToggle: false,
    zoomCycle: false,
    horn: false,
    reload: false,
    weaponWheel: false,
    hubToggle: false,
    aiming: false,
    firing: false,
    pulseFire: false,
    pointerLocked: false,
    edgeTurnRate: 0,
    weaponSlot: null,
    lookDeltaX: 0,
    lookDeltaY: 0,
    zoomDelta: 0,
  };
}

function getPointerNDC(
  event: PointerEvent,
  container: HTMLElement,
): {nx: number; ny: number; clientX: number; clientY: number} {
  const rect = container.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;
  const clientX = event.clientX - rect.left;
  const clientY = event.clientY - rect.top;
  const nx = (clientX / width) * 2 - 1;
  const ny = -(clientY / height) * 2 + 1;
  return {nx, ny, clientX, clientY};
}

export function useInput(
  containerRef: RefObject<HTMLDivElement>,
  options: {
    enabled?: boolean;
    allowPointerLock?: boolean;
    externalInputRef?: MutableRefObject<InputSnapshot>;
    onToggleLockRef?: MutableRefObject<(() => void) | null>;
  } = {},
): MutableRefObject<InputSnapshot> {
  const {
    enabled = true,
    allowPointerLock = false,
    externalInputRef,
    onToggleLockRef,
  } = options;
  const internalInputRef = useRef<InputSnapshot>(createInitialInputSnapshot());
  const inputRef = externalInputRef ?? internalInputRef;
  const allowPointerLockRef = useRef(allowPointerLock);
  allowPointerLockRef.current = allowPointerLock;

  useEffect(() => {
    if (!allowPointerLock) {
      inputRef.current.pointerLocked = false;
      inputRef.current.edgeTurnRate = 0;
      const container = containerRef.current;
      if (container) {
        container.style.cursor = '';
      }
      if (
        typeof document !== 'undefined' &&
        document.pointerLockElement &&
        (document.pointerLockElement === container ||
          document.pointerLockElement === container?.querySelector('canvas'))
      ) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
    }
  }, [allowPointerLock, containerRef, inputRef]);

  useEffect(() => {
    if (!enabled) {
      Object.assign(inputRef.current, createInitialInputSnapshot());
      return;
    }

    const activePointers = new Map<
      number,
      {nx: number; ny: number; clientX: number; clientY: number}
    >();

    const container = containerRef.current;
    let lastClientX = 0;
    let lastClientY = 0;
    let downClientX = 0;
    let downClientY = 0;
    let draggedDistance = 0;
    let hasLastFreePos = false;
    let isLeftButtonDown = false;
    let isRightButtonDown = false;
    let shiftLockMode = false; // Roblox-style Shift-Lock toggled by Ctrl
    let wasNativeLocked = false;
    let lastPinchDist = 0;

    const getLockTarget = (): HTMLElement | null => {
      if (!container) return null;
      return (container.querySelector('canvas') as HTMLElement | null) ?? container;
    };

    const isNativeLocked = (): boolean => {
      if (typeof document === 'undefined' || !container) return false;
      const lockedEl = document.pointerLockElement;
      return Boolean(
        lockedEl &&
          (lockedEl === container || lockedEl === container.querySelector('canvas')),
      );
    };

    const requestNativeLock = () => {
      const target = getLockTarget();
      if (!target) return;
      try {
        if (target.requestPointerLock) {
          Promise.resolve(target.requestPointerLock()).catch(() => {});
        }
      } catch {
        // Fallback Shift-Lock mode remains active
      }
    };

    const exitNativeLock = () => {
      if (isNativeLocked()) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
    };

    const setShiftLockState = (locked: boolean) => {
      shiftLockMode = locked;
      hasLastFreePos = false;
      inputRef.current.pointerLocked = locked;
      inputRef.current.edgeTurnRate = 0;
      if (container) {
        container.style.cursor = locked ? 'crosshair' : '';
      }
      if (locked) {
        requestNativeLock();
      } else {
        wasNativeLocked = false;
        exitNativeLock();
      }
    };

    if (onToggleLockRef) {
      onToggleLockRef.current = () => {
        if (allowPointerLockRef.current) {
          setShiftLockState(!(shiftLockMode || isNativeLocked()));
        }
      };
    }

    const handlePointerLockChange = () => {
      const nativeNow = isNativeLocked();
      if (nativeNow) {
        wasNativeLocked = true;
        shiftLockMode = true;
        inputRef.current.pointerLocked = true;
        inputRef.current.edgeTurnRate = 0;
        if (container) container.style.cursor = 'none';
      } else if (wasNativeLocked && !isRightButtonDown) {
        wasNativeLocked = false;
        shiftLockMode = false;
        hasLastFreePos = false;
        inputRef.current.pointerLocked = false;
        inputRef.current.edgeTurnRate = 0;
        if (container) container.style.cursor = '';
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const code = event.code;
      const key = event.key;

      // Toggle Roblox-style Shift-Lock with Ctrl (Left or Right)
      if (
        (key === 'Control' || code === 'ControlLeft' || code === 'ControlRight') &&
        !event.repeat
      ) {
        if (allowPointerLockRef.current) {
          event.preventDefault();
          const currentlyActive = shiftLockMode || isNativeLocked();
          setShiftLockState(!currentlyActive);
        }
        return;
      }

      const action = ACTION_KEYS[key] ?? ACTION_KEYS[code];
      if (action) {
        inputRef.current.actions[action] = true;
      }

      if (key === 'Shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.sprint = true;
      } else if (key === ' ' || code === 'Space') {
        inputRef.current.jump = true;
        inputRef.current.actions.confirm = true;
      } else if (code === 'KeyE' || key === 'e' || key === 'E') {
        inputRef.current.interact = true;
      } else if (code === 'KeyF' || key === 'f' || key === 'F') {
        inputRef.current.contextAction = true;
      } else if (code === 'KeyC' || key === 'c' || key === 'C') {
        inputRef.current.cameraToggle = true;
      } else if (code === 'KeyV' || key === 'v' || key === 'V') {
        inputRef.current.zoomCycle = true;
      } else if (
        code === 'Equal' ||
        code === 'NumpadAdd' ||
        code === 'BracketRight' ||
        key === '+' ||
        key === '='
      ) {
        inputRef.current.zoomDelta -= 1.8;
      } else if (
        code === 'Minus' ||
        code === 'NumpadSubtract' ||
        code === 'BracketLeft' ||
        key === '-'
      ) {
        inputRef.current.zoomDelta += 1.8;
      } else if (code === 'KeyH' || key === 'h' || key === 'H') {
        inputRef.current.horn = true;
      } else if (code === 'KeyR' || key === 'r' || key === 'R') {
        inputRef.current.reload = true;
      } else if (code === 'Tab' || key === 'Tab') {
        event.preventDefault();
        inputRef.current.weaponWheel = true;
      } else if (code === 'KeyB' || key === 'b' || key === 'B') {
        inputRef.current.hubToggle = true;
      } else if (code === 'Digit1') {
        inputRef.current.weaponSlot = 0;
      } else if (code === 'Digit2') {
        inputRef.current.weaponSlot = 1;
      } else if (code === 'Digit3') {
        inputRef.current.weaponSlot = 2;
      } else if (code === 'Digit4') {
        inputRef.current.weaponSlot = 3;
      } else if (code === 'Digit5') {
        inputRef.current.weaponSlot = 4;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const code = event.code;
      const key = event.key;
      const action = ACTION_KEYS[key] ?? ACTION_KEYS[code];
      if (action) {
        inputRef.current.actions[action] = false;
      }

      if (key === 'Shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.sprint = false;
      } else if (key === ' ' || code === 'Space') {
        inputRef.current.jump = false;
        inputRef.current.actions.confirm = false;
      } else if (code === 'KeyE' || key === 'e' || key === 'E') {
        inputRef.current.interact = false;
      } else if (code === 'KeyF' || key === 'f' || key === 'F') {
        inputRef.current.contextAction = false;
      } else if (code === 'KeyC' || key === 'c' || key === 'C') {
        inputRef.current.cameraToggle = false;
      } else if (code === 'KeyV' || key === 'v' || key === 'V') {
        inputRef.current.zoomCycle = false;
      } else if (code === 'KeyH' || key === 'h' || key === 'H') {
        inputRef.current.horn = false;
      } else if (code === 'KeyR' || key === 'r' || key === 'R') {
        inputRef.current.reload = false;
      } else if (code === 'Tab' || key === 'Tab') {
        inputRef.current.weaponWheel = false;
      } else if (code === 'KeyB' || key === 'b' || key === 'B') {
        inputRef.current.hubToggle = false;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!container) return;
      const pos = getPointerNDC(event, container);
      activePointers.set(event.pointerId, pos);
      inputRef.current.pointer = {...pos, down: true};
      inputRef.current.actions.tap = true;

      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(
          pts[0].clientX - pts[1].clientX,
          pts[0].clientY - pts[1].clientY,
        );
      }

      // If Shift-Lock is active and browser blocked requestPointerLock on Ctrl keydown,
      // this pointerDown gesture is guaranteed to upgrade to native PointerLock!
      if (shiftLockMode && allowPointerLockRef.current && !isNativeLocked()) {
        requestNativeLock();
      }

      if (event.button === 2) {
        // Right-click: ADS aim + rotate camera smoothly when moving mouse
        inputRef.current.aiming = true;
        isRightButtonDown = true;
        lastClientX = event.clientX;
        lastClientY = event.clientY;
      } else if (event.button === 0) {
        lastClientX = event.clientX;
        lastClientY = event.clientY;
        downClientX = event.clientX;
        downClientY = event.clientY;
        draggedDistance = 0;
        isLeftButtonDown = true;
        // Fire IMMEDIATELY on Left-Click whenever Aiming (Right-Click held) OR Shift-Lock is active!
        if (
          event.pointerType === 'mouse' &&
          (shiftLockMode ||
            isNativeLocked() ||
            isRightButtonDown ||
            inputRef.current.aiming)
        ) {
          inputRef.current.firing = true;
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!container) return;
      const pos = getPointerNDC(event, container);
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, pos);
      }

      if (event.pointerType === 'mouse') {
        const rmbStillDown = (event.buttons & 2) !== 0;
        const lmbStillDown = (event.buttons & 1) !== 0;
        isRightButtonDown = rmbStillDown;
        inputRef.current.aiming = rmbStillDown;
        if (!lmbStillDown && isLeftButtonDown) {
          isLeftButtonDown = false;
          inputRef.current.firing = false;
        }
      }

      inputRef.current.pointer = {
        ...pos,
        down: activePointers.size > 0 || isRightButtonDown || isLeftButtonDown,
      };

      // Two-finger pinch zoom on touch devices
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(
          pts[0].clientX - pts[1].clientX,
          pts[0].clientY - pts[1].clientY,
        );
        if (lastPinchDist > 0) {
          const pinchDelta = lastPinchDist - dist;
          inputRef.current.zoomDelta += pinchDelta * 0.04;
        }
        lastPinchDist = dist;
        return;
      }

      if (isNativeLocked()) {
        inputRef.current.lookDeltaX += event.movementX;
        inputRef.current.lookDeltaY += event.movementY;
        inputRef.current.edgeTurnRate = 0;
      } else if (shiftLockMode && allowPointerLockRef.current) {
        if (hasLastFreePos) {
          const dx = event.clientX - lastClientX;
          const dy = event.clientY - lastClientY;
          inputRef.current.lookDeltaX += dx;
          inputRef.current.lookDeltaY += dy;
        }
        lastClientX = event.clientX;
        lastClientY = event.clientY;
        hasLastFreePos = true;

        // Edge-turn fallback if iframe sandbox prevents native PointerLock
        if (pos.nx > 0.82) {
          inputRef.current.edgeTurnRate = -((pos.nx - 0.82) / 0.18) * 2.4;
        } else if (pos.nx < -0.82) {
          inputRef.current.edgeTurnRate = ((-pos.nx - 0.82) / 0.18) * 2.4;
        } else {
          inputRef.current.edgeTurnRate = 0;
        }
      } else if (isRightButtonDown || isLeftButtonDown) {
        const dx = event.clientX - lastClientX;
        const dy = event.clientY - lastClientY;
        if (isLeftButtonDown && !isRightButtonDown) {
          draggedDistance = Math.hypot(
            event.clientX - downClientX,
            event.clientY - downClientY,
          );
        }
        lastClientX = event.clientX;
        lastClientY = event.clientY;
        inputRef.current.lookDeltaX += dx;
        inputRef.current.lookDeltaY += dy;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!container) return;
      const anyMouseStillHeld =
        event.pointerType === 'mouse' && (event.buttons & 3) !== 0;
      if (!anyMouseStillHeld) {
        activePointers.delete(event.pointerId);
      }
      if (activePointers.size < 2) {
        lastPinchDist = 0;
      }
      inputRef.current.actions.tap = false;

      if (event.button === 2) {
        inputRef.current.aiming = false;
        isRightButtonDown = false;
      }
      if (event.button === 0) {
        // When unlocked & not aiming, clean click (< 6px drag) fires once
        if (
          event.pointerType === 'mouse' &&
          !(shiftLockMode || isNativeLocked() || isRightButtonDown) &&
          draggedDistance < 6 &&
          allowPointerLockRef.current
        ) {
          inputRef.current.pulseFire = true;
        }
        inputRef.current.firing = false;
        isLeftButtonDown = false;
      }

      if (event.pointerType === 'mouse') {
        isRightButtonDown = (event.buttons & 2) !== 0;
        inputRef.current.aiming = isRightButtonDown;
      }

      if (activePointers.size > 0 || isRightButtonDown || isLeftButtonDown) {
        const latestPos = Array.from(activePointers.values()).pop();
        if (latestPos) {
          inputRef.current.pointer = {...latestPos, down: true};
        }
      } else {
        const pos = getPointerNDC(event, container);
        inputRef.current.pointer = {...pos, down: false};
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const clamped = Math.max(-180, Math.min(180, event.deltaY));
      inputRef.current.zoomDelta += clamped * 0.025;
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleBlur = () => {
      activePointers.clear();
      isLeftButtonDown = false;
      isRightButtonDown = false;
      lastPinchDist = 0;
      setShiftLockState(false);
      Object.assign(inputRef.current, createInitialInputSnapshot());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBlur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerUp);
      container.addEventListener('wheel', handleWheel, {passive: false});
      container.addEventListener('contextmenu', handleContextMenu);
    }

    return () => {
      if (onToggleLockRef) onToggleLockRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      setShiftLockState(false);

      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerup', handlePointerUp);
        container.removeEventListener('pointercancel', handlePointerUp);
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [containerRef, enabled, inputRef, onToggleLockRef]);

  return inputRef;
}
