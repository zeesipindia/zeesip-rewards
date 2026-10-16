export type BottleType = 'mango' | 'pineapple' | 'gold' | 'expired';

export interface BottleSpawn {
  index: number;
  type: BottleType;
  appear_at_ms: number;
  start_x: number; // 15 to 85 (%)
  arc_height: number; // 55 to 80 (% of height)
  speed: number; // duration in ms (2000 to 2400)
}
