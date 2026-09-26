import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { arcAt, arcAngle, launchPosition, type Vec2 } from '../arc';
import type { Phase } from '../../engine/types';

export interface SceneAssets {
  sky: THREE.Texture | null; // null → procedural fallback
  torpedo: THREE.Texture | null;
}

const BLOOD = 0x8a0303;
const FLAME_CORE = 0xffb36b;
const GOLD = 0xc9a227;

// Torpedo sprite geometry: the asset is landscape, nose pointing up-right ≈ 36°.
const TORPEDO_W = 2.6;
const TORPEDO_H = 1.74;
const NOSE_ANGLE = Math.PI / 5; // 36° above horizontal, world space (y-up)
const TAIL_OFFSET = new THREE.Vector3(-0.82, -0.5, 0); // flame, in sprite units

/** Soft radial glow texture — sprite/point maps need it or they render as hard squares. */
function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** normalized [0..1] → world position on the z=0 plane for given camera frustum. */
interface Projector {
  toWorld(n: Vec2, z?: number): THREE.Vector3;
  halfH(z: number): number;
  halfW(z: number): number;
}

function makeProjector(camera: THREE.PerspectiveCamera): Projector {
  const baseHalfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return {
    halfH(z: number) {
      return baseHalfH * (camera.position.z - z);
    },
    halfW(z: number) {
      return baseHalfH * (camera.position.z - z) * camera.aspect;
    },
    toWorld(n: Vec2, z = 0) {
      return new THREE.Vector3(
        (n.x - 0.5) * 2 * baseHalfH * (camera.position.z - z) * camera.aspect,
        (0.5 - n.y) * 2 * baseHalfH * (camera.position.z - z),
        z,
      );
    },
  };
}

interface Ember {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: number;
}

