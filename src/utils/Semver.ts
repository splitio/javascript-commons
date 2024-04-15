import { isString } from '../utils/lang';

const NUMERIC_IDENTIFIER_REGEX = /^[0-9]+$/;

const METADATA_DELIMITER = '+';
const PRERELEASE_DELIMITER = '-';
const VALUE_DELIMITER = '.';

/**
 * Compares two strings. If both strings are numeric identifiers, they are compared numerically. Otherwise, they are compared lexicographically.
 * This could be implemented using `a.localeCompare(b, undefined, { numeric: true })` but locale options are not broadly supported.
 */
function compareStrings(a: string, b: string): number {
  if (NUMERIC_IDENTIFIER_REGEX.test(a) && NUMERIC_IDENTIFIER_REGEX.test(b)) {
    const result = a.length - b.length;
    if (result !== 0) {
      return result;
    }
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// Sanitizes a numeric identifier by removing leading zeros
function sanitizeNumericIdentifier(value: string): string {
  return value.replace(/^0+(?=\d)/, '');
}

function throwError(version: string) {
  throw new Error('Unable to convert to Semver, incorrect format: ' + version);
}

export class Semver {

  private readonly _major: string;
  private readonly _minor: string;
  private readonly _patch: string;
  private readonly _preRelease: string[];
  private readonly _isStable: boolean;

  // Version string for 'equal' and 'in list' comparisons
  public readonly version: string;

  public constructor(version: string) {
    if (!isString(version)) throwError(version);

    // Separate metadata if exists
    let index = version.indexOf(METADATA_DELIMITER);
    let [vWithoutMetadata, metadata] = index === -1 ? [version] : [version.slice(0, index), version.slice(index + 1)];
    if (metadata === '') throwError(version);

    // Set pre-release versions if exists
    index = vWithoutMetadata.indexOf(PRERELEASE_DELIMITER);
    if (index === -1) {
      this._isStable = true;
      this._preRelease = [];
    } else {
      this._isStable = false;
      this._preRelease = vWithoutMetadata.slice(index + 1).split(VALUE_DELIMITER).map((value) => {
        if (!value) throwError(version);
        return NUMERIC_IDENTIFIER_REGEX.test(value) ?
          sanitizeNumericIdentifier(value) :
          value;
      });
      vWithoutMetadata = vWithoutMetadata.slice(0, index);
    }

    // Set major, minor, and patch versions
    const vParts = vWithoutMetadata.split(VALUE_DELIMITER).map((value) => {
      if (!value || !NUMERIC_IDENTIFIER_REGEX.test(value)) throwError(version);
      return sanitizeNumericIdentifier(value);
    });

    if (vParts.length !== 3) throwError(version);
    this._major = vParts[0];
    this._minor = vParts[1];
    this._patch = vParts[2];

    // Set version string
    this.version = vParts.join(VALUE_DELIMITER);
    if (this._preRelease.length) this.version += PRERELEASE_DELIMITER + this._preRelease.join(VALUE_DELIMITER);
    if (metadata) this.version += METADATA_DELIMITER + metadata;
  }

  /**
   * Precedence comparision between 2 Semver objects.
   *
   * @return `0` if `this === toCompare`, `-1` if `this < toCompare`, and `1` if `this > toCompare`
   */
  public compare(toCompare: Semver): number {
    if (this.version === toCompare.version) return 0;

    let result = compareStrings(this._major, toCompare._major);
    if (result !== 0) return result;

    result = compareStrings(this._minor, toCompare._minor);
    if (result !== 0) return result;

    result = compareStrings(this._patch, toCompare._patch);
    if (result !== 0) return result;

    if (!this._isStable && toCompare._isStable) return -1;
    if (this._isStable && !toCompare._isStable) return 1;

    for (let i = 0, length = Math.min(this._preRelease.length, toCompare._preRelease.length); i < length; i++) {
      const result = compareStrings(this._preRelease[i], toCompare._preRelease[i]);
      if (result !== 0) return result;
    }

    return this._preRelease.length - toCompare._preRelease.length;
  }
}
