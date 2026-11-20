declare module "*/flow-rules.mjs" {
  export const SIDES: string[]
  export const EDGE_KINDS: string[]
  export const NODE_TYPES: string[]
  export const DIRECTIONS: string[]
  export const UPDATE_TAGS: string[]
  export const PALETTE: string[]
  export const RESERVED_COLORS: string[]
  export const CARD: { w: number; h: number }
  export function cardHeight(node: object): number
  export function isSafeHref(href: unknown): boolean
  export function edgeScenarios(
    edge: { from: string; to: string; scenarios?: string[] },
    nodeById: Map<string, { scenarios: string[] }>,
  ): string[]
  export function checkFlow(flow: unknown): { errors: string[]; warnings: string[] }
}
