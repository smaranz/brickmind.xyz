/**
 * BrickMind Master Architectural Engine
 * "NO-ERROR" 3D LEGO Builder with LDU Precision
 *
 * MATHEMATICAL FOUNDATION: LDraw Unit (LDU) System
 * - 1 LDU = 0.4mm
 * - Standard 1x1 brick: 20×20×24 LDU
 * - Plate height: 8 LDU
 * - Stud pitch: 20 LDU
 */

import * as THREE from 'three';
import type { BrickPart, BuildData, ModelOption, BuildStep } from '@/hooks/use-app-store';
import { getLDrawColor } from '@/lib/ldraw-parser';

// ═══════════════════════════════════════════════════════════════════════════
// I. MATHEMATICAL CONSTANTS (LDU GRID SYSTEM)
// ═══════════════════════════════════════════════════════════════════════════

export const LDU = {
  TO_MM: 0.4,
  BRICK_UNIT: 20,      // 1 stud width = 20 LDU
  BRICK_HEIGHT: 24,    // Standard brick height = 24 LDU
  PLATE_HEIGHT: 8,     // Plate height = 8 LDU (1/3 brick)
  STUD_HEIGHT: 4,      // Stud protrusion = 4 LDU
  GRID_SNAP_XZ: 20,    // Horizontal grid snap = 20 LDU
  GRID_SNAP_Y: 8,      // Vertical grid snap = 8 LDU
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// II. BRICK DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════

export interface LDUBrick {
  id: string;
  partId: string;
  type: BrickPart['shape'];
  color: string;
  colorHex: string;
  position: { x: number; y: number; z: number }; // In LDU
  size: { w: number; h: number; d: number };      // In LDU
  rotation: 0 | 90 | 180 | 270;                   // Only 90° increments
  studsTop: Array<{ x: number; z: number }>;      // Stud positions in local space
  connectsBelow: Array<{ x: number; z: number }>; // Connection points below
  boundingBox?: THREE.Box3;
}

export interface PhysicsValidationResult {
  status: 'legal' | 'collision' | 'floating' | 'unstable';
  errors: string[];
  warnings: string[];
}

interface KimiPartPayload {
  partId: string;
  colorCode: number;
  position: { x: number; y: number; z: number };
  rotation?: { x?: number; y?: number; z?: number };
  step?: number;
}

interface KimiBuildGuideStepPayload {
  step: number;
  yLevel?: number;
  title?: string;
  description?: string;
}

interface KimiModelPayload {
  modelName?: string;
  gridSystem?: string;
  parts?: KimiPartPayload[];
  meta?: {
    totalParts?: number;
    estimatedBuildTime?: string;
  };
  buildGuide?: {
    inventory?: Array<{ partId: string; colorCode: number; qty: number }>;
    steps?: KimiBuildGuideStepPayload[];
  };
}

interface PartSpec {
  name: string;
  shape: BrickPart['shape'];
  widthStuds: number;
  depthStuds: number;
  heightLdu: number;
}

interface SanitizedGeneratedPart {
  id: string;
  partId: string;
  inventoryId: string;
  colorCode: number;
  colorName: string;
  colorHex: string;
  shape: BrickPart['shape'];
  position: { x: number; y: number; z: number };
  size: { w: number; h: number; d: number };
  rotationY: 0 | 90 | 180 | 270;
  step: number;
}

const PART_SPECS: Record<string, PartSpec> = {
  '3001': { name: 'Brick 2x4', shape: 'brick', widthStuds: 4, depthStuds: 2, heightLdu: 24 },
  '3003': { name: 'Brick 2x2', shape: 'brick', widthStuds: 2, depthStuds: 2, heightLdu: 24 },
  '3004': { name: 'Brick 1x2', shape: 'brick', widthStuds: 2, depthStuds: 1, heightLdu: 24 },
  '3005': { name: 'Brick 1x1', shape: 'brick', widthStuds: 1, depthStuds: 1, heightLdu: 24 },
  '3010': { name: 'Brick 1x4', shape: 'brick', widthStuds: 4, depthStuds: 1, heightLdu: 24 },
  '3020': { name: 'Plate 2x4', shape: 'plate', widthStuds: 4, depthStuds: 2, heightLdu: 24 },
  '3022': { name: 'Plate 2x2', shape: 'plate', widthStuds: 2, depthStuds: 2, heightLdu: 24 },
  '3023': { name: 'Plate 1x2', shape: 'plate', widthStuds: 2, depthStuds: 1, heightLdu: 24 },
  '3024': { name: 'Plate 1x1', shape: 'plate', widthStuds: 1, depthStuds: 1, heightLdu: 24 },
  '3710': { name: 'Plate 1x4', shape: 'plate', widthStuds: 4, depthStuds: 1, heightLdu: 24 },
  '54200': { name: 'Slope 30 1x1x2/3', shape: 'slope', widthStuds: 1, depthStuds: 1, heightLdu: 24 },
  '6000': { name: 'Wheel 18 x 14', shape: 'round', widthStuds: 2, depthStuds: 2, heightLdu: 24 },
};

const DEFAULT_PART_ID = '3001';

// ═══════════════════════════════════════════════════════════════════════════
// III. THE "CRITIC" AGENT - PHYSICS VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class BrickPhysicsValidator {
  private bricks: LDUBrick[] = [];

  /**
   * Validate entire build for physics legality
   */
  validatePhysics(bricks: LDUBrick[]): PhysicsValidationResult {
    this.bricks = bricks;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Test 1: Collision detection using Box3 bounding boxes
    const collisions = this.detectCollisions();
    if (collisions.length > 0) {
      errors.push(...collisions.map(c => `Collision between ${c.brick1} and ${c.brick2}`));
      return { status: 'collision', errors, warnings };
    }

    // Test 2: Connectivity check - no floating bricks
    const floatingBricks = this.detectFloatingBricks();
    if (floatingBricks.length > 0) {
      errors.push(...floatingBricks.map(id => `Brick ${id} is floating (no connection below)`));
      return { status: 'floating', errors, warnings };
    }

    // Test 3: Structural stability check
    const unstableBricks = this.detectUnstableBricks();
    if (unstableBricks.length > 0) {
      warnings.push(...unstableBricks.map(id => `Brick ${id} may be unstable`));
    }

    return {
      status: 'legal',
      errors,
      warnings
    };
  }

  /**
   * Collision detection using Three.js Box3 intersections
   */
  private detectCollisions(): Array<{ brick1: string; brick2: string }> {
    const collisions: Array<{ brick1: string; brick2: string }> = [];

    // Create bounding boxes for all bricks
    this.bricks.forEach(brick => {
      const min = new THREE.Vector3(
        brick.position.x - brick.size.w / 2,
        brick.position.y,
        brick.position.z - brick.size.d / 2
      );
      const max = new THREE.Vector3(
        brick.position.x + brick.size.w / 2,
        brick.position.y + brick.size.h,
        brick.position.z + brick.size.d / 2
      );
      brick.boundingBox = new THREE.Box3(min, max);
    });

    // Test all pairs for intersection
    for (let i = 0; i < this.bricks.length; i++) {
      for (let j = i + 1; j < this.bricks.length; j++) {
        const boxA = this.bricks[i].boundingBox;
        const boxB = this.bricks[j].boundingBox;

        if (boxA && boxB && boxA.intersectsBox(boxB)) {
          collisions.push({
            brick1: this.bricks[i].id,
            brick2: this.bricks[j].id
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Check for floating bricks (no connection below except baseplate layer)
   */
  private detectFloatingBricks(): string[] {
    const floating: string[] = [];
    const BASEPLATE_LAYER_Y = 0;

    for (const brick of this.bricks) {
      // Skip baseplate layer
      if (brick.position.y <= BASEPLATE_LAYER_Y + LDU.GRID_SNAP_Y) continue;

      // Check if this brick has connection points with any brick below
      let hasConnection = false;

      for (const connPoint of brick.connectsBelow) {
        const worldConnPoint = {
          x: brick.position.x + connPoint.x,
          z: brick.position.z + connPoint.z,
          y: brick.position.y
        };

        // Look for a brick below with studs at this position
        for (const otherBrick of this.bricks) {
          if (otherBrick.id === brick.id) continue;
          if (otherBrick.position.y >= brick.position.y) continue;

          // Check if other brick's top studs align with our connection points
          const expectedY = otherBrick.position.y + otherBrick.size.h;
          const tolerance = 2; // 2 LDU tolerance

          if (Math.abs(expectedY - worldConnPoint.y) > tolerance) continue;

          for (const stud of otherBrick.studsTop) {
            const studWorldX = otherBrick.position.x + stud.x;
            const studWorldZ = otherBrick.position.z + stud.z;
            const tolerance = 2;

            if (
              Math.abs(studWorldX - worldConnPoint.x) < tolerance &&
              Math.abs(studWorldZ - worldConnPoint.z) < tolerance
            ) {
              hasConnection = true;
              break;
            }
          }
          if (hasConnection) break;
        }
        if (hasConnection) break;
      }

      if (!hasConnection) {
        floating.push(brick.id);
      }
    }

    return floating;
  }

  /**
   * Check for structurally unstable bricks (e.g., overhangs without support)
   */
  private detectUnstableBricks(): string[] {
    const unstable: string[] = [];

    for (const brick of this.bricks) {
      // Skip baseplate
      if (brick.position.y <= LDU.GRID_SNAP_Y) continue;

      // Count support percentage
      const supportRatio = this.calculateSupportRatio(brick);

      // If less than 25% supported, mark as unstable
      if (supportRatio < 0.25) {
        unstable.push(brick.id);
      }
    }

    return unstable;
  }

  /**
   * Calculate what percentage of brick's bottom is supported
   */
  private calculateSupportRatio(brick: LDUBrick): number {
    const totalConnPoints = brick.connectsBelow.length;
    if (totalConnPoints === 0) return 0;

    let supportedPoints = 0;

    for (const connPoint of brick.connectsBelow) {
      const worldConnPoint = {
        x: brick.position.x + connPoint.x,
        z: brick.position.z + connPoint.z,
        y: brick.position.y
      };

      // Look for supporting stud
      for (const otherBrick of this.bricks) {
        if (otherBrick.id === brick.id) continue;
        if (otherBrick.position.y >= brick.position.y) continue;

        const expectedY = otherBrick.position.y + otherBrick.size.h;
        if (Math.abs(expectedY - worldConnPoint.y) > 2) continue;

        for (const stud of otherBrick.studsTop) {
          const studWorldX = otherBrick.position.x + stud.x;
          const studWorldZ = otherBrick.position.z + stud.z;

          if (
            Math.abs(studWorldX - worldConnPoint.x) < 2 &&
            Math.abs(studWorldZ - worldConnPoint.z) < 2
          ) {
            supportedPoints++;
            break;
          }
        }
      }
    }

    return supportedPoints / totalConnPoints;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IV. BRICK GEOMETRY GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export class BrickGeometryEngine {
  /**
   * Generate stud positions for a brick based on width/depth in studs
   */
  static generateStudPositions(widthStuds: number, depthStuds: number): Array<{ x: number; z: number }> {
    const studs: Array<{ x: number; z: number }> = [];
    const studSpacing = LDU.BRICK_UNIT;

    for (let x = 0; x < widthStuds; x++) {
      for (let z = 0; z < depthStuds; z++) {
        studs.push({
          x: (x - (widthStuds - 1) / 2) * studSpacing,
          z: (z - (depthStuds - 1) / 2) * studSpacing
        });
      }
    }

    return studs;
  }

  /**
   * Generate connection points below (inverse of studs on top)
   */
  static generateConnectionPoints(widthStuds: number, depthStuds: number): Array<{ x: number; z: number }> {
    return this.generateStudPositions(widthStuds, depthStuds);
  }

  /**
   * Create a standard LEGO brick with LDU precision
   */
  static createStandardBrick(
    widthStuds: number,
    depthStuds: number,
    heightLayers: number,
    type: BrickPart['shape'],
    color: string,
    colorHex: string,
    partId: string
  ): Omit<LDUBrick, 'id' | 'position' | 'rotation'> {
    const isPlate = type === 'plate';
    const height = isPlate ? LDU.PLATE_HEIGHT * heightLayers : LDU.BRICK_HEIGHT * heightLayers;

    return {
      partId,
      type,
      color,
      colorHex,
      size: {
        w: widthStuds * LDU.BRICK_UNIT,
        h: height,
        d: depthStuds * LDU.BRICK_UNIT
      },
      studsTop: type === 'tile' ? [] : this.generateStudPositions(widthStuds, depthStuds),
      connectsBelow: this.generateConnectionPoints(widthStuds, depthStuds)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V. THE "CREATOR" AGENT - BUILD GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export class BrickMindCreatorEngine {
  private validator = new BrickPhysicsValidator();
  private maxRetries = 10;

  /**
   * Generate a legal build with Creator-Critic loop
   */
  generateBuild(prompt: string, brickLimit: number): BuildData {
    const seed = this.hashString(prompt);
    const rng = this.createSeededRNG(seed);

    // Generate parts palette
    const partsPalette = this.generatePartsPalette(brickLimit, rng);

    // Generate two design variations
    const speedsterModel = this.generateModel(prompt, brickLimit * 0.6, partsPalette, 'speedster', rng);
    const tankerModel = this.generateModel(prompt, brickLimit, partsPalette, 'tanker', rng);

    // Generate step-by-step instructions for selected model
    const steps = this.generateBuildSteps(tankerModel, partsPalette);

    return {
      prompt,
      brickLimit,
      partsList: partsPalette,
      steps,
      modelOptions: [speedsterModel, tankerModel]
    };
  }

  /**
   * Generate a single model with physics validation
   */
  private generateModel(
    prompt: string,
    targetCount: number,
    partsPalette: BrickPart[],
    variant: 'speedster' | 'tanker',
    rng: () => number
  ): ModelOption {
    const isCompact = variant === 'speedster';
    const partCount = Math.floor(targetCount);

    // Generate bricks with Creator-Critic loop
    const bricks = this.generateBricksWithValidation(partCount, partsPalette, isCompact, rng);

    return {
      name: variant === 'speedster' ? 'The Speedster' : 'The Tanker',
      subtitle: isCompact ? 'Aerodynamic, sleek, lower part count' : 'Heavy armor, complex greebling, maximum parts',
      partCount: bricks.length,
      difficulty: partCount < 80 ? 'Novice' : partCount > 150 ? 'Expert' : 'Intermediate',
      estimatedTime: Math.floor(partCount * 0.6),
      bricks: bricks.map((b, idx) => ({
        id: `B${idx}`,
        partId: b.partId,
        color: b.color,
        colorHex: b.colorHex,
        position: b.position,
        size: b.size,
        rotation: b.rotation,
        delay: idx * 30
      }))
    };
  }

  /**
   * Generate bricks with Creator-Critic validation loop
   */
  private generateBricksWithValidation(
    targetCount: number,
    partsPalette: BrickPart[],
    isCompact: boolean,
    rng: () => number
  ): LDUBrick[] {
    const bricks: LDUBrick[] = [];
    let retries = 0;

    // Layer-by-layer construction
    const layers = isCompact ? Math.max(4, Math.floor(targetCount / 10)) : Math.max(6, Math.floor(targetCount / 8));
    const basePlateSize = isCompact ? 4 : 6;

    // Baseplate layer (always legal)
    const baseplateBrick = this.createBaseplate(basePlateSize, partsPalette, rng);
    bricks.push(baseplateBrick);

    let currentCount = 1;
    let currentY = baseplateBrick.size.h;

    // Build layers
    for (let layer = 1; layer < layers && currentCount < targetCount; layer++) {
      const bricksPerLayer = Math.min(
        targetCount - currentCount,
        Math.max(3, Math.floor((targetCount / layers) * (1 + rng() * 0.3)))
      );

      for (let b = 0; b < bricksPerLayer && currentCount < targetCount; b++) {
        let newBrick: LDUBrick | null = null;
        let attemptRetries = 0;

        // Creator-Critic loop: Try to place brick legally
        while (attemptRetries < this.maxRetries) {
          newBrick = this.proposeBrickPlacement(bricks, currentY, partsPalette, isCompact, rng);

          // Critic: Validate physics
          const testBricks = [...bricks, newBrick];
          const validation = this.validator.validatePhysics(testBricks);

          if (validation.status === 'legal') {
            break; // Accept this brick
          }

          // Reject and retry
          attemptRetries++;
          newBrick = null;
        }

        if (newBrick) {
          bricks.push(newBrick);
          currentCount++;
        } else {
          retries++;
          if (retries > this.maxRetries * 3) break; // Give up on this layer
        }
      }

      // Move to next layer
      currentY += (isCompact ? LDU.PLATE_HEIGHT : LDU.BRICK_HEIGHT);
    }

    return bricks;
  }

  /**
   * Propose a brick placement (Creator agent)
   */
  private proposeBrickPlacement(
    existingBricks: LDUBrick[],
    y: number,
    partsPalette: BrickPart[],
    isCompact: boolean,
    rng: () => number
  ): LDUBrick {
    const part = partsPalette[Math.floor(rng() * partsPalette.length)];
    const brickTemplate = BrickGeometryEngine.createStandardBrick(
      part.width,
      part.height,
      1,
      part.shape,
      part.color,
      part.colorHex,
      part.id
    );

    // Find a legal grid position
    const gridRange = isCompact ? 3 : 5;
    const xGrid = Math.floor(rng() * gridRange) - Math.floor(gridRange / 2);
    const zGrid = Math.floor(rng() * gridRange) - Math.floor(gridRange / 2);

    const x = xGrid * LDU.GRID_SNAP_XZ;
    const z = zGrid * LDU.GRID_SNAP_XZ;

    // Snap Y to grid
    const ySnapped = Math.round(y / LDU.GRID_SNAP_Y) * LDU.GRID_SNAP_Y;

    const rotation: 0 | 90 | 180 | 270 = [0, 90, 180, 270][Math.floor(rng() * 4)] as 0 | 90 | 180 | 270;

    return {
      ...brickTemplate,
      id: `brick_${Date.now()}_${Math.random()}`,
      position: { x, y: ySnapped, z },
      rotation
    };
  }

  /**
   * Create baseplate brick
   */
  private createBaseplate(sizeStuds: number, partsPalette: BrickPart[], rng: () => number): LDUBrick {
    const greenPart = partsPalette.find(p => p.color.toLowerCase().includes('green')) || partsPalette[0];
    const brickTemplate = BrickGeometryEngine.createStandardBrick(
      sizeStuds,
      sizeStuds,
      1,
      'plate',
      greenPart.color,
      greenPart.colorHex,
      greenPart.id
    );

    return {
      ...brickTemplate,
      id: 'baseplate',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0
    };
  }

  /**
   * Generate step-by-step build instructions
   */
  private generateBuildSteps(model: ModelOption, partsPalette: BrickPart[]): BuildStep[] {
    const steps: BuildStep[] = [];
    const stepsCount = Math.max(6, Math.min(20, Math.floor(model.bricks.length / 8)));
    const bricksPerStep = Math.ceil(model.bricks.length / stepsCount);

    for (let s = 0; s < stepsCount; s++) {
      const startIdx = s * bricksPerStep;
      const endIdx = Math.min((s + 1) * bricksPerStep, model.bricks.length);
      const stepBricks = model.bricks.slice(startIdx, endIdx);

      steps.push({
        stepNum: s + 1,
        partsAdded: stepBricks.map(brick => ({
          partId: brick.partId,
          position: brick.position,
          rotation: brick.rotation
        })),
        description: s === 0
          ? 'Build the foundation baseplate'
          : s === stepsCount - 1
            ? 'Add final details and finishing touches'
            : `Assemble layer ${s + 1} - ${stepBricks.length} bricks`,
        cameraAngle: { rotateX: -25 + s * 2, rotateY: s * 30 }
      });
    }

    return steps;
  }

  /**
   * Generate parts palette from brick limit
   */
  private generatePartsPalette(brickLimit: number, rng: () => number): BrickPart[] {
    const BRICK_COLORS = [
      { name: 'Red', hex: '#E3000B' },
      { name: 'Blue', hex: '#0057A8' },
      { name: 'Yellow', hex: '#FFD700' },
      { name: 'Green', hex: '#00852B' },
      { name: 'White', hex: '#F4F4F4' },
      { name: 'Black', hex: '#1B1B1B' },
      { name: 'Orange', hex: '#FF7E14' },
      { name: 'Dark Gray', hex: '#6B6B6B' }
    ];

    const BRICK_TYPES: Array<{ name: string; shape: BrickPart['shape']; w: number; h: number }> = [
      { name: 'Brick 2x4', shape: 'brick', w: 4, h: 2 },
      { name: 'Brick 2x2', shape: 'brick', w: 2, h: 2 },
      { name: 'Brick 1x2', shape: 'brick', w: 2, h: 1 },
      { name: 'Plate 2x4', shape: 'plate', w: 4, h: 2 },
      { name: 'Plate 2x2', shape: 'plate', w: 2, h: 2 },
      { name: 'Slope 2x2', shape: 'slope', w: 2, h: 2 },
      { name: 'Tile 1x4', shape: 'tile', w: 4, h: 1 }
    ];

    const partCount = Math.min(brickLimit, Math.max(20, Math.floor(brickLimit * 0.8)));
    const uniqueTypes = Math.min(BRICK_TYPES.length, Math.max(6, Math.floor(partCount / 4)));

    const partsList: BrickPart[] = [];
    let remaining = partCount;

    for (let i = 0; i < uniqueTypes; i++) {
      const bt = BRICK_TYPES[Math.floor(rng() * BRICK_TYPES.length)];
      const color = BRICK_COLORS[Math.floor(rng() * BRICK_COLORS.length)];
      const qty = i === uniqueTypes - 1 ? remaining : Math.max(1, Math.floor(rng() * (remaining / (uniqueTypes - i))));
      remaining -= qty;

      partsList.push({
        id: `P${(i + 1).toString().padStart(3, '0')}`,
        name: bt.name,
        color: color.name,
        colorHex: color.hex,
        qty: Math.max(1, qty),
        shape: bt.shape,
        width: bt.w,
        height: bt.h
      });
    }

    return partsList;
  }

  // Utility functions
  private hashString(str: string): number {
    return str.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }

  /**
   * Generate a build using live Kimi model output (JSON-only contract).
   */
  async generateAIBuild(prompt: string, brickLimit = 200): Promise<BuildData> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new Error('Build prompt is required.');
    }

    const limit = Math.max(1, Math.min(2000, Math.floor(brickLimit)));
    const sessionSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

    const systemPrompt = `You are a LDraw Architect. You must generate a 3D model based on the user's prompt.
Rule 1 (The Grid): All parts must snap to the LDraw Grid. X and Z coordinates must be multiples of 20. Y coordinates must be multiples of 24.
Rule 2 (Connectivity): Every part must physically touch at least one other part. No floating bricks. Build from the ground up (Y=0).
Rule 3 (Validity): Use only standard LDraw Part IDs (e.g., 3001, 3003, 3020, 6000, 3004, 3005, 3010, 3022, 3023, 3024, 3710, 54200).
Rule 4 (Context): If the user asks for a dragon, approximate organic curves with slopes and hinges. If the user asks for a city, bias toward large plates/bricks.
Rule 5 (Output): Return ONLY valid JSON. Do not include markdown, prose, or explanations.

Use this exact JSON contract:
{
  "modelName": "Generated_Structure_ID_[TIMESTAMP]",
  "gridSystem": "LDU_Standard",
  "parts": [
    {
      "partId": "3001",
      "colorCode": 4,
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "step": 1
    }
  ],
  "meta": {
    "totalParts": 1,
    "estimatedBuildTime": "1 min"
  },
  "buildGuide": {
    "inventory": [
      { "partId": "3001", "colorCode": 4, "qty": 1 }
    ],
    "steps": [
      { "step": 1, "yLevel": 0, "title": "Base/Chassis", "description": "Build the foundation layer." }
    ]
  }
}`;

    const userPrompt = `Prompt: ${normalizedPrompt}
Brick limit: ${limit}
Random seed: ${sessionSeed}
Generate a fresh interpretation for this seed.`;

    const { requestNvidiaChat } = await import('@/lib/nvidia-ai');
    const response = await requestNvidiaChat({
      body: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 4096,
        chat_template_kwargs: { thinking: false },
      },
    });

    if (response.error || !response.data?.choices?.[0]?.message?.content) {
      throw new Error('Kimi generation request failed.');
    }

    const aiPayload = this.parseKimiPayload(response.data.choices[0].message.content);
    const sanitizedParts = this.sanitizeGeneratedParts(aiPayload.parts ?? [], limit);

    if (sanitizedParts.length === 0) {
      throw new Error('Kimi returned no valid parts for this prompt.');
    }

    const partsList = this.buildInventoryFromParts(sanitizedParts);
    const steps = this.buildLayerSteps(sanitizedParts, aiPayload.buildGuide?.steps);

    const modelName = (aiPayload.modelName || `Generated_Structure_ID_${Date.now()}`).trim();
    const estimatedTime = this.parseEstimatedMinutes(aiPayload.meta?.estimatedBuildTime, sanitizedParts.length);
    const difficulty = this.mapDifficulty(sanitizedParts.length);

    const primaryBricks = sanitizedParts.map((part, idx) => ({
      id: part.id,
      partId: part.inventoryId,
      color: part.colorName,
      colorHex: part.colorHex,
      position: part.position,
      size: part.size,
      rotation: part.rotationY,
      delay: idx * 30,
    }));

    const variantBricks = primaryBricks.map((brick, idx) => ({
      ...brick,
      id: `v2_${idx}`,
      rotation: ((brick.rotation + 180) % 360),
    }));

    const primaryModel: ModelOption = {
      name: modelName,
      subtitle: 'Live Kimi generation',
      partCount: primaryBricks.length,
      difficulty,
      estimatedTime,
      bricks: primaryBricks,
    };

    const secondaryModel: ModelOption = {
      name: `${modelName} Variant`,
      subtitle: 'Alternate orientation',
      partCount: variantBricks.length,
      difficulty,
      estimatedTime,
      bricks: variantBricks,
    };

    return {
      prompt: normalizedPrompt,
      brickLimit: limit,
      partsList,
      steps,
      modelOptions: [primaryModel, secondaryModel],
    };
  }

  private parseKimiPayload(rawContent: string): KimiModelPayload {
    const cleaned = rawContent.replace(/```json|```/gi, '').trim();
    const parsed = this.parseJsonObject(cleaned);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Kimi response was not a valid JSON object.');
    }

    const payload = parsed as KimiModelPayload;
    if (!Array.isArray(payload.parts)) {
      throw new Error('Kimi response missing required "parts" array.');
    }

    return payload;
  }

  private parseJsonObject(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Unable to parse JSON from Kimi response.');
      }
      return JSON.parse(content.slice(firstBrace, lastBrace + 1));
    }
  }

  private sanitizeGeneratedParts(parts: KimiPartPayload[], limit: number): SanitizedGeneratedPart[] {
    const cappedParts = parts.slice(0, limit);
    const normalized = cappedParts.map((rawPart, idx) => {
      const requestedPartId = typeof rawPart.partId === 'string' ? rawPart.partId.trim() : '';
      const partId = PART_SPECS[requestedPartId] ? requestedPartId : DEFAULT_PART_ID;
      const spec = PART_SPECS[partId];

      const colorCode = Number.isFinite(rawPart.colorCode) ? Math.round(rawPart.colorCode) : 4;
      const ldrawColor = getLDrawColor(colorCode);

      const x = this.snapToGrid(this.toFinite(rawPart.position?.x, 0), LDU.GRID_SNAP_XZ);
      const y = Math.abs(this.snapToGrid(this.toFinite(rawPart.position?.y, 0), LDU.BRICK_HEIGHT));
      const z = this.snapToGrid(this.toFinite(rawPart.position?.z, 0), LDU.GRID_SNAP_XZ);

      const rotationY = this.normalizeRotationY(rawPart.rotation?.y ?? 0);
      const inventoryId = `${partId}-${colorCode}`;

      return {
        id: `ai_${idx}`,
        partId,
        inventoryId,
        colorCode,
        colorName: ldrawColor.name,
        colorHex: ldrawColor.value,
        shape: spec.shape,
        position: { x, y, z },
        size: {
          w: spec.widthStuds * LDU.BRICK_UNIT,
          h: spec.heightLdu,
          d: spec.depthStuds * LDU.BRICK_UNIT,
        },
        rotationY,
        step: Number.isFinite(rawPart.step) ? Math.round(rawPart.step as number) : idx + 1,
      };
    }).sort((a, b) => a.position.y - b.position.y || a.step - b.step);

    const placed: SanitizedGeneratedPart[] = [];
    normalized.forEach((candidate, idx) => {
      let part: SanitizedGeneratedPart = {
        ...candidate,
        position: { ...candidate.position, y: idx === 0 ? 0 : candidate.position.y },
      };

      part = this.resolveCollisionPosition(part, placed);
      part = this.ensureConnectedPlacement(part, placed);
      part = this.resolveCollisionPosition(part, placed);

      if (placed.length > 0 && !this.touchesAny(part, placed)) {
        const anchor = placed[placed.length - 1];
        part = {
          ...part,
          position: {
            x: anchor.position.x,
            y: this.snapToGrid(anchor.position.y + LDU.BRICK_HEIGHT, LDU.BRICK_HEIGHT),
            z: anchor.position.z,
          },
        };
        part = this.resolveCollisionPosition(part, placed);
      }

      placed.push(part);
    });

    return placed;
  }

  private ensureConnectedPlacement(
    part: SanitizedGeneratedPart,
    existing: SanitizedGeneratedPart[]
  ): SanitizedGeneratedPart {
    if (existing.length === 0) {
      return {
        ...part,
        position: { ...part.position, y: 0 },
      };
    }

    if (!this.collidesWithAny(part, existing) && this.touchesAny(part, existing)) {
      return part;
    }

    const anchor = existing[existing.length - 1];
    const sideOffsets = [
      { x: (anchor.size.w + part.size.w) / 2, z: 0, y: 0 },
      { x: -(anchor.size.w + part.size.w) / 2, z: 0, y: 0 },
      { x: 0, z: (anchor.size.d + part.size.d) / 2, y: 0 },
      { x: 0, z: -(anchor.size.d + part.size.d) / 2, y: 0 },
      { x: 0, z: 0, y: LDU.BRICK_HEIGHT },
    ];

    for (const offset of sideOffsets) {
      const candidate: SanitizedGeneratedPart = {
        ...part,
        position: {
          x: this.snapToGrid(anchor.position.x + offset.x, LDU.GRID_SNAP_XZ),
          y: this.snapToGrid(Math.max(0, anchor.position.y + offset.y), LDU.BRICK_HEIGHT),
          z: this.snapToGrid(anchor.position.z + offset.z, LDU.GRID_SNAP_XZ),
        },
      };

      if (!this.collidesWithAny(candidate, existing) && this.touchesAny(candidate, existing)) {
        return candidate;
      }
    }

    return {
      ...part,
      position: {
        x: anchor.position.x,
        y: this.snapToGrid(anchor.position.y + LDU.BRICK_HEIGHT, LDU.BRICK_HEIGHT),
        z: anchor.position.z,
      },
    };
  }

  private resolveCollisionPosition(
    part: SanitizedGeneratedPart,
    existing: SanitizedGeneratedPart[]
  ): SanitizedGeneratedPart {
    if (!this.collidesWithAny(part, existing)) {
      return part;
    }

    const maxRadius = 6;
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) {
            continue;
          }

          const candidate: SanitizedGeneratedPart = {
            ...part,
            position: {
              x: this.snapToGrid(part.position.x + dx * LDU.GRID_SNAP_XZ, LDU.GRID_SNAP_XZ),
              y: part.position.y,
              z: this.snapToGrid(part.position.z + dz * LDU.GRID_SNAP_XZ, LDU.GRID_SNAP_XZ),
            },
          };

          if (!this.collidesWithAny(candidate, existing)) {
            if (existing.length === 0 || this.touchesAny(candidate, existing)) {
              return candidate;
            }
          }
        }
      }
    }

    for (let i = existing.length - 1; i >= 0; i--) {
      const anchor = existing[i];
      const candidate: SanitizedGeneratedPart = {
        ...part,
        position: {
          x: anchor.position.x,
          y: this.snapToGrid(anchor.position.y + LDU.BRICK_HEIGHT, LDU.BRICK_HEIGHT),
          z: anchor.position.z,
        },
      };
      if (!this.collidesWithAny(candidate, existing) && this.touchesAny(candidate, existing)) {
        return candidate;
      }
    }

    return part;
  }

  private buildInventoryFromParts(parts: SanitizedGeneratedPart[]): BrickPart[] {
    const inventory = new Map<string, BrickPart>();

    parts.forEach((part) => {
      const spec = PART_SPECS[part.partId] ?? PART_SPECS[DEFAULT_PART_ID];
      const existing = inventory.get(part.inventoryId);
      if (existing) {
        existing.qty += 1;
        return;
      }
      inventory.set(part.inventoryId, {
        id: part.inventoryId,
        name: spec.name,
        color: part.colorName,
        colorHex: part.colorHex,
        qty: 1,
        shape: part.shape,
        width: spec.widthStuds,
        height: spec.depthStuds,
      });
    });

    return Array.from(inventory.values()).sort((a, b) => b.qty - a.qty || a.id.localeCompare(b.id));
  }

  private buildLayerSteps(
    parts: SanitizedGeneratedPart[],
    guidedSteps?: KimiBuildGuideStepPayload[]
  ): BuildStep[] {
    const guideByLayer = new Map<number, KimiBuildGuideStepPayload>();
    (guidedSteps ?? []).forEach((step) => {
      const layer = this.snapToGrid(this.toFinite(step.yLevel, 0), LDU.BRICK_HEIGHT);
      guideByLayer.set(layer, step);
    });

    const layerMap = new Map<number, SanitizedGeneratedPart[]>();
    parts.forEach((part) => {
      const layer = part.position.y;
      if (!layerMap.has(layer)) {
        layerMap.set(layer, []);
      }
      layerMap.get(layer)?.push(part);
    });

    const layers = Array.from(layerMap.keys()).sort((a, b) => a - b);
    return layers.map((layerY, idx) => {
      const stepParts = layerMap.get(layerY) ?? [];
      const guidedStep = guideByLayer.get(layerY);

      return {
        stepNum: idx + 1,
        partsAdded: stepParts.map((part) => ({
          partId: part.inventoryId,
          position: part.position,
          rotation: part.rotationY,
        })),
        description: guidedStep?.description?.trim()
          || guidedStep?.title?.trim()
          || this.defaultLayerTitle(idx, layers.length, layerY),
        cameraAngle: {
          rotateX: Math.max(-45, -25 + idx * 3),
          rotateY: idx * 28,
        },
      };
    });
  }

  private defaultLayerTitle(index: number, total: number, yLevel: number): string {
    if (index === 0) {
      return `Base/Chassis (Y=${yLevel})`;
    }
    if (index === total - 1) {
      return `Roof/Details (Y=${yLevel})`;
    }
    return `Walls/Structure (Y=${yLevel})`;
  }

  private parseEstimatedMinutes(estimated: string | undefined, partCount: number): number {
    const fromMeta = Number.parseInt((estimated || '').replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(fromMeta) && fromMeta > 0) {
      return fromMeta;
    }
    return Math.max(1, Math.ceil(partCount * 0.6));
  }

  private mapDifficulty(partCount: number): ModelOption['difficulty'] {
    if (partCount < 80) return 'Novice';
    if (partCount > 180) return 'Expert';
    return 'Intermediate';
  }

  private toFinite(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private snapToGrid(value: number, unit: number): number {
    return Math.round(value / unit) * unit;
  }

  private normalizeRotationY(value: number): 0 | 90 | 180 | 270 {
    const snapped = Math.round(value / 90) * 90;
    const normalized = ((snapped % 360) + 360) % 360;
    if (normalized === 90 || normalized === 180 || normalized === 270) {
      return normalized;
    }
    return 0;
  }

  private collidesWithAny(part: SanitizedGeneratedPart, existing: SanitizedGeneratedPart[]): boolean {
    return existing.some((other) => this.boxesOverlap(part, other));
  }

  private touchesAny(part: SanitizedGeneratedPart, existing: SanitizedGeneratedPart[]): boolean {
    return existing.some((other) => this.areTouching(part, other));
  }

  private boxesOverlap(a: SanitizedGeneratedPart, b: SanitizedGeneratedPart): boolean {
    const A = this.getBounds(a);
    const B = this.getBounds(b);
    const eps = 0.001;

    return (
      A.minX < B.maxX - eps &&
      A.maxX > B.minX + eps &&
      A.minY < B.maxY - eps &&
      A.maxY > B.minY + eps &&
      A.minZ < B.maxZ - eps &&
      A.maxZ > B.minZ + eps
    );
  }

  private areTouching(a: SanitizedGeneratedPart, b: SanitizedGeneratedPart): boolean {
    const A = this.getBounds(a);
    const B = this.getBounds(b);
    const eps = 0.001;

    const overlapX = this.overlaps1D(A.minX, A.maxX, B.minX, B.maxX, eps);
    const overlapY = this.overlaps1D(A.minY, A.maxY, B.minY, B.maxY, eps);
    const overlapZ = this.overlaps1D(A.minZ, A.maxZ, B.minZ, B.maxZ, eps);

    const touchingY =
      (Math.abs(A.maxY - B.minY) <= eps || Math.abs(B.maxY - A.minY) <= eps) &&
      overlapX &&
      overlapZ;
    const touchingX =
      (Math.abs(A.maxX - B.minX) <= eps || Math.abs(B.maxX - A.minX) <= eps) &&
      overlapY &&
      overlapZ;
    const touchingZ =
      (Math.abs(A.maxZ - B.minZ) <= eps || Math.abs(B.maxZ - A.minZ) <= eps) &&
      overlapX &&
      overlapY;

    return touchingY || touchingX || touchingZ;
  }

  private overlaps1D(minA: number, maxA: number, minB: number, maxB: number, eps: number): boolean {
    return minA < maxB - eps && maxA > minB + eps;
  }

  private getBounds(part: SanitizedGeneratedPart): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } {
    return {
      minX: part.position.x - part.size.w / 2,
      maxX: part.position.x + part.size.w / 2,
      minY: part.position.y,
      maxY: part.position.y + part.size.h,
      minZ: part.position.z - part.size.d / 2,
      maxZ: part.position.z + part.size.d / 2,
    };
  }

  private createSeededRNG(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export const BrickMindEngine = {
  Creator: new BrickMindCreatorEngine(),
  Validator: new BrickPhysicsValidator(),
  Geometry: BrickGeometryEngine,
  LDU
};
