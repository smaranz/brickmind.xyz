import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  MessageSquarePlus,
  Boxes,
  Users,
  Settings,
  Send,
  X,
  Sparkles,
  Zap,
  Volume2,
  Vibrate,
  User,
  Hammer,
  RotateCw,
  Check,
  ChevronDown,
  Clock,
  Gauge,
  Package,
  Move3d,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Search,
  Library,
  Eye,
  Loader2,
  Download,
  RotateCcw,
  Grid3x3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type ChatMessage,
  type AIStatus,
  type BuildData,
  type BrickPart,
  type BuildStep,
  type ModelOption,
  useAppStore,
} from "@/hooks/use-app-store";
import { requestOpenAIGPTChat } from "@/sdk/api-clients/688a0b64dc79a2533460892c/requestOpenAIGPTChat";
import { requestOpenAIGPTVision } from "@/sdk/api-clients/68a5655cdeb2a0b2f64c013d/requestOpenAIGPTVision";
import {
  ChatMessageORM,
  ChatMessageRole,
} from "@/sdk/database/orm/orm_chat_message";
import type { ChatMessageModel } from "@/sdk/database/orm/orm_chat_message";
import { BrickCollectionORM } from "@/sdk/database/orm/orm_brick_collection";
import { SavedBuildORM } from "@/sdk/database/orm/orm_saved_build";
import { ScanHistoryORM } from "@/sdk/database/orm/orm_scan_history";
import type { ScanHistoryModel } from "@/sdk/database/orm/orm_scan_history";
import { BrickMindEngine } from "@/lib/brickmind-engine";
import { motion } from "framer-motion";
import { rebrickableClient, getStandardPartNumber, getColorIdFromName } from "@/lib/rebrickable-client";
import {
  type CatalogEntry,
  ldrawParser,
  ldrawToThreeJS,
  searchParts as ldrawSearchParts,
  loadCommonParts,
  getLDrawColor,
} from "@/lib/ldraw-parser";

