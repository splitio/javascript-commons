import { readCSV } from '../../__tests__/testUtils/csv';
import { Semver } from '../Semver';

describe('Semver', () => {

  test('should throw an error if the version is invalid', async () => {
    const lines = await readCSV(require.resolve('../../evaluator/matchers/__tests__/mocks/invalid-semantic-versions.csv'));

    for (const [invalidVersion] of lines) {
      expect(() => new Semver(invalidVersion)).toThrow();
    }
  });

  test('should correctly parse the version', async () => {
    let semver = new Semver('1.2.3-rc.1');
    expect(semver.version).toBe('1.2.3-rc.1');

    // Although leading zeros are invalid in numeric identifiers, the parsing should sanitize them
    semver = new Semver('01.002.0-rc0.1.000');
    expect(semver.version).toBe('1.2.0-rc0.1.0');

    const lines = await readCSV(require.resolve('../../evaluator/matchers/__tests__/mocks/valid-semantic-versions.csv'));

    for (const [version1, version2] of lines) {
      const semver1 = new Semver(version1);
      expect(semver1.version).toBe(version1);

      const semver2 = new Semver(version2);
      expect(semver2.version).toBe(version2);
    }
  });

  test('should correctly compare versions', async () => {
    const target = new Semver('1.2.3-rc.1.2+meta.1.2');

    // Major
    expect(target.compare(new Semver('2.2.3-rc.1.2+meta.1.2'))).toBe(-1);
    expect(target.compare(new Semver('1.03.3-rc.1.2+meta.1.2'))).toBe(-1);
    expect(target.compare(new Semver('1.2.30-rc.1.2+meta.1.2'))).toBe(-1);
    expect(target.compare(new Semver('1.2.3-rc.2.2+meta.1.2'))).toBe(-1);
    expect(target.compare(new Semver('1.2.3-rc.1.2.3+meta.1.2'))).toBe(-1);
    expect(target.compare(new Semver('01.02.03-rc.01.02.03'))).toBe(-1);

    // Equals
    expect(target.compare(new Semver('1.2.3-rc.1.2'))).toBe(0);
    expect(target.compare(new Semver('1.2.3-rc.1.2+meta.1.2'))).toBe(0);
    expect(target.compare(new Semver('01.02.03-rc.01.02+meta.1.3'))).toBe(0);

    // Less
    expect(target.compare(new Semver('0.2.3-rc.1.2+meta.1.2'))).toBe(1);
    expect(target.compare(new Semver('1.01.3-rc.1.2+meta.1.2'))).toBe(1);
    expect(target.compare(new Semver('1.2.0-rc.1.2+meta.1.2'))).toBe(1);
    expect(target.compare(new Semver('1.2.3-rc.0.2.3+meta.1.2'))).toBe(1);
    expect(target.compare(new Semver('1.2.3-rc.1+meta.1.2'))).toBe(1);
    expect(target.compare(new Semver('01.02.03-rc.01'))).toBe(1);
  });

});
