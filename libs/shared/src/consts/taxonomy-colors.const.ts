/**
 * Fixed brand palette for taxonomy entities (difficulty levels & impact types).
 * The admin colour picker offers exactly these tokens, the DB stores the token,
 * and each app maps token → concrete classes so contrast holds in both themes.
 * Keeping it a closed set (rather than arbitrary hex) guarantees on-brand,
 * legible badges everywhere.
 */
export const TAXONOMY_COLORS = ['green', 'amber', 'red', 'orange', 'blue', 'purple', 'slate', 'teal'] as const;

export type TTaxonomyColor = (typeof TAXONOMY_COLORS)[number];