export const Route = createFileRoute("/")({
  component: App,
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Mock Generator ──────────────────────────────────────────────────────────

const BRICK_COLORS = [
  { name: "Red", hex: "#E3000B" },
  { name: "Blue", hex: "#0057A8" },
  { name: "Yellow", hex: "#FFD700" },
  { name: "Green", hex: "#00852B" },
  { name: "White", hex: "#F4F4F4" },
  { name: "Black", hex: "#1B1B1B" },
  { name: "Orange", hex: "#FF7E14" },
  { name: "Dark Gray", hex: "#6B6B6B" },
  { name: "Light Gray", hex: "#A0A0A0" },
  { name: "Dark Blue", hex: "#003A7A" },
  { name: "Lime", hex: "#A5CA18" },
  { name: "Brown", hex: "#5F3109" },
];

const BRICK_TYPES: Array<{ name: string; shape: BrickPart["shape"]; w: number; h: number }> = [
  { name: "Brick 2x4", shape: "brick", w: 4, h: 2 },
  { name: "Brick 2x2", shape: "brick", w: 2, h: 2 },
  { name: "Brick 1x2", shape: "brick", w: 2, h: 1 },
  { name: "Brick 1x4", shape: "brick", w: 4, h: 1 },
  { name: "Plate 2x4", shape: "plate", w: 4, h: 2 },
  { name: "Plate 2x2", shape: "plate", w: 2, h: 2 },
  { name: "Plate 1x2", shape: "plate", w: 2, h: 1 },
  { name: "Plate 1x6", shape: "plate", w: 6, h: 1 },
  { name: "Slope 2x2", shape: "slope", w: 2, h: 2 },
  { name: "Slope 1x2", shape: "slope", w: 2, h: 1 },
  { name: "Tile 2x2", shape: "tile", w: 2, h: 2 },
  { name: "Tile 1x4", shape: "tile", w: 4, h: 1 },
  { name: "Round 1x1", shape: "round", w: 1, h: 1 },
  { name: "Technic Beam 1x4", shape: "technic", w: 4, h: 1 },
  { name: "Technic Pin", shape: "technic", w: 1, h: 1 },
  { name: "Windshield 3x4", shape: "special", w: 4, h: 3 },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * BrickMind Engine Generator - Replaces mock with real physics-based engine
 */
function mockGenerator(prompt: string, limit: number): BuildData {
  return BrickMindEngine.Creator.generateBuild(prompt, limit);
}

// ─── Landing Page ────────────────────────────────────────────────────────────

// Build Instructions Section - LEGO Manual Style
function BuildInstructionsSection() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isAutoplay, setIsAutoplay] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Define castle building steps
  const buildingSteps = [
    {
      stepNum: 1,
      title: "Base Plate",
      description: "Place the green foundation baseplate",
      partsNeeded: [
        { name: "32x32 Baseplate", color: "Green", qty: 1 },
      ],
      instruction: "Start with a solid foundation. This green baseplate will support your entire castle.",
    },
    {
      stepNum: 2,
      title: "Outer Walls - First Layer",
      description: "Add the first layer of castle walls",
      partsNeeded: [
        { name: "2x4 Brick", color: "Gray", qty: 24 },
        { name: "2x2 Brick", color: "Gray", qty: 8 },
      ],
      instruction: "Build the perimeter walls using gray bricks. Leave space for the gate entrance at the front.",
    },
    {
      stepNum: 3,
      title: "Corner Towers - Foundation",
      description: "Stack cylindrical tower bricks at corners",
      partsNeeded: [
        { name: "Round 4x4", color: "Dark Gray", qty: 16 },
      ],
      instruction: "Add round tower bases at each of the four corners. These will become your watchtowers.",
    },
    {
      stepNum: 4,
      title: "Gate & Archway",
      description: "Add gate frame and wooden door",
      partsNeeded: [
        { name: "Arch Brick", color: "Brown", qty: 13 },
        { name: "2x6 Plate", color: "Brown", qty: 2 },
      ],
      instruction: "Create the dramatic arched gateway entrance. Use brown pieces for a wooden appearance.",
    },
    {
      stepNum: 5,
      title: "Battlements",
      description: "Add crenellations to the walls",
      partsNeeded: [
        { name: "1x1 Brick", color: "Gray", qty: 32 },
      ],
      instruction: "Top the walls with battlements - the iconic castle defensive feature with alternating high and low sections.",
    },
    {
      stepNum: 6,
      title: "Tower Roofs",
      description: "Add red cone roofs to towers",
      partsNeeded: [
        { name: "Cone 4x4", color: "Red", qty: 5 },
      ],
      instruction: "Crown each tower with a red conical roof for that classic medieval castle look.",
    },
    {
      stepNum: 7,
      title: "Interior Details",
      description: "Add throne, well, and village houses",
      partsNeeded: [
        { name: "Various Bricks", color: "Assorted", qty: 50 },
      ],
      instruction: "Bring your castle courtyard to life with a throne, village houses, market stall, and decorative props.",
    },
    {
      stepNum: 8,
      title: "Flags & Finishing",
      description: "Attach waving flags to towers",
      partsNeeded: [
        { name: "Flag Pole", color: "Gray", qty: 5 },
        { name: "Flag 2x3", color: "Red", qty: 5 },
      ],
      instruction: "Complete your castle by adding flags to each tower. Your medieval fortress is now complete!",
    },
  ];

  const totalSteps = buildingSteps.length;
  const currentStepData = buildingSteps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Autoplay functionality
  React.useEffect(() => {
    if (!isAutoplay) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsAutoplay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [isAutoplay, totalSteps]);

  return (
    <div className="relative bg-[#FCF6E5] py-16 px-4" ref={containerRef}>
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-xl border-4 border-black bg-yellow-400 px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-4">
            <Hammer className="h-6 w-6" />
            <span className="text-xl font-black tracking-tight">BUILD THE CASTLE</span>
          </div>
          <h2 className="text-4xl font-black mb-3">Step by Step</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Follow the official building instructions to construct your medieval LEGO castle
          </p>
        </div>

        {/* Main Instruction Card - LEGO Manual Style */}
        <div className="rounded-3xl border-4 border-black bg-white overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-8">
          {/* Step Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 border-b-4 border-black px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-3xl font-black">{currentStepData.stepNum}</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white/80">STEP {currentStepData.stepNum} OF {totalSteps}</div>
                  <h3 className="text-2xl font-black text-white">{currentStepData.title}</h3>
                  <p className="text-sm font-bold text-white/90">{currentStepData.description}</p>
                </div>
              </div>
              <div className="hidden md:block rounded-xl border-2 border-white/30 bg-white/20 px-4 py-2">
                <div className="text-xs font-bold text-white/80">PROGRESS</div>
                <div className="text-2xl font-black text-white">{Math.round(progress)}%</div>
              </div>
            </div>
          </div>

          {/* 3D Preview Area - Clean white background like LEGO manuals */}
          <div className="bg-white p-8">
            <div
              className="relative rounded-2xl border-4 border-black bg-gradient-to-b from-gray-50 to-white overflow-hidden"
              style={{
                minHeight: '400px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
              }}
            >
              {/* Placeholder for 3D render - shows current step highlighting */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="mb-6 text-8xl">🏰</div>
                  <div className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-yellow-400 px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-sm font-bold">Building Step {currentStepData.stepNum}...</span>
                  </div>
                  <div
                    className="mt-6 mx-auto w-full max-w-md rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    style={{ animation: 'fadeSlideIn 0.5s ease-out' }}
                  >
                    <div className="text-xs font-bold text-gray-400 mb-2">NEW PIECES</div>
                    <div className="text-sm font-bold text-gray-700 leading-relaxed">
                      {currentStepData.instruction}
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow indicating placement (LEGO style) */}
              {currentStep > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div
                    className="text-yellow-400 opacity-60"
                    style={{
                      fontSize: '120px',
                      animation: 'pulse 2s ease-in-out infinite',
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                    }}
                  >
                    ↓
                  </div>
                </div>
              )}
            </div>

            {/* Parts List for Current Step */}
            <div className="mt-6 rounded-2xl border-4 border-black bg-blue-50 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-black">Parts Needed for This Step</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentStepData.partsNeeded.map((part, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-black bg-gray-100">
                      <span className="text-2xl">🧱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black truncate">{part.name}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-bold">{part.color}</span>
                        <span className="text-red-500 font-black">×{part.qty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="bg-gray-50 border-t-4 border-black px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-4 border-black px-6 py-3 text-sm font-black transition-all",
                  currentStep === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                )}
              >
                <ChevronLeft className="h-5 w-5" />
                PREVIOUS
              </button>

              <button
                onClick={() => setIsAutoplay(!isAutoplay)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-4 border-black px-6 py-3 text-sm font-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none",
                  isAutoplay ? "bg-red-500 text-white" : "bg-yellow-400"
                )}
              >
                {isAutoplay ? <X className="h-5 w-5" /> : <RotateCw className="h-5 w-5" />}
                {isAutoplay ? "STOP" : "AUTO-PLAY"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentStep === totalSteps - 1}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-4 border-black px-6 py-3 text-sm font-black transition-all",
                  currentStep === totalSteps - 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                )}
              >
                NEXT
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar at Bottom */}
        <div className="rounded-2xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black text-gray-600">OVERALL PROGRESS</span>
            <span className="text-sm font-black text-red-500">{currentStep + 1} / {totalSteps}</span>
          </div>
          <div className="h-6 overflow-hidden rounded-full border-4 border-black bg-white shadow-inner">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)',
              }}
            />
          </div>

          {/* Step Indicator Dots */}
          <div className="flex justify-between mt-4">
            {buildingSteps.map((step, idx) => (
              <button
                key={step.stepNum}
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "group flex flex-col items-center gap-1 transition-all",
                  idx === currentStep && "scale-110"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-4 border-black flex items-center justify-center text-xs font-black transition-all",
                    idx < currentStep
                      ? "bg-green-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      : idx === currentStep
                      ? "bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                      : "bg-white text-gray-400"
                  )}
                >
                  {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className="text-[10px] font-bold text-gray-500 hidden md:block">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Completion Message */}
        {currentStep === totalSteps - 1 && (
          <div
            className="mt-8 rounded-3xl border-4 border-black bg-gradient-to-br from-yellow-400 to-yellow-500 p-8 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            style={{ animation: 'fadeSlideIn 0.6s ease-out' }}
          >
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-black mb-2">BUILD COMPLETE!</h3>
            <p className="text-lg font-bold text-gray-800">
              Congratulations! Your medieval LEGO castle is ready for adventure!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Falling brick component
function FallingBrick({
  color,
  size,
  style,
  delay,
}: {
  color: string;
  size: number;
  style: React.CSSProperties;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "absolute rounded-sm border-2 border-black/80",
        color,
      )}
      style={{
        width: size,
        height: size * 0.6,
        animation: `fallBrick ${4 + Math.random() * 2}s linear infinite`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      {/* Add studs to make it look more like LEGO */}
      <div className="absolute -top-1 left-1/4 h-2 w-2 rounded-full border border-black/40" style={{ backgroundColor: style.backgroundColor || color }} />
      <div className="absolute -top-1 right-1/4 h-2 w-2 rounded-full border border-black/40" style={{ backgroundColor: style.backgroundColor || color }} />
    </div>
  );
}

// Three.js LEGO Castle Component - Premium Showcase
function CastleBuilding() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = React.useRef<number>(0);
  const [isNight, setIsNight] = React.useState(false);
  const [isWireframe, setIsWireframe] = React.useState(false);
  const [isExploded, setIsExploded] = React.useState(false);
  const [gateOpen, setGateOpen] = React.useState(false);
  const stateRef = React.useRef({ isNight: false, isWireframe: false, isExploded: false, gateOpen: false });

  React.useEffect(() => {
    stateRef.current = { isNight, isWireframe, isExploded, gateOpen };
  }, [isNight, isWireframe, isExploded, gateOpen]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // ─── Renderer ───
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // ─── Scene ───
    const scene = new THREE.Scene();

    // ─── Camera ───
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(55, 40, 55);
    camera.lookAt(0, 8, 0);

    // ─── Controls ───
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 25;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 8, 0);

    // ─── Shared geometries for instancing ───
    const studGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12);
    const brickUnit = 0.8; // LEGO unit size

    // ─── Plastic material helper ───
    function plasticMat(baseColor: number, variation = 0): THREE.MeshStandardMaterial {
      const c = new THREE.Color(baseColor);
      if (variation > 0) {
        c.r += (Math.random() - 0.5) * variation;
        c.g += (Math.random() - 0.5) * variation;
        c.b += (Math.random() - 0.5) * variation;
      }
      return new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.35,
        metalness: 0.05,
      });
    }

    // ─── createStud ───
    function createStud(color: number): THREE.Mesh {
      const mat = plasticMat(color);
      const stud = new THREE.Mesh(studGeo, mat);
      stud.castShadow = true;
      return stud;
    }

    // ─── createBrick (rectangular LEGO brick) ───
    function createBrick(
      widthUnits: number, heightUnits: number, depthUnits: number,
      color: number, x: number, y: number, z: number
    ): THREE.Group {
      const group = new THREE.Group();
      const w = widthUnits * brickUnit;
      const h = heightUnits * brickUnit;
      const d = depthUnits * brickUnit;

      // Beveled body via box
      const bodyGeo = new THREE.BoxGeometry(w - 0.04, h - 0.02, d - 0.04);
      const mat = plasticMat(color, 0.015);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.isBrick = true;
      group.add(body);

      // Edge bevel line
      const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 });
      group.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // Studs on top
      for (let sx = 0; sx < widthUnits; sx++) {
        for (let sz = 0; sz < depthUnits; sz++) {
          const stud = createStud(color);
          stud.position.set(
            (sx - (widthUnits - 1) / 2) * brickUnit,
            h / 2 + 0.09,
            (sz - (depthUnits - 1) / 2) * brickUnit
          );
          group.add(stud);
        }
      }

      group.position.set(x, y + h / 2, z);
      group.userData.originalPosition = group.position.clone();
      group.userData.isBrickGroup = true;
      return group;
    }

    // ─── createRoundBrick (cylindrical LEGO brick for towers) ───
    function createRoundBrick(
      radius: number, heightUnits: number, color: number,
      x: number, y: number, z: number, segments = 16
    ): THREE.Group {
      const group = new THREE.Group();
      const h = heightUnits * brickUnit;
      const geo = new THREE.CylinderGeometry(radius, radius, h - 0.02, segments);
      const mat = plasticMat(color, 0.012);
      const body = new THREE.Mesh(geo, mat);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.isBrick = true;
      group.add(body);

      // Studs on top in circle
      const studCount = Math.max(4, Math.floor(radius / 0.35));
      for (let i = 0; i < studCount; i++) {
        const angle = (i / studCount) * Math.PI * 2;
        const sr = radius * 0.6;
        const stud = createStud(color);
        stud.position.set(Math.cos(angle) * sr, h / 2 + 0.09, Math.sin(angle) * sr);
        group.add(stud);
      }

      group.position.set(x, y + h / 2, z);
      group.userData.originalPosition = group.position.clone();
      group.userData.isBrickGroup = true;
      return group;
    }

    // ─── createWallSegment ───
    function createWallSegment(
      startX: number, startZ: number, endX: number, endZ: number,
      heightLayers: number, color: number, hasArrowSlits = false
    ): THREE.Group {
      const group = new THREE.Group();
      const dx = endX - startX;
      const dz = endZ - startZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const bW = 2;
      const brickLen = bW * brickUnit;
      const bricksPerRow = Math.max(1, Math.round(len / brickLen));
      const actualBrickLen = len / bricksPerRow;
      const nx = dx / len;
      const nz = dz / len;

      for (let layer = 0; layer < heightLayers; layer++) {
        // Offset rows use half-brick stagger but clamp to wall bounds — no wrapping
        const halfOffset = (layer % 2) * 0.5;
        const count = bricksPerRow + (layer % 2); // extra brick on offset rows to cover edges
        for (let i = 0; i < count; i++) {
          if (hasArrowSlits && layer === 5 && i > 0 && i < bricksPerRow - 1 && i % 3 === 1) {
            continue;
          }
          // Center of this brick along the wall
          let dist = (i - halfOffset) * actualBrickLen + actualBrickLen / 2;
          // Clamp: skip bricks whose center falls outside wall
          if (dist < 0 || dist > len) continue;
          // Clamp brick size at wall edges
          const halfLen = actualBrickLen / 2;
          const clampedStart = Math.max(0, dist - halfLen);
          const clampedEnd = Math.min(len, dist + halfLen);
          const visibleLen = clampedEnd - clampedStart;
          const center = (clampedStart + clampedEnd) / 2;

          const bx = startX + nx * center;
          const bz = startZ + nz * center;
          const scaleW = visibleLen / brickLen;
          const brick = createBrick(bW, 1, 1, color, 0, 0, 0);
          brick.rotation.y = angle;
          brick.scale.x = scaleW;
          brick.position.set(bx, layer * brickUnit, bz);
          brick.userData.originalPosition = brick.position.clone();
          group.add(brick);
        }
      }

      // Crenellations (battlements) on top
      for (let i = 0; i < bricksPerRow; i += 2) {
        const dist = i * actualBrickLen + actualBrickLen / 2;
        if (dist > len) continue;
        const bx = startX + nx * dist;
        const bz = startZ + nz * dist;
        const battlement = createBrick(1, 1, 1, color, 0, 0, 0);
        battlement.rotation.y = angle;
        battlement.position.set(bx, heightLayers * brickUnit, bz);
        battlement.userData.originalPosition = battlement.position.clone();
        group.add(battlement);
      }

      return group;
    }

    // ─── createTower (cylindrical with conical roof) ───
    function createTower(
      x: number, z: number, layerCount: number, baseColor: number, roofColor: number
    ): THREE.Group {
      const group = new THREE.Group();
      const radius = 2.2;

      // Stacked round bricks
      for (let i = 0; i < layerCount; i++) {
        const rb = createRoundBrick(radius, 1, baseColor, 0, i * brickUnit, 0);
        group.add(rb);
      }

      // Balcony ledge
      const balconyY = layerCount * brickUnit;
      const balconyGeo = new THREE.CylinderGeometry(radius + 0.5, radius + 0.5, 0.3, 20);
      const balconyMat = plasticMat(baseColor);
      const balcony = new THREE.Mesh(balconyGeo, balconyMat);
      balcony.position.set(0, balconyY, 0);
      balcony.castShadow = true;
      group.add(balcony);

      // Crenellations on balcony
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cr = radius + 0.4;
        const merlon = createBrick(1, 1, 1, baseColor, Math.cos(a) * cr, balconyY + 0.15, Math.sin(a) * cr);
        group.add(merlon);
      }

      // Conical roof
      const roofHeight = 4;
      const roofGeo = new THREE.ConeGeometry(radius + 0.3, roofHeight, 16);
      const roofMat = plasticMat(roofColor);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, balconyY + brickUnit + roofHeight / 2, 0);
      roof.castShadow = true;
      group.add(roof);

      group.position.set(x, 0, z);
      return group;
    }

    // ─── createGate (arched gate with drawbridge) ───
    function createGate(x: number, z: number): THREE.Group {
      const group = new THREE.Group();
      const pillarColor = 0x5a4a3a;
      const archColor = 0x6b5b4b;

      // Left pillar (pure wood)
      for (let i = 0; i < 10; i++) {
        group.add(createBrick(1, 1, 1, pillarColor, -2.4, i * brickUnit, 0));
      }
      // Right pillar (pure wood)
      for (let i = 0; i < 10; i++) {
        group.add(createBrick(1, 1, 1, pillarColor, 2.4, i * brickUnit, 0));
      }

      // Arch top — pure wooden arch
      const archBrickCount = 13;
      const archRadiusX = 2.4;
      const archRadiusY = 2.0;
      const archBaseY = 8 * brickUnit;
      for (let i = 0; i < archBrickCount; i++) {
        const t = i / (archBrickCount - 1); // 0..1
        const a = t * Math.PI; // 0..PI semicircle
        const ax = Math.cos(a) * archRadiusX;
        const ay = archBaseY + Math.sin(a) * archRadiusY;

        const brick = createBrick(1, 1, 1, archColor, ax, ay, 0);
        // Rotate each brick to be tangent to the arch curve
        brick.rotation.z = a - Math.PI / 2;
        group.add(brick);
      }
      // Keystone at top center (wooden)
      const keystoneBrick = createBrick(1, 1, 1, archColor, 0, archBaseY + archRadiusY + 0.1, 0);
      group.add(keystoneBrick);

      // Wooden door (with plank texture via canvas)
      const doorCanvas = document.createElement('canvas');
      doorCanvas.width = 128;
      doorCanvas.height = 256;
      const dCtx = doorCanvas.getContext('2d');
      if (dCtx) {
        dCtx.fillStyle = '#5a3a1a';
        dCtx.fillRect(0, 0, 128, 256);
        dCtx.strokeStyle = '#3a2510';
        dCtx.lineWidth = 3;
        for (let px = 0; px < 128; px += 20) {
          dCtx.beginPath();
          dCtx.moveTo(px, 0);
          dCtx.lineTo(px, 256);
          dCtx.stroke();
        }
        // Horizontal planks
        dCtx.lineWidth = 2;
        for (let py = 0; py < 256; py += 50) {
          dCtx.beginPath();
          dCtx.moveTo(0, py);
          dCtx.lineTo(128, py);
          dCtx.stroke();
        }
        // Iron bands
        dCtx.fillStyle = '#333';
        dCtx.fillRect(0, 40, 128, 8);
        dCtx.fillRect(0, 180, 128, 8);
      }
      const doorTexture = new THREE.CanvasTexture(doorCanvas);
      const doorGeo = new THREE.BoxGeometry(3.8, 6, 0.25);
      const doorMat = new THREE.MeshStandardMaterial({ map: doorTexture, roughness: 0.85 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.castShadow = true;
      door.position.set(0, 3, 0);
      door.userData.isDoor = true;
      group.add(door);

      // Drawbridge (hinged at bottom)
      const dbGeo = new THREE.BoxGeometry(3.8, 4, 0.2);
      const dbMat = new THREE.MeshStandardMaterial({ map: doorTexture.clone(), roughness: 0.85 });
      const drawbridge = new THREE.Mesh(dbGeo, dbMat);
      drawbridge.castShadow = true;
      drawbridge.receiveShadow = true;
      // Pivot point at bottom edge
      drawbridge.geometry.translate(0, -2, 0);
      drawbridge.position.set(0, 0, -0.3);
      drawbridge.userData.isDrawbridge = true;
      group.add(drawbridge);

      group.position.set(x, 0, z);
      group.userData.door = door;
      group.userData.drawbridge = drawbridge;
      return group;
    }

    // ─── Torch with fire ───
    function createTorch(x: number, y: number, z: number): THREE.Group {
      const group = new THREE.Group();
      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.9 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.75;
      group.add(pole);

      // Flame particles (using small spheres)
      const flameGroup = new THREE.Group();
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
      const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flameGeo = new THREE.SphereGeometry(0.12, 6, 6);
      for (let i = 0; i < 5; i++) {
        const flame = new THREE.Mesh(flameGeo, i % 2 === 0 ? flameMat : flameMat2);
        flame.position.set(
          (Math.random() - 0.5) * 0.15,
          1.5 + i * 0.08,
          (Math.random() - 0.5) * 0.15
        );
        flame.scale.setScalar(1 - i * 0.15);
        flame.userData.flameIndex = i;
        flameGroup.add(flame);
      }
      group.add(flameGroup);
      group.userData.flames = flameGroup;

      // Point light
      const torchLight = new THREE.PointLight(0xff7722, 0.8, 10);
      torchLight.position.set(0, 1.8, 0);
      torchLight.castShadow = false;
      group.add(torchLight);
      group.userData.torchLight = torchLight;

      group.position.set(x, y, z);
      return group;
    }

    // ─── createFlag ───
    function createFlag(x: number, y: number, z: number, color: number): THREE.Group {
      const group = new THREE.Group();
      // Taller pole
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.5 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2;
      pole.castShadow = true;
      group.add(pole);

      // Pole finial (ball on top)
      const finialGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const finialMat = new THREE.MeshStandardMaterial({ color: 0xddcc44, metalness: 0.6, roughness: 0.3 });
      const finial = new THREE.Mesh(finialGeo, finialMat);
      finial.position.y = 4.05;
      group.add(finial);

      // Large flag with high subdivision for dramatic flying wave effect
      const flagW = 2.4;
      const flagH = 1.3;
      const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 30, 10);
      const flagMat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.05 });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(flagW / 2, 3.5, 0);
      flag.castShadow = true;
      group.add(flag);

      // Store original Y positions for the flying lift effect
      const pos = flagGeo.attributes.position;
      const origY = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        origY[i] = pos.getY(i);
      }

      group.position.set(x, y, z);
      group.userData.flag = flag;
      group.userData.flagGeo = flagGeo;
      group.userData.flagOrigY = origY;
      group.userData.flagW = flagW;
      group.userData.flagH = flagH;
      group.userData.flagPhase = Math.random() * Math.PI * 2; // random phase per flag
      return group;
    }

    // ─── createRoof (sloped medieval LEGO roof with studs on edges) ───
    function createRoof(
      widthUnits: number, depthUnits: number, heightUnits: number,
      color: number, x: number, y: number, z: number,
      overhang = 0.3
    ): THREE.Group {
      const group = new THREE.Group();
      const w = widthUnits * brickUnit + overhang * 2;
      const d = depthUnits * brickUnit + overhang * 2;
      const h = heightUnits * brickUnit;

      // Build sloped roof from stacked bricks, each layer narrower
      const layers = Math.max(3, heightUnits);
      for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const layerW = w * (1 - t * 0.6);
        const roofBrickGeo = new THREE.BoxGeometry(layerW, brickUnit * 0.5, d - 0.04);
        const roofMat = plasticMat(color, 0.02);
        const roofBrick = new THREE.Mesh(roofBrickGeo, roofMat);
        roofBrick.position.set(0, i * brickUnit * 0.45 + brickUnit * 0.25, 0);
        roofBrick.castShadow = true;
        roofBrick.receiveShadow = true;
        roofBrick.userData.isBrick = true;
        group.add(roofBrick);

        // Edge line
        const edgeGeo = new THREE.EdgesGeometry(roofBrickGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 });
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        edgeLines.position.copy(roofBrick.position);
        group.add(edgeLines);

        // Studs on roof edges (front and back)
        const studCount = Math.max(2, Math.floor(layerW / brickUnit));
        for (let si = 0; si < studCount; si++) {
          const sx = (si - (studCount - 1) / 2) * brickUnit;
          // Front edge studs
          const stud1 = createStud(color);
          stud1.position.set(sx, i * brickUnit * 0.45 + brickUnit * 0.5, d / 2 - 0.2);
          group.add(stud1);
          // Back edge studs
          const stud2 = createStud(color);
          stud2.position.set(sx, i * brickUnit * 0.45 + brickUnit * 0.5, -d / 2 + 0.2);
          group.add(stud2);
        }
      }

      // Ridge cap on top
      const ridgeGeo = new THREE.BoxGeometry(w * 0.3, brickUnit * 0.3, d + 0.1);
      const ridgeMat = plasticMat(color - 0x111111);
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.y = layers * brickUnit * 0.45 + brickUnit * 0.15;
      ridge.castShadow = true;
      group.add(ridge);

      group.position.set(x, y, z);
      return group;
    }

    // ─── createChimney (round bricks with smoke particles) ───
    function createChimney(
      x: number, y: number, z: number, heightLayers = 4
    ): THREE.Group {
      const group = new THREE.Group();
      const CHIMNEY_COLOR = 0x7a6655;
      const CHIMNEY_DARK = 0x5a4a3a;

      // Stack round bricks
      for (let i = 0; i < heightLayers; i++) {
        const cColor = i % 2 === 0 ? CHIMNEY_COLOR : CHIMNEY_DARK;
        const rb = createRoundBrick(0.3, 1, cColor, 0, i * brickUnit, 0, 8);
        group.add(rb);
      }

      // Chimney cap (slight overhang)
      const capGeo = new THREE.CylinderGeometry(0.38, 0.38, brickUnit * 0.3, 8);
      const capMat = plasticMat(CHIMNEY_DARK);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = heightLayers * brickUnit + brickUnit * 0.15;
      cap.castShadow = true;
      group.add(cap);

      // Smoke particles (small semi-transparent spheres that float upward)
      const smokeGroup = new THREE.Group();
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa, transparent: true, opacity: 0.3,
      });
      for (let si = 0; si < 5; si++) {
        const smokeGeo = new THREE.SphereGeometry(0.08 + si * 0.03, 6, 6);
        const smoke = new THREE.Mesh(smokeGeo, smokeMat.clone());
        smoke.position.set(
          (Math.random() - 0.5) * 0.1,
          heightLayers * brickUnit + 0.5 + si * 0.4,
          (Math.random() - 0.5) * 0.1
        );
        smoke.userData.smokeIndex = si;
        smoke.userData.smokeBaseY = smoke.position.y;
        smokeGroup.add(smoke);
      }
      group.add(smokeGroup);
      group.userData.smokeGroup = smokeGroup;

      group.position.set(x, y, z);
      return group;
    }

    // ─── createVillageHouse (full medieval LEGO house) ───
    function createVillageHouse(config: {
      x: number; z: number;
      widthUnits: number; wallHeightLayers: number;
      roofColor: number; facingAngle: number;
      windowSide?: 'left' | 'right' | 'both';
      doorSide?: 'front' | 'left';
    }): THREE.Group {
      const house = new THREE.Group();
      const TAN_WALL = 0xd4b878;
      const BROWN_TIMBER = 0x5a3a1a;
      const TIMBER_DARK = 0x4a2a10;
      const wU = config.widthUnits;
      const dU = Math.max(3, wU - 1); // depth units
      const hLayers = config.wallHeightLayers;

      // ── Walls: stacked bricks with tan base ──
      for (let layer = 0; layer < hLayers; layer++) {
        const halfOffset = (layer % 2) * 0.5;
        // Front and back walls
        for (let i = 0; i < wU + (layer % 2); i++) {
          const xOff = (i - halfOffset - (wU - 1) / 2) * brickUnit;
          if (Math.abs(xOff) > wU * brickUnit / 2 + 0.1) continue;

          // Skip door position in front wall (center, bottom 3 layers)
          const isDoorPos = config.doorSide === 'front' &&
            Math.abs(xOff) < brickUnit * 0.6 && layer < 3;

          if (!isDoorPos) {
            const frontBrick = createBrick(1, 1, 1, TAN_WALL, xOff, layer * brickUnit, -dU * brickUnit / 2);
            house.add(frontBrick);
          }
          // Back wall (always full)
          const backBrick = createBrick(1, 1, 1, TAN_WALL, xOff, layer * brickUnit, dU * brickUnit / 2);
          house.add(backBrick);
        }
        // Left and right side walls
        for (let j = 1; j < dU; j++) {
          const zOff = (j - (dU - 1) / 2) * brickUnit;
          // Skip window positions
          const isWindowLeft = (config.windowSide === 'left' || config.windowSide === 'both') &&
            j === Math.floor(dU / 2) && layer >= 2 && layer <= 3;
          const isWindowRight = (config.windowSide === 'right' || config.windowSide === 'both') &&
            j === Math.floor(dU / 2) && layer >= 2 && layer <= 3;

          if (!isWindowLeft) {
            house.add(createBrick(1, 1, 1, TAN_WALL, -wU * brickUnit / 2, layer * brickUnit, zOff));
          }
          if (!isWindowRight) {
            house.add(createBrick(1, 1, 1, TAN_WALL, wU * brickUnit / 2, layer * brickUnit, zOff));
          }
        }
      }

      // ── Brown timber framing (vertical + horizontal beams) ──
      // Corner timbers
      const corners = [
        [-wU * brickUnit / 2, -dU * brickUnit / 2],
        [wU * brickUnit / 2, -dU * brickUnit / 2],
        [-wU * brickUnit / 2, dU * brickUnit / 2],
        [wU * brickUnit / 2, dU * brickUnit / 2],
      ];
      corners.forEach(([cx, cz]) => {
        const timberGeo = new THREE.BoxGeometry(brickUnit * 0.25, hLayers * brickUnit, brickUnit * 0.25);
        const timber = new THREE.Mesh(timberGeo, plasticMat(BROWN_TIMBER));
        timber.position.set(cx, hLayers * brickUnit / 2, cz);
        timber.castShadow = true;
        house.add(timber);
      });
      // Horizontal timber beams at mid and top of front/back walls
      for (const zSide of [-dU * brickUnit / 2 - 0.02, dU * brickUnit / 2 + 0.02]) {
        for (const beamY of [Math.floor(hLayers / 2) * brickUnit, (hLayers - 0.5) * brickUnit]) {
          const beamGeo = new THREE.BoxGeometry(wU * brickUnit + 0.1, brickUnit * 0.2, brickUnit * 0.15);
          const beam = new THREE.Mesh(beamGeo, plasticMat(TIMBER_DARK));
          beam.position.set(0, beamY, zSide);
          beam.castShadow = true;
          house.add(beam);
        }
      }

      // ── Windows with frames ──
      const windowPositions: Array<{ x: number; z: number; rotY: number }> = [];
      if (config.windowSide === 'left' || config.windowSide === 'both') {
        windowPositions.push({ x: -wU * brickUnit / 2 - 0.05, z: 0, rotY: Math.PI / 2 });
      }
      if (config.windowSide === 'right' || config.windowSide === 'both') {
        windowPositions.push({ x: wU * brickUnit / 2 + 0.05, z: 0, rotY: Math.PI / 2 });
      }
      // Front window (upper)
      windowPositions.push({ x: wU > 4 ? brickUnit * 1.2 : 0, z: -dU * brickUnit / 2 - 0.05, rotY: 0 });

      windowPositions.forEach(wp => {
        const wGroup = new THREE.Group();
        // Window glass (dark)
        const glassGeo = new THREE.PlaneGeometry(brickUnit * 0.8, brickUnit * 0.9);
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x88aabb, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        wGroup.add(glass);

        // Window frame (brown wood)
        const frameThick = 0.06;
        const frameColor = BROWN_TIMBER;
        const framePieces = [
          { w: brickUnit * 0.95, h: frameThick, x: 0, y: brickUnit * 0.45 },
          { w: brickUnit * 0.95, h: frameThick, x: 0, y: -brickUnit * 0.45 },
          { w: frameThick, h: brickUnit * 0.95, x: -brickUnit * 0.4, y: 0 },
          { w: frameThick, h: brickUnit * 0.95, x: brickUnit * 0.4, y: 0 },
          // Cross mullion
          { w: brickUnit * 0.8, h: frameThick * 0.8, x: 0, y: 0 },
          { w: frameThick * 0.8, h: brickUnit * 0.8, x: 0, y: 0 },
        ];
        framePieces.forEach(fp => {
          const fGeo = new THREE.BoxGeometry(fp.w, fp.h, 0.04);
          const fMesh = new THREE.Mesh(fGeo, plasticMat(frameColor));
          fMesh.position.set(fp.x, fp.y, 0.02);
          wGroup.add(fMesh);
        });

        wGroup.position.set(wp.x, 2.5 * brickUnit, wp.z);
        wGroup.rotation.y = wp.rotY;
        house.add(wGroup);
      });

      // ── Wooden door (front wall) ──
      if (config.doorSide === 'front') {
        const doorGroup = new THREE.Group();
        const dGeo = new THREE.BoxGeometry(brickUnit * 0.9, brickUnit * 2.8, 0.12);
        const doorCanvas = document.createElement('canvas');
        doorCanvas.width = 64;
        doorCanvas.height = 128;
        const dCtx = doorCanvas.getContext('2d');
        if (dCtx) {
          dCtx.fillStyle = '#5a3a1a';
          dCtx.fillRect(0, 0, 64, 128);
          dCtx.strokeStyle = '#3a2510';
          dCtx.lineWidth = 2;
          for (let px = 0; px < 64; px += 12) {
            dCtx.beginPath(); dCtx.moveTo(px, 0); dCtx.lineTo(px, 128); dCtx.stroke();
          }
          // Iron bands
          dCtx.fillStyle = '#444';
          dCtx.fillRect(0, 25, 64, 4);
          dCtx.fillRect(0, 90, 64, 4);
          // Handle
          dCtx.fillStyle = '#888';
          dCtx.beginPath(); dCtx.arc(48, 60, 4, 0, Math.PI * 2); dCtx.fill();
        }
        const doorTex = new THREE.CanvasTexture(doorCanvas);
        const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.8 });
        const doorMesh = new THREE.Mesh(dGeo, doorMat);
        doorMesh.position.set(0, brickUnit * 1.4, -dU * brickUnit / 2);
        doorMesh.userData.isBrick = true;
        doorGroup.add(doorMesh);

        // Door frame
        const dfMat = plasticMat(TIMBER_DARK);
        const doorFrameParts = [
          { w: brickUnit * 0.15, h: brickUnit * 3, x: -brickUnit * 0.52, y: brickUnit * 1.5 },
          { w: brickUnit * 0.15, h: brickUnit * 3, x: brickUnit * 0.52, y: brickUnit * 1.5 },
          { w: brickUnit * 1.2, h: brickUnit * 0.15, x: 0, y: brickUnit * 3 },
        ];
        doorFrameParts.forEach(df => {
          const fGeo = new THREE.BoxGeometry(df.w, df.h, 0.15);
          const fMesh = new THREE.Mesh(fGeo, dfMat);
          fMesh.position.set(df.x, df.y, -dU * brickUnit / 2 - 0.01);
          fMesh.castShadow = true;
          doorGroup.add(fMesh);
        });
        house.add(doorGroup);
      }

      // ── Roof ──
      const roofY = hLayers * brickUnit;
      const roofGroup = createRoof(wU + 1, dU + 1, 3, config.roofColor, 0, roofY, 0, 0.4);
      house.add(roofGroup);

      // ── Chimney (on one side of roof) ──
      const chimneyX = (wU > 4 ? -1 : 1) * brickUnit;
      const chimneyZ = brickUnit;
      const chimney = createChimney(chimneyX, roofY, chimneyZ, 4);
      house.add(chimney);
      house.userData.chimney = chimney;

      // ── Interior warm light ──
      const houseLight = new THREE.PointLight(0xffaa55, 0.4, 6);
      houseLight.position.set(0, brickUnit * 2, 0);
      house.add(houseLight);
      house.userData.houseLight = houseLight;

      // ── Hanging lantern on front ──
      const lanternGroup = new THREE.Group();
      // Bracket
      const bracketGeo = new THREE.BoxGeometry(0.04, 0.04, 0.4);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.3 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(brickUnit * 0.8, hLayers * brickUnit * 0.7, -dU * brickUnit / 2 - 0.3);
      lanternGroup.add(bracket);
      // Lantern body
      const lanternGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2);
      const lanternMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.4 });
      const lanternBody = new THREE.Mesh(lanternGeo, lanternMat);
      lanternBody.position.set(brickUnit * 0.8, hLayers * brickUnit * 0.7 - 0.2, -dU * brickUnit / 2 - 0.5);
      lanternGroup.add(lanternBody);
      // Lantern glow
      const lanternGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffcc44 })
      );
      lanternGlow.position.copy(lanternBody.position);
      lanternGroup.add(lanternGlow);
      // Lantern light
      const lanternLight = new THREE.PointLight(0xffcc44, 0.3, 4);
      lanternLight.position.copy(lanternBody.position);
      lanternGroup.add(lanternLight);
      house.userData.lanternLight = lanternLight;
      house.add(lanternGroup);

      house.position.set(config.x, 0.08, config.z);
      house.rotation.y = config.facingAngle;
      house.userData.originalPosition = house.position.clone();
      house.userData.isBrickGroup = true;
      return house;
    }

    // ─── createVillageProps (small props near houses) ───
    function createVillageProps(x: number, z: number, facingAngle: number): THREE.Group {
      const propsGroup = new THREE.Group();

      // Barrel
      const barrelG = new THREE.Group();
      const bGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.8, 10);
      const bMat = plasticMat(0x6b4226, 0.03);
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.y = 0.4;
      bMesh.castShadow = true;
      bMesh.userData.isBrick = true;
      barrelG.add(bMesh);
      const bandGeo = new THREE.TorusGeometry(0.36, 0.02, 6, 12);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
      for (let bi = 0; bi < 2; bi++) {
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 0.2 + bi * 0.4;
        band.rotation.x = Math.PI / 2;
        barrelG.add(band);
      }
      barrelG.position.set(1.5, 0, -0.5);
      propsGroup.add(barrelG);

      // Crate
      const crateGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const crateMesh = new THREE.Mesh(crateGeo, plasticMat(0x6b5030));
      crateMesh.position.set(1.8, 0.25, 0.3);
      crateMesh.rotation.y = 0.3;
      crateMesh.castShadow = true;
      crateMesh.userData.isBrick = true;
      propsGroup.add(crateMesh);
      const crateEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(crateGeo),
        new THREE.LineBasicMaterial({ color: 0x3a2510, transparent: true, opacity: 0.3 })
      );
      crateEdges.position.copy(crateMesh.position);
      crateEdges.rotation.copy(crateMesh.rotation);
      propsGroup.add(crateEdges);

      // Bench
      const benchGroup = new THREE.Group();
      const seatGeo = new THREE.BoxGeometry(1.2, 0.08, 0.35);
      const benchWood = plasticMat(0x5a3a1a);
      const seat = new THREE.Mesh(seatGeo, benchWood);
      seat.position.y = 0.5;
      seat.castShadow = true;
      benchGroup.add(seat);
      for (let li = -1; li <= 1; li += 2) {
        const legGeo = new THREE.BoxGeometry(0.08, 0.5, 0.3);
        const leg = new THREE.Mesh(legGeo, benchWood);
        leg.position.set(li * 0.45, 0.25, 0);
        benchGroup.add(leg);
      }
      benchGroup.position.set(-1.5, 0, 0.5);
      benchGroup.rotation.y = 0.3;
      propsGroup.add(benchGroup);

      propsGroup.position.set(x, 0.08, z);
      propsGroup.rotation.y = facingAngle;
      propsGroup.userData.originalPosition = propsGroup.position.clone();
      propsGroup.userData.isBrickGroup = true;
      return propsGroup;
    }

    // ─── Sky dome with gradient ───
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#4a90d9');
      grad.addColorStop(0.4, '#87ceeb');
      grad.addColorStop(0.7, '#b8dff0');
      grad.addColorStop(1.0, '#d4e8c2');
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 512, 512);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);
    scene.background = null;

    // ─── Clouds ───
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 12; i++) {
      const cGroup = new THREE.Group();
      const puffCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const puffGeo = new THREE.SphereGeometry(1.5 + Math.random() * 2, 8, 6);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(p * 2.5, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1.5);
        puff.scale.y = 0.5;
        cGroup.add(puff);
      }
      const a = (i / 12) * Math.PI * 2;
      const r = 60 + Math.random() * 40;
      cGroup.position.set(Math.cos(a) * r, 40 + Math.random() * 15, Math.sin(a) * r);
      cGroup.userData.cloudSpeed = 0.02 + Math.random() * 0.03;
      cGroup.userData.cloudRadius = r;
      cGroup.userData.cloudAngle = a;
      cloudGroup.add(cGroup);
    }
    scene.add(cloudGroup);

    // ─── Ground / Grass ───
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 256;
    grassCanvas.height = 256;
    const gCtx = grassCanvas.getContext('2d');
    if (gCtx) {
      gCtx.fillStyle = '#5a8c29';
      gCtx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        gCtx.fillStyle = `hsl(${85 + Math.random() * 30}, ${50 + Math.random() * 30}%, ${30 + Math.random() * 20}%)`;
        gCtx.fillRect(gx, gy, 1, 2);
      }
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(8, 8);
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ─── Moat removed - replaced with green studs ───

    // ─── Green stud baseplate (expanded - replaces moat area) ───
    const greenStudGeo = new THREE.PlaneGeometry(38, 38);
    const greenStudMat = new THREE.MeshStandardMaterial({
      color: 0x00a550,
      roughness: 0.8,
    });
    const greenStudPlate = new THREE.Mesh(greenStudGeo, greenStudMat);
    greenStudPlate.rotation.x = -Math.PI / 2;
    greenStudPlate.position.y = 0.06;
    greenStudPlate.receiveShadow = true;
    scene.add(greenStudPlate);

    // Add studs on green baseplate (grid pattern across entire green area)
    const studSpacing = 0.8;
    const studRadius = 0.28;
    const studHeight = 0.18;
    const areaMin = -19;
    const areaMax = 19;
    const innerWall = -13;
    const outerWall = 13;

    for (let x = areaMin; x <= areaMax; x += studSpacing) {
      for (let z = areaMin; z <= areaMax; z += studSpacing) {
        // Only place studs outside the inner courtyard area
        if (x < innerWall || x > outerWall || z < innerWall || z > outerWall) {
          const stud = new THREE.Mesh(studGeo, plasticMat(0x00a550));
          stud.position.set(x, 0.15, z);
          stud.castShadow = true;
          scene.add(stud);
        }
      }
    }

    // ─── Courtyard floor ───
    const courtyardGeo = new THREE.PlaneGeometry(24, 24);
    const courtyardCanvas = document.createElement('canvas');
    courtyardCanvas.width = 128;
    courtyardCanvas.height = 128;
    const cCtx = courtyardCanvas.getContext('2d');
    if (cCtx) {
      cCtx.fillStyle = '#c4a86b';
      cCtx.fillRect(0, 0, 128, 128);
      cCtx.strokeStyle = '#a08850';
      cCtx.lineWidth = 1;
      for (let cx = 0; cx < 128; cx += 16) {
        for (let cy = 0; cy < 128; cy += 16) {
          cCtx.strokeRect(cx, cy, 16, 16);
        }
      }
    }
    const courtyardTex = new THREE.CanvasTexture(courtyardCanvas);
    courtyardTex.wrapS = THREE.RepeatWrapping;
    courtyardTex.wrapT = THREE.RepeatWrapping;
    courtyardTex.repeat.set(3, 3);
    const courtyardMat = new THREE.MeshStandardMaterial({ map: courtyardTex, roughness: 0.8 });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.position.y = 0.08;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    // ─── Lighting ───
    // Hemisphere light (sky/ground ambient)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.5);
    scene.add(hemiLight);

    // Directional sunlight
    const sunLight = new THREE.DirectionalLight(0xfff0d4, 1.0);
    sunLight.position.set(35, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.25);
    fillLight.position.set(-20, 30, -20);
    scene.add(fillLight);

    // ─── BUILD THE CASTLE ───
    const STONE_GRAY = 0x9a9a9a;
    const DARK_STONE = 0x6a6a6a;
    const ROOF_RED = 0xb22222;
    const FLAG_RED = 0xdc143c;

    // Corner towers
    const towers = [
      createTower(-12, -12, 14, DARK_STONE, ROOF_RED),
      createTower(12, -12, 14, DARK_STONE, ROOF_RED),
      createTower(-12, 12, 14, DARK_STONE, ROOF_RED),
      createTower(12, 12, 14, DARK_STONE, ROOF_RED),
    ];
    towers.forEach(t => scene.add(t));

    // Walls (with arrow slits)
    const wallHeight = 10;
    // Front wall - left segment (before gate)
    const wallFL = createWallSegment(-12, -12, -3, -12, wallHeight, STONE_GRAY, true);
    scene.add(wallFL);
    // Front wall - right segment (after gate)
    const wallFR = createWallSegment(3, -12, 12, -12, wallHeight, STONE_GRAY, true);
    scene.add(wallFR);
    // Right wall
    scene.add(createWallSegment(12, -12, 12, 12, wallHeight, STONE_GRAY, true));
    // Back wall
    scene.add(createWallSegment(12, 12, -12, 12, wallHeight, STONE_GRAY, true));
    // Left wall
    scene.add(createWallSegment(-12, 12, -12, -12, wallHeight, STONE_GRAY, true));

    // Gate
    const gateGroup = createGate(0, -12);
    scene.add(gateGroup);

    // Wall above gate removed - open archway

    // Central keep tower
    const keep = createTower(0, 0, 20, 0xc4a86b, 0x2255aa);
    scene.add(keep);

    // ─── Castle Interior (detailed) ───

    // ── Well (right side of keep) ──
    const wellGroup = new THREE.Group();
    const WELL_STONE = 0x808080;
    const WELL_DARK = 0x606060;
    // Stone wall — 12 segments, 5 layers, alternating color
    for (let wi = 0; wi < 12; wi++) {
      const wa = (wi / 12) * Math.PI * 2;
      const wr = 1.2;
      for (let wl = 0; wl < 5; wl++) {
        const wc = (wi + wl) % 2 === 0 ? WELL_STONE : WELL_DARK;
        const wb = createBrick(1, 1, 1, wc, Math.cos(wa) * wr, wl * brickUnit, Math.sin(wa) * wr);
        wb.rotation.y = wa;
        wellGroup.add(wb);
      }
    }
    // Stone rim on top
    const rimGeo = new THREE.TorusGeometry(1.25, 0.15, 8, 20);
    const rimMat = plasticMat(0x707070);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 5 * brickUnit + 0.1;
    rim.castShadow = true;
    wellGroup.add(rim);
    // Water inside well — animated via userData
    const wellWaterGeo = new THREE.CircleGeometry(1.0, 20);
    const wellWaterMat = new THREE.MeshStandardMaterial({
      color: 0x2266bb, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.85,
    });
    const wellWater = new THREE.Mesh(wellWaterGeo, wellWaterMat);
    wellWater.rotation.x = -Math.PI / 2;
    wellWater.position.y = 2.5 * brickUnit;
    wellGroup.add(wellWater);
    // Wooden posts (thicker, with crossbeam)
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });
    for (let pi = 0; pi < 2; pi++) {
      const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8);
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(pi === 0 ? -0.9 : 0.9, 5 * brickUnit + 2.25, 0);
      post.castShadow = true;
      wellGroup.add(post);
    }
    // Crossbeam
    const crossGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
    const crossBeam = new THREE.Mesh(crossGeo, woodMat);
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, 5 * brickUnit + 4.3, 0);
    crossBeam.castShadow = true;
    wellGroup.add(crossBeam);
    // Rope + bucket
    const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 2, 4);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(0, 5 * brickUnit + 3.0, 0);
    wellGroup.add(rope);
    const bucketGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8, 1, true);
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, side: THREE.DoubleSide });
    const bucket = new THREE.Mesh(bucketGeo, bucketMat);
    bucket.position.set(0, 5 * brickUnit + 1.85, 0);
    wellGroup.add(bucket);
    // Bottom of bucket
    const bucketBottom = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), bucketMat);
    bucketBottom.rotation.x = Math.PI / 2;
    bucketBottom.position.set(0, 5 * brickUnit + 1.68, 0);
    wellGroup.add(bucketBottom);
    // Conical roof with shingles effect
    const wellRoofGeo = new THREE.ConeGeometry(1.5, 1.5, 4);
    const wellRoofMat = plasticMat(0xb22222);
    const wellRoof = new THREE.Mesh(wellRoofGeo, wellRoofMat);
    wellRoof.position.y = 5 * brickUnit + 5.2;
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = true;
    wellGroup.add(wellRoof);
    wellGroup.position.set(6, 0.08, 5);
    scene.add(wellGroup);

    // ── Throne (behind keep) ──
    const throneGroup = new THREE.Group();
    const THRONE_BASE = 0xc4a86b;
    const THRONE_RED = 0xb22222;
    const THRONE_GOLD = 0xccaa33;
    // Two-step raised platform
    for (let step = 0; step < 2; step++) {
      const stepW = 5 - step;
      const stepD = 3 - step * 0.5;
      for (let tx = 0; tx < stepW; tx++) {
        for (let tz = 0; tz < Math.ceil(stepD); tz++) {
          const bc = (tx + tz + step) % 3 === 0 ? 0xb09858 : THRONE_BASE;
          throneGroup.add(createBrick(1, 1, 1, bc,
            (tx - (stepW - 1) / 2) * brickUnit, step * brickUnit, tz * brickUnit * 0.8));
        }
      }
    }
    // Chair seat
    throneGroup.add(createBrick(2, 1, 2, THRONE_RED, 0, 2 * brickUnit, 0.5 * brickUnit));
    // Chair back — tall, ornate
    for (let tl = 0; tl < 5; tl++) {
      throneGroup.add(createBrick(2, 1, 1, THRONE_RED, 0, (3 + tl) * brickUnit, 1.2 * brickUnit));
    }
    // Crown finial on top
    throneGroup.add(createBrick(1, 1, 1, THRONE_GOLD, 0, 8 * brickUnit, 1.2 * brickUnit));
    // Side finials
    throneGroup.add(createBrick(1, 1, 1, THRONE_GOLD, -0.8 * brickUnit, 7 * brickUnit, 1.2 * brickUnit));
    throneGroup.add(createBrick(1, 1, 1, THRONE_GOLD, 0.8 * brickUnit, 7 * brickUnit, 1.2 * brickUnit));
    // Armrests
    for (let tl = 0; tl < 3; tl++) {
      throneGroup.add(createBrick(1, 1, 1, THRONE_RED, -1.5 * brickUnit, (2 + tl) * brickUnit, 0.3 * brickUnit));
      throneGroup.add(createBrick(1, 1, 1, THRONE_RED, 1.5 * brickUnit, (2 + tl) * brickUnit, 0.3 * brickUnit));
    }
    // Armrest caps
    throneGroup.add(createBrick(1, 1, 1, THRONE_GOLD, -1.5 * brickUnit, 5 * brickUnit, 0.3 * brickUnit));
    throneGroup.add(createBrick(1, 1, 1, THRONE_GOLD, 1.5 * brickUnit, 5 * brickUnit, 0.3 * brickUnit));
    // Red carpet in front
    const carpetGeo = new THREE.PlaneGeometry(2.5, 4);
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9 });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.12, -1.5);
    carpet.receiveShadow = true;
    throneGroup.add(carpet);
    throneGroup.position.set(0, 0.08, 7);
    scene.add(throneGroup);

    // ── Barrels (cluster on left side — more barrels, different sizes, stacked) ──
    const BARREL_BROWN = 0x6b4226;
    const BARREL_DARK = 0x4a2a10;
    const barrelConfigs = [
      { x: -6, z: 3, r: 0.5, h: 1.2, tilt: 0, color: BARREL_BROWN },
      { x: -4.8, z: 3.3, r: 0.45, h: 1.1, tilt: 0, color: BARREL_DARK },
      { x: -5.5, z: 4.4, r: 0.4, h: 1.0, tilt: 0, color: BARREL_BROWN },
      { x: -6.8, z: 3.6, r: 0.35, h: 0.9, tilt: 0, color: BARREL_DARK },
      // One barrel on its side
      { x: -5.2, z: 2, r: 0.4, h: 1.0, tilt: Math.PI / 2, color: BARREL_BROWN },
      // Stacked barrel on top of two
      { x: -5.4, z: 3.15, r: 0.42, h: 1.0, tilt: 0, color: BARREL_DARK, yOff: 1.25 },
    ];
    barrelConfigs.forEach(bc => {
      const bg = new THREE.Group();
      const barrelGeo = new THREE.CylinderGeometry(bc.r * 0.9, bc.r, bc.h, 12);
      const barrelMat = plasticMat(bc.color, 0.03);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.y = bc.h / 2;
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      barrel.userData.isBrick = true;
      bg.add(barrel);
      // Three iron bands
      const bandGeo = new THREE.TorusGeometry(bc.r * 0.95, 0.025, 6, 16);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
      for (let bnd = 0; bnd < 3; bnd++) {
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = bc.h * 0.2 + bnd * bc.h * 0.3;
        band.rotation.x = Math.PI / 2;
        bg.add(band);
      }
      // Lid circle on top (if upright)
      if (bc.tilt === 0) {
        const lidGeo = new THREE.CircleGeometry(bc.r * 0.85, 12);
        const lidMat = plasticMat(bc.color - 0x111111);
        const lid = new THREE.Mesh(lidGeo, lidMat);
        lid.rotation.x = -Math.PI / 2;
        lid.position.y = bc.h + 0.01;
        bg.add(lid);
      }
      bg.position.set(bc.x, 0.08 + (bc.yOff || 0), bc.z);
      if (bc.tilt) {
        bg.rotation.z = bc.tilt;
        bg.position.y += bc.r;
      }
      bg.userData.originalPosition = bg.position.clone();
      bg.userData.isBrickGroup = true;
      scene.add(bg);
    });

    // ── Weapon rack (right inner wall) — with shield + more weapons ──
    const rackGroup = new THREE.Group();
    // Back board with wood texture
    const rackBackGeo = new THREE.BoxGeometry(3.0, 3.0, 0.18);
    const rackBackMat = plasticMat(0x5a3a1a);
    const rackBack = new THREE.Mesh(rackBackGeo, rackBackMat);
    rackBack.position.y = 1.8;
    rackBack.castShadow = true;
    rackBack.userData.isBrick = true;
    rackGroup.add(rackBack);
    // Wooden frame border
    const frameMat = plasticMat(0x4a2a10);
    const frameParts = [
      { w: 3.1, h: 0.12, d: 0.22, x: 0, y: 0.3 },
      { w: 3.1, h: 0.12, d: 0.22, x: 0, y: 3.3 },
      { w: 0.12, h: 3.0, d: 0.22, x: -1.5, y: 1.8 },
      { w: 0.12, h: 3.0, d: 0.22, x: 1.5, y: 1.8 },
    ];
    frameParts.forEach(fp => {
      const g = new THREE.BoxGeometry(fp.w, fp.h, fp.d);
      const m = new THREE.Mesh(g, frameMat);
      m.position.set(fp.x, fp.y, 0.02);
      m.castShadow = true;
      rackGroup.add(m);
    });
    // Horizontal pegs
    for (let rh = 0; rh < 3; rh++) {
      const holderGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
      const holderMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });
      const holder = new THREE.Mesh(holderGeo, holderMat);
      holder.rotation.z = Math.PI / 2;
      holder.position.set(0, 0.8 + rh * 0.9, 0.15);
      rackGroup.add(holder);
    }
    // Swords — 3 with crossguards and detailed handles
    for (let sw = 0; sw < 3; sw++) {
      // Blade
      const bladeGeo = new THREE.BoxGeometry(0.07, 1.6, 0.03);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0 + sw * 0x050505, metalness: 0.8, roughness: 0.2,
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(-0.8 + sw * 0.8, 1.8, 0.22);
      blade.rotation.z = (sw - 1) * 0.12;
      blade.castShadow = true;
      rackGroup.add(blade);
      // Crossguard
      const guardGeo = new THREE.BoxGeometry(0.35, 0.06, 0.06);
      const guardMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.6, roughness: 0.3 });
      const guard = new THREE.Mesh(guardGeo, guardMat);
      guard.position.set(-0.8 + sw * 0.8, 0.95, 0.22);
      guard.rotation.z = (sw - 1) * 0.12;
      rackGroup.add(guard);
      // Handle wrapped
      const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.9 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(-0.8 + sw * 0.8, 0.72, 0.22);
      handle.rotation.z = (sw - 1) * 0.12;
      rackGroup.add(handle);
      // Pommel
      const pommelGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const pommel = new THREE.Mesh(pommelGeo, guardMat);
      pommel.position.set(-0.8 + sw * 0.8, 0.52, 0.22);
      rackGroup.add(pommel);
    }
    // Shield (round, mounted on rack)
    const shieldGeo = new THREE.CircleGeometry(0.5, 16);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xb22222, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(0, 2.6, 0.2);
    shield.castShadow = true;
    rackGroup.add(shield);
    // Shield boss (center nub)
    const bossGeo = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.7, roughness: 0.3 });
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.position.set(0, 2.6, 0.22);
    rackGroup.add(boss);
    rackGroup.position.set(8, 0.08, -6);
    rackGroup.rotation.y = -Math.PI / 2;
    rackGroup.userData.originalPosition = rackGroup.position.clone();
    rackGroup.userData.isBrickGroup = true;
    scene.add(rackGroup);

    // ── Market stall (left-front, with canopy) ──
    const stallGroup = new THREE.Group();
    // Table (thick top, sturdy legs)
    const tableTopGeo = new THREE.BoxGeometry(3.5, 0.2, 1.8);
    const tableTopMat = plasticMat(0x5a3a1a);
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTop.position.y = 1.7;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableTop.userData.isBrick = true;
    stallGroup.add(tableTop);
    // Legs
    for (let lx = -1; lx <= 1; lx += 2) {
      for (let lz = -1; lz <= 1; lz += 2) {
        const legGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
        const leg = new THREE.Mesh(legGeo, tableTopMat);
        leg.position.set(lx * 1.4, 0.8, lz * 0.6);
        leg.castShadow = true;
        stallGroup.add(leg);
      }
    }
    // Goods on table — more variety
    const goodItems: Array<{ geo: THREE.BufferGeometry; color: number; x: number; y: number }> = [
      // Bread loaf (rounded)
      { geo: new THREE.SphereGeometry(0.2, 8, 6), color: 0xd4a050, x: -1.0, y: 1.95 },
      { geo: new THREE.SphereGeometry(0.18, 8, 6), color: 0xc89040, x: -0.5, y: 1.93 },
      // Apples (red spheres)
      { geo: new THREE.SphereGeometry(0.12, 8, 6), color: 0xcc2222, x: 0.0, y: 1.88 },
      { geo: new THREE.SphereGeometry(0.12, 8, 6), color: 0xcc2222, x: 0.25, y: 1.88 },
      { geo: new THREE.SphereGeometry(0.12, 8, 6), color: 0x22aa22, x: 0.12, y: 1.88 },
      // Cheese wedge
      { geo: new THREE.CylinderGeometry(0, 0.25, 0.2, 3), color: 0xeedd44, x: 0.7, y: 1.9 },
      // Potion bottle
      { geo: new THREE.CylinderGeometry(0.06, 0.1, 0.35, 8), color: 0x4444cc, x: 1.1, y: 1.97 },
    ];
    goodItems.forEach(gi => {
      const mat = plasticMat(gi.color);
      const mesh = new THREE.Mesh(gi.geo, mat);
      mesh.position.set(gi.x, gi.y, 0);
      mesh.castShadow = true;
      mesh.userData.isBrick = true;
      stallGroup.add(mesh);
    });
    // Canopy over the stall (striped cloth)
    const canopyCanvas = document.createElement('canvas');
    canopyCanvas.width = 128;
    canopyCanvas.height = 64;
    const canCtx = canopyCanvas.getContext('2d');
    if (canCtx) {
      for (let stripe = 0; stripe < 8; stripe++) {
        canCtx.fillStyle = stripe % 2 === 0 ? '#cc2222' : '#f4f4f4';
        canCtx.fillRect(stripe * 16, 0, 16, 64);
      }
    }
    const canopyTex = new THREE.CanvasTexture(canopyCanvas);
    const canopyGeo = new THREE.PlaneGeometry(4.0, 2.2);
    const canopyMat = new THREE.MeshStandardMaterial({
      map: canopyTex, side: THREE.DoubleSide, roughness: 0.9,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 3.2, 0);
    canopy.rotation.x = -Math.PI / 2 + 0.15; // slight tilt
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    stallGroup.add(canopy);
    // Canopy posts
    for (let cp = -1; cp <= 1; cp += 2) {
      const cpGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6);
      const cpMesh = new THREE.Mesh(cpGeo, woodMat);
      cpMesh.position.set(cp * 1.6, 1.6, -0.8);
      cpMesh.castShadow = true;
      stallGroup.add(cpMesh);
    }
    stallGroup.position.set(-5, 0.08, -5);
    stallGroup.userData.originalPosition = stallGroup.position.clone();
    stallGroup.userData.isBrickGroup = true;
    scene.add(stallGroup);

    // ── Hay bales (near barrels) ──
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccbb55, roughness: 0.95 });
    const hayConfigs = [
      { x: -8, z: 5, w: 1.2, h: 0.7, d: 0.8 },
      { x: -7.5, z: 6, w: 1.0, h: 0.65, d: 0.75 },
      { x: -8.3, z: 5.8, w: 0.8, h: 0.5, d: 0.7, yOff: 0.7 }, // stacked
    ];
    hayConfigs.forEach(hc => {
      const hGeo = new THREE.BoxGeometry(hc.w, hc.h, hc.d);
      const hMesh = new THREE.Mesh(hGeo, hayMat);
      hMesh.position.set(hc.x, 0.08 + hc.h / 2 + (hc.yOff || 0), hc.z);
      hMesh.castShadow = true;
      hMesh.receiveShadow = true;
      hMesh.userData.isBrick = true;
      scene.add(hMesh);
    });

    // ── Campfire (center-left courtyard) ──
    const fireGroup = new THREE.Group();
    // Stone ring
    for (let fi = 0; fi < 8; fi++) {
      const fa = (fi / 8) * Math.PI * 2;
      const fr = 0.5;
      const stone = createBrick(1, 1, 1, 0x555555, Math.cos(fa) * fr, 0, Math.sin(fa) * fr);
      stone.scale.set(0.4, 0.35, 0.4);
      stone.rotation.y = fa;
      fireGroup.add(stone);
    }
    // Log pieces
    const logGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.6, 6);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.9 });
    for (let li = 0; li < 4; li++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (li / 4) * Math.PI;
      log.position.set(Math.cos(li * 1.5) * 0.15, 0.15, Math.sin(li * 1.5) * 0.15);
      fireGroup.add(log);
    }
    // Fire embers (small glowing spheres)
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const emberMat2 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    for (let ei = 0; ei < 6; ei++) {
      const eGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 6);
      const ember = new THREE.Mesh(eGeo, ei % 2 === 0 ? emberMat : emberMat2);
      ember.position.set(
        (Math.random() - 0.5) * 0.2,
        0.2 + ei * 0.06,
        (Math.random() - 0.5) * 0.2,
      );
      ember.userData.flameIndex = ei;
      fireGroup.add(ember);
    }
    // Fire light
    const fireLight = new THREE.PointLight(0xff6622, 0.6, 8);
    fireLight.position.set(0, 0.5, 0);
    fireGroup.add(fireLight);
    fireGroup.position.set(-3, 0.08, 2);
    fireGroup.userData.fireLight = fireLight;
    scene.add(fireGroup);

    // ── Stone path from gate to keep ──
    const pathMat = plasticMat(0x888880);
    for (let pi = 0; pi < 10; pi++) {
      const pw = 0.6 + Math.random() * 0.3;
      const pd = 0.5 + Math.random() * 0.2;
      const stoneGeo = new THREE.BoxGeometry(pw, 0.08, pd);
      const stone = new THREE.Mesh(stoneGeo, pathMat);
      stone.position.set(
        (Math.random() - 0.5) * 1.2,
        0.12,
        -11 + pi * 1.1 + (Math.random() - 0.5) * 0.3,
      );
      stone.rotation.y = Math.random() * 0.3;
      stone.receiveShadow = true;
      scene.add(stone);
    }

    // ── Ladder against inner wall (back-right) ──
    const ladderGroup = new THREE.Group();
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });
    // Side rails
    for (let lr = -1; lr <= 1; lr += 2) {
      const railGeo = new THREE.BoxGeometry(0.08, 5, 0.08);
      const rail = new THREE.Mesh(railGeo, ladderMat);
      rail.position.set(lr * 0.35, 2.5, 0);
      rail.castShadow = true;
      ladderGroup.add(rail);
    }
    // Rungs
    for (let rung = 0; rung < 7; rung++) {
      const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6);
      const rungMesh = new THREE.Mesh(rungGeo, ladderMat);
      rungMesh.rotation.z = Math.PI / 2;
      rungMesh.position.set(0, 0.4 + rung * 0.65, 0);
      ladderGroup.add(rungMesh);
    }
    ladderGroup.position.set(9, 0.08, 8);
    ladderGroup.rotation.y = Math.PI;
    ladderGroup.rotation.x = -0.15; // leaning against wall
    scene.add(ladderGroup);

    // ── Crates (near market stall) ──
    const crateMat = plasticMat(0x6b5030);
    const crateConfigs = [
      { x: -7, z: -5, s: 0.7 },
      { x: -7.5, z: -4.2, s: 0.6 },
      { x: -7.2, z: -4.7, s: 0.55, yOff: 0.65 },
    ];
    crateConfigs.forEach(cc => {
      const crateGeo = new THREE.BoxGeometry(cc.s, cc.s, cc.s);
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(cc.x, 0.08 + cc.s / 2 + (cc.yOff || 0), cc.z);
      crate.rotation.y = Math.random() * 0.4;
      crate.castShadow = true;
      crate.receiveShadow = true;
      crate.userData.isBrick = true;
      scene.add(crate);
      // Edge lines on crate
      const edges = new THREE.EdgesGeometry(crateGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a2510, transparent: true, opacity: 0.3 });
      const edgeLines = new THREE.LineSegments(edges, edgeMat);
      edgeLines.position.copy(crate.position);
      edgeLines.rotation.copy(crate.rotation);
      scene.add(edgeLines);
    });

    // ─── VILLAGE HOUSES (along inner perimeter walls) ───
    const villageHouses: THREE.Group[] = [];
    const DARK_RED_ROOF = 0x8b1a1a;
    const DARK_BLUE_ROOF = 0x1a3a6b;
    const houseConfigs = [
      // Left wall houses (facing inward = angle 0 / PI/2)
      { x: -9.5, z: -7, widthUnits: 4, wallHeightLayers: 5, roofColor: DARK_RED_ROOF, facingAngle: Math.PI / 2, windowSide: 'right' as const, doorSide: 'front' as const },
      { x: -9.5, z: 2, widthUnits: 3, wallHeightLayers: 6, roofColor: DARK_BLUE_ROOF, facingAngle: Math.PI / 2, windowSide: 'both' as const, doorSide: 'front' as const },
      // Back wall houses (facing inward = angle PI)
      { x: -5, z: 9, widthUnits: 4, wallHeightLayers: 5, roofColor: DARK_BLUE_ROOF, facingAngle: Math.PI, windowSide: 'left' as const, doorSide: 'front' as const },
      { x: 5, z: 9, widthUnits: 3, wallHeightLayers: 7, roofColor: DARK_RED_ROOF, facingAngle: Math.PI, windowSide: 'right' as const, doorSide: 'front' as const },
      // Right wall houses (facing inward = angle -PI/2)
      { x: 9.5, z: -6, widthUnits: 3, wallHeightLayers: 5, roofColor: DARK_RED_ROOF, facingAngle: -Math.PI / 2, windowSide: 'left' as const, doorSide: 'front' as const },
      { x: 9.5, z: 4, widthUnits: 4, wallHeightLayers: 6, roofColor: DARK_BLUE_ROOF, facingAngle: -Math.PI / 2, windowSide: 'both' as const, doorSide: 'front' as const },
    ];
    houseConfigs.forEach(hc => {
      const h = createVillageHouse(hc);
      villageHouses.push(h);
      scene.add(h);
    });

    // ─── Village props near houses ───
    const villagePropsGroups: THREE.Group[] = [];
    const propPositions = [
      { x: -8, z: -4.5, angle: Math.PI / 2 },
      { x: -8, z: 5, angle: Math.PI / 3 },
      { x: 8, z: -3.5, angle: -Math.PI / 2 },
      { x: 8, z: 7, angle: -Math.PI / 3 },
    ];
    propPositions.forEach(pp => {
      const pg = createVillageProps(pp.x, pp.z, pp.angle);
      villagePropsGroups.push(pg);
      scene.add(pg);
    });

    // ─── LEGO-tiled pathways between houses ───
    const pathTileMat = plasticMat(0xa09070);
    const pathTileDark = plasticMat(0x807060);
    // Pathway along left wall (connecting houses)
    for (let pi = 0; pi < 14; pi++) {
      const tileW = brickUnit;
      const tileD = brickUnit;
      const tileMat = pi % 3 === 0 ? pathTileDark : pathTileMat;
      const tileGeo = new THREE.BoxGeometry(tileW - 0.04, 0.06, tileD - 0.04);
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(-7.5, 0.11, -9 + pi * brickUnit * 1.4);
      tile.receiveShadow = true;
      scene.add(tile);
      // Stud on each tile
      const tileStud = createStud(tileMat === pathTileDark ? 0x807060 : 0xa09070);
      tileStud.position.set(-7.5, 0.15, -9 + pi * brickUnit * 1.4);
      scene.add(tileStud);
    }
    // Pathway along right wall
    for (let pi = 0; pi < 14; pi++) {
      const tileMat = pi % 3 === 0 ? pathTileDark : pathTileMat;
      const tileGeo = new THREE.BoxGeometry(brickUnit - 0.04, 0.06, brickUnit - 0.04);
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(7.5, 0.11, -9 + pi * brickUnit * 1.4);
      tile.receiveShadow = true;
      scene.add(tile);
      const tileStud = createStud(tileMat === pathTileDark ? 0x807060 : 0xa09070);
      tileStud.position.set(7.5, 0.15, -9 + pi * brickUnit * 1.4);
      scene.add(tileStud);
    }
    // Pathway along back wall
    for (let pi = 0; pi < 12; pi++) {
      const tileMat = pi % 3 === 0 ? pathTileDark : pathTileMat;
      const tileGeo = new THREE.BoxGeometry(brickUnit - 0.04, 0.06, brickUnit - 0.04);
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(-7 + pi * brickUnit * 1.25, 0.11, 7);
      tile.receiveShadow = true;
      scene.add(tile);
      const tileStud = createStud(tileMat === pathTileDark ? 0x807060 : 0xa09070);
      tileStud.position.set(-7 + pi * brickUnit * 1.25, 0.15, 7);
      scene.add(tileStud);
    }

    // ─── Garden patches (green studs near houses) ───
    const gardenPositions = [
      { x: -7.5, z: -2, w: 3, d: 2 },
      { x: 7.5, z: 0, w: 2, d: 3 },
      { x: -2, z: 8, w: 3, d: 1.5 },
    ];
    gardenPositions.forEach(gp => {
      const gardenGroup = new THREE.Group();
      // Dirt patch
      const dirtGeo = new THREE.BoxGeometry(gp.w, 0.06, gp.d);
      const dirtMat = plasticMat(0x6b5030);
      const dirt = new THREE.Mesh(dirtGeo, dirtMat);
      dirt.receiveShadow = true;
      gardenGroup.add(dirt);
      // Green studs (plants)
      const cols = Math.floor(gp.w / 0.4);
      const rows = Math.floor(gp.d / 0.4);
      const plantColors = [0x228b22, 0x32cd32, 0x006400, 0x00852b];
      for (let gx = 0; gx < cols; gx++) {
        for (let gz = 0; gz < rows; gz++) {
          if (Math.random() > 0.6) continue; // sparse planting
          const pc = plantColors[Math.floor(Math.random() * plantColors.length)];
          const plantStud = createStud(pc);
          plantStud.position.set(
            (gx - (cols - 1) / 2) * 0.4,
            0.05,
            (gz - (rows - 1) / 2) * 0.4
          );
          plantStud.scale.setScalar(1.2);
          gardenGroup.add(plantStud);
        }
      }
      gardenGroup.position.set(gp.x, 0.11, gp.z);
      gardenGroup.userData.originalPosition = gardenGroup.position.clone();
      gardenGroup.userData.isBrickGroup = true;
      scene.add(gardenGroup);
    });

    // ─── Additional village well (near left houses) ───
    const villageWellGroup = new THREE.Group();
    for (let wi = 0; wi < 8; wi++) {
      const wa = (wi / 8) * Math.PI * 2;
      const wr = 0.7;
      for (let wl = 0; wl < 3; wl++) {
        const wc = (wi + wl) % 2 === 0 ? 0x808080 : 0x606060;
        const wb = createBrick(1, 1, 1, wc, Math.cos(wa) * wr, wl * brickUnit, Math.sin(wa) * wr);
        wb.scale.set(0.6, 0.6, 0.6);
        wb.rotation.y = wa;
        villageWellGroup.add(wb);
      }
    }
    // Small bucket on rim
    const vBucketGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.2, 8, 1, true);
    const vBucket = new THREE.Mesh(vBucketGeo, new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, side: THREE.DoubleSide }));
    vBucket.position.set(0.4, 3 * brickUnit * 0.6 + 0.1, 0);
    villageWellGroup.add(vBucket);
    villageWellGroup.position.set(-5.5, 0.08, -1);
    villageWellGroup.userData.originalPosition = villageWellGroup.position.clone();
    villageWellGroup.userData.isBrickGroup = true;
    scene.add(villageWellGroup);

    // Torches — gate + courtyard walls for interior lighting
    const torches: THREE.Group[] = [];
    const torchPositions: [number, number, number][] = [
      [-3.5, 5, -12.5],   // gate left
      [3.5, 5, -12.5],    // gate right
      [-10, 5, 0],         // left wall mid
      [10, 5, 0],          // right wall mid
      [0, 5, 10],          // back wall mid
      [-10, 5, -10],       // left wall front
      [10, 5, -10],        // right wall front
    ];
    torchPositions.forEach(([tx, ty, tz]) => {
      const t = createTorch(tx, ty, tz);
      torches.push(t);
      scene.add(t);
    });

    // Flags on towers
    const flags: THREE.Group[] = [];
    const flagPositions: [number, number, number][] = [
      [-12, 14 * brickUnit + 5.5 - 6.25 + 3.75, -12],
      [12, 14 * brickUnit + 5.5 - 6.25 + 3.75, -12],
      [-12, 14 * brickUnit + 5.5 - 6.25 + 3.75, 12],
      [12, 14 * brickUnit + 5.5 - 6.25 + 3.75, 12],
      [0, 20 * brickUnit + 7 - 6.25 + 3.75, 0],
    ];
    flagPositions.forEach(([fx, fy, fz]) => {
      const f = createFlag(fx, fy, fz, FLAG_RED);
      flags.push(f);
      scene.add(f);
    });

    // ─── Raycaster for hover/click ───
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredObj: THREE.Object3D | null = null;
    const originalColors = new Map<THREE.Mesh, THREE.Color>();

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onMouseClick() {
      raycaster.setFromCamera(mouse, camera);
      const allBricks: THREE.Object3D[] = [];
      scene.traverse(obj => {
        if (obj.userData.isBrick) allBricks.push(obj);
      });
      const intersects = raycaster.intersectObjects(allBricks);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        // Pop animation
        const parent = hit.parent;
        if (parent) {
          const origScale = parent.scale.clone();
          parent.scale.multiplyScalar(1.15);
          setTimeout(() => { parent.scale.copy(origScale); }, 150);
        }
        // Check if door was clicked
        if (hit.userData.isDoor) {
          setGateOpen(prev => !prev);
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    // ─── Intro orbit animation ───
    let introAngle = 0;
    let introActive = true;
    const introDuration = 4; // seconds
    let introElapsed = 0;

    // ─── Animation ───
    let time = 0;
    const clock = new THREE.Clock();

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      time += delta;

      const state = stateRef.current;

      // Intro orbit
      if (introActive) {
        introElapsed += delta;
        introAngle += delta * 0.5;
        const introR = 60 - introElapsed * 4;
        camera.position.set(
          Math.cos(introAngle) * Math.max(35, introR),
          40 - introElapsed * 3,
          Math.sin(introAngle) * Math.max(35, introR)
        );
        camera.lookAt(0, 8, 0);
        if (introElapsed > introDuration) {
          introActive = false;
          camera.position.set(45, 30, 45);
        }
      }

      // Animate flags — dramatic flying-in-the-air effect
      flags.forEach(fg => {
        const flag = fg.userData.flag as THREE.Mesh;
        const geo = fg.userData.flagGeo as THREE.PlaneGeometry;
        const phase = (fg.userData.flagPhase as number) || 0;
        const origY = fg.userData.flagOrigY as Float32Array;
        const flagW = (fg.userData.flagW as number) || 2.4;
        const flagH = (fg.userData.flagH as number) || 1.3;
        if (flag && geo && origY) {
          const pos = geo.attributes.position;
          const halfW = flagW / 2;
          const halfH = flagH / 2;
          for (let i = 0; i < pos.count; i++) {
            const fx = pos.getX(i);
            const fy = origY[i];
            // Normalized distance from pole (0 at pole, 1 at tip)
            const distNorm = (fx + halfW) / flagW;
            const dist3 = distNorm * distNorm * distNorm; // cubic falloff — tip moves most

            // ── Z axis: strong billowing waves (perpendicular to flag plane) ──
            const baseAmp = 0.6;
            const wave1 = Math.sin(fx * 4 + time * 6 + phase) * baseAmp * dist3;
            const wave2 = Math.sin(fx * 7 + time * 9 + phase + 1.5) * baseAmp * 0.4 * dist3;
            const wave3 = Math.sin(fy * 5 + time * 4.5 + phase + 0.7) * baseAmp * 0.25 * dist3;
            // Turbulent high-frequency flutter at the tip
            const flutter = Math.sin(fx * 12 + time * 14 + phase * 2.3) * 0.12 * dist3;
            // Gusting effect — slow oscillation that modulates overall amplitude
            const gust = 1.0 + 0.3 * Math.sin(time * 1.2 + phase);
            pos.setZ(i, (wave1 + wave2 + wave3 + flutter) * gust);

            // ── Y axis: lift & droop — flag lifts upward at tip, with gentle bounce ──
            const lift = distNorm * distNorm * 0.25 * Math.sin(time * 2.5 + phase);
            const droop = -distNorm * 0.08; // slight gravity droop
            // Vertical ripple along length
            const vertRipple = Math.sin(fx * 6 + time * 5 + phase) * 0.06 * distNorm;
            // Edge flutter — top and bottom edges flutter more
            const edgeDist = Math.abs(fy) / halfH;
            const edgeFlutter = edgeDist * Math.sin(fx * 9 + time * 11 + phase + fy * 3) * 0.05 * distNorm;
            pos.setY(i, fy + lift + droop + vertRipple + edgeFlutter);
          }
          pos.needsUpdate = true;
          geo.computeVertexNormals();
        }
      });

      // Animate torch flames
      torches.forEach(tg => {
        const flames = tg.userData.flames as THREE.Group;
        const tLight = tg.userData.torchLight as THREE.PointLight;
        if (flames) {
          flames.children.forEach((f, i) => {
            const fi = f.userData.flameIndex ?? i;
            f.position.y = 1.5 + fi * 0.08 + Math.sin(time * 8 + fi * 2) * 0.05;
            f.position.x = Math.sin(time * 6 + fi * 3) * 0.06;
            f.scale.setScalar(0.7 + Math.sin(time * 10 + fi) * 0.3);
          });
        }
        if (tLight) {
          tLight.intensity = 0.6 + Math.sin(time * 7) * 0.3;
        }
      });

      // Animate campfire embers
      fireGroup.children.forEach(child => {
        if (child.userData.flameIndex !== undefined) {
          const fi = child.userData.flameIndex as number;
          child.position.y = 0.2 + fi * 0.06 + Math.sin(time * 9 + fi * 1.7) * 0.04;
          child.position.x = Math.sin(time * 7 + fi * 2.5) * 0.08;
          child.position.z = Math.cos(time * 5 + fi * 1.3) * 0.06;
          child.scale.setScalar(0.6 + Math.sin(time * 12 + fi) * 0.4);
        }
      });
      const fLight = fireGroup.userData.fireLight as THREE.PointLight;
      if (fLight) {
        fLight.intensity = 0.5 + Math.sin(time * 8) * 0.2 + Math.sin(time * 13) * 0.1;
      }

      // Animate village chimney smoke
      villageHouses.forEach((vh, hi) => {
        const chimney = vh.userData.chimney as THREE.Group | undefined;
        if (chimney) {
          const smokeG = chimney.userData.smokeGroup as THREE.Group | undefined;
          if (smokeG) {
            smokeG.children.forEach(smoke => {
              const si = smoke.userData.smokeIndex as number;
              const baseY = smoke.userData.smokeBaseY as number;
              // Float upward with drift, cycle back down
              const cycle = (time * 0.5 + si * 0.7 + hi * 1.3) % 3;
              smoke.position.y = baseY + cycle * 0.6;
              smoke.position.x = Math.sin(time * 1.5 + si * 2 + hi) * 0.12;
              smoke.position.z = Math.cos(time * 1.2 + si * 1.5 + hi) * 0.08;
              // Fade out as it rises
              const opacity = Math.max(0, 0.35 - cycle * 0.1);
              if (smoke instanceof THREE.Mesh && smoke.material instanceof THREE.MeshBasicMaterial) {
                smoke.material.opacity = opacity;
              }
              // Scale up as it rises
              smoke.scale.setScalar(1 + cycle * 0.4);
            });
          }
        }
      });

      // Animate village house lights (warm flicker)
      villageHouses.forEach((vh, hi) => {
        const hLight = vh.userData.houseLight as THREE.PointLight | undefined;
        if (hLight) {
          const nightTarget = 1.5 + Math.sin(time * 5 + hi * 2.1) * 0.3 + Math.sin(time * 8.5 + hi) * 0.15;
          const dayTarget = 0.3 + Math.sin(time * 4 + hi * 1.7) * 0.1;
          const target = state.isNight ? nightTarget : dayTarget;
          hLight.intensity = THREE.MathUtils.lerp(hLight.intensity, target, 0.06);
        }
        const lLight = vh.userData.lanternLight as THREE.PointLight | undefined;
        if (lLight) {
          const nightTarget = 1.0 + Math.sin(time * 6 + hi * 3) * 0.3;
          const dayTarget = 0.2 + Math.sin(time * 3 + hi * 2) * 0.05;
          const target = state.isNight ? nightTarget : dayTarget;
          lLight.intensity = THREE.MathUtils.lerp(lLight.intensity, target, 0.05);
        }
      });

      // Animate clouds
      cloudGroup.children.forEach(c => {
        const sp = c.userData.cloudSpeed as number;
        const ca = (c.userData.cloudAngle as number) + time * sp * 0.1;
        const cr = c.userData.cloudRadius as number;
        c.position.x = Math.cos(ca) * cr;
        c.position.z = Math.sin(ca) * cr;
      });

      // Day/Night transition
      hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, state.isNight ? 0.15 : 0.5, 0.03);
      sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, state.isNight ? 0.1 : 1.0, 0.03);
      sunLight.color.lerp(new THREE.Color(state.isNight ? 0x334466 : 0xfff0d4), 0.03);
      skyMat.color.lerp(new THREE.Color(state.isNight ? 0x111133 : 0xffffff), 0.03);
      torches.forEach(tg => {
        const tLight = tg.userData.torchLight as THREE.PointLight;
        if (tLight) {
          const targetIntensity = state.isNight ? 2.0 + Math.sin(time * 7) * 0.5 : 0.6 + Math.sin(time * 7) * 0.3;
          tLight.intensity = THREE.MathUtils.lerp(tLight.intensity, targetIntensity, 0.05);
        }
      });

      // Wireframe toggle
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.wireframe = state.isWireframe;
        }
      });

      // Exploded view
      scene.traverse(obj => {
        if (obj.userData.isBrickGroup && obj.userData.originalPosition) {
          const orig = obj.userData.originalPosition as THREE.Vector3;
          if (state.isExploded) {
            const dir = orig.clone().normalize();
            const target = orig.clone().add(dir.multiplyScalar(3));
            target.y = orig.y + 2;
            obj.position.lerp(target, 0.05);
          } else {
            obj.position.lerp(orig, 0.08);
          }
        }
      });

      // Gate open/close
      const door = gateGroup.userData.door as THREE.Mesh;
      const drawbridge = gateGroup.userData.drawbridge as THREE.Mesh;
      if (door) {
        const targetY = state.gateOpen ? 9 : 3;
        door.position.y = THREE.MathUtils.lerp(door.position.y, targetY, 0.04);
      }
      if (drawbridge) {
        const targetRot = state.gateOpen ? -Math.PI / 2 : 0;
        drawbridge.rotation.x = THREE.MathUtils.lerp(drawbridge.rotation.x, targetRot, 0.04);
      }

      // Hover highlight via raycasting
      raycaster.setFromCamera(mouse, camera);
      const brickMeshes: THREE.Object3D[] = [];
      scene.traverse(obj => {
        if (obj.userData.isBrick) brickMeshes.push(obj);
      });
      const intersects = raycaster.intersectObjects(brickMeshes);

      // Reset previous hover
      if (hoveredObj && hoveredObj instanceof THREE.Mesh) {
        const oc = originalColors.get(hoveredObj);
        if (oc && hoveredObj.material instanceof THREE.MeshStandardMaterial) {
          hoveredObj.material.emissive.copy(oc);
        }
        hoveredObj = null;
      }

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit instanceof THREE.Mesh && hit.material instanceof THREE.MeshStandardMaterial) {
          if (!originalColors.has(hit)) {
            originalColors.set(hit, hit.material.emissive.clone());
          }
          hit.material.emissive.set(0x333333);
          hoveredObj = hit;
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        renderer.domElement.style.cursor = 'grab';
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ─── Resize ───
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ─── Cleanup ───
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-[650px] w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* UI Control buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsNight(p => !p)}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          {isNight ? 'Day Mode' : 'Night Mode'}
        </button>
        <button
          onClick={() => setIsWireframe(p => !p)}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          {isWireframe ? 'Solid View' : 'Wireframe'}
        </button>
        <button
          onClick={() => setIsExploded(p => !p)}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          {isExploded ? 'Assembled' : 'Exploded View'}
        </button>
        <button
          onClick={() => setGateOpen(p => !p)}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          {gateOpen ? 'Close Gate' : 'Open Gate'}
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-lg bg-black/60 px-4 py-2 backdrop-blur-sm">
          <p className="text-xs text-white/80 font-medium tracking-wide">
            grab &amp; drag to look around &nbsp;/&nbsp; scroll to zoom &nbsp;/&nbsp; click a brick to poke it
          </p>
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  const items = "SCAN \u2022 BUILD \u2022 CREATE \u2022 SHARE \u2022 ";
  const repeated = items.repeat(12);
  return (
    <div className="w-full overflow-hidden border-y-2 border-black bg-yellow-400 py-3">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marquee 20s linear infinite" }}
      >
        <span className="text-lg font-black tracking-widest text-black">
          {repeated}
        </span>
      </div>
    </div>
  );
}

