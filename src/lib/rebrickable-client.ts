/**
 * Rebrickable API Client
 * Manual implementation for fetching LEGO part metadata and images
 *
 * API Documentation: https://rebrickable.com/api/v3/docs/
 */

export interface RebrickablePart {
  part_num: string;
  name: string;
  part_cat_id: number;
  part_url: string;
  part_img_url: string | null;
  external_ids: Record<string, string[]>;
  print_of: string | null;
}

export interface RebrickablePartImage {
  id: number;
  part_num: string;
  color_id: number;
  color_name: string;
  user_id: number;
  img_url: string;
}

export interface RebrickableColor {
  id: number;
  name: string;
  rgb: string;
  is_trans: boolean;
}

/**
 * Rebrickable API Client
 * Note: This is a mock client for demonstration. In production, you would:
 * 1. Sign up for a Rebrickable API key at https://rebrickable.com/api/
 * 2. Store the API key in environment variables
 * 3. Make actual HTTP requests to the Rebrickable API
 */
export class RebrickableClient {
  private readonly baseUrl = 'https://api.rebrickable.com/api/v3';
  private readonly apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  /**
   * Fetch part metadata by part number
   * Mock implementation - returns placeholder data
   */
  async getPartMetadata(partNum: string): Promise<RebrickablePart | null> {
    // In production, this would be:
    // const response = await fetch(`${this.baseUrl}/lego/parts/${partNum}/?key=${this.apiKey}`);
    // return await response.json();

    // Mock data for demonstration
    return {
      part_num: partNum,
      name: `LEGO Part ${partNum}`,
      part_cat_id: 1,
      part_url: `https://rebrickable.com/parts/${partNum}/`,
      part_img_url: null,
      external_ids: {},
      print_of: null,
    };
  }

  /**
   * Get part images/silhouettes
   * Mock implementation - returns placeholder data
   */
  async getPartImages(partNum: string, colorId?: number): Promise<RebrickablePartImage[]> {
    // In production:
    // const url = `${this.baseUrl}/lego/parts/${partNum}/images/${colorId ? `?color_id=${colorId}&` : '?'}key=${this.apiKey}`;
    // const response = await fetch(url);
    // return await response.json();

    // Mock data
    return [
      {
        id: 1,
        part_num: partNum,
        color_id: colorId || 0,
        color_name: 'Red',
        user_id: 1,
        img_url: `https://cdn.rebrickable.com/media/parts/elements/${partNum}.jpg`,
      },
    ];
  }

  /**
   * Search for parts by query, color, and type
   * Mock implementation
   */
  async searchParts(query?: string, colorId?: number, partType?: string): Promise<RebrickablePart[]> {
    // In production:
    // const params = new URLSearchParams({ key: this.apiKey || '' });
    // if (query) params.append('search', query);
    // if (colorId) params.append('color_id', colorId.toString());
    // if (partType) params.append('type', partType);
    // const response = await fetch(`${this.baseUrl}/lego/parts/?${params.toString()}`);
    // return await response.json();

    // Mock data
    return [];
  }

  /**
   * Get color information by color ID
   * Mock implementation
   */
  async getColor(colorId: number): Promise<RebrickableColor | null> {
    // In production:
    // const response = await fetch(`${this.baseUrl}/lego/colors/${colorId}/?key=${this.apiKey}`);
    // return await response.json();

    // Common LEGO colors mapping
    const colors: Record<number, RebrickableColor> = {
      5: { id: 5, name: 'Red', rgb: 'E3000B', is_trans: false },
      7: { id: 7, name: 'Blue', rgb: '0057A8', is_trans: false },
      14: { id: 14, name: 'Yellow', rgb: 'FFD700', is_trans: false },
      10: { id: 10, name: 'Green', rgb: '00852B', is_trans: false },
      15: { id: 15, name: 'White', rgb: 'F4F4F4', is_trans: false },
      0: { id: 0, name: 'Black', rgb: '1B1B1B', is_trans: false },
      4: { id: 4, name: 'Orange', rgb: 'FF7E14', is_trans: false },
      85: { id: 85, name: 'Dark Gray', rgb: '6B6B6B', is_trans: false },
    };

    return colors[colorId] || null;
  }

  /**
   * Generate a silhouette image URL for a part
   * Uses Rebrickable's CDN (works without API key)
   */
  getPartImageUrl(partNum: string, colorId?: number): string {
    if (colorId) {
      return `https://cdn.rebrickable.com/media/parts/colors/${colorId}/${partNum}.png`;
    }
    return `https://cdn.rebrickable.com/media/parts/elements/${partNum}.jpg`;
  }

  /**
   * Get part silhouette (outline) for instruction manuals
   */
  getPartSilhouetteUrl(partNum: string): string {
    // Rebrickable specific LDraw render
    return `https://cdn.rebrickable.com/media/parts/ldraw/${partNum}.png`;
  }

  /**
   * Get BrickLink image URL (often more reliable for standard parts)
   */
  getBrickLinkImageUrl(partNum: string, colorId: number = 0): string {
    // BrickLink uses generic color 0 for "no color" / default
    // We map LDraw colors to close BrickLink IDs if needed, but 0 is safe for shape.
    return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partNum}.png`;
  }
}

// Export a singleton instance
export const rebrickableClient = new RebrickableClient();

/**
 * Helper function to convert LEGO color names to Rebrickable color IDs
 */
export function getColorIdFromName(colorName: string): number {
  const colorMap: Record<string, number> = {
    'Red': 5,
    'Blue': 7,
    'Yellow': 14,
    'Green': 10,
    'White': 15,
    'Black': 0,
    'Orange': 4,
    'Dark Gray': 85,
  };

  return colorMap[colorName] || 0;
}

/**
 * Helper function to get common LEGO brick part numbers by type
 */
export function getStandardPartNumber(brickType: string, width: number, height: number): string {
  // Common LEGO part numbers (reference: https://rebrickable.com/)
  const partNumbers: Record<string, string> = {
    'brick_2x4': '3001',
    'brick_2x2': '3003',
    'brick_1x2': '3004',
    'brick_1x1': '3005',
    'plate_2x4': '3020',
    'plate_2x2': '3022',
    'plate_1x2': '3023',
    'plate_1x1': '3024',
    'slope_2x2': '3039',
    'slope_2x1': '3040',
    'tile_1x4': '2431',
    'tile_1x2': '3069',
  };

  const key = `${brickType}_${width}x${height}`;
  return partNumbers[key] || '3001'; // Default to 2x4 brick
}
