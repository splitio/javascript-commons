import { IMetadata } from '../../dtos/types';
import { SplitIO } from '../../types';

export type ImpressionsPayload = {
  /** Split name */
  f: string,
  /** Key Impressions */
  i: {
    /** Key */
    k: string;
    /** Treatment */
    t: string;
    /** Timestamp */
    m: number;
    /** ChangeNumber */
    c: number;
    /** Rule label */
    r?: string;
    /** Bucketing Key */
    b?: string;
    /** Previous time */
    pt?: number;
  }[]
}[]

export type ImpressionCountsPayload = {
  pf: {
    /** Split name */
    f: string
    /** Time Frame */
    m: number
    /** Count */
    rc: number
  }[]
}

export type StoredImpressionWithMetadata = {
  /** Metadata */
  m: IMetadata,
  /** Stored impression */
  i: {
    /** keyName */
    k: string,
    /** bucketingKey */
    b?: string,
    /** Split name */
    f: string,
    /** treatment */
    t: string,
    /** label */
    r: string,
    /** changeNumber */
    c: number,
    /** time */
    m: number
  }
}

export type StoredEventWithMetadata = {
  /** Metadata */
  m: IMetadata,
  /** Stored event */
  e: SplitIO.EventData
}