function LandingPage() {
  const { setView, setIsTransitioning } = useAppStore();

  const handleEnter = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setView("dashboard");
      setTimeout(() => setIsTransitioning(false), 50);
    }, 400);
  };

  // Generate falling bricks with random positions
  const fallingBricks = React.useMemo(() => {
    const bricks = [];
    const colors = ["#E3000B", "#0057A8", "#FFD700", "#00852B", "#FF7E14"];
    for (let i = 0; i < 20; i++) {
      bricks.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 30 + Math.random() * 30,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 4,
      });
    }
    return bricks;
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      {/* Hero Section with Castle */}
      <div className="relative flex min-h-screen flex-col">
        {/* Top Half - Hero Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 text-center pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Boxes className="h-8 w-8 text-black" />
            </div>
            <span className="text-2xl font-black tracking-tight">BrickMind</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-black sm:text-5xl md:text-6xl mb-6">
            UNLEASH YOUR
            <br />
            <span className="relative">
              <span className="relative z-10">BRICK POTENTIAL</span>
              <span className="absolute bottom-1 left-0 -z-0 h-4 w-full bg-yellow-400 sm:h-5" />
            </span>
          </h1>

          <p className="max-w-md text-base text-gray-600 mb-6">
            Scan your LEGO collection. Get AI-powered build suggestions. Create
            something amazing.
          </p>

          <button
            onClick={handleEnter}
            className="group relative rounded-2xl border-2 border-black bg-red-500 px-8 py-3 text-lg font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
              START BUILDING
              <Sparkles className="h-5 w-5 transition-transform group-hover:-rotate-12" />
            </span>
          </button>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[
              { label: "Bricks Scanned", value: "10M+" },
              { label: "Builds Created", value: "50K+" },
              { label: "Master Builders", value: "12K+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="text-lg font-black">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Half - Castle Building Animation */}
        <div className="relative">
          <div className="text-center py-6">
            <h2 className="text-3xl font-black mb-2">HAVE A LOOK AROUND</h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto px-4 mb-4">
              This castle was built entirely from LEGO bricks. Spin it, zoom in, open the gate — it's yours to explore.
            </p>
          </div>
          <CastleBuilding />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10">
          <Marquee />
        </div>
      </div>

      {/* Build the Castle - LEGO Instruction Section */}
      <BuildInstructionsSection />

      {/* Second Screen - Call to Action */}
      <div className="relative bg-gradient-to-b from-green-200 via-sky-50 to-white py-24 text-center">
        <h3 className="text-4xl font-black mb-6">READY TO BUILD YOUR MASTERPIECE?</h3>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8 px-4">
          Join thousands of master builders creating amazing LEGO creations with AI-powered assistance.
        </p>
        <button
          onClick={handleEnter}
          className="group relative rounded-2xl border-2 border-black bg-red-500 px-10 py-4 text-lg font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <span className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            LAUNCH BRICKMIND
            <Zap className="h-5 w-5" />
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── AI Status Indicator ─────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: AIStatus }) {
  const colorMap: Record<AIStatus, string> = {
    Online: "bg-green-500",
    Scanning: "bg-yellow-400",
    Thinking: "bg-blue-500",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-3 w-3 items-center justify-center">
        <div
          className={cn(
            "absolute h-3 w-3 rounded-full",
            colorMap[status],
            status !== "Online" && "animate-ping opacity-75",
          )}
        />
        <div
          className={cn("relative h-2 w-2 rounded-full", colorMap[status])}
        />
      </div>
      <span className="text-sm font-bold">{status}</span>
    </div>
  );
}

