/**
 * LDraw DAT File Parser & Three.js Geometry Converter
 *
 * Parses the LDraw file format (.dat, .ldr) into Three.js geometry.
 * Reference: https://www.ldraw.org/article/218.html
 *
 * LDraw Line Types:
 *   0 - Comment / Meta command
 *   1 - Sub-file reference (with transformation matrix)
 *   2 - Line (edge)
 *   3 - Triangle
 *   4 - Quad
 *   5 - Optional line
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
// I. LDRAW COLOR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export interface LDrawColor {
  code: number;
  name: string;
  value: string;   // hex e.g. "#B40000"
  edge: string;    // edge color hex
  alpha?: number;  // 0-255 for transparent colors
}

// Core LDraw colors parsed from LDConfig.ldr
const LDRAW_COLORS: Map<number, LDrawColor> = new Map([
  [0,  { code: 0,  name: 'Black',         value: '#1B2A34', edge: '#808080' }],
  [1,  { code: 1,  name: 'Blue',          value: '#1E5AA8', edge: '#333333' }],
  [2,  { code: 2,  name: 'Green',         value: '#00852B', edge: '#333333' }],
  [3,  { code: 3,  name: 'Dark_Turquoise', value: '#069D9F', edge: '#333333' }],
  [4,  { code: 4,  name: 'Red',           value: '#B40000', edge: '#333333' }],
  [5,  { code: 5,  name: 'Dark_Pink',     value: '#D3359D', edge: '#333333' }],
  [6,  { code: 6,  name: 'Brown',         value: '#543324', edge: '#1E1E1E' }],
  [7,  { code: 7,  name: 'Light_Grey',    value: '#8A928D', edge: '#333333' }],
  [8,  { code: 8,  name: 'Dark_Grey',     value: '#545955', edge: '#333333' }],
  [9,  { code: 9,  name: 'Light_Blue',    value: '#97CBD9', edge: '#333333' }],
  [10, { code: 10, name: 'Bright_Green',  value: '#58AB41', edge: '#333333' }],
  [11, { code: 11, name: 'Light_Turquoise', value: '#00AAA4', edge: '#333333' }],
  [12, { code: 12, name: 'Salmon',        value: '#F06D61', edge: '#333333' }],
  [13, { code: 13, name: 'Pink',          value: '#F6A9BB', edge: '#333333' }],
  [14, { code: 14, name: 'Yellow',        value: '#FAC80A', edge: '#333333' }],
  [15, { code: 15, name: 'White',         value: '#F4F4F4', edge: '#333333' }],
  [17, { code: 17, name: 'Light_Green',   value: '#ADD9A8', edge: '#333333' }],
  [18, { code: 18, name: 'Light_Yellow',  value: '#FFD67F', edge: '#333333' }],
  [19, { code: 19, name: 'Tan',           value: '#D7BA8C', edge: '#333333' }],
  [20, { code: 20, name: 'Light_Violet',  value: '#AFBED6', edge: '#333333' }],
  [22, { code: 22, name: 'Purple',        value: '#671F81', edge: '#333333' }],
  [23, { code: 23, name: 'Dark_Blue_Violet', value: '#0E3E9A', edge: '#333333' }],
  [25, { code: 25, name: 'Orange',        value: '#D67923', edge: '#333333' }],
  [26, { code: 26, name: 'Magenta',       value: '#901F76', edge: '#333333' }],
  [27, { code: 27, name: 'Lime',          value: '#A5CA18', edge: '#333333' }],
  [28, { code: 28, name: 'Dark_Tan',      value: '#897D62', edge: '#333333' }],
  [29, { code: 29, name: 'Bright_Pink',   value: '#FF9ECD', edge: '#333333' }],
  [33, { code: 33, name: 'Trans_Dark_Blue', value: '#0020A0', edge: '#000B38', alpha: 128 }],
  [34, { code: 34, name: 'Trans_Green',   value: '#237841', edge: '#174F2B', alpha: 128 }],
  [36, { code: 36, name: 'Trans_Red',     value: '#C91A09', edge: '#660D05', alpha: 128 }],
  [40, { code: 40, name: 'Trans_Black',   value: '#635F52', edge: '#171614', alpha: 128 }],
  [41, { code: 41, name: 'Trans_Medium_Blue', value: '#559AB7', edge: '#326276', alpha: 128 }],
  [42, { code: 42, name: 'Trans_Neon_Green', value: '#C0FF00', edge: '#739900', alpha: 128 }],
  [43, { code: 43, name: 'Trans_Light_Blue', value: '#AEE9EF', edge: '#59C4CF', alpha: 128 }],
  [46, { code: 46, name: 'Trans_Yellow',  value: '#F5CD2F', edge: '#8E7518', alpha: 128 }],
  [47, { code: 47, name: 'Trans_Clear',   value: '#FCFCFC', edge: '#C3C3C3', alpha: 128 }],
  [70, { code: 70, name: 'Reddish_Brown', value: '#582A12', edge: '#1E1E1E' }],
  [71, { code: 71, name: 'Light_Bluish_Grey', value: '#A0A5A9', edge: '#333333' }],
  [72, { code: 72, name: 'Dark_Bluish_Grey', value: '#6C6E68', edge: '#333333' }],
  [73, { code: 73, name: 'Medium_Blue',   value: '#5A93DB', edge: '#333333' }],
  [74, { code: 74, name: 'Medium_Green',  value: '#73DCA1', edge: '#333333' }],
  [77, { code: 77, name: 'Light_Pink',    value: '#FECCCF', edge: '#333333' }],
  [78, { code: 78, name: 'Light_Nougat',  value: '#F6D7B3', edge: '#333333' }],
  [84, { code: 84, name: 'Medium_Nougat', value: '#E1A13D', edge: '#333333' }],
  [85, { code: 85, name: 'Medium_Lilac',  value: '#2C1577', edge: '#333333' }],
  [272, { code: 272, name: 'Dark_Blue',   value: '#19325A', edge: '#333333' }],
  [288, { code: 288, name: 'Dark_Green',  value: '#184632', edge: '#333333' }],
  [308, { code: 308, name: 'Dark_Brown',  value: '#352100', edge: '#1E1E1E' }],
  [320, { code: 320, name: 'Dark_Red',    value: '#720012', edge: '#333333' }],
  [326, { code: 326, name: 'Bright_Light_Yellow', value: '#FFF03A', edge: '#333333' }],
  [330, { code: 330, name: 'Olive_Green', value: '#77774E', edge: '#333333' }],
  [378, { code: 378, name: 'Sand_Green',  value: '#708E7C', edge: '#333333' }],
  [379, { code: 379, name: 'Sand_Blue',   value: '#70819A', edge: '#333333' }],
  [462, { code: 462, name: 'Medium_Orange', value: '#F58624', edge: '#333333' }],
  [484, { code: 484, name: 'Dark_Orange', value: '#91501C', edge: '#333333' }],
]);

// Special color codes
const COLOR_MAIN_COLOR = 16;  // Inherit from parent
const COLOR_EDGE_COLOR = 24;  // Edge/complement color

export function getLDrawColor(code: number): LDrawColor {
  return LDRAW_COLORS.get(code) || { code, name: `Color_${code}`, value: '#808080', edge: '#333333' };
}

export function getAllLDrawColors(): LDrawColor[] {
  return Array.from(LDRAW_COLORS.values());
}

// ═══════════════════════════════════════════════════════════════════════════
// II. PARSED LDRAW DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════

export interface LDrawTriangle {
  color: number;
  vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

export interface LDrawQuad {
  color: number;
  vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

export interface LDrawLine {
  color: number;
  vertices: [THREE.Vector3, THREE.Vector3];
}

export interface LDrawSubfileRef {
  color: number;
  matrix: THREE.Matrix4;
  filename: string;
}

export interface LDrawPartData {
  filename: string;
  description: string;
  category: string;
  keywords: string[];
  triangles: LDrawTriangle[];
  quads: LDrawQuad[];
  lines: LDrawLine[];
  subfiles: LDrawSubfileRef[];
}

export interface LDrawPartMeta {
  partNum: string;
  description: string;
  category: string;
  keywords: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// III. LDRAW FILE PARSER
// ═══════════════════════════════════════════════════════════════════════════

export class LDrawParser {
  private basePath: string;
  private fileCache: Map<string, string> = new Map();
  private parsedCache: Map<string, LDrawPartData> = new Map();
  private loadingPromises: Map<string, Promise<LDrawPartData | null>> = new Map();

  constructor(basePath = '/ldraw') {
    this.basePath = basePath;
  }

  /**
   * Fetch a raw LDraw file from the server
   */
  private async fetchFile(filepath: string): Promise<string | null> {
    // Check cache first
    if (this.fileCache.has(filepath)) {
      return this.fileCache.get(filepath)!;
    }

    try {
      const response = await fetch(`${this.basePath}/${filepath}`);
      if (!response.ok) return null;
      const text = await response.text();
      this.fileCache.set(filepath, text);
      return text;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a subfile reference to a file path
   * LDraw uses backslash paths (Windows), convert to forward slash
   */
  private resolveFilePath(reference: string, currentFile: string): string[] {
    // Normalize path separators
    const normalized = reference.replace(/\\/g, '/');

    // Search order for LDraw file resolution:
    const candidates: string[] = [];

    // If it starts with s/, it's a subpart
    if (normalized.startsWith('s/')) {
      candidates.push(`parts/${normalized}`);
    }
    // If it starts with 48/, 8/, or similar, it's a hi-res primitive
    else if (/^\d+\//.test(normalized)) {
      candidates.push(`p/${normalized}`);
    }
    // Check primitives directory
    else {
      candidates.push(`p/${normalized}`);
      candidates.push(`parts/${normalized}`);
    }

    // Also try the file as-is
    candidates.push(normalized);

    return candidates;
  }

  /**
   * Parse a single LDraw line into its components
   */
  private parseLine(line: string): {
    type: number;
    rest: string[];
  } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const type = parseInt(parts[0], 10);
    if (isNaN(type)) return null;

    return { type, rest: parts.slice(1) };
  }

  /**
   * Parse a type 1 line (subfile reference with transformation matrix)
   * Format: 1 color x y z a b c d e f g h i file
   */
  private parseSubfileRef(parts: string[]): LDrawSubfileRef | null {
    if (parts.length < 14) return null;

    const color = parseInt(parts[0], 10);
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);
    const a = parseFloat(parts[4]);
    const b = parseFloat(parts[5]);
    const c = parseFloat(parts[6]);
    const d = parseFloat(parts[7]);
    const e = parseFloat(parts[8]);
    const f = parseFloat(parts[9]);
    const g = parseFloat(parts[10]);
    const h = parseFloat(parts[11]);
    const i = parseFloat(parts[12]);
    const filename = parts.slice(13).join(' ');

    // LDraw matrix format -> Three.js Matrix4
    // LDraw uses column-major:
    // | a d g x |
    // | b e h y |
    // | c f i z |
    // | 0 0 0 1 |
    const matrix = new THREE.Matrix4();
    matrix.set(
      a, d, g, x,
      b, e, h, y,
      c, f, i, z,
      0, 0, 0, 1
    );

    return { color, matrix, filename };
  }

  /**
   * Parse a full LDraw DAT file content
   */
  parseFileContent(content: string, filename: string): LDrawPartData {
    const data: LDrawPartData = {
      filename,
      description: '',
      category: '',
      keywords: [],
      triangles: [],
      quads: [],
      lines: [],
      subfiles: [],
    };

    const contentLines = content.split('\n');
    let descriptionSet = false;

    for (const line of contentLines) {
      const parsed = this.parseLine(line);
      if (!parsed) continue;

      switch (parsed.type) {
        case 0: {
          // Meta / Comment
          const metaLine = parsed.rest.join(' ');
          if (!descriptionSet && !metaLine.startsWith('!') && !metaLine.startsWith('Name:') && !metaLine.startsWith('Author:') && !metaLine.startsWith('//') && !metaLine.startsWith('BFC')) {
            data.description = metaLine;
            descriptionSet = true;
          }
          if (metaLine.startsWith('!CATEGORY')) {
            data.category = metaLine.replace('!CATEGORY', '').trim();
          }
          if (metaLine.startsWith('!KEYWORDS')) {
            data.keywords.push(...metaLine.replace('!KEYWORDS', '').split(',').map(k => k.trim()));
          }
          break;
        }

        case 1: {
          // Subfile reference
          const subRef = this.parseSubfileRef(parsed.rest);
          if (subRef) {
            data.subfiles.push(subRef);
          }
          break;
        }

        case 2: {
          // Line
          if (parsed.rest.length >= 7) {
            const color = parseInt(parsed.rest[0], 10);
            data.lines.push({
              color,
              vertices: [
                new THREE.Vector3(parseFloat(parsed.rest[1]), parseFloat(parsed.rest[2]), parseFloat(parsed.rest[3])),
                new THREE.Vector3(parseFloat(parsed.rest[4]), parseFloat(parsed.rest[5]), parseFloat(parsed.rest[6])),
              ],
            });
          }
          break;
        }

        case 3: {
          // Triangle
          if (parsed.rest.length >= 10) {
            const color = parseInt(parsed.rest[0], 10);
            data.triangles.push({
              color,
              vertices: [
                new THREE.Vector3(parseFloat(parsed.rest[1]), parseFloat(parsed.rest[2]), parseFloat(parsed.rest[3])),
                new THREE.Vector3(parseFloat(parsed.rest[4]), parseFloat(parsed.rest[5]), parseFloat(parsed.rest[6])),
                new THREE.Vector3(parseFloat(parsed.rest[7]), parseFloat(parsed.rest[8]), parseFloat(parsed.rest[9])),
              ],
            });
          }
          break;
        }

        case 4: {
          // Quad - split into two triangles
          if (parsed.rest.length >= 13) {
            const color = parseInt(parsed.rest[0], 10);
            const v1 = new THREE.Vector3(parseFloat(parsed.rest[1]), parseFloat(parsed.rest[2]), parseFloat(parsed.rest[3]));
            const v2 = new THREE.Vector3(parseFloat(parsed.rest[4]), parseFloat(parsed.rest[5]), parseFloat(parsed.rest[6]));
            const v3 = new THREE.Vector3(parseFloat(parsed.rest[7]), parseFloat(parsed.rest[8]), parseFloat(parsed.rest[9]));
            const v4 = new THREE.Vector3(parseFloat(parsed.rest[10]), parseFloat(parsed.rest[11]), parseFloat(parsed.rest[12]));

            data.quads.push({
              color,
              vertices: [v1, v2, v3, v4],
            });
          }
          break;
        }

        // Type 5 (optional lines) are skipped - they're only for edge rendering
      }
    }

    return data;
  }

  /**
   * Load and parse a part file, resolving all subfile references recursively
   */
  async loadPart(partNum: string, maxDepth = 6): Promise<LDrawPartData | null> {
    const filename = `parts/${partNum}.dat`;

    // Check cache
    if (this.parsedCache.has(filename)) {
      return this.parsedCache.get(filename)!;
    }

    // Check if already loading (prevent duplicate fetches)
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename)!;
    }

    const promise = this._loadPartInternal(filename, maxDepth, 0);
    this.loadingPromises.set(filename, promise);
    const result = await promise;
    this.loadingPromises.delete(filename);
    return result;
  }

  private async _loadPartInternal(filepath: string, maxDepth: number, currentDepth: number): Promise<LDrawPartData | null> {
    if (currentDepth > maxDepth) return null;

    const content = await this.fetchFile(filepath);
    if (!content) return null;

    const data = this.parseFileContent(content, filepath);
    this.parsedCache.set(filepath, data);

    // Recursively resolve subfiles
    for (const subRef of data.subfiles) {
      const candidates = this.resolveFilePath(subRef.filename, filepath);
      let subData: LDrawPartData | null = null;

      for (const candidate of candidates) {
        if (this.parsedCache.has(candidate)) {
          subData = this.parsedCache.get(candidate)!;
          break;
        }

        subData = await this._loadPartInternal(candidate, maxDepth, currentDepth + 1);
        if (subData) break;
      }

      // If subfile loaded, transform and merge its geometry into parent
      if (subData) {
        this.mergeSubfileGeometry(data, subData, subRef);
      }
    }

    return data;
  }

  /**
   * Merge subfile geometry into parent, applying the transformation matrix
   */
  private mergeSubfileGeometry(
    parent: LDrawPartData,
    child: LDrawPartData,
    ref: LDrawSubfileRef
  ): void {
    const matrix = ref.matrix;
    const color = ref.color;

    // Merge triangles
    for (const tri of child.triangles) {
      const resolvedColor = tri.color === COLOR_MAIN_COLOR ? color : tri.color;
      parent.triangles.push({
        color: resolvedColor,
        vertices: [
          tri.vertices[0].clone().applyMatrix4(matrix),
          tri.vertices[1].clone().applyMatrix4(matrix),
          tri.vertices[2].clone().applyMatrix4(matrix),
        ],
      });
    }

    // Merge quads
    for (const quad of child.quads) {
      const resolvedColor = quad.color === COLOR_MAIN_COLOR ? color : quad.color;
      parent.quads.push({
        color: resolvedColor,
        vertices: [
          quad.vertices[0].clone().applyMatrix4(matrix),
          quad.vertices[1].clone().applyMatrix4(matrix),
          quad.vertices[2].clone().applyMatrix4(matrix),
          quad.vertices[3].clone().applyMatrix4(matrix),
        ],
      });
    }

    // Merge lines
    for (const line of child.lines) {
      const resolvedColor = line.color === COLOR_MAIN_COLOR ? color : line.color;
      parent.lines.push({
        color: resolvedColor,
        vertices: [
          line.vertices[0].clone().applyMatrix4(matrix),
          line.vertices[1].clone().applyMatrix4(matrix),
        ],
      });
    }
  }

  /**
   * Clear all caches (useful for memory management)
   */
  clearCache(): void {
    this.fileCache.clear();
    this.parsedCache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IV. THREE.JS GEOMETRY CONVERTER
// ═══════════════════════════════════════════════════════════════════════════

/** Scale factor: LDraw units to Three.js scene units */
const LDRAW_TO_THREE_SCALE = 0.025; // 1 LDU = 0.025 three.js units (adjustable)

export interface LDrawMeshOptions {
  color?: number | string;     // Override color (LDraw color code or hex)
  scale?: number;              // Additional scale factor
  smoothNormals?: boolean;     // Attempt to smooth normals
  edgeLines?: boolean;         // Include edge lines in output
}

/**
 * Convert parsed LDraw part data into a Three.js Group
 */
export function ldrawToThreeJS(
  partData: LDrawPartData,
  options: LDrawMeshOptions = {}
): THREE.Group {
  const group = new THREE.Group();
  const scale = (options.scale || 1) * LDRAW_TO_THREE_SCALE;

  // Collect all vertices and faces by color for efficient batching
  const colorBatches: Map<string, {
    positions: number[];
    normals: number[];
  }> = new Map();

  const addToBatch = (colorHex: string, v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3) => {
    if (!colorBatches.has(colorHex)) {
      colorBatches.set(colorHex, { positions: [], normals: [] });
    }
    const batch = colorBatches.get(colorHex)!;

    // Calculate face normal
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Add vertices (scaled and Y-inverted for LDraw -> Three.js coordinate)
    batch.positions.push(
      v1.x * scale, -v1.y * scale, v1.z * scale,
      v2.x * scale, -v2.y * scale, v2.z * scale,
      v3.x * scale, -v3.y * scale, v3.z * scale,
    );

    // Add normals
    batch.normals.push(
      normal.x, -normal.y, normal.z,
      normal.x, -normal.y, normal.z,
      normal.x, -normal.y, normal.z,
    );
  };

  // Resolve the display color
  const resolveColor = (colorCode: number): string => {
    if (options.color !== undefined) {
      if (typeof options.color === 'string') return options.color;
      return getLDrawColor(options.color).value;
    }
    if (colorCode === COLOR_MAIN_COLOR || colorCode === COLOR_EDGE_COLOR) {
      return '#A0A5A9'; // Default light grey
    }
    return getLDrawColor(colorCode).value;
  };

  // Process triangles
  for (const tri of partData.triangles) {
    const colorHex = resolveColor(tri.color);
    addToBatch(colorHex, tri.vertices[0], tri.vertices[1], tri.vertices[2]);
  }

  // Process quads (split into two triangles)
  for (const quad of partData.quads) {
    const colorHex = resolveColor(quad.color);
    addToBatch(colorHex, quad.vertices[0], quad.vertices[1], quad.vertices[2]);
    addToBatch(colorHex, quad.vertices[0], quad.vertices[2], quad.vertices[3]);
  }

  // Create meshes for each color batch
  for (const [colorHex, batch] of colorBatches) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));

    if (options.smoothNormals) {
      geometry.computeVertexNormals();
    }

    const color = new THREE.Color(colorHex);
    const ldrawColorEntry = Array.from(LDRAW_COLORS.values()).find(c => c.value.toLowerCase() === colorHex.toLowerCase());
    const isTransparent = ldrawColorEntry?.alpha !== undefined;

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: isTransparent,
      opacity: isTransparent ? 0.5 : 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Optional: Add edge lines
  if (options.edgeLines && partData.lines.length > 0) {
    const linePositions: number[] = [];
    for (const line of partData.lines) {
      linePositions.push(
        line.vertices[0].x * scale, -line.vertices[0].y * scale, line.vertices[0].z * scale,
        line.vertices[1].x * scale, -line.vertices[1].y * scale, line.vertices[1].z * scale,
      );
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lineSegments);
  }

  return group;
}

