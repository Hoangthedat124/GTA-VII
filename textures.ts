import * as THREE from 'three';

export interface CityTextures {
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughness: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  glassTowerMap: THREE.CanvasTexture;
  glassTowerEmissive: THREE.CanvasTexture;
  residentialMap: THREE.CanvasTexture;
  residentialEmissive: THREE.CanvasTexture;
  commercialMap: THREE.CanvasTexture;
  sandMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  runwayMap: THREE.CanvasTexture;
  containerMap: THREE.CanvasTexture;
}

let cachedTextures: CityTextures | null = null;

function createCanvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  repeatX = 1,
  repeatY = 1,
  srgb = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function getCityTextures(): CityTextures {
  if (cachedTextures) return cachedTextures;

  // 1. Realistic Asphalt Road Texture (cracks, aggregate grain, tire wear, lane lines)
  const asphaltMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#252932';
      ctx.fillRect(0, 0, s, s);

      // Mineral aggregate noise
      for (let i = 0; i < 18000; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const v = 28 + Math.floor(Math.random() * 28);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
        ctx.fillRect(x, y, 2, 2);
      }

      // Subtle tire wear tracks
      ctx.fillStyle = 'rgba(15, 17, 22, 0.28)';
      ctx.fillRect(s * 0.18, 0, s * 0.14, s);
      ctx.fillRect(s * 0.68, 0, s * 0.14, s);

      // Asphalt cracks
      ctx.strokeStyle = 'rgba(12, 13, 18, 0.65)';
      ctx.lineWidth = 1.4;
      for (let c = 0; c < 14; c++) {
        let cx = Math.random() * s;
        let cy = Math.random() * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let seg = 0; seg < 6; seg++) {
          cx += (Math.random() - 0.5) * 40;
          cy += (Math.random() - 0.5) * 40;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }

      // Center double yellow line
      ctx.fillStyle = '#eab308';
      ctx.fillRect(s * 0.485, 0, s * 0.012, s);
      ctx.fillRect(s * 0.503, 0, s * 0.012, s);

      // Side white edge lines
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.fillRect(s * 0.04, 0, s * 0.015, s);
      ctx.fillRect(s * 0.945, 0, s * 0.015, s);
    },
    1,
    1,
    true,
  );

  // Asphalt roughness map (puddles & variation for rain reflections)
  const asphaltRoughness = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        const px = Math.random() * s;
        const py = Math.random() * s;
        const rad = 18 + Math.random() * 48;
        const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
        grad.addColorStop(0, 'rgba(35,35,35,0.65)');
        grad.addColorStop(1, 'rgba(200,200,200,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1,
    1,
    false,
  );

  // 2. Concrete Sidewalk Pavers
  const sidewalkMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 10000; i++) {
        const v = 130 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 7})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      const step = s / 8;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(s, i * step);
        ctx.stroke();
      }
    },
    4,
    4,
    true,
  );

  // 3. Reflective Glass Skyscraper Curtain Wall + Night Emissive
  const glassTowerMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, s, s);
      const cols = 8;
      const rows = 12;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const skyGrad = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
          const lit = Math.random() > 0.35;
          skyGrad.addColorStop(0, lit ? '#38bdf8' : '#0f172a');
          skyGrad.addColorStop(1, lit ? '#1d4ed8' : '#1e293b');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
          // Mullion highlights
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, 3);
        }
      }
    },
    2,
    3,
    true,
  );

  const glassTowerEmissive = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, s, s);
      const cols = 8;
      const rows = 12;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rnd = Math.random();
          if (rnd > 0.42) {
            ctx.fillStyle =
              rnd > 0.8 ? '#fde68a' : rnd > 0.6 ? '#7dd3fc' : '#fef3c7';
            ctx.fillRect(c * cw + 5, r * rh + 5, cw - 10, rh - 10);
          }
        }
      }
    },
    2,
    3,
    true,
  );

  // 4. Residential / Townhouse Stucco & Window Texture
  const residentialMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#d6c7b2';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle =
          Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
      const cols = 4;
      const rows = 4;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(c * cw + 22, r * rh + 24, cw - 44, rh - 48);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(c * cw + 26, r * rh + 28, cw - 52, rh - 56);
          // Window sill
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(c * cw + 18, (r + 1) * rh - 24, cw - 36, 8);
        }
      }
    },
    1,
    1,
    true,
  );

  const residentialEmissive = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, s, s);
      const cols = 4;
      const rows = 4;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.35) {
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(c * cw + 28, r * rh + 30, cw - 56, rh - 60);
          }
        }
      }
    },
    1,
    1,
    true,
  );

  // 5. Commercial Brick & Storefront
  const commercialMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#7c3f2c';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#57281b';
      ctx.lineWidth = 2;
      for (let y = 0; y < s; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      const cols = 4;
      const rows = 3;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c * cw + 18, r * rh + 20, cw - 36, rh - 44);
          ctx.fillStyle = r === rows - 1 ? '#fde047' : '#93c5fd';
          ctx.fillRect(c * cw + 22, r * rh + 24, cw - 44, rh - 52);
        }
      }
    },
    1,
    1,
    true,
  );

  // 6. Golden Sand Beach
  const sandMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#e6c88a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 20000; i++) {
        const r = Math.random();
        ctx.fillStyle = r < 0.35 ? '#d9b570' : r < 0.7 ? '#f0d8a1' : '#c9a259';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
    },
    12,
    12,
    true,
  );

  // 7. Coastal Hills Grass
  const grassMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#476b35';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 18000; i++) {
        const r = Math.random();
        ctx.fillStyle = r < 0.4 ? '#557d3e' : r < 0.8 ? '#365226' : '#6f964b';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
    },
    16,
    16,
    true,
  );

  // 8. Airstrip Runway
  const runwayMap = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#1f242c';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(s * 0.47, s * 0.1, s * 0.06, s * 0.65);
      ctx.fillRect(s * 0.08, 0, s * 0.03, s);
      ctx.fillRect(s * 0.89, 0, s * 0.03, s);
    },
    1,
    6,
    true,
  );

  // 9. Shipping Container Ribbed Steel
  const containerMap = createCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 16) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, 0, 6, s);
      }
    },
    2,
    1,
    true,
  );

  cachedTextures = {
    asphaltMap,
    asphaltRoughness,
    sidewalkMap,
    glassTowerMap,
    glassTowerEmissive,
    residentialMap,
    residentialEmissive,
    commercialMap,
    sandMap,
    grassMap,
    runwayMap,
    containerMap,
  };
  return cachedTextures;
}