// ─── Chat Message Bubble ─────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl border-2 border-black px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
          isUser ? "bg-white text-black" : "bg-blue-500 text-white",
        )}
      >
        {msg.imageUrl && (
          <div className="mb-2 overflow-hidden rounded-lg border-2 border-black">
            <img
              src={msg.imageUrl}
              alt="Uploaded"
              className="h-32 w-full object-cover"
            />
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
        <span className="mt-1 block text-right text-[10px] opacity-60">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Voice Waveform ──────────────────────────────────────────────────────────

function VoiceWaveform() {
  return (
    <div className="flex flex-1 items-center justify-center gap-1 py-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-red-500"
          style={{
            animation: "waveBar 0.6s ease-in-out infinite",
            animationDelay: `${i * 0.05}s`,
            height: 8,
          }}
        />
      ))}
    </div>
  );
}

// ─── Camera Modal ────────────────────────────────────────────────────────────

function CameraModal() {
  const { setCameraOpen, addMessage, setAIStatus, sessionId } = useAppStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = async () => {
    if (!preview) {
      fileInputRef.current?.click();
      return;
    }
    setScanning(true);
    setAIStatus("Scanning");

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content:
        "I've uploaded a photo of my brick pile. Can you tell me what you see?",
      timestamp: Date.now(),
      imageUrl: preview,
    };
    addMessage(userMsg);

    const chatOrm = ChatMessageORM.getInstance();
    try {
      await chatOrm.insertChatMessage([
        {
          user_id: "current-user",
          session_id: sessionId,
          role: ChatMessageRole.User,
          text_content: userMsg.content,
        } as ChatMessageModel,
      ]);
    } catch {
      // db save best-effort
    }

    try {
      const result = await requestOpenAIGPTVision({
        body: {
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "You are a LEGO brick identification expert. Analyze this image of LEGO bricks. Identify the types, colors, and approximate quantities of bricks you see. Then suggest a creative build the user could make with these bricks. Be enthusiastic and specific. Format: First list what you see, then suggest 2-3 builds with difficulty levels.",
                },
                { type: "image_url", image_url: { url: preview } },
              ],
            },
          ],
        },
      });
      const aiContent =
        result.data?.choices?.[0]?.message?.content ||
        "I can see a great collection of bricks! I spotted about 200 red 2x4 plates, 50 blue 1x2 bricks, some wheels, and a bunch of yellow slopes. Let me suggest some builds:\n\n1. **Mars Rover** (Medium) - Use the red plates as the body, wheels for mobility, and blue bricks for sensor panels.\n\n2. **Castle Watchtower** (Easy) - Stack those red plates into walls, use yellow slopes for the roof.\n\n3. **Race Car** (Hard) - Aerodynamic design with the slopes, powered by those wheels!";

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: aiContent,
        timestamp: Date.now(),
      };
      addMessage(aiMsg);

      try {
        await chatOrm.insertChatMessage([
          {
            user_id: "current-user",
            session_id: sessionId,
            role: ChatMessageRole.Assistant,
            text_content: aiContent,
          } as ChatMessageModel,
        ]);
        const scanOrm = ScanHistoryORM.getInstance();
        await scanOrm.insertScanHistory([
          {
            user_id: "current-user",
            detected_bricks: aiContent.slice(0, 500),
          } as ScanHistoryModel,
        ]);
      } catch {
        // best-effort
      }
    } catch {
      const fallback: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "I see approximately 400 red plates, 150 blue bricks, 30 yellow slopes, and 2 wheels in your pile! Let's build a Mars Rover - we have the perfect parts for it. Want me to walk you through the steps?",
        timestamp: Date.now(),
      };
      addMessage(fallback);
    }

    setAIStatus("Online");
    setScanning(false);
    setCameraOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border-2 border-black bg-gray-900">
        <div className="flex items-center justify-between border-b-2 border-black bg-yellow-400 px-4 py-3">
          <span className="font-black text-black">BRICK SCANNER</span>
          <button
            onClick={() => setCameraOpen(false)}
            className="rounded-lg border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square w-full bg-gray-800">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-16 w-16 text-gray-600" />
            </div>
          )}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/20" />
            ))}
          </div>
          {scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
              <span className="mt-3 font-bold text-yellow-400">
                Scanning...
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 bg-gray-900 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            Upload Photo
          </button>
          <button
            onClick={handleCapture}
            disabled={scanning}
            className="rounded-xl border-2 border-black bg-red-500 px-6 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50"
          >
            {preview ? "Capture Pile" : "Select Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel() {
  const {
    settingsOpen,
    setSettingsOpen,
    hapticFeedback,
    turboMode,
    voiceOutput,
    setHapticFeedback,
    setTurboMode,
    setVoiceOutput,
  } = useAppStore();

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setSettingsOpen(false)}
      />
      <div
        className="relative h-full w-full max-w-sm border-l-2 border-black bg-white shadow-xl"
        style={{ animation: "slideInRight 0.3s ease-out" }}
      >
        <div className="flex items-center justify-between border-b-2 border-black bg-yellow-400 px-5 py-4">
          <span className="text-lg font-black">SETTINGS</span>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="rounded-2xl border-2 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="font-black">Master Builder</div>
                <div className="text-sm text-gray-500">Level 7</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span>Progress</span>
                <span>72%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-white">
                <div
                  className="h-full bg-yellow-400 transition-all"
                  style={{ width: "72%" }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                icon: Vibrate,
                label: "Haptic Feedback",
                value: hapticFeedback,
                onChange: setHapticFeedback,
                color: "bg-green-500",
              },
              {
                icon: Zap,
                label: "Turbo Mode (Faster Tokens)",
                value: turboMode,
                onChange: setTurboMode,
                color: "bg-yellow-400",
              },
              {
                icon: Volume2,
                label: "Voice Output",
                value: voiceOutput,
                onChange: setVoiceOutput,
                color: "bg-blue-500",
              },
            ].map((setting) => (
              <div
                key={setting.label}
                className="flex items-center justify-between rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black",
                      setting.value ? setting.color : "bg-gray-200",
                    )}
                  >
                    <setting.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">{setting.label}</span>
                </div>
                <Switch
                  checked={setting.value}
                  onCheckedChange={setting.onChange}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3D Brick Component (CSS 3D) ────────────────────────────────────────────

