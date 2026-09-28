'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    class Stage {
      renderParam: { clearColor: number; width: number; height: number; };
      cameraParam: { left: number; right: number; top: number; bottom: number; near: number; far: number; };
      scene: THREE.Scene | null;
      camera: THREE.OrthographicCamera | null;
      renderer: THREE.WebGLRenderer | null;
      isInitialized: boolean;

      constructor() {
        this.renderParam = {
          clearColor: 0x0f172a, // Using a dark color that fits the site's dark mode
          width: window.innerWidth,
          height: window.innerHeight
        };

        this.cameraParam = {
          left: -1,
          right: 1,
          top: 1,
          bottom: 1,
          near: 0,
          far: -1
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.isInitialized = false;
      }

      init(canvas: HTMLCanvasElement) {
        this._setScene();
        this._setRender(canvas);
        this._setCamera();

        this.isInitialized = true;
      }

      _setScene() {
        this.scene = new THREE.Scene();
      }

      _setRender(canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: true,
          powerPreference: "high-performance", // Hint to the GPU
          antialias: false // Not needed for a shader background
        });
        // Limit device pixel ratio to improve performance on high-DPI screens (like retina displays/phones)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setClearColor(new THREE.Color(this.renderParam.clearColor), 0);
        this.renderer.setSize(this.renderParam.width, this.renderParam.height);
      }

      _setCamera() {
        if (!this.isInitialized) {
          this.camera = new THREE.OrthographicCamera(
            this.cameraParam.left,
            this.cameraParam.right,
            this.cameraParam.top,
            this.cameraParam.bottom,
            this.cameraParam.near,
            this.cameraParam.far
          );
        }
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (this.camera) {
            this.camera.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(windowWidth, windowHeight);
        }
      }

      _render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
      }

      onResize() {
        this._setCamera();
      }

      onRaf() {
        this._render();
      }
    }

    class Mesh {
      canvas: HTMLCanvasElement;
      canvasWidth: number;
      canvasHeight: number;
      uniforms: any;
      stage: Stage;
      mesh: THREE.Mesh | null;
      xScale: number;
      yScale: number;
      distortion: number;

      constructor(stage: Stage, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        this.uniforms = {
          resolution: { type: "v2", value: [ this.canvasWidth, this.canvasHeight ] },
          time: { type: "f", value: 0.0 },
          xScale: { type: "f", value: 1.0 },
          yScale: { type: "f", value: 0.5 },
          distortion: { type: "f", value: 0.050 }
        };

        this.stage = stage;

        this.mesh = null;
        
        this.xScale = 1.0;
        this.yScale = 0.5;
        this.distortion = 0.050;
      }

      init() {
        this._setMesh();
      }

      _setMesh() {
        const position = [
          -1.0, -1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0,  1.0, 0.0
        ];

        const positions = new THREE.BufferAttribute(new Float32Array(position), 3);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", positions);

        const material = new THREE.RawShaderMaterial({
          vertexShader: `
            attribute vec3 position;
            void main()	{
              gl_Position = vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            // Use mediump instead of highp to significantly boost mobile performance
            precision mediump float;
            uniform vec2 resolution;
            uniform float time;
            uniform float xScale;
            uniform float yScale;
            uniform float distortion;

            void main() {
              vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
              
              float d = length(p) * distortion;
              
              float rx = p.x * (1.0 + d);
              float gx = p.x;
              float bx = p.x * (1.0 - d);

              float w1 = 0.012 / (abs(p.y + sin((rx + time) * xScale) * yScale) + 0.05);
              float w2 = 0.012 / (abs(p.y + sin((gx + time) * xScale) * yScale) + 0.05);
              float w3 = 0.012 / (abs(p.y + sin((bx + time) * xScale) * yScale) + 0.05);
              
              vec3 color = w1 * vec3(0.545, 0.361, 0.965) + 
                           w2 * vec3(0.400, 0.200, 0.900) + 
                           w3 * vec3(0.231, 0.510, 0.965);
              
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          uniforms: this.uniforms,
          side: THREE.DoubleSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false, // Optimization: No depth writing needed for 2D background
          depthTest: false // Optimization: No depth testing needed
        });

        this.mesh = new THREE.Mesh(geometry, material);

        if (this.stage.scene) {
            this.stage.scene.add(this.mesh);
        }
      }
      
      _render() {
        this.uniforms.time.value += 0.01;
      }

      onResize() {
        this.uniforms.resolution.value = [window.innerWidth, window.innerHeight];
      }

      onRaf() {
        this._render();
      }
    }

    const isWebGLAvailable = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    };

    if (!isWebGLAvailable()) {
      console.warn('WebGL is not supported on this device. Disabling 3D background.');
      return;
    }

    const stage = new Stage();
    let mesh: Mesh | null = null;
    let animationFrameId: number;
    let isVisible = true;
    let observer: IntersectionObserver | null = null;

    try {
      stage.init(canvasRef.current);
      mesh = new Mesh(stage, canvasRef.current);
      mesh.init();
    } catch (e) {
      console.warn('WebGL is not supported or failed to initialize on this device. Disabling background animation.', e);
      return; // Exit early so we don't crash the app or run the animation loop
    }

    const handleResize = () => {
      stage.onResize();
      if (mesh) mesh.onResize();
    };

    window.addEventListener("resize", handleResize);

    // Optimization: Only animate when the canvas is actually visible on screen
    observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    });
    observer.observe(canvasRef.current);

    const _raf = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        if (isVisible) {
          stage.onRaf();
          if (mesh) mesh.onRaf();
        }
        _raf();
      });
    };

    _raf();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
      if (observer && canvasRef.current) observer.unobserve(canvasRef.current);
      if (stage.renderer) {
          stage.renderer.dispose();
      }
      if (mesh && mesh.mesh) {
          mesh.mesh.geometry.dispose();
          (mesh.mesh.material as THREE.Material).dispose();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="webgl-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none', // Allow clicks to pass through
      }}
    />
  );
}
