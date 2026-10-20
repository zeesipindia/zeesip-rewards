export type FruitType = 'mango' | 'pineapple';
export type ItemType = 'mango' | 'pineapple' | 'bomb';
// Alias for backwards compatibility
export type BottleType = 'mango' | 'pineapple' | 'bomb' | 'gold' | 'expired';

export interface ItemSpawn {
  index: number;
  type: ItemType;
  appear_at_ms: number;
  start_x_percent: number; // 10 to 90
  velocity_x: number; // horizontal drift speed
  velocity_y: number; // initial upward speed
  peak_height_percent: number; // 25 to 70 (% of screen height from top)
  rotation_speed: number; // degrees per second
}

// Alias for backwards compatibility
export type BottleSpawn = ItemSpawn;
