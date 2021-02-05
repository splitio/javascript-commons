/* eslint-disable no-use-before-define */
/**
 * yallist implementation based on isaacs/yallist (https://github.com/isaacs/yallist/yallist.js),
 * with the minimal features used by the SDK.

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
**/

export class Node<T = any> {
  value: T;
  list: LinkedList<T> | null;
  next: Node<T> | null;
  prev: Node<T> | null;

  constructor(value: T, prev: Node<T> | null, next: Node<T> | null, list: LinkedList<T> | null) {
    this.list = list;
    this.value = value;

    if (prev) {
      prev.next = this;
      this.prev = prev;
    } else {
      this.prev = null;
    }

    if (next) {
      next.prev = this;
      this.next = next;
    } else {
      this.next = null;
    }
  }
}

export class LinkedList<T = any> {
  tail: Node<T> | null;
  head: Node<T> | null;
  length: number;

  constructor() {
    this.tail = null;
    this.head = null;
    this.length = 0;
  }

  // removes the given node of `this` list and returns the next node.
  removeNode(node: Node<T> | null): Node<T> | null | undefined {
    if (!node || !(node instanceof Node)) return;

    if (node.list !== this) {
      throw new Error('removing node which does not belong to this list');
    }

    var next = node.next;
    var prev = node.prev;

    if (next) {
      next.prev = prev;
    }

    if (prev) {
      prev.next = next;
    }

    if (node === this.head) {
      this.head = next;
    }
    if (node === this.tail) {
      this.tail = prev;
    }

    node.list.length--;
    node.next = null;
    node.prev = null;
    node.list = null;

    return next;
  }

  // Move a Node object to the front of the list. (That is, pull it out of wherever it lives, and make it the new head.)
  // If the node belongs to a different list, then that list will remove it first.
  unshiftNode(node: Node<T>) {
    if (!node || !(node instanceof Node)) return;

    if (node === this.head) {
      return;
    }

    if (node.list) {
      node.list.removeNode(node);
    }

    var head = this.head;
    node.list = this;
    node.next = head;
    if (head) {
      head.prev = node;
    }

    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
    this.length++;
  }

  // similar to Array.prototype.unshift, it adds one or more elements to the head of the list and returns the new length of the list.
  unshift() {
    for (var i = 0, l = arguments.length; i < l; i++) {
      this.head = new Node(arguments[i], null, this.head, this);
      if (!this.tail) {
        this.tail = this.head;
      }
      this.length++;
    }
    return this.length;
  }
}
