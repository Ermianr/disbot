export type DbError =
  | { kind: "conflict"; field: string; constraint: string }
  | { kind: "notFound" }
  | { kind: "constraintFailed"; message: string }
  | { kind: "connectionFailed"; message: string }
  | { kind: "unexpected"; message: string };