export class ThreeScene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private projector!: Projector;

  private bg!: THREE.Mesh;
  private stars!: THREE.Points;
  private torpedo!: THREE.Group;
  private torpedoSprite!: THREE.Sprite;
  private trailHolder!: THREE.Group;
  private embers: Ember[] = [];
  private flash!: THREE.Mesh;
  private shockwave!: THREE.Mesh;
  private debris!: THREE.Points;

  private phase: Phase = 'BETTING';
  private flightSec = 0;
  private crashSec = 0;
  private crashed = false;
  private warpSpeed = 0;
  private pointer = { x: 0, y: 0 };
  private parallax = { x: 0, y: 0 };
  private starVel = 0.4;
  private quality = 1;

  async init(canvas: HTMLCanvasElement, assets: SceneAssets): Promise<void> {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x050403, 1);
    this.quality = window.devicePixelRatio > 1.5 ? 1.5 : window.devicePixelRatio;
    this.renderer.setPixelRatio(this.quality);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0503, 0.02);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.z = 10;
    this.projector = makeProjector(this.camera);

    this.buildBackground(assets.sky);
    this.buildStars();
    this.buildTorpedo(assets.torpedo);
    this.buildTrail();
    this.buildCrashFx();

    // Post: subtle bloom so the warp flame and stars glow.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  // ── builders ──────────────────────────────────────────────────────────

  private buildBackground(sky: THREE.Texture | null): void {
    let material: THREE.MeshBasicMaterial;
    if (sky) {
      sky.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshBasicMaterial({ map: sky, fog: false });
    } else {
      // Fallback: burning-sky gradient.
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 256;
      const g = c.getContext('2d')!;
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#050403');
      grad.addColorStop(0.55, '#1c0a05');
      grad.addColorStop(0.8, '#571505');
      grad.addColorStop(1, '#8a0303');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshBasicMaterial({ map: tex, fog: false });
      console.warn('[three] sky asset failed — using procedural gradient');
    }
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    this.bg.position.z = -6;
    this.scene.add(this.bg);
  }

  private buildStars(): void {
    const count = 900;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color(GOLD);
    const red = new THREE.Color(0xff5a3c);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = -Math.random() * 14 - 1;
      const c = Math.random() < 0.75 ? warm : red;
      const dim = 0.35 + Math.random() * 0.65;
      col[i * 3] = c.r * dim;
      col[i * 3 + 1] = c.g * dim;
      col[i * 3 + 2] = c.b * dim;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.09,
      map: makeGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private buildTorpedo(tex: THREE.Texture | null): void {
    this.torpedo = new THREE.Group();
    let material: THREE.SpriteMaterial;
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    } else {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 256;
      const g = c.getContext('2d')!;
      g.fillStyle = '#2a2a2e';
      g.beginPath();
      g.moveTo(64, 8);
      g.lineTo(112, 200);
      g.lineTo(64, 248);
      g.lineTo(16, 200);
      g.closePath();
      g.fill();
      g.strokeStyle = '#c9a227';
      g.lineWidth = 6;
      g.stroke();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.SpriteMaterial({ map: t, transparent: true });
      console.warn('[three] torpedo asset failed — using procedural fallback');
    }
    this.torpedoSprite = new THREE.Sprite(material);
    const baseScale = TORPEDO_W;
    this.torpedoSprite.scale.set(baseScale, (TORPEDO_H / TORPEDO_W) * baseScale, 1);
    this.torpedo.add(this.torpedoSprite);
    this.torpedo.position.copy(this.projector.toWorld(launchPosition(), 0));
    this.scene.add(this.torpedo);
  }

  private buildTrail(): void {
    this.trailHolder = new THREE.Group();
    this.scene.add(this.trailHolder);
  }

  private buildCrashFx(): void {
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    );
    this.flash.renderOrder = 50;
    this.scene.add(this.flash);

    this.shockwave = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff6a3a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(this.shockwave);

    const n = 160;
    const pos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.debris = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xff8a4a,
        size: 0.14,
        map: makeGlowTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.debris.userData.velocities = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 6;
      return new THREE.Vector3(Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * 2);
    });
    this.debris.visible = false;
    this.scene.add(this.debris);
  }

  // ── public API ────────────────────────────────────────────────────────

  setPhase(phase: Phase): void {
    if (phase === 'FLYING' && this.phase !== 'FLYING') {
      this.crashed = false;
      this.flightSec = 0;
      this.warpSpeed = 0;
    }
    if (phase === 'BETTING' && this.phase === 'CRASHED') {
      this.crashed = false;
      this.torpedo.visible = true;
    }
    this.phase = phase;
  }

  /** Per-frame update. dtSec: real delta; flightSec: engine flight clock. */
  frame(dtSec: number, flightSec: number, multiplier: number): void {
    this.flightSec = flightSec;
    this.warpSpeed = THREE.MathUtils.lerp(this.warpSpeed, Math.min(6, (multiplier - 1) * 2), 0.05);

    this.updateTorpedo();
    this.updateTrail(dtSec);
    this.updateStars(dtSec);
    this.updateCamera(dtSec, multiplier);
    this.updateCrashFx(dtSec);
    this.layoutBackground();

    this.composer.render();
  }

  /** Trigger the warp-rift detonation at the torpedo's current position. */
  detonate(): void {
    this.crashed = true;
    this.crashSec = 0;
    this.torpedo.visible = false;

    const at = this.projector.toWorld(arcAt(this.flightSec), 0);

    const halfW = this.projector.halfW(this.camera.position.z);
    const halfH = this.projector.halfH(this.camera.position.z);
    this.flash.position.set(0, 0, 5);
    this.flash.scale.set(halfW * 2.2, halfH * 2.2, 1);
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 0.95;

    this.shockwave.position.copy(at);
    this.shockwave.scale.setScalar(0.2);
    (this.shockwave.material as THREE.MeshBasicMaterial).opacity = 0.95;
    this.shockwave.visible = true;

    const posAttr = this.debris.geometry.getAttribute('position') as THREE.BufferAttribute;
    const vels = this.debris.userData.velocities as THREE.Vector3[];
    for (let i = 0; i < vels.length; i++) {
      posAttr.setXYZ(i, at.x, at.y, 0);
    }
    posAttr.needsUpdate = true;
    this.debris.userData.age = 0;
    this.debris.visible = true;
    (this.debris.material as THREE.PointsMaterial).opacity = 1;
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.renderer.dispose();
  }

  // ── internals ─────────────────────────────────────────────────────────

  private onPointer = (e: PointerEvent): void => {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w * this.quality, h * this.quality);
    this.bloom.setSize(w * this.quality, h * this.quality);
    this.layoutBackground();
  };

  private layoutBackground(): void {
    // Cover-fit the sky plate at z=-6.
    const halfW = this.projector.halfW(this.bg.position.z);
    const halfH = this.projector.halfH(this.bg.position.z);
    const tex = (this.bg.material as THREE.MeshBasicMaterial).map;
    let texAspect = 16 / 9;
    if (tex?.image) texAspect = tex.image.width / tex.image.height;
    const viewAspect = (halfW * 2) / (halfH * 2);
    let w = halfW * 2;
    let h = halfH * 2;
    if (texAspect > viewAspect) w = h * texAspect;
    else h = w / texAspect;
    this.bg.scale.set(w * 1.08, h * 1.08, 1);
  }

  private updateTorpedo(): void {
    if (this.crashed) return;
    const n = this.phase === 'BETTING' ? launchPosition() : arcAt(this.flightSec);
    const target = this.projector.toWorld(n, 0);
    this.torpedo.position.lerp(target, this.phase === 'BETTING' ? 0.08 : 0.55);

    // Align sprite rotation to the arc tangent.
    // arcAngle() is measured in screen space (y-down); the world uses y-up.
    if (this.phase !== 'BETTING') {
      const tangentScreen = arcAngle(this.flightSec);
      this.torpedoSprite.material.rotation = -tangentScreen - NOSE_ANGLE;
    }
    // Engine flicker.
    const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.03;
    this.torpedoSprite.scale.y = TORPEDO_H * pulse;
    this.torpedoSprite.scale.x = TORPEDO_W * (2 - pulse);
  }

  private updateTrail(dtSec: number): void {
    // Spawn embers only in flight.
    if (this.phase === 'FLYING' && !this.crashed) {
      const rot = this.torpedoSprite.material.rotation;
      const tail = TAIL_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), rot);
      const world = this.torpedo.position.clone().add(tail);
      const spawn = 2;
      for (let i = 0; i < spawn; i++) this.spawnEmber(world);
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i]!;
      e.life -= dtSec;
      if (e.life <= 0) {
        this.trailHolder.remove(e.sprite);
        e.sprite.material.dispose();
        this.embers.splice(i, 1);
        continue;
      }
      e.sprite.position.addScaledVector(e.vel, dtSec);
      e.vel.multiplyScalar(1 - 1.6 * dtSec);
      e.vel.y -= 0.4 * dtSec; // embers sag into the burning sky
      const k = e.life / e.maxLife;
      e.sprite.material.opacity = k * 0.9;
      e.sprite.scale.setScalar(0.14 + 0.5 * (1 - k) + 0.1 * Math.sin(e.spin + e.life * 20));
    }
  }

  private glowTex: THREE.Texture | null = null;

  private spawnEmber(at: THREE.Vector3): void {
    if (this.embers.length > 220) return;
    if (!this.glowTex) this.glowTex = makeGlowTexture();
    const hue = Math.random();
    const color = new THREE.Color().lerpColors(new THREE.Color(BLOOD), new THREE.Color(FLAME_CORE), hue);
    const mat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(at);
    const vel = new THREE.Vector3(
      -0.8 - Math.random() * 1.6,
      (Math.random() - 0.65) * 1.2,
      (Math.random() - 0.5) * 0.4,
    );
    const maxLife = 0.5 + Math.random() * 0.6;
    this.trailHolder.add(sprite);
    this.embers.push({ sprite, vel, life: maxLife, maxLife, spin: Math.random() * 10 });
  }

  private updateStars(dtSec: number): void {
    this.stars.rotation.z += dtSec * 0.004;
    // Warp-stretch: stars stream toward the viewer during flight.
    const positions = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute;
    const v = this.starVel + this.warpSpeed * 2;
    for (let i = 0; i < positions.count; i++) {
      let z = positions.getZ(i) + v * dtSec;
      if (z > 2) z = -15 - Math.random() * 4;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
  }

  private updateCamera(dtSec: number, multiplier: number): void {
    // Pointer parallax…
    this.parallax.x = THREE.MathUtils.lerp(this.parallax.x, this.pointer.x * 0.35, 0.04);
    this.parallax.y = THREE.MathUtils.lerp(this.parallax.y, -this.pointer.y * 0.25, 0.04);
    // …plus a slow push-in as the multiplier climbs.
    const zoom = Math.min(1.6, Math.log2(Math.max(1, multiplier)) * 0.22);
    this.camera.position.x = this.parallax.x;
    this.camera.position.y = this.parallax.y;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 10 - zoom, 0.03);
    this.camera.lookAt(0, 0, -2);
    void dtSec;
  }

  private updateCrashFx(dtSec: number): void {
    const flashMat = this.flash.material as THREE.MeshBasicMaterial;
    if (flashMat.opacity > 0.001) flashMat.opacity = Math.max(0, flashMat.opacity - dtSec * 2.2);

    if (this.shockwave.visible) {
      this.crashSec += dtSec;
      const k = this.crashSec / 0.9;
      if (k >= 1) {
        this.shockwave.visible = false;
      } else {
        this.shockwave.scale.setScalar(0.2 + k * 7);
        (this.shockwave.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k);
      }
    }

    if (this.debris.visible) {
      this.debris.userData.age += dtSec;
      const age = this.debris.userData.age as number;
      const posAttr = this.debris.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vels = this.debris.userData.velocities as THREE.Vector3[];
      for (let i = 0; i < vels.length; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vels[i]!.x * dtSec,
          posAttr.getY(i) + vels[i]!.y * dtSec,
          posAttr.getZ(i) + vels[i]!.z * dtSec,
        );
      }
      posAttr.needsUpdate = true;
      const mat = this.debris.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - age / 1.4);
      if (mat.opacity <= 0) this.debris.visible = false;
    }
  }
}
