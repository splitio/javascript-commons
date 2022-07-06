import { IFilter } from "./types";

export class DictionaryFilter implements IFilter {
  
  private filter: string[] = [];
  
  constructor() {}

  add(data: string): boolean {
    try {
      this.filter.push(data);
      return true;
    } catch {
      return false;
    }
  }
  
  contains(data: string): boolean {
    return this.filter.indexOf(data) > -1;
  }
  
  clear(): void {
    this.filter = [];
  }
}
