// Loyihada `@types/react` yo'q (CLAUDE.md) — event handlerlardagi `React.FormEvent` /
// `React.ChangeEvent<T>` annotatsiyalari uchun ambient `React` namespace'ning
// minimal, real ishlatiladigan qismini shu yerda e'lon qilamiz.
declare namespace React {
  interface SyntheticEvent<T = Element> {
    readonly target: T;
    readonly currentTarget: T;
    preventDefault(): void;
  }

  type FormEvent<T = Element> = SyntheticEvent<T>;
  type ChangeEvent<T = Element> = SyntheticEvent<T>;

  interface DragEvent<T = Element> extends SyntheticEvent<T> {
    readonly dataTransfer: DataTransfer;
  }
}
