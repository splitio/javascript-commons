export interface IFilter {
  add(data: string): boolean,
  contains(data: string): boolean,
  clear(): void
}
