import { useEffect, useRef } from "react";
import type * as THREE from "three";
// Fontes auto-hospedadas (woff2 servidos do próprio domínio) — compatível com
// o CSP do app (`font-src 'self'`). Mesma convenção do @fontsource/geist-*.
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./HabitGridLoader.css";

interface HabitGridLoaderProps {
  /** Quando `true`, a barra completa até 100% e o loader some com fade. */
  ready?: boolean;
  /** Chamado depois do fade-out, para o pai desmontar o loader. */
  onFinished?: () => void;
}

const PHASES = [
  "Preparando seus hábitos",
  "Sincronizando sequências",
  "Calculando consistência",
  "Quase lá",
];

/**
 * Tela de carregamento "Grade de hábitos" — recriação fiel do protótipo
 * `Loader Grade Streaks.dc.html` (Opção 2 · Grade de hábitos).
 *
 * Uma grade 3D (7×5) de barras estilo "streak" oscila numa onda enquanto o
 * grupo gira sozinho; o usuário pode arrastar para girar com inércia. O bloco
 * de progresso embaixo sobe até ~90% enquanto `ready` é falso e dispara até
 * 100% (com fade) assim que `ready` vira verdadeiro.
 *
 * O three.js é carregado sob demanda (dynamic import) para não pesar o chunk
 * inicial — o overlay HTML aparece no primeiro paint e o canvas 3D entra logo
 * em seguida, seguindo a mesma estratégia de deferral do PGlite em db/client.ts.
 */
