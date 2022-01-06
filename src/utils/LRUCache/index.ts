import { IMap, _Map } from '../lang/maps';
import { LinkedList, Node } from './LinkedList';

export class LRUCache<K, V> {
  maxLen: number;
  items: IMap<K, Node<{ key: K, value: V }>>;
  lru: LinkedList<{ key: K, value: V }>;

  constructor(maxSize?: number) {
    this.maxLen = maxSize || 1;
    this.items = new _Map();
    this.lru = new LinkedList();
  }

  get(key: K) {
    const node = this.items.get(key);
    if (!node || !(node instanceof Node)) return;

    this.lru.unshiftNode(node); // Move to front

    return node.value.value;
  }

  set(key: K, value: V) {
    const node = this.items.get(key);

    if (node) {
      if (!(node instanceof Node)) return false;
      this.lru.unshiftNode(node); // Move to front
      (this.lru.head as Node).value.value = value; // Update value
    } else {
      if (this.lru.length === this.maxLen) {  // Remove last
        const last = this.lru.tail;
        if (!last) return false;
        this.items.delete(last.value.key);
        this.lru.removeNode(this.lru.tail); // Remove node
      }
      // @ts-ignore
      this.lru.unshift({ key, value }); // Push front
      this.items.set(key, this.lru.head as Node<{ key: K, value: V }>);
    }
    return true;
  }
}
