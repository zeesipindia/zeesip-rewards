export type BottleType = 'mango' | 'pineapple' | 'gold' | 'expired';

export interface BottleSpawn {
  index: number;
  type: BottleType;
  appear_at_ms: number;
  start_x_percent: number; // 0.10 to 0.90
  drift_x: number; // horizontal drift in pixels across flight (-80 to +80)
  peak_height_percent: number; // 0.28 to 0.68 (fraction of screen height from top)
  flight_duration_ms: number; // 2100 to 2500 ms
  initial_rotation: number; // -30 to +30 deg
  rotation_speed: number; // deg per second, e.g. -180 to +180
}
