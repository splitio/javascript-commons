import { IBetweenMatcherData } from '../../dtos/types';

export function zeroSinceHH(millisSinceEpoch: number): number {
  return new Date(millisSinceEpoch).setUTCHours(0, 0, 0, 0);
}

export function zeroSinceSS(millisSinceEpoch: number): number {
  return new Date(millisSinceEpoch).setUTCSeconds(0, 0);
}

export function betweenDateTimeTransform(betweenMatcherData: IBetweenMatcherData): IBetweenMatcherData {
  return {
    dataType: betweenMatcherData.dataType,
    start: zeroSinceSS(betweenMatcherData.start),
    end: zeroSinceSS(betweenMatcherData.end)
  };
}
