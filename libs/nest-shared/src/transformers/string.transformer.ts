import type { TransformFnParams } from 'class-transformer/types/interfaces';

/**
 * Trims a string field; collapses empty/whitespace-only to `undefined` so
 * `@IsOptional` lets it through validation. Non-string values pass through
 * untouched.
 */
export const TrimToUndefinedTransformer = ({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() || undefined : value;

/**
 * Trims and lowercases a string field — for free-form identifiers like login
 * where storage/lookup should be case-insensitive. Non-string values pass
 * through untouched.
 */
export const TrimLowercaseTransformer = ({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;