// ═══════════════════════════════════════════════════════════════════════════
// V. PART CATALOG & SEARCH
// ═══════════════════════════════════════════════════════════════════════════

export interface CatalogEntry {
  p: string;   // part number
  d: string;   // description
  c?: string;  // category
  k?: string[]; // keywords
}

let catalogCache: CatalogEntry[] | null = null;
let commonPartsCache: CatalogEntry[] | null = null;

/**
 * Load the full parts catalog (23,000+ parts)
 */
export async function loadPartsCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache) return catalogCache;

  try {
    const response = await fetch('/ldraw/parts-catalog.json');
    if (!response.ok) return [];
    catalogCache = await response.json();
    return catalogCache!;
  } catch {
    return [];
  }
}

/**
 * Load common/popular parts catalog (~80 parts)
 */
export async function loadCommonParts(): Promise<CatalogEntry[]> {
  if (commonPartsCache) return commonPartsCache;

  try {
    const response = await fetch('/ldraw/common-parts.json');
    if (!response.ok) return [];
    commonPartsCache = await response.json();
    return commonPartsCache!;
  } catch {
    return [];
  }
}

/**
 * Search the parts catalog
 */
export async function searchParts(query: string, limit = 50): Promise<CatalogEntry[]> {
  const catalog = await loadPartsCatalog();
  if (!query.trim()) return catalog.slice(0, limit);

  const terms = query.toLowerCase().split(/\s+/);
  const results: Array<{ entry: CatalogEntry; score: number }> = [];

  for (const entry of catalog) {
    const text = `${entry.p} ${entry.d} ${entry.c || ''} ${(entry.k || []).join(' ')}`.toLowerCase();
    let score = 0;

    // Exact part number match is highest priority
    if (entry.p === query) {
      score += 100;
    } else if (entry.p.startsWith(query)) {
      score += 50;
    }

    // Term matching in description
    for (const term of terms) {
      if (text.includes(term)) {
        score += 10;
        if (entry.d.toLowerCase().startsWith(term)) {
          score += 5;
        }
      }
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(r => r.entry);
}

// ═══════════════════════════════════════════════════════════════════════════
// VI. SINGLETON PARSER INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const ldrawParser = new LDrawParser('/ldraw');
