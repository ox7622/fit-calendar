/// <reference types="vite/client" />

import type { JSX as ReactJSX } from 'react';

// React 19's @types/react no longer exposes a global `JSX` namespace.
// This re-exposes it so `JSX.Element` annotations keep compiling
// without per-file edits. Mirrors apps/mini-app/src/vite-env.d.ts.
// The type names below must match React's JSX namespace contract exactly;
// the `I`/`T` prefix convention does not apply here.
/* eslint-disable @typescript-eslint/naming-convention */
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
