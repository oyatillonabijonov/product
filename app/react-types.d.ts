// This project has no `@types/react` dependency (see CLAUDE.md architecture notes —
// JSX/React usage typechecks today only because `noImplicitAny` is off). RR v7's
// generated root/route modules (per its own scaffold templates) annotate
// `children: React.ReactNode`, which requires the ambient `React` namespace to
// exist. Mirrors the minimal-shape approach already used in
// `src/admin/react-events.d.ts` for event types — declare only what's used here
// instead of installing `@types/react` project-wide.
declare namespace React {
  type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;

  interface ReactElement {
    type: string | ((props: unknown) => ReactNode);
    props: unknown;
    key: string | number | null;
  }
}
