/// <reference types="vite/client" />

import type { JSX as ReactJSX } from 'react';

// React 19's @types/react no longer exposes a global `JSX` namespace.
// This re-exposes it so existing `JSX.Element` annotations across the
// codebase keep compiling without per-file edits.
declare global {
    namespace JSX {
        type Element = ReactJSX.Element;
        type ElementType = ReactJSX.ElementType;
        type ElementClass = ReactJSX.ElementClass;
        type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
        type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
        type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
        type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
        type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
        type IntrinsicElements = ReactJSX.IntrinsicElements;
    }
}
