import React, {useEffect, useRef} from 'react';
import {HudTelemetry} from '../types';
import {
  BRIDGE_Z_CENTERS,
  CITY_BUILDINGS,
  ENTERABLE_BUILDINGS,
  RACETRACK_SAMPLES,
  RIVER_MAX_X,
  RIVER_MIN_X,
  ROAD_X_CENTERS,
  ROAD_Z_CENTERS,
} from './worldData';

interface MinimapCanvasProps {
  hud: HudTelemetry;
  size?: number;
  zoomScale?: number;
  fullMap?: boolean;
}

export function MinimapCanvas({
  hud,
  size = 116,
  zoomScale = 0.45,
  fullMap = false,
}: MinimapCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const pxSize = Math.floor(size * dpr);
    if (canvas.width !== pxSize || canvas.height !== pxSize) {
      canvas.width = pxSize;
      canvas.height = pxSize;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    // Full map frames doubled megacity + wide river (X: -460..960 = 1420 wide)
    const scale = fullMap ? size / 1460 : zoomScale;
    const originX = fullMap ? 250 : hud.playerX;
    const originZ = fullMap ? -10 : hud.playerZ;

    const toScreenX = (wx: number) => cx + (wx - originX) * scale;
    const toScreenY = (wz: number) => cy + (wz - originZ) * scale;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Aurelia River (X: 110..240)
    const riverL = toScreenX(RIVER_MIN_X);
    const riverR = toScreenX(RIVER_MAX_X);
    if (riverR > 0 && riverL < size) {
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(riverL, 0, riverR - riverL, size);
    }

    // Southern Ocean (Z > 280)
    const oceanY = toScreenY(280);
    if (oceanY < size) {
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, Math.max(0, oceanY), size, size - Math.max(0, oceanY));
    }

    // Beaches (Z: 250..280)
    const beachTop = toScreenY(250);
    const beachBot = toScreenY(280);
    if (beachBot > 0 && beachTop < size) {
      ctx.fillStyle = '#a1885d';
      ctx.fillRect(toScreenX(-460), beachTop, 570 * scale, beachBot - beachTop);
      ctx.fillRect(toScreenX(240), beachTop, 700 * scale, beachBot - beachTop);
    }

    // Roads (West City, East City — x=650 & x=800 terminate at Z=-140 for the Racetrack)
    ctx.fillStyle = '#334155';
    const roadW = Math.max(2.0, 12 * scale);
    for (const rx of ROAD_X_CENTERS) {
      const sx = toScreenX(rx);
      if (rx >= 650) {
        ctx.fillRect(sx - roadW / 2, toScreenY(-140), roadW, 395 * scale);
      } else {
        ctx.fillRect(sx - roadW / 2, toScreenY(-295), roadW, 550 * scale);
      }
    }
    for (const rz of ROAD_Z_CENTERS) {
      const sy = toScreenY(rz);
      ctx.fillRect(toScreenX(-430), sy - roadW / 2, 540 * scale, roadW);
      ctx.fillRect(toScreenX(240), sy - roadW / 2, 690 * scale, roadW);
    }
    // 3 Bridges across Aurelia River
    ctx.fillStyle = '#94a3b8';
    for (const bz of BRIDGE_Z_CENTERS) {
      const sy = toScreenY(bz);
      ctx.fillRect(
        toScreenX(RIVER_MIN_X - 10),
        sy - roadW * 0.7,
        (RIVER_MAX_X - RIVER_MIN_X + 20) * scale,
        roadW * 1.4,
      );
    }

    // Port Aurelia International Speedway Circuit
    if (RACETRACK_SAMPLES.length > 0) {
      ctx.save();
      ctx.beginPath();
      RACETRACK_SAMPLES.forEach((s, idx) => {
        const sx = toScreenX(s.x);
        const sy = toScreenY(s.z);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = Math.max(3.5, 19 * scale);
      ctx.stroke();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(2.2, 14 * scale);
      ctx.stroke();
      // Start/finish tick
      const s0 = RACETRACK_SAMPLES[0];
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(toScreenX(s0.x) - 1.5, toScreenY(s0.z) - Math.max(2, 8 * scale), 3, Math.max(4, 16 * scale));
      ctx.restore();
    }

    // Solid Buildings
    ctx.fillStyle = '#475569';
    for (const b of CITY_BUILDINGS) {
      const bx = toScreenX(b.x - b.w / 2);
      const bz = toScreenY(b.z - b.d / 2);
      ctx.fillRect(bx, bz, Math.max(2, b.w * scale), Math.max(2, b.d * scale));
    }
    // Enterable Buildings
    ctx.fillStyle = '#64748b';
    for (const eb of ENTERABLE_BUILDINGS) {
      const bx = toScreenX(eb.x - eb.w / 2);
      const bz = toScreenY(eb.z - eb.d / 2);
      ctx.fillRect(
        bx,
        bz,
        Math.max(3, eb.w * scale),
        Math.max(3, eb.d * scale),
      );
    }

    // Police detection radius ring around player when wanted
    if (hud.wantedLevel > 0) {
      const px = toScreenX(hud.playerX);
      const py = toScreenY(hud.playerZ);
      ctx.strokeStyle = hud.policeSightActive
        ? 'rgba(239, 68, 68, 0.55)'
        : 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(px, py, 48 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // GPS Route Line
    if (hud.targetX !== null && hud.targetZ !== null) {
      const px = toScreenX(hud.playerX);
      const py = toScreenY(hud.playerZ);
      const tx = toScreenX(hud.targetX);
      const ty = toScreenY(hud.targetZ);

      ctx.strokeStyle =
        hud.activeMissionId !== null || hud.activeSideMissionId !== null
          ? '#f59e0b'
          : '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const blinkBlue = Math.floor(Date.now() / 220) % 2 === 0;

    for (const blip of hud.blips) {
      const bx = toScreenX(blip.x);
      const by = toScreenY(blip.z);
      if (bx < 2 || bx > size - 2 || by < 2 || by > size - 2) continue;
      ctx.beginPath();
      if (blip.type === 'police') {
        ctx.fillStyle = blinkBlue ? '#3b82f6' : '#ef4444';
        ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'checkpoint') {
        ctx.fillStyle = '#fbbf24';
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'mission') {
        ctx.fillStyle = '#22d3ee';
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'tank') {
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(bx - 4.5, by - 4.5, 9, 9);
        ctx.strokeStyle = '#ecfccb';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx - 4.5, by - 4.5, 9, 9);
      } else if (blip.type === 'side_mission') {
        ctx.fillStyle = '#c084fc';
        ctx.arc(bx, by, 4.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'jewelry') {
        ctx.fillStyle = '#38bdf8';
        ctx.moveTo(bx, by - 4.5);
        ctx.lineTo(bx + 4.5, by);
        ctx.lineTo(bx, by + 4.5);
        ctx.lineTo(bx - 4.5, by);
        ctx.closePath();
        ctx.fill();
      } else if (blip.type === 'shop') {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(bx - 3.5, by - 3.5, 7, 7);
      } else if (blip.type === 'garage') {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(bx - 3.5, by - 3.5, 7, 7);
      } else if (blip.type === 'bank_atm') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx - 3.5, by - 3.5, 7, 7);
      } else if (blip.type === 'house') {
        ctx.fillStyle = '#fef08a';
        ctx.moveTo(bx, by - 4.5);
        ctx.lineTo(bx + 4, by + 3.5);
        ctx.lineTo(bx - 4, by + 3.5);
        ctx.closePath();
        ctx.fill();
      } else if (blip.type === 'bank') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx - 4, by - 4, 8, 8);
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 4, by - 4, 8, 8);
      } else if (blip.type === 'gas_station') {
        ctx.fillStyle = '#fb923c';
        ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'minimart') {
        ctx.fillStyle = '#4ade80';
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'medkit') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx - 3, by - 1, 6, 2);
        ctx.fillRect(bx - 1, by - 3, 2, 6);
      } else if (blip.type === 'armor') {
        ctx.fillStyle = '#38bdf8';
        ctx.arc(bx, by, 2.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (blip.type === 'ammo') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx - 2.2, by - 2.2, 4.4, 4.4);
      } else if (blip.type === 'racetrack') {
        ctx.fillStyle = '#f97316';
        ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (blip.type === 'racer') {
        ctx.fillStyle = '#fb7185';
        ctx.arc(bx, by, 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#cbd5e1';
        ctx.arc(bx, by, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Arrow
    const px = toScreenX(hud.playerX);
    const py = toScreenY(hud.playerZ);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-hud.playerRotY);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud, size, zoomScale, fullMap]);

  const borderClass =
    hud.wantedLevel > 0
      ? hud.policeSightActive
        ? 'border-2 border-red-500 animate-pulse'
        : 'border-2 border-amber-400'
      : 'border border-slate-500/50';

  return (
    <canvas
      ref={canvasRef}
      style={{width: size, height: size}}
      className={`block rounded-lg bg-slate-950 ${borderClass}`}
    />
  );
}
