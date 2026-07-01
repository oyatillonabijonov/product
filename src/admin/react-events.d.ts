// This project has no `@types/react` dependency (see CLAUDE.md architecture notes —
// JSX/React usage typechecks today only because `noImplicitAny` is off). The admin
// components use explicit `React.FormEvent` / `React.ChangeEvent<T>` annotations on
// event handlers (per the reja3 task briefs), which requires the ambient `React`
// namespace to exist. Installing `@types/react` project-wide surfaces unrelated
// pre-existing type errors in `src/App.tsx` (framer-motion transition prop types),
// so instead we declare the minimal shape actually used here.
declare namespace React {
  interface SyntheticEvent<T = Element> {
    readonly target: T;
    preventDefault(): void;
  }

  type FormEvent<T = Element> = SyntheticEvent<T>;
  type ChangeEvent<T = Element> = SyntheticEvent<T>;
}
