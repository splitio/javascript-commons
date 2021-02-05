import { ImpressionDTO } from '../../types';

const UNKNOWN = 'UNKNOWN';

function _unknownIfNull(s: any) {
  return s ? s : UNKNOWN;
}

function _zeroIfNull(l: any) {
  return l ? l : 0;
}

export default function buildKey(impression: ImpressionDTO) {
  return `${_unknownIfNull(impression.keyName)}
    :${_unknownIfNull(impression.feature)}
    :${_unknownIfNull(impression.treatment)}
    :${_unknownIfNull(impression.label)}
    :${_zeroIfNull(impression.changeNumber)}`;
}