export function HabitGridLoader({ ready = false, onFinished }: HabitGridLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);

  // Lidos dentro do loop de animação sem recriar a cena quando mudam.
  const readyRef = useRef(ready);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const initScene = (three: typeof import("three")): (() => void) => {
      // Casa as cores com o protótipo original. Em three r0.185 o default de
      // ColorManagement é `true`; salvamos e restauramos no cleanup para não
      // vazar estado global do módulo (a flag é singleton, não do renderer).
      const prevColorManagement = three.ColorManagement.enabled;
      three.ColorManagement.enabled = false;

      // Em telas touch (celular/WebView) reduz o custo de GPU: sem antialias
      // e DPR limitado a 1.5 — imperceptível em tela pequena, muito mais leve.
      const coarse =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
      const renderer = new three.WebGLRenderer({
        canvas,
        antialias: !coarse,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 4.2, 6.2);
      camera.lookAt(0, 0, 0);

      scene.add(new three.AmbientLight(0x404030, 1.4));
      const key = new three.DirectionalLight(0xffffff, 1.5);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new three.PointLight(0xa9c44d, 1.0, 30);
      rim.position.set(-4, -1, 4);
      scene.add(rim);
      const fill = new three.PointLight(0x88aaff, 0.6, 30);
      fill.position.set(3, -3, -2);
      scene.add(fill);

      const group = new three.Group();
      scene.add(group);

      // ---- grade de hábitos ----
      const cols = 7;
      const rows = 5;
      const gap = 0.66;
      const boxes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
      const dists: number[] = [];
      const geo = new three.BoxGeometry(0.46, 1, 0.46);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const mat = new three.MeshStandardMaterial({
            color: 0xa9c44d,
            emissive: 0x2c3a0c,
            emissiveIntensity: 0.4,
            roughness: 0.4,
            metalness: 0.1,
          });
          const m = new three.Mesh(geo, mat);
          m.position.x = (c - (cols - 1) / 2) * gap;
          m.position.z = (r - (rows - 1) / 2) * gap;
          dists.push(Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2));
          group.add(m);
          boxes.push(m);
        }
      }
      const plateGeo = new three.BoxGeometry(cols * gap + 0.5, 0.12, rows * gap + 0.5);
      const plateMat = new three.MeshStandardMaterial({ color: 0x12140d, roughness: 0.9 });
      const plate = new three.Mesh(plateGeo, plateMat);
      plate.position.y = -0.06;
      group.add(plate);

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      // ---- arraste para girar com inércia ----
      let rx = 0;
      let ry = 0.5;
      let vx = 0;
      let vy = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let moved = false;

      const point = (e: MouseEvent | TouchEvent) =>
        "touches" in e ? e.touches[0] : (e as MouseEvent);

      const down = (e: MouseEvent | TouchEvent) => {
        dragging = true;
        moved = false;
        const p = point(e);
        if (!p) return;
        lastX = p.clientX;
        lastY = p.clientY;
        canvas.style.cursor = "grabbing";
      };
      const move = (e: MouseEvent | TouchEvent) => {
        if (!dragging) return;
        const p = point(e);
        if (!p) return;
        const dx = p.clientX - lastX;
        const dy = p.clientY - lastY;
        lastX = p.clientX;
        lastY = p.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        ry += dx * 0.01;
        rx += dy * 0.008;
        rx = Math.max(-0.6, Math.min(1.1, rx));
        vy = dx * 0.01;
        vx = dy * 0.008;
        if (hintRef.current && moved) hintRef.current.style.opacity = "0";
        if (e.cancelable && "touches" in e) e.preventDefault();
      };
      const up = () => {
        dragging = false;
        canvas.style.cursor = "grab";
      };
      canvas.addEventListener("mousedown", down);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      canvas.addEventListener("touchstart", down, { passive: false });
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);

      // ---- progresso ----
      let prog = 0;
      let finishing = false;
      let finished = false;
      let finishTimer = 0;

      let last = performance.now();
      let elapsed = 0;
      let raf = 0;

      const loop = () => {
        const now = performance.now();
        const raw = (now - last) / 1000;
        last = now;
        const dt = Math.min(raw, 0.05);
        elapsed += raw;
        const t = elapsed;

        if (!dragging) {
          vx *= 0.95;
          vy *= 0.95;
          rx += vx;
          ry += vy;
          ry += 0.003;
          rx = Math.max(-0.6, Math.min(1.1, rx));
        }
        group.rotation.x = rx;
        group.rotation.y = ry;

        for (let i = 0; i < boxes.length; i++) {
          const m = boxes[i];
          const h = 0.25 + (Math.sin(t * 1.8 - dists[i] * 0.9) * 0.5 + 0.5) * 1.6;
          m.scale.y = h;
          m.position.y = h / 2;
          m.material.emissiveIntensity = 0.12 + (h / 1.85) * 0.45;
        }

        // Sobe até ~90% enquanto carrega; dispara até 100% quando pronto.
        const canComplete = readyRef.current && t > 0.7;
        if (canComplete) {
          prog += dt * 55;
          if (prog >= 100) {
            prog = 100;
            if (!finishing) {
              finishing = true;
              rootRef.current?.classList.add("hgl-hidden");
              finishTimer = window.setTimeout(() => {
                if (!finished) {
                  finished = true;
                  onFinishedRef.current?.();
                }
              }, 520);
            }
          }
        } else if (prog < 90) {
          prog += dt * (prog < 70 ? 26 : 8);
          if (prog > 90) prog = 90;
        }

        const pv = Math.min(100, Math.round(prog));
        if (pctRef.current) pctRef.current.textContent = pv + "%";
        if (barRef.current) barRef.current.style.width = pv + "%";
        if (phaseRef.current) {
          phaseRef.current.textContent = PHASES[Math.min(PHASES.length - 1, Math.floor(pv / 25))];
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        if (finishTimer) clearTimeout(finishTimer);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("mousedown", down);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        canvas.removeEventListener("touchstart", down);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
        geo.dispose();
        plateGeo.dispose();
        plateMat.dispose();
        for (const m of boxes) m.material.dispose();
        // forceContextLoss() solta o contexto WebGL de forma determinística;
        // dispose() sozinho libera só os recursos de GPU, não o contexto.
        renderer.forceContextLoss();
        renderer.dispose();
        three.ColorManagement.enabled = prevColorManagement;
      };
    };

    import("three").then((three) => {
      if (disposed || !canvasRef.current) return;
      cleanup = initScene(three);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={rootRef} className="hgl-root" data-screen-label="Loader Grade">
      <canvas ref={canvasRef} className="hgl-canvas" />

      {/* marca */}
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 36,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "#c8f23c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 15,
              height: 15,
              borderRadius: 5,
              background: "#0a0a0b",
              transform: "rotate(45deg)",
            }}
          />
        </div>
        <div style={{ lineHeight: 1.05 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f3f4f0",
              letterSpacing: "-.01em",
            }}
          >
            Streaks
          </div>
          <div
            className="hgl-mono"
            style={{
              fontSize: 8.5,
              letterSpacing: ".22em",
              color: "#63675f",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            Tracker de hábitos
          </div>
        </div>
      </div>

      {/* dica de arraste */}
      <div
        ref={hintRef}
        className="hgl-mono"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, 175px)",
          fontSize: 10,
          letterSpacing: ".22em",
          color: "#5b5f57",
          textTransform: "uppercase",
          zIndex: 2,
          transition: "opacity .4s ease",
          pointerEvents: "none",
        }}
      >
        ↔ Arraste para girar
      </div>

      {/* bloco de progresso */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div
            ref={pctRef}
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#f3f4f0",
              letterSpacing: "-.03em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            0%
          </div>
          <div
            className="hgl-mono"
            style={{
              fontSize: 10,
              letterSpacing: ".2em",
              color: "#7c8079",
              textTransform: "uppercase",
            }}
          >
            Carregando
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,.07)",
            overflow: "hidden",
          }}
        >
          <div
            ref={barRef}
            style={{
              height: "100%",
              width: "0%",
              borderRadius: 3,
              background: "#c8f23c",
              boxShadow: "0 0 12px rgba(200,242,60,.5)",
              transition: "width .25s ease",
            }}
          />
        </div>
        <div
          className="hgl-mono"
          style={{
            fontSize: 9.5,
            letterSpacing: ".2em",
            color: "#5b5f57",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span ref={phaseRef}>Preparando seus hábitos</span>
          <span style={{ display: "inline-flex", gap: 4 }}>
            <span className="hgl-dot" />
            <span className="hgl-dot" />
            <span className="hgl-dot" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default HabitGridLoader;
