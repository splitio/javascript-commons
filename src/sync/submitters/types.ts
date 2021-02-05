export type ImpressionsPayload = {
  f: string, // Split name
  i: { // Key Impressions
    k: string; // Key
    t: string; // Treatment
    m: number; // Timestamp
    c: number; // ChangeNumber
    r?: string; // Rule label
    b?: string; // Bucketing Key
    pt?: number; // Previous time
  }[]
}[]

export type ImpressionCountsPayload = {
  pf: {
    f: string // Split name
    m: number // Time Frame
    rc: number // Count
  }[]
}
