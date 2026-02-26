export type Season = 1 | 2 | 3 | 4;

export interface TrainingMetric {
  season: Season;
  accuracy: number;
  forgetting: number;
  timestamp: number;
}

export interface AugmentationSettings {
  rotation: boolean;
  shear: boolean;
  zoom: boolean;
  flip: boolean;
  elastic: boolean;
}

export interface SimulationState {
  currentSeason: Season;
  isTraining: boolean;
  mode: 'naive' | 'ewc';
  augmentations: AugmentationSettings;
  history: {
    naive: TrainingMetric[];
    ewc: TrainingMetric[];
  };
}

export const CROP_CLASSES = [
  "Tomato Healthy",
  "Tomato Late Blight",
  "Potato Early Blight",
  "Potato Healthy",
  "Corn Common Rust",
  "Corn Healthy"
];

export const SEASON_DESCRIPTIONS = {
  1: "Spring (Baseline): Clear lighting, standard conditions.",
  2: "Summer (Drift): High brightness, high contrast, harsh shadows.",
  3: "Autumn (Drift): Low light, motion blur, foggy conditions.",
  4: "Winter (Extreme): High noise, desaturated colors, frost artifacts."
};
