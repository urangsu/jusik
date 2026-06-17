export function shrinkHitRate(params: {
  observedHitRate: number | null;
  sampleSize: number;
  priorHitRate: number;
  priorStrength: number;
}): number | null {
  if (params.observedHitRate === null || params.observedHitRate === undefined) {
    return null;
  }

  return (
    (params.observedHitRate * params.sampleSize +
      params.priorHitRate * params.priorStrength) /
    (params.sampleSize + params.priorStrength)
  );
}

export function shrinkIc(params: {
  observedIc: number | null;
  sampleSize: number;
  priorIc: number;
  priorStrength: number;
}): number | null {
  if (params.observedIc === null || params.observedIc === undefined) {
    return null;
  }

  return (
    (params.observedIc * params.sampleSize +
      params.priorIc * params.priorStrength) /
    (params.sampleSize + params.priorStrength)
  );
}
