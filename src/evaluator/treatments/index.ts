import { ISplitPartition } from '../../dtos/types';
import { findIndex } from '../../utils/lang';

export class Treatments {

  private _ranges: number[];
  private _treatments: string[];

  constructor(ranges: number[], treatments: string[]) {
    if (ranges[ranges.length - 1] !== 100) {
      throw new RangeError('Provided invalid dataset as input');
    }

    this._ranges = ranges;
    this._treatments = treatments;
  }

  static parse(data: ISplitPartition[]) {
    let { ranges, treatments } = data.reduce((accum, value) => {
      let { size, treatment } = value;

      accum.ranges.push(accum.inc += size);
      accum.treatments.push(treatment);

      return accum;
    }, {
      inc: 0,
      ranges: [],
      treatments: []
    } as { inc: number, ranges: number[], treatments: string[] });

    return new Treatments(ranges, treatments);
  }

  getTreatmentFor(x: number): string {
    if (x < 0 || x > 100) {
      throw new RangeError('Please provide a value between 0 and 100');
    }

    // Readme [1]
    // We need to manually add any dependency which escape of dummy resolution
    // I'll deal with this in a future release
    // for (let [k, r] of this._ranges.entries()) {
    //   if (x <= r) return this._treatments[k];
    // }

    const index = findIndex(this._ranges, range => x <= range);
    const treatment = this._treatments[index];

    return treatment;
  }

}
