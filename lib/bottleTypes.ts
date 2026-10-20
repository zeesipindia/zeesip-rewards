export type BottleType = 'mango' | 'pineapple' | 'gold' | 'expired';

export interface BottleSpawn {
  index: number;
  type: BottleType;
  appear_at_ms: number;
  start_x_percent: number; // 10 to 90
  velocity_x: number; // horizontal drift speed
  velocity_y: number; // initial upward speed
  peak_height_percent: number; // 30 to 70 (% of screen height from top)
  rotation_speed: number; // degrees per second
}
