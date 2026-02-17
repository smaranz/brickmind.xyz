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
