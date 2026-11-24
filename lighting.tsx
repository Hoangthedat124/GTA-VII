import {useFrame, useThree} from '@react-three/fiber';
import React, {useRef} from 'react';
import * as THREE from 'three';
import {getConfig} from '../constants';
import {GraphicsQuality, WeatherType} from '../types';

const sunFocus = new THREE.Vector3();
const sunForward = new THREE.Vector3();

const SUN_FOCUS_DISTANCE = 14;
const SUN_SHADOW_EXTENT_MAP: Record<GraphicsQuality, number> = {
  low: 24,
  medium: 32,
  high: 44,
  ultra: 56,
};
const SHADOW_MAP_SIZES: Record<GraphicsQuality, number> = {
  low: 512,
  medium: 1024,
  high: 2048,
  ultra: 2048,
};

const SKY_DAWN = new THREE.Color('#f59e7a');
const SKY_DAY = new THREE.Color('#7ec8f2');
const SKY_SUNSET = new THREE.Color('#ea6a47');
const SKY_NIGHT = new THREE.Color('#0c1428');
const SKY_RAIN = new THREE.Color('#475569');
const SKY_CLOUDY = new THREE.Color('#94a3b8');
const SKY_FOG = new THREE.Color('#cbd5e1');

const SUN_DAY = new THREE.Color('#fff7e2');
const SUN_WARM = new THREE.Color('#ffaa66');
const SUN_MOON = new THREE.Color('#8ab4f8');

const HEMI_SKY_DAY = new THREE.Color('#93d5ff');
const HEMI_SKY_NIGHT = new THREE.Color('#273b69');
const HEMI_GND_DAY = new THREE.Color('#6e5f50');
const HEMI_GND_NIGHT = new THREE.Color('#2d313d');

const tempSky = new THREE.Color();
const tempSunColor = new THREE.Color();
const tempHemiSky = new THREE.Color();
const tempHemiGnd = new THREE.Color();