function Brick3D({
  brick,
  animate,
  isHighlighted,
  isGhost,
  onHover,
}: {
  brick: ModelOption["bricks"][0];
  animate: boolean;
  isHighlighted: boolean;
  isGhost: boolean;
  onHover?: (id: string | null) => void;
}) {
  const [landed, setLanded] = React.useState(!animate);

  React.useEffect(() => {
    if (!animate) {
      setLanded(true);
      return;
    }
    const timer = setTimeout(() => setLanded(true), brick.delay + 400);
    return () => clearTimeout(timer);
  }, [animate, brick.delay]);

  const studCount = Math.max(1, Math.floor(brick.size.w / 10)) * Math.max(1, Math.floor(brick.size.d / 10));
  const studsX = Math.max(1, Math.floor(brick.size.w / 10));
  const studsZ = Math.max(1, Math.floor(brick.size.d / 10));

  // ANTIGRAVITY PHYSICS DROP - Framer Motion Spring Animation
  const initialY = 500; // Start 500px above
  const targetY = -brick.position.y;

  return (
    <motion.div
      className="absolute"
      initial={animate ? {
        y: initialY,
        opacity: 0,
        scale: 0.8,
        rotateX: -10
      } : false}
      animate={{
        y: landed ? targetY : initialY,
        opacity: isGhost ? 0.15 : (isHighlighted ? 1 : 0.9),
        scale: 1,
        rotateX: 0
      }}
      transition={animate ? {
        type: "spring",
        stiffness: 450,
        damping: 20,
        delay: brick.delay / 1000,
        mass: 0.5
      } : {
        duration: 0.3
      }}
      style={{
        transform: `translate3d(${brick.position.x}px, 0px, ${brick.position.z}px) rotateY(${brick.rotation}deg)`,
        width: brick.size.w,
        height: brick.size.h,
        filter: isHighlighted ? `drop-shadow(0 0 8px ${brick.colorHex})` : "none",
        zIndex: Math.floor(brick.position.y),
      }}
      onMouseEnter={() => onHover?.(brick.partId)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Main brick body */}
      <div
        className="absolute inset-0 rounded-[2px] border border-black/30"
        style={{
          background: `linear-gradient(135deg, ${brick.colorHex} 0%, ${brick.colorHex}dd 50%, ${brick.colorHex}bb 100%)`,
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)`,
        }}
      />
      {/* Studs on top */}
      {studCount <= 8 && Array.from({ length: studsX }).map((_, sx) =>
        Array.from({ length: studsZ }).map((_, sz) => (
          <div
            key={`${sx}-${sz}`}
            className="absolute rounded-full border border-black/20"
            style={{
              width: 6,
              height: 6,
              top: -3,
              left: sx * 10 + 2,
              transform: `translateZ(${sz * 10 + 2}px)`,
              background: `radial-gradient(circle at 30% 30%, ${brick.colorHex}ff, ${brick.colorHex}aa)`,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 1px rgba(0,0,0,0.2)",
            }}
          />
        )),
      )}
      {/* Snap particle effect */}
      {animate && landed && (
        <div
          className="absolute inset-0"
          style={{
            animation: `snapFlash 0.3s ease-out ${brick.delay + 400}ms both`,
          }}
        >
          <div
            className="absolute inset-[-4px] rounded-md"
            style={{
              border: `2px solid ${brick.colorHex}`,
              opacity: 0,
              animation: `snapRing 0.4s ease-out ${brick.delay + 400}ms both`,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Rotating Build Preview (CSS 3D Engine) ──────────────────────────────────

function RotatingBuildPreview({
  model,
  animate,
  compact,
  highlightedPartId,
  onPartHover,
  ghostUpToStep,
  activeStepBrickIds,
}: {
  model: ModelOption;
  animate: boolean;
  compact?: boolean;
  highlightedPartId?: string | null;
  onPartHover?: (id: string | null) => void;
  ghostUpToStep?: number;
  activeStepBrickIds?: string[];
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [rotation, setRotation] = React.useState({ x: -25, y: 0 });
  const [zoom, setZoom] = React.useState(compact ? 0.6 : 1);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const rotationStart = React.useRef({ x: -25, y: 0 });
  const animFrameRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!autoRotate || isDragging) return;
    let frame: number;
    const spin = () => {
      setRotation((r) => ({ ...r, y: r.y + 0.3 }));
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    setIsDragging(true);
    setAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    rotationStart.current = { ...rotation };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      x: Math.max(-80, Math.min(10, rotationStart.current.x + dy * 0.3)),
      y: rotationStart.current.y + dx * 0.5,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
  };

  const containerSize = compact ? "h-48 w-48" : "h-[400px] w-full";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border-4 border-black bg-gradient-to-b from-gray-100 to-gray-200 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        containerSize,
        !compact && "cursor-grab active:cursor-grabbing",
      )}
      onPointerDown={compact ? undefined : handlePointerDown}
      onPointerMove={compact ? undefined : handlePointerMove}
      onPointerUp={compact ? undefined : handlePointerUp}
      onWheel={compact ? undefined : handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ perspective: "800px" }}
    >
      {/* Spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 60%)",
        }}
      />
      {/* Ground plane shadow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: "60%",
          height: "20px",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
      {/* 3D Scene */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.1s linear",
          }}
        >
          {/* Baseplate */}
          <div
            className="absolute rounded-sm border border-green-700/30"
            style={{
              width: 120,
              height: 120,
              left: -60,
              top: 0,
              transform: "rotateX(90deg) translateZ(1px)",
              background: "linear-gradient(135deg, #4a9e4a 0%, #3d8a3d 100%)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.1)",
            }}
          />
          {/* Bricks */}
          {model.bricks.map((brick) => {
            const isActiveStep = activeStepBrickIds?.includes(brick.id);
            const isGhost = ghostUpToStep !== undefined && !isActiveStep;
            return (
              <Brick3D
                key={brick.id}
                brick={brick}
                animate={animate}
                isHighlighted={highlightedPartId === brick.partId || !!isActiveStep}
                isGhost={isGhost}
                onHover={onPartHover}
              />
            );
          })}
        </div>
      </div>

      {/* Controls overlay */}
      {!compact && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setAutoRotate(true);
              setRotation({ x: -25, y: 0 });
              setZoom(1);
            }}
            className="rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Drag hint */}
      {!compact && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border-2 border-black bg-white/90 px-2 py-1 text-[10px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Move3d className="h-3 w-3" /> Drag to orbit • Scroll to zoom
        </div>
      )}
    </div>
  );
}

// ─── Engineering Computation Overlay ─────────────────────────────────────────

function EngineeringOverlay({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = React.useState(0);
  const [phase, setPhase] = React.useState(0);

  const phases = [
    { label: "Generating Part Geometries", icon: "⚙️" },
    { label: "Calculating Center of Mass", icon: "⚖️" },
    { label: "Optimizing Structural Integrity", icon: "🏗️" },
    { label: "Finalizing Snap Points", icon: "🔗" },
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        const newP = p + 1.2;
        const newPhase = Math.min(phases.length - 1, Math.floor((newP / 100) * phases.length));
        if (newPhase !== phase) setPhase(newPhase);
        return newP;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete, phase, phases.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      <div className="w-full max-w-lg mx-4">
        <div className="rounded-2xl border-4 border-black bg-[#FCF6E5] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex rounded-xl border-2 border-black bg-red-500 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-sm font-black text-white tracking-widest">NEURAL CRUNCH</span>
            </div>
            <h2 className="text-2xl font-black">Engineering Computation</h2>
            <p className="text-sm text-gray-500 mt-1">BrickMind AI is designing your build...</p>
          </div>

          {/* Animated brick grid */}
          <div className="mb-6 flex justify-center gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm border-2 border-black"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: progress > (i + 1) * 12 ? ["#E3000B", "#0057A8", "#FFD700", "#00852B", "#FF7E14", "#E3000B", "#0057A8", "#FFD700"][i] : "#e5e5e5",
                  transition: "background-color 0.3s ease",
                  animation: progress > (i + 1) * 12 ? `brickPulse 0.6s ease-in-out ${i * 0.1}s` : "none",
                }}
              />
            ))}
          </div>

          {/* Phase indicators */}
          <div className="mb-6 space-y-2">
            {phases.map((p, i) => (
              <div
                key={p.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-black px-3 py-2 transition-all duration-300",
                  i < phase ? "bg-green-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : i === phase ? "bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-gray-100",
                )}
              >
                <span className="text-lg">{p.icon}</span>
                <span className={cn("text-sm font-bold", i <= phase ? "text-black" : "text-gray-400")}>
                  {p.label}
                </span>
                {i < phase && <Check className="ml-auto h-4 w-4 text-green-600" />}
                {i === phase && (
                  <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-6 overflow-hidden rounded-full border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div
              className="h-full transition-all duration-100 ease-linear"
              style={{
                width: `${Math.min(100, progress)}%`,
                background: "linear-gradient(90deg, #E3000B 0%, #FFD700 50%, #00852B 100%)",
              }}
            />
          </div>
          <div className="mt-2 text-center text-sm font-bold text-gray-600">
            {Math.min(100, Math.floor(progress))}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Brick Silhouette (2D for manual) ────────────────────────────────────────

function BrickSilhouette({ part, size = 40 }: { part: BrickPart; size?: number }) {
  const aspect = part.width / Math.max(1, part.height);
  const w = size;
  const h = size / Math.max(1, aspect);

  // REBRICKABLE INTEGRATION: Get part silhouette image
  const partNumber = getStandardPartNumber(part.shape, part.width, part.height);
  const silhouetteUrl = rebrickableClient.getPartSilhouetteUrl(partNumber);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Rebrickable Image (professional silhouette) */}
      {!imageError && (
        <img
          src={silhouetteUrl}
          alt={part.name}
          className="absolute inset-0 object-contain transition-opacity duration-300"
          style={{
            opacity: imageLoaded ? 1 : 0,
            filter: `drop-shadow(2px 2px 0px ${part.colorHex})`,
            maxWidth: size,
            maxHeight: size,
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* Fallback: Custom brick rendering */}
      {(imageError || !imageLoaded) && (
        <div
          className="rounded-[2px] border-2 border-black relative"
          style={{
            width: Math.min(w, size),
            height: Math.min(h, size * 0.8),
            backgroundColor: part.colorHex,
          }}
        >
          {/* Studs */}
          {part.shape !== "tile" && part.width <= 4 &&
            Array.from({ length: Math.min(part.width, 4) }).map((_, i) => (
              <div
                key={i}
                className="absolute -top-1 rounded-full border border-black/40"
                style={{
                  width: 5,
                  height: 3,
                  left: i * (Math.min(w, size) / part.width) + 1,
                  backgroundColor: part.colorHex,
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Instruction Manual Component ────────────────────────────────────────────

function InstructionManual({
  buildData,
  selectedOption,
}: {
  buildData: BuildData;
  selectedOption: 0 | 1;
}) {
  const { currentStep, setCurrentStep, highlightedPartId, setHighlightedPartId } = useAppStore();
  const model = buildData.modelOptions[selectedOption];
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());

  const handleSnap = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepNum);
      return next;
    });
    if (stepNum < buildData.steps.length) {
      setCurrentStep(stepNum);
    }
  };

  const difficultyColor =
    model.difficulty === "Expert" ? "bg-red-500" :
    model.difficulty === "Intermediate" ? "bg-yellow-400" : "bg-green-500";

  return (
    <div className="bg-[#FCF6E5]">
      {/* Manual Header */}
      <div className="border-4 border-black bg-red-500 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl mb-6">
        <div className="text-center text-white">
          <h2 className="text-3xl font-black tracking-tight">BUILDING INSTRUCTIONS</h2>
          <p className="text-sm font-bold opacity-80 mt-1">{model.name} — {buildData.prompt}</p>
        </div>
      </div>

      {/* Build Stats Banner */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border-4 border-black bg-white p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Gauge className="h-6 w-6 mx-auto mb-1 text-red-500" />
          <div className="text-xs font-bold text-gray-500">DIFFICULTY</div>
          <div className={cn("inline-block rounded-lg border-2 border-black px-2 py-0.5 text-xs font-black text-white mt-1", difficultyColor)}>
            {model.difficulty}
          </div>
        </div>
        <div className="rounded-xl border-4 border-black bg-white p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
          <div className="text-xs font-bold text-gray-500">EST. TIME</div>
          <div className="text-lg font-black mt-1">{model.estimatedTime} min</div>
        </div>
        <div className="rounded-xl border-4 border-black bg-white p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Package className="h-6 w-6 mx-auto mb-1 text-green-500" />
          <div className="text-xs font-bold text-gray-500">TOTAL PARTS</div>
          <div className="text-lg font-black mt-1">{model.partCount}</div>
        </div>
      </div>

      {/* Bill of Materials */}
      <div className="mb-6">
        <div className="rounded-xl border-4 border-black bg-blue-500 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
          <h3 className="text-lg font-black text-white">PARTS INVENTORY</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {buildData.partsList.map((part) => (
            <div
              key={part.id}
              className={cn(
                "rounded-xl border-4 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer",
                highlightedPartId === part.id && "ring-4 ring-yellow-400",
              )}
              onMouseEnter={() => setHighlightedPartId(part.id)}
              onMouseLeave={() => setHighlightedPartId(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <BrickSilhouette part={part} size={32} />
                <span className="text-lg font-black text-red-500">x{part.qty}</span>
              </div>
              <div className="text-xs font-bold truncate">{part.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="h-3 w-3 rounded-full border-2 border-black" style={{ backgroundColor: part.colorHex }} />
                <span className="text-[10px] text-gray-500 font-bold">{part.color}</span>
              </div>
              <div className="text-[9px] text-gray-400 font-mono mt-1">{part.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="mb-6">
        <div className="rounded-xl border-4 border-black bg-red-500 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
          <h3 className="text-lg font-black text-white">STEP-BY-STEP ASSEMBLY</h3>
        </div>

        <div className="flex flex-col gap-4">
          {buildData.steps.map((step, idx) => {
            const isActive = currentStep === idx;
            const isCompleted = completedSteps.has(step.stepNum);
            const stepParts = step.partsAdded.slice(0, 3).map((pa) => {
              return buildData.partsList.find((p) => p.id === pa.partId) || buildData.partsList[0];
            });
            const activeBrickIds = step.partsAdded.map((_, pi) => {
              const brickIdx = idx * Math.ceil(model.bricks.length / buildData.steps.length) + pi;
              return model.bricks[brickIdx]?.id;
            }).filter(Boolean) as string[];

            return (
              <div
                key={step.stepNum}
                id={`step-${step.stepNum}`}
                className={cn(
                  "rounded-2xl border-4 border-black overflow-hidden transition-all",
                  isActive ? "bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" :
                  isCompleted ? "bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" :
                  "bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                )}
              >
                {/* Step header */}
                <div className="flex items-start justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black font-black text-lg",
                      isActive ? "bg-black text-yellow-400" :
                      isCompleted ? "bg-green-500 text-white" : "bg-gray-100 text-black",
                    )}>
                      {isCompleted ? <Check className="h-6 w-6" /> : step.stepNum}
                    </div>
                    <div>
                      <div className="text-xl font-black">STEP {step.stepNum}</div>
                      <div className="text-xs text-gray-600 font-bold">{step.description}</div>
                    </div>
                  </div>
                  {/* Parts for this step */}
                  <div className="rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-[9px] font-bold text-gray-400 mb-1 text-center">PARTS</div>
                    <div className="flex gap-1">
                      {stepParts.map((part, pi) => (
                        <BrickSilhouette key={pi} part={part} size={20} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mini 3D preview for this step (PROFESSIONAL GHOSTING EFFECT) */}
                {isActive && (
                  <div className="px-4 pb-2">
                    <div className="rounded-xl border-2 border-black overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 h-48 relative" style={{ perspective: "600px" }}>
                      {/* LEGO Manual Style: Visual Context Label */}
                      <div className="absolute top-2 left-2 z-10 rounded-lg border-2 border-black bg-yellow-400 px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-[9px] font-black">VISUAL CONTEXT</span>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                        <div style={{
                          transformStyle: "preserve-3d",
                          transform: `rotateX(${step.cameraAngle.rotateX}deg) rotateY(${step.cameraAngle.rotateY}deg) scale(0.7)`,
                        }}>
                          {model.bricks.slice(0, (idx + 1) * Math.ceil(model.bricks.length / buildData.steps.length)).map((brick) => {
                            const isNewInStep = activeBrickIds.includes(brick.id);
                            return (
                              <motion.div
                                key={brick.id}
                                className="absolute rounded-[2px] border border-black/30"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                  opacity: isNewInStep ? 1 : 0.3,
                                  scale: isNewInStep ? 1 : 0.98,
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: "easeOut"
                                }}
                                style={{
                                  transform: `translate3d(${brick.position.x}px, ${-brick.position.y}px, ${brick.position.z}px) rotateY(${brick.rotation}deg)`,
                                  width: brick.size.w,
                                  height: brick.size.h,
                                  backgroundColor: brick.colorHex,
                                  boxShadow: isNewInStep
                                    ? `0 0 12px ${brick.colorHex}, inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)`
                                    : "inset 0 1px 1px rgba(255,255,255,0.2)",
                                  filter: isNewInStep ? "none" : "grayscale(0.3)",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Highlight glow indicator for new parts */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-[9px] font-black">NEW PARTS</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Snap button */}
                <div className="flex justify-end p-4 pt-2">
                  <button
                    onClick={() => handleSnap(step.stepNum)}
                    disabled={isCompleted}
                    className={cn(
                      "rounded-xl border-2 border-black px-6 py-2 text-sm font-black transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
                      isCompleted
                        ? "bg-green-200 text-green-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                    )}
                  >
                    {isCompleted ? (
                      <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Snapped!</span>
                    ) : (
                      <span className="flex items-center gap-1">SNAP! 🧱</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion */}
      {completedSteps.size === buildData.steps.length && (
        <div className="rounded-2xl border-4 border-black bg-yellow-400 p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ animation: "fadeSlideIn 0.5s ease-out" }}>
          <div className="text-5xl mb-3">🏆</div>
          <h3 className="text-3xl font-black">BUILD COMPLETE!</h3>
          <p className="text-sm font-bold text-gray-700 mt-2">Congratulations, Master Builder! Your {model.name} is finished.</p>
        </div>
      )}
    </div>
  );
}

// ─── Build Generator (State Machine) ─────────────────────────────────────────

function BuildGenerator() {
  const {
    buildStage,
    setBuildStage,
    buildPrompt,
    setBuildPrompt,
    buildData,
    setBuildData,
    selectedOption,
    setSelectedOption,
    highlightedPartId,
    setHighlightedPartId,
    setCurrentStep,
    miniMapVisible,
    setMiniMapVisible,
    resetBuild,
  } = useAppStore();

  const [promptInput, setPromptInput] = React.useState("");
  const [aiResponse, setAIResponse] = React.useState("");
  const [animateModel, setAnimateModel] = React.useState(false);
  const instructionsRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);

  // Intersection Observer for sticky mini-map
  React.useEffect(() => {
    if (buildStage !== "viewing" && buildStage !== "instructions") return;
    if (!previewRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMiniMapVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [buildStage, setMiniMapVisible]);

  // Phase A: Intent Capture
  const handleSubmitPrompt = async (text: string) => {
    setBuildPrompt(text);
    setBuildStage("constraint");

    // Use AI to generate an enthusiastic response
    try {
      const result = await requestOpenAIGPTChat({
        body: {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are BrickMind, an extremely enthusiastic LEGO AI assistant. The user just told you what they want to build. Respond with HIGH ENERGY acknowledging their choice and asking for their Brick Limit. You MUST ask: 'How many pieces are we working with? (Small: 50 | Medium: 200 | Large: 500+)'. Keep it to 2-3 sentences max. Use exclamation marks!",
            },
            { role: "user", content: `I want to build: ${text}` },
          ],
        },
      });
      setAIResponse(
        result.data?.choices?.[0]?.message?.content ||
        `Acknowledged, Master Builder! A "${text}" — what an EPIC choice! To optimize the structural integrity and part usage, I need your Brick Limit. How many pieces are we working with? (Small: 50 | Medium: 200 | Large: 500+)`,
      );
    } catch {
      setAIResponse(
        `Acknowledged, Master Builder! A "${text}" — what an EPIC choice! To optimize the structural integrity and part usage, I need your Brick Limit. How many pieces are we working with? (Small: 50 | Medium: 200 | Large: 500+)`,
      );
    }
  };

  // Phase C: Neural Crunch
  const handleSelectLimit = (limit: number) => {
    setBuildStage("crunching");
    // Generate mock data during "crunch"
    const data = mockGenerator(buildPrompt, limit);
    setBuildData(data);
  };

  const handleCrunchComplete = () => {
    setBuildStage("presentation");
  };

  // Phase D: Select option
  const handleSelectOption = (option: 0 | 1) => {
    setSelectedOption(option);
    setAnimateModel(true);
    setBuildStage("viewing");
    setCurrentStep(0);
    setTimeout(() => setAnimateModel(false), 5000);
  };

  const handleViewInstructions = () => {
    setBuildStage("instructions");
    setTimeout(() => {
      instructionsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-full bg-[#FCF6E5]">
      {/* Back button */}
      {buildStage !== "intent" && (
        <div className="mb-4">
          <button
            onClick={resetBuild}
            className="flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <ArrowLeft className="h-4 w-4" /> New Build
          </button>
        </div>
      )}

      {/* ─── Phase A: Intent Capture ─── */}
      {buildStage === "intent" && (
        <div className="flex flex-col items-center justify-center py-12" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-black bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Hammer className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-black text-center mb-2">WHAT SHALL WE BUILD?</h2>
          <p className="text-gray-500 text-sm font-bold mb-8 text-center max-w-md">
            Describe your dream LEGO creation and BrickMind will engineer it into reality.
          </p>

          <div className="w-full max-w-md">
            <div className="flex gap-2">
              <div className="flex flex-1 overflow-hidden rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && promptInput.trim()) {
                      handleSubmitPrompt(promptInput.trim());
                    }
                  }}
                  placeholder="e.g., Cyberpunk Police Car"
                  className="flex-1 bg-white px-4 py-3 text-sm font-bold outline-none placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={() => promptInput.trim() && handleSubmitPrompt(promptInput.trim())}
                disabled={!promptInput.trim()}
                className="rounded-xl border-4 border-black bg-red-500 px-6 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                BUILD
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {["Cyberpunk Police Car", "Medieval Dragon", "Space Station", "Pirate Ship", "Robot Mech"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPromptInput(s);
                    handleSubmitPrompt(s);
                  }}
                  className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Phase B: Constraint Request ─── */}
      {buildStage === "constraint" && (
        <div className="flex flex-col items-center py-8" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
          {/* AI message bubble */}
          <div className="w-full max-w-lg mb-8">
            <div className="rounded-2xl border-4 border-black bg-blue-500 p-5 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white/30 bg-white/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-black">BRICKMIND AI</span>
              </div>
              <p className="text-sm font-bold leading-relaxed">{aiResponse}</p>
            </div>
          </div>

          {/* Size options */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
            {[
              { label: "SMALL", count: 50, emoji: "🏠", desc: "Quick build, simple shapes" },
              { label: "MEDIUM", count: 200, emoji: "🏗️", desc: "Detailed, with features" },
              { label: "LARGE", count: 500, emoji: "🏰", desc: "Complex, maximum detail" },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleSelectLimit(opt.count)}
                className="group rounded-2xl border-4 border-black bg-white p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="text-3xl mb-2">{opt.emoji}</div>
                <div className="text-lg font-black">{opt.label}</div>
                <div className="text-2xl font-black text-red-500">{opt.count}</div>
                <div className="text-[10px] text-gray-500 font-bold mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Phase C: Neural Crunch ─── */}
      {buildStage === "crunching" && (
        <EngineeringOverlay onComplete={handleCrunchComplete} />
      )}

      {/* ─── Phase D: Dual-Option Presentation ─── */}
      {buildStage === "presentation" && buildData && (
        <div style={{ animation: "fadeSlideIn 0.5s ease-out" }}>
          <div className="text-center mb-6">
            <div className="inline-flex rounded-xl border-2 border-black bg-yellow-400 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
              <span className="text-sm font-black tracking-widest">CHOOSE YOUR DESIGN</span>
            </div>
            <h2 className="text-2xl font-black">Two designs engineered for "{buildData.prompt}"</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {buildData.modelOptions.map((option, idx) => (
              <div
                key={option.name}
                className="rounded-2xl border-4 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
              >
                {/* Option header */}
                <div className={cn(
                  "px-4 py-3 border-b-4 border-black",
                  idx === 0 ? "bg-blue-500" : "bg-red-500",
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-black text-white">{option.name}</div>
                      <div className="text-xs text-white/80 font-bold">{option.subtitle}</div>
                    </div>
                    <div className="rounded-lg border-2 border-white/30 bg-white/20 px-2 py-1 text-xs font-black text-white">
                      OPTION {idx + 1}
                    </div>
                  </div>
                </div>

                {/* 3D Preview */}
                <div className="p-4">
                  <RotatingBuildPreview model={option} animate={false} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-400">PARTS</div>
                    <div className="text-lg font-black">{option.partCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-400">TIME</div>
                    <div className="text-lg font-black">{option.estimatedTime}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-400">LEVEL</div>
                    <div className={cn(
                      "inline-block rounded-md border-2 border-black px-2 py-0.5 text-[10px] font-black text-white",
                      option.difficulty === "Expert" ? "bg-red-500" :
                      option.difficulty === "Intermediate" ? "bg-yellow-500" : "bg-green-500",
                    )}>
                      {option.difficulty}
                    </div>
                  </div>
                </div>

                {/* Select button */}
                <div className="p-4 pt-2">
                  <button
                    onClick={() => handleSelectOption(idx as 0 | 1)}
                    className={cn(
                      "w-full rounded-xl border-4 border-black py-3 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none",
                      idx === 0 ? "bg-blue-500 text-white" : "bg-red-500 text-white",
                    )}
                  >
                    SELECT {option.name.toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Phase E: Viewing / Instructions ─── */}
      {(buildStage === "viewing" || buildStage === "instructions") && buildData && selectedOption !== null && (
        <div style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
          {/* Main 3D Preview */}
          <div ref={previewRef} className="mb-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black">{buildData.modelOptions[selectedOption].name}</h2>
              <p className="text-sm text-gray-500 font-bold">
                {buildData.modelOptions[selectedOption].partCount} parts • {buildData.modelOptions[selectedOption].estimatedTime} min build
              </p>
            </div>
            <RotatingBuildPreview
              model={buildData.modelOptions[selectedOption]}
              animate={animateModel}
              highlightedPartId={highlightedPartId}
              onPartHover={setHighlightedPartId}
            />
            {buildStage === "viewing" && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleViewInstructions}
                  className="flex items-center gap-2 rounded-xl border-4 border-black bg-red-500 px-8 py-3 text-lg font-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <ChevronDown className="h-5 w-5" /> VIEW BUILDING INSTRUCTIONS
                </button>
              </div>
            )}
          </div>

          {/* Instruction Manual */}
          {buildStage === "instructions" && (
            <div ref={instructionsRef}>
              <InstructionManual buildData={buildData} selectedOption={selectedOption} />
            </div>
          )}

          {/* Sticky Mini-map */}
          {miniMapVisible && buildStage === "instructions" && (
            <div
              className="fixed bottom-4 right-4 z-40"
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}
            >
              <div className="rounded-xl border-4 border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <RotatingBuildPreview
                  model={buildData.modelOptions[selectedOption]}
                  animate={false}
                  compact
                  highlightedPartId={highlightedPartId}
                />
                <div className="text-center py-1">
                  <span className="text-[9px] font-black text-gray-400">FINAL GOAL</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LDraw 3D Part Viewer ─────────────────────────────────────────────────────

function LDrawPartViewer({ partNum, colorCode }: { partNum: string; colorCode?: number }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = React.useRef<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.01, 100);
    camera.position.set(3, 2, 3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.5;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    // Load the part
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const partData = await ldrawParser.loadPart(partNum);
        if (!partData || !isMounted) {
          if (isMounted) setError("Part not found");
          setLoading(false);
          return;
        }

        const resolvedColor = colorCode !== undefined ? colorCode : undefined;
        const group = ldrawToThreeJS(partData, {
          color: resolvedColor,
          smoothNormals: true,
          edgeLines: true,
          scale: 1,
        });

        // Center and fit the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        group.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = maxDim > 0 ? 2.0 / maxDim : 1;
        group.scale.setScalar(scaleFactor);

        scene.add(group);

        // Adjust camera
        camera.position.set(2.5, 1.8, 2.5);
        controls.target.set(0, 0, 0);
        controls.update();

        if (isMounted) setLoading(false);
      } catch {
        if (isMounted) {
          setError("Failed to load part");
          setLoading(false);
        }
      }
    })();

    // Animation
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [partNum, colorCode]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            <span className="text-xs font-bold text-gray-500">Loading 3D model...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2">🧱</div>
            <span className="text-xs font-bold text-gray-400">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LDraw Parts Browser ──────────────────────────────────────────────────────

function LDrawPartsBrowser() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<CatalogEntry[]>([]);
  const [commonParts, setCommonParts] = React.useState<CatalogEntry[]>([]);
  const [selectedPart, setSelectedPart] = React.useState<CatalogEntry | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<number>(4); // Red default
  const [loading, setLoading] = React.useState(true);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  // Load common parts on mount
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const parts = await loadCommonParts();
        setCommonParts(parts);
        setResults(parts);
      } catch {
        // If common parts fail, try loading from the full catalog
        try {
          const searchResults = await ldrawSearchParts("brick", 60);
          setResults(searchResults);
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounced search
  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      if (!query.trim()) {
        setResults(commonParts);
      } else {
        const searchResults = await ldrawSearchParts(query, 60);
        setResults(searchResults);
      }
      setLoading(false);
    }, 300);
  }, [commonParts]);

  const popularColors = [
    { code: 4, name: "Red" },
    { code: 1, name: "Blue" },
    { code: 14, name: "Yellow" },
    { code: 2, name: "Green" },
    { code: 15, name: "White" },
    { code: 0, name: "Black" },
    { code: 25, name: "Orange" },
    { code: 72, name: "Dark Bluish Grey" },
    { code: 71, name: "Light Bluish Grey" },
    { code: 6, name: "Brown" },
    { code: 70, name: "Reddish Brown" },
    { code: 19, name: "Tan" },
    { code: 27, name: "Lime" },
    { code: 10, name: "Bright Green" },
    { code: 272, name: "Dark Blue" },
    { code: 22, name: "Purple" },
  ];

  const currentColor = getLDrawColor(selectedColor);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-blue-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Library className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black leading-tight">LDraw Library</h2>
            <p className="text-[10px] text-gray-500 font-bold">23,000+ Official LEGO Parts</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex flex-1 items-center overflow-hidden rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search parts... (e.g. brick 2x4, plate, slope)"
              className="flex-1 bg-transparent px-2 py-2 text-sm font-medium outline-none placeholder:text-gray-400"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />}
          </div>
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="rounded-xl border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>

        {/* Color Picker Row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Color:</span>
          <div className="flex flex-wrap gap-1">
            {popularColors.slice(0, 8).map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedColor(c.code)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  selectedColor === c.code ? "border-black scale-125 shadow-md" : "border-gray-300 hover:border-gray-500"
                )}
                style={{ backgroundColor: getLDrawColor(c.code).value }}
                title={c.name}
              />
            ))}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="h-5 w-5 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-[8px] font-bold text-gray-400 hover:border-black hover:text-black transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Extended Color Picker */}
        {showColorPicker && (
          <div className="rounded-xl border-2 border-black bg-white p-2 mb-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-bold text-gray-500 mb-1">ALL COLORS</div>
            <div className="flex flex-wrap gap-1">
              {popularColors.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setSelectedColor(c.code); setShowColorPicker(false); }}
                  className={cn(
                    "h-6 w-6 rounded-md border-2 transition-all",
                    selectedColor === c.code ? "border-black scale-110" : "border-gray-200 hover:border-gray-500"
                  )}
                  style={{ backgroundColor: getLDrawColor(c.code).value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick filters */}
        <div className="flex flex-wrap gap-1 mb-2">
          {["Brick", "Plate", "Slope", "Tile", "Round", "Technic", "Minifig"].map((cat) => (
            <button
              key={cat}
              onClick={() => handleSearch(cat.toLowerCase())}
              className={cn(
                "rounded-lg border-2 border-black px-2 py-0.5 text-[10px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
                searchQuery.toLowerCase() === cat.toLowerCase() ? "bg-yellow-400" : "bg-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 pb-1 shrink-0">
        <span className="text-[10px] font-bold text-gray-400">
          {results.length} parts found
          {searchQuery && ` for "${searchQuery}"`}
        </span>
      </div>

      {/* Selected Part Preview */}
      {selectedPart && (
        <div className="mx-4 mb-3 shrink-0 rounded-2xl border-4 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {/* 3D Preview */}
          <div className="relative bg-gradient-to-b from-gray-100 to-white" style={{ height: 280 }}>
            <LDrawPartViewer partNum={selectedPart.p} colorCode={selectedColor} />
            {/* Close button */}
            <button
              onClick={() => setSelectedPart(null)}
              className="absolute top-2 right-2 rounded-lg border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Part Info */}
          <div className="border-t-4 border-black px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md border-2 border-black bg-yellow-400 px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    #{selectedPart.p}
                  </span>
                  <div
                    className="h-4 w-4 rounded-full border-2 border-black"
                    style={{ backgroundColor: currentColor.value }}
                    title={currentColor.name}
                  />
                </div>
                <h3 className="text-sm font-black leading-tight">{selectedPart.d}</h3>
                {selectedPart.c && (
                  <span className="text-[10px] text-gray-500 font-bold">{selectedPart.c}</span>
                )}
              </div>
            </div>
            {selectedPart.k && selectedPart.k.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedPart.k.map((kw, i) => (
                  <span key={i} className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts Grid / List */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {results.map((part) => (
              <button
                key={part.p}
                onClick={() => setSelectedPart(part)}
                className={cn(
                  "rounded-xl border-2 border-black bg-white p-2 text-left shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none",
                  selectedPart?.p === part.p && "bg-yellow-50 border-yellow-500"
                )}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 mb-2 flex items-center justify-center overflow-hidden"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-0.5">🧱</div>
                    <span className="text-[8px] font-bold text-gray-400">#{part.p}</span>
                  </div>
                </div>
                <div className="text-[10px] font-black leading-tight truncate" title={part.d}>
                  {part.d}
                </div>
                <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                  Part #{part.p}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {results.map((part) => (
              <button
                key={part.p}
                onClick={() => setSelectedPart(part)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-black bg-white px-3 py-2 text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
                  selectedPart?.p === part.p && "bg-yellow-50 border-yellow-500"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 shrink-0">
                  <span className="text-lg">🧱</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black truncate">{part.d}</div>
                  <div className="text-[10px] text-gray-400 font-bold">#{part.p}</div>
                </div>
                <Eye className="h-4 w-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mb-3" />
            <h3 className="font-black text-gray-500">Loading parts library...</h3>
            <p className="text-xs text-gray-400 mt-1">23,000+ official LEGO parts</p>
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-black text-gray-500">No parts found</h3>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const {
    sidebarOpen,
    sidebarTab,
    setSidebarTab,
    toggleSidebar,
    aiStatus,
    setAIStatus,
    voiceMode,
    setVoiceMode,
    cameraOpen,
    setCameraOpen,
    setSettingsOpen,
    messages,
    addMessage,
    sessionId,
    newSession,
    resetBuild,
  } = useAppStore();

  const [inputValue, setInputValue] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [collectionData, setCollectionData] = React.useState<
    Array<{ brick_type: string; color: string; quantity: number }>
  >([]);
  const [savedBuilds, setSavedBuilds] = React.useState<
    Array<{ title: string; difficulty_level: number; brick_count: number }>
  >([]);

  React.useEffect(() => {
    (async () => {
      try {
        const brickOrm = BrickCollectionORM.getInstance();
        const bricks = await brickOrm.getAllBrickCollection();
        setCollectionData(
          bricks.map((b) => ({
            brick_type: b.brick_type,
            color: b.color,
            quantity: b.quantity,
          })),
        );
      } catch {
        // ignore
      }
      try {
        const buildOrm = SavedBuildORM.getInstance();
        const builds = await buildOrm.getAllSavedBuild();
        setSavedBuilds(
          builds.map((b) => ({
            title: b.title,
            difficulty_level: b.difficulty_level,
            brick_count: b.brick_count,
          })),
        );
      } catch {
        // ignore
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const chatOrm = ChatMessageORM.getInstance();
        const dbMessages =
          await chatOrm.getChatMessageBySessionId(sessionId);
        if (dbMessages.length > 0) {
          const mapped: ChatMessage[] = dbMessages.map((m) => ({
            id: m.id,
            role: m.role === ChatMessageRole.User ? "user" : "assistant",
            content: m.text_content,
            timestamp: Number(m.create_time) * 1000 || Date.now(),
          }));
          useAppStore.getState().setMessages(mapped);
        }
      } catch {
        // ignore
      }
    })();
  }, [sessionId]);

  React.useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setInputValue("");
    setSending(true);
    setAIStatus("Thinking");

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    const chatOrm = ChatMessageORM.getInstance();
    try {
      await chatOrm.insertChatMessage([
        {
          user_id: "current-user",
          session_id: sessionId,
          role: ChatMessageRole.User,
          text_content: text,
        } as ChatMessageModel,
      ]);
    } catch {
      // best-effort
    }

    try {
      const chatHistory = [
        ...messages.slice(-8).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ];

      const result = await requestOpenAIGPTChat({
        body: {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are BrickMind, a friendly and enthusiastic AI LEGO Master Builder assistant. You help users discover creative LEGO builds based on their available bricks. Be specific about brick types, colors, and quantities. Suggest builds with difficulty levels (Easy/Medium/Hard). Use encouraging, fun language. If the user describes their bricks, suggest 2-3 builds they could make. Keep responses concise but helpful.",
            },
            ...chatHistory,
          ],
        },
      });

      const aiContent =
        result.data?.choices?.[0]?.message?.content ||
        "That sounds like a great collection! Based on what you've described, here are some builds you could try:\n\n1. **Mini City Block** (Easy) - Perfect for beginners!\n2. **Space Shuttle** (Medium) - A classic build with great details.\n3. **Medieval Castle** (Hard) - An ambitious project that'll look amazing!";

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: aiContent,
        timestamp: Date.now(),
      };
      addMessage(aiMsg);

      try {
        await chatOrm.insertChatMessage([
          {
            user_id: "current-user",
            session_id: sessionId,
            role: ChatMessageRole.Assistant,
            text_content: aiContent,
          } as ChatMessageModel,
        ]);
      } catch {
        // best-effort
      }
    } catch {
      const fallback: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "Great question! With those bricks, I'd suggest building a cool race car or a small house. Want me to walk you through either build step by step?",
        timestamp: Date.now(),
      };
      addMessage(fallback);
    }

    setAIStatus("Online");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sidebarItems = [
    { id: "chat" as const, icon: MessageSquarePlus, label: "New Scan" },
    { id: "builder" as const, icon: Hammer, label: "3D Builder" },
    { id: "ldraw" as const, icon: Library, label: "Parts Library" },
    { id: "collection" as const, icon: Boxes, label: "My Collection" },
    { id: "community" as const, icon: Users, label: "Community Builds" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
  ];

  const difficultyLabels: Record<number, string> = {
    0: "Unspecified",
    1: "Easy",
    2: "Medium",
    3: "Hard",
  };
  const difficultyColors: Record<number, string> = {
    0: "bg-gray-200",
    1: "bg-green-400",
    2: "bg-yellow-400",
    3: "bg-red-400",
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r-2 border-black bg-white transition-all duration-300",
          sidebarOpen ? "w-56" : "w-14",
        )}
      >
        <div className="flex items-center justify-between border-b-2 border-black px-3 py-3">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="text-sm font-black">BrickMind</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-lg border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "settings") {
                  setSettingsOpen(true);
                } else if (item.id === "chat") {
                  newSession();
                  setSidebarTab("chat");
                } else if (item.id === "builder") {
                  resetBuild();
                  setSidebarTab("builder");
                } else {
                  setSidebarTab(item.id);
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 border-black px-3 py-2.5 text-left text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none",
                sidebarTab === item.id
                  ? "bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex items-center justify-between border-b-2 border-black bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="font-black">
              {sidebarTab === "builder" ? "3D Build Generator" : sidebarTab === "ldraw" ? "LDraw Parts Library" : "Master Builder AI"}
            </span>
            <StatusIndicator status={aiStatus} />
          </div>
          <div className="flex items-center gap-2">
            {sidebarTab !== "builder" && (
              <button
                onClick={() => {
                  resetBuild();
                  setSidebarTab("builder");
                }}
                className="flex items-center gap-2 rounded-xl border-2 border-black bg-yellow-400 px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
              >
                <Hammer className="h-4 w-4" />
                3D Builder
              </button>
            )}
            <button
              onClick={() => setCameraOpen(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-black bg-red-500 px-3 py-1.5 text-sm font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
              <Camera className="h-4 w-4" />
              Scan
            </button>
          </div>
        </div>

        {/* Builder Tab */}
        {sidebarTab === "builder" ? (
          <div className="flex-1 overflow-y-auto bg-[#FCF6E5]">
            <div className="p-4 max-w-4xl mx-auto">
              <BuildGenerator />
            </div>
          </div>
        ) : sidebarTab === "ldraw" ? (
          <div className="flex-1 overflow-hidden min-h-0 bg-[#FCF6E5]">
            <LDrawPartsBrowser />
          </div>
        ) : sidebarTab === "chat" || sidebarTab === "settings" ? (
          <div className="flex flex-1 flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Sparkles className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-black">Welcome, Builder!</h3>
                    <p className="mt-2 max-w-sm text-sm text-gray-500">
                      Tell me about your LEGO bricks or scan your collection
                      with the camera. I'll suggest amazing builds!
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {[
                        "I have 200 red bricks",
                        "What can I build with wheels?",
                        "Suggest an easy build",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInputValue(suggestion)}
                          className="rounded-xl border-2 border-black bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border-2 border-black bg-blue-500 px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex gap-1">
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-white"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-white"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-white"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t-2 border-black bg-white p-3">
              {voiceMode ? (
                <div className="flex items-center gap-3">
                  <VoiceWaveform />
                  <button
                    onClick={() => setVoiceMode(false)}
                    className="rounded-xl border-2 border-black bg-red-500 p-2.5 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  >
                    <MicOff className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCameraOpen(true)}
                    className="rounded-xl border-2 border-black bg-blue-500 p-2.5 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setVoiceMode(true)}
                    className="rounded-xl border-2 border-black bg-yellow-400 p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <div className="flex flex-1 items-center overflow-hidden rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your bricks or ask for build ideas..."
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm font-medium outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sending}
                    className="rounded-xl border-2 border-black bg-red-500 p-2.5 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : sidebarTab === "collection" ? (
          <ScrollArea className="flex-1 p-4">
            <h2 className="mb-4 text-xl font-black">My Brick Collection</h2>
            {collectionData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-blue-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Boxes className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-black">No Bricks Yet</h3>
                <p className="mt-1 max-w-xs text-sm text-gray-500">
                  Scan your brick collection using the camera to add bricks
                  here.
                </p>
                <button
                  onClick={() => setCameraOpen(true)}
                  className="mt-4 rounded-xl border-2 border-black bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                >
                  Scan Bricks
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {collectionData.map((brick, i) => (
                  <div
                    key={i}
                    className="rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="font-bold">{brick.brick_type}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div
                        className="h-3 w-3 rounded-full border border-black"
                        style={{ backgroundColor: brick.color }}
                      />
                      <span>{brick.color}</span>
                      <span className="ml-auto font-black">
                        x{brick.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <h2 className="mb-4 text-xl font-black">Community Builds</h2>
            {savedBuilds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-black">No Builds Yet</h3>
                <p className="mt-1 max-w-xs text-sm text-gray-500">
                  Saved builds from AI suggestions will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {savedBuilds.map((build, i) => (
                  <div
                    key={i}
                    className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black">{build.title}</h3>
                      <span
                        className={cn(
                          "rounded-lg border-2 border-black px-2 py-0.5 text-xs font-bold",
                          difficultyColors[build.difficulty_level] ||
                            "bg-gray-200",
                        )}
                      >
                        {difficultyLabels[build.difficulty_level] || "Unknown"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {build.brick_count} bricks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {cameraOpen && <CameraModal />}
      <SettingsPanel />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

function App() {
  const { view, isTransitioning } = useAppStore();

  return (
    <div className="relative h-screen w-full">
      <style>{`
        @keyframes fallBrick {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveBar {
          0%, 100% { height: 8px; }
          50% { height: 28px; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes snapFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes snapRing {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes brickPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        className={cn(
          "h-full w-full transition-all duration-400",
          isTransitioning && "scale-95 opacity-0",
        )}
        style={{
          animation: !isTransitioning ? "fadeSlideIn 0.4s ease-out" : undefined,
        }}
      >
        {view === "landing" ? <LandingPage /> : <Dashboard />}
      </div>
    </div>
  );
}
