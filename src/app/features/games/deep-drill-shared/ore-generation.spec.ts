import {
  GOLD_BUFFER_DEPTH,
  GOLD_UNLOCK_DEPTH,
  PLATINUM_UNLOCK_DEPTH,
  ROCK_UNLOCK_DEPTH,
  SILVER_BUFFER_DEPTH,
  SILVER_UNLOCK_DEPTH,
  pickUndergroundTile,
} from './ore-generation';

function fixedRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

/** Force ore pick: skip lava, pass ore gate, then weight roll. */
function forceOreRandom(weightRoll: number): () => number {
  return fixedRandom([0.99, 0.01, weightRoll]);
}

describe('pickUndergroundTile', () => {
  it('yields only copper before silver buffer', () => {
    const samples: string[] = [];

    for (let i = 0; i < 200; i += 1) {
      samples.push(pickUndergroundTile(SILVER_BUFFER_DEPTH - 1, forceOreRandom(i / 200)).kind);
    }

    expect(samples.includes('silver')).toBeFalse();
    expect(samples.includes('gold')).toBeFalse();
    expect(samples.includes('platinum')).toBeFalse();
    expect(samples.includes('copper')).toBeTrue();
  });

  it('can yield silver in the buffer zone before full unlock', () => {
    let sawSilver = false;
    for (let i = 0; i < 200; i += 1) {
      const kind = pickUndergroundTile(20, forceOreRandom(i / 200)).kind;
      if (kind === 'silver') {
        sawSilver = true;
        break;
      }
    }

    expect(sawSilver).toBeTrue();
    expect(SILVER_BUFFER_DEPTH).toBeLessThan(SILVER_UNLOCK_DEPTH);
  });

  it('does not yield gold before gold buffer', () => {
    const samples: string[] = [];

    for (let i = 0; i < 200; i += 1) {
      samples.push(pickUndergroundTile(GOLD_BUFFER_DEPTH - 1, forceOreRandom(i / 200)).kind);
    }

    expect(samples.includes('gold')).toBeFalse();
  });

  it('can yield gold in the buffer zone before full unlock', () => {
    let sawGold = false;
    for (let i = 0; i < 200; i += 1) {
      const kind = pickUndergroundTile(42, forceOreRandom(i / 200)).kind;
      if (kind === 'gold') {
        sawGold = true;
        break;
      }
    }

    expect(sawGold).toBeTrue();
    expect(GOLD_BUFFER_DEPTH).toBeLessThan(GOLD_UNLOCK_DEPTH);
  });

  it('can yield platinum only after unlock depth', () => {
    let sawPlatinum = false;
    for (let i = 0; i < 300; i += 1) {
      const kind = pickUndergroundTile(90, forceOreRandom(i / 300)).kind;
      if (kind === 'platinum') {
        sawPlatinum = true;
        break;
      }
    }

    expect(sawPlatinum).toBeTrue();
    expect(PLATINUM_UNLOCK_DEPTH).toBeGreaterThan(GOLD_UNLOCK_DEPTH);
  });

  it('does not spawn rocks before rock unlock depth', () => {
    const samples: string[] = [];

    for (let i = 0; i < 500; i += 1) {
      samples.push(pickUndergroundTile(ROCK_UNLOCK_DEPTH - 1, () => (i % 23) / 23).kind);
    }

    expect(samples.includes('rock')).toBeFalse();
  });

  it('can spawn rocks from rock unlock depth', () => {
    let sawRock = false;
    for (let i = 0; i < 200; i += 1) {
      // skip lava (0.99), then low roll hits rock chance
      if (pickUndergroundTile(ROCK_UNLOCK_DEPTH, fixedRandom([0.99, 0.05])).kind === 'rock') {
        sawRock = true;
        break;
      }
    }

    expect(sawRock).toBeTrue();
  });
});
