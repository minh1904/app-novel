// Helper for parse5 DOM traversal. Never runs embedded scripts.
import type { DefaultTreeAdapterTypes } from 'parse5'

export type Document = DefaultTreeAdapterTypes.Document
export type Element = DefaultTreeAdapterTypes.Element
export type TextNode = DefaultTreeAdapterTypes.TextNode
export type Node = DefaultTreeAdapterTypes.Node
export type ChildNode = DefaultTreeAdapterTypes.ChildNode

export function isElement(node: ChildNode): node is Element {
  return (
    node.nodeName !== '#text' &&
    node.nodeName !== '#comment' &&
    node.nodeName !== '#document' &&
    'childNodes' in node
  )
}

export function isText(node: ChildNode): node is TextNode {
  return node.nodeName === '#text'
}

export function* walk(nodes: ChildNode[]): Generator<ChildNode> {
  for (const node of nodes) {
    yield node
    if (isElement(node)) yield* walk(node.childNodes)
  }
}

export function findAll(nodes: ChildNode[], predicate: (n: ChildNode) => boolean): ChildNode[] {
  const result: ChildNode[] = []
  for (const node of walk(nodes)) {
    if (predicate(node)) result.push(node)
  }
  return result
}

export function attr(el: Element, name: string): string | undefined {
  return el.attrs.find((a) => a.name === name)?.value
}