export interface DefaultLightingProps {
  timeOfDayRef: React.MutableRefObject<number>; // 0..1 (0.25 dawn, 0.5 noon, 0.75 sunset, 0 midnight)
  weather: WeatherType;
  quality: GraphicsQuality;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

export const DefaultLighting = React.memo(function DefaultLighting({
  timeOfDayRef,
  weather,
  quality,
  playerPosRef,
}: DefaultLightingProps): React.ReactElement {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const auraLightRef = useRef<THREE.PointLight>(null);
  const {camera, scene} = useThree();

  const shadowMapRes = SHADOW_MAP_SIZES[quality];
  const shadowExtent = SUN_SHADOW_EXTENT_MAP[quality];

  useFrame(() => {
    const t = timeOfDayRef.current; // 0..1
    // Compute elevation angle: 0.25 = sunrise (0 rad), 0.5 = noon (PI/2), 0.75 = sunset (PI)
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const sunHoriz = Math.cos(sunAngle);
    const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.22) / 0.55, 0, 1);

    // Sky color interpolation across night -> dawn -> day -> sunset -> night
    if (sunHeight > 0.25) {
      tempSky.copy(SKY_DAY);
    } else if (sunHeight > -0.15) {
      const k = (sunHeight + 0.15) / 0.4;
      const warmRef = sunHoriz >= 0 ? SKY_DAWN : SKY_SUNSET;
      tempSky.copy(SKY_NIGHT).lerp(warmRef, k * 0.9);
      if (k > 0.55) {
        tempSky.lerp(SKY_DAY, (k - 0.55) / 0.45);
      }
    } else {
      tempSky.copy(SKY_NIGHT);
    }

    if (weather === 'rain') {
      tempSky.lerp(SKY_RAIN, 0.65);
    } else if (weather === 'cloudy') {
      tempSky.lerp(SKY_CLOUDY, 0.45);
    } else if (weather === 'fog') {
      tempSky.lerp(SKY_FOG, 0.6);
    }

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(tempSky);
    } else {
      scene.background = tempSky.clone();
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(tempSky);
      const baseNear = weather === 'fog' ? 24 : weather === 'rain' ? 55 : 150;
      const baseFar =
        weather === 'fog'
          ? 145
          : weather === 'rain'
            ? 230
            : quality === 'low'
              ? 280
              : 460;
      scene.fog.near = baseNear;
      scene.fog.far = baseFar;
    }

    // Update Directional Sun/Moon Light
    const dir = dirLightRef.current;
    if (dir) {
      camera.getWorldDirection(sunForward);
      sunFocus
        .copy(camera.position)
        .addScaledVector(sunForward, SUN_FOCUS_DISTANCE);
      sunFocus.y = 0;

      // Snap shadow target to shadow-map texel grid to prevent shadow swimming/jitter while moving
      const texelSize = (shadowExtent * 2) / shadowMapRes;
      sunFocus.x = Math.round(sunFocus.x / texelSize) * texelSize;
      sunFocus.z = Math.round(sunFocus.z / texelSize) * texelSize;

      const elev = Math.max(0.28, Math.abs(sunHeight));
      const sx = sunHoriz * 28;
      const sy = elev * 42;
      const sz = 16;

      dir.position.set(sunFocus.x + sx, sunFocus.y + sy, sunFocus.z + sz);
      dir.target.position.copy(sunFocus);
      dir.target.updateMatrixWorld();

      const baseSun = Math.max(3.0, getConfig('sunIntensity'));
      const weatherMul =
        weather === 'rain' ? 0.55 : weather === 'cloudy' ? 0.72 : 1.0;
      dir.intensity = THREE.MathUtils.lerp(
        1.9,
        baseSun * weatherMul,
        dayFactor,
      );

      if (dayFactor < 0.25) {
        tempSunColor.copy(SUN_MOON);
      } else if (sunHeight < 0.3) {
        tempSunColor.copy(SUN_WARM).lerp(SUN_DAY, Math.max(0, sunHeight / 0.3));
      } else {
        tempSunColor.copy(SUN_DAY);
      }
      dir.color.copy(tempSunColor);
    }

    // Update Hemisphere Light
    const hemi = hemiLightRef.current;
    if (hemi) {
      tempHemiSky.copy(HEMI_SKY_NIGHT).lerp(HEMI_SKY_DAY, dayFactor);
      tempHemiGnd.copy(HEMI_GND_NIGHT).lerp(HEMI_GND_DAY, dayFactor);
      hemi.color.copy(tempHemiSky);
      hemi.groundColor.copy(tempHemiGnd);
      hemi.intensity = THREE.MathUtils.lerp(
        0.75,
        Math.max(1.0, getConfig('hemiIntensity')),
        dayFactor,
      );
    }

    // Update Ambient Light (minimum 1.5 during daytime, soft moonlight at night)
    const amb = ambientLightRef.current;
    if (amb) {
      const baseAmb = Math.max(1.5, getConfig('ambientIntensity'));
      amb.intensity = THREE.MathUtils.lerp(0.85, baseAmb, dayFactor);
    }

    // Player Aura light (helps readability at night / in alleys)
    const aura = auraLightRef.current;
    if (aura) {
      aura.position.set(
        playerPosRef.current.x,
        playerPosRef.current.y + 2.4,
        playerPosRef.current.z,
      );
      aura.intensity = THREE.MathUtils.lerp(32, 6, dayFactor);
    }
  });

  return (
    <>
      <fog attach="fog" args={[getConfig('backgroundColor'), 75, 220]} />
      <ambientLight
        ref={ambientLightRef}
        color={getConfig('ambientColor')}
        intensity={Math.max(1.5, getConfig('ambientIntensity'))}
      />
      <hemisphereLight
        ref={hemiLightRef}
        color={getConfig('hemiSkyColor')}
        groundColor={getConfig('hemiGroundColor')}
        intensity={Math.max(1.0, getConfig('hemiIntensity'))}
      />
      <directionalLight
        ref={dirLightRef}
        intensity={Math.max(3.0, getConfig('sunIntensity'))}
        color={getConfig('sunColor')}
        castShadow={quality !== 'low'}
        shadow-mapSize={[shadowMapRes, shadowMapRes]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <pointLight
        ref={auraLightRef}
        color="#dbeafe"
        intensity={12}
        distance={16}
        decay={1.2}
        castShadow={false}
      />
    </>
  );
});
