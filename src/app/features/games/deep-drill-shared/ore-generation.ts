/**
 * Shared ore depth zones for Deep Drill games.
 * Absolute tile depth (same as HUD depth / player.y):
 * 0–14 → copper only
 * 15–24 → copper + silver buffer (teaser)
 * 25+ → silver common
 * 35–49 → gold buffer (teaser)
 * 50+ → gold common
 * 75+ → platinum
 * 100+ → rocks (and deeper hazard belt)
 */

export type DrillOreType = 'copper' | 'silver' | 'gold' | 'platinum';

export interface OrePickResult {
  kind: 'dirt' | 'rock' | 'lava' | DrillOreType;
}

/** Absolute depth thresholds (tile y / HUD depth). */
export const SILVER_BUFFER_DEPTH = 15;
export const SILVER_UNLOCK_DEPTH = 25;
export const GOLD_BUFFER_DEPTH = 35;
export const GOLD_UNLOCK_DEPTH = 50;
export const PLATINUM_UNLOCK_DEPTH = 75;
export const ROCK_UNLOCK_DEPTH = 100;

/** Max diggable depth (last tile row index). World height = this + 1. */
export const MAX_WORLD_DEPTH = 120;

/**
 * @param absoluteDepth - tile y (matches in-game depth HUD)
 */
export function pickUndergroundTile(absoluteDepth: number, random: () => number): OrePickResult {
  const depth = Math.max(0, absoluteDepth);

  // Lava only deep; gentle ramp from gold zone downward.
  const lavaChance =
    depth >= GOLD_UNLOCK_DEPTH ? 0.015 + ((depth - GOLD_UNLOCK_DEPTH) / 70) * 0.06 : 0;
  if (random() < lavaChance) {
    return { kind: 'lava' };
  }

  // Rocks only from depth 100 — early/mid dig stays soft.
  if (depth >= ROCK_UNLOCK_DEPTH) {
    const rockChance = 0.12 + ((depth - ROCK_UNLOCK_DEPTH) / (MAX_WORLD_DEPTH - ROCK_UNLOCK_DEPTH)) * 0.1;
    if (random() < rockChance) {
      return { kind: 'rock' };
    }
  }

  // Ore slightly more common deeper as a reward for risk.
  const oreChance = 0.05 + (Math.min(depth, ROCK_UNLOCK_DEPTH) / ROCK_UNLOCK_DEPTH) * 0.1;
  if (random() >= oreChance) {
    return { kind: 'dirt' };
  }

  return { kind: pickOreType(depth, random) };
}

function pickOreType(depth: number, random: () => number): DrillOreType {
  let copperWeight = 1;
  let silverWeight = 0;
  let goldWeight = 0;
  let platinumWeight = 0;

  if (depth < SILVER_BUFFER_DEPTH) {
    // Pure copper band.
    copperWeight = 1;
  } else if (depth < SILVER_UNLOCK_DEPTH) {
    // Buffer 15–24: rising silver teaser, copper still main.
    const t = (depth - SILVER_BUFFER_DEPTH) / (SILVER_UNLOCK_DEPTH - SILVER_BUFFER_DEPTH);
    copperWeight = 1.0 - t * 0.35;
    silverWeight = 0.2 + t * 0.55;
  } else if (depth < GOLD_BUFFER_DEPTH) {
    // 25–34: silver zone, no gold yet.
    const t = (depth - SILVER_UNLOCK_DEPTH) / (GOLD_BUFFER_DEPTH - SILVER_UNLOCK_DEPTH);
    copperWeight = 0.65 - t * 0.2;
    silverWeight = 0.75 + t * 0.25;
  } else if (depth < GOLD_UNLOCK_DEPTH) {
    // Buffer 35–49: gold teaser while silver/copper remain.
    const t = (depth - GOLD_BUFFER_DEPTH) / (GOLD_UNLOCK_DEPTH - GOLD_BUFFER_DEPTH);
    copperWeight = 0.45 - t * 0.15;
    silverWeight = 0.9 - t * 0.25;
    goldWeight = 0.25 + t * 0.55;
  } else {
    // 50+: gold common; platinum from 75.
    const t = (depth - GOLD_UNLOCK_DEPTH) / Math.max(1, MAX_WORLD_DEPTH - GOLD_UNLOCK_DEPTH);
    copperWeight = Math.max(0.08, 0.3 - t * 0.2);
    silverWeight = Math.max(0.15, 0.65 - t * 0.35);
    goldWeight = 0.55 + t * 0.55;
    platinumWeight =
      depth < PLATINUM_UNLOCK_DEPTH
        ? 0
        : 0.25 + ((depth - PLATINUM_UNLOCK_DEPTH) / (MAX_WORLD_DEPTH - PLATINUM_UNLOCK_DEPTH)) * 0.9;
  }

  const weights: Array<{ type: DrillOreType; weight: number }> = (
    [
      { type: 'copper' as const, weight: copperWeight },
      { type: 'silver' as const, weight: silverWeight },
      { type: 'gold' as const, weight: goldWeight },
      { type: 'platinum' as const, weight: platinumWeight },
    ] as const
  ).filter((entry) => entry.weight > 0);

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;

  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.type;
    }
  }

  return 'copper';
}
