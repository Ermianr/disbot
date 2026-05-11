export type Passwords = {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
};

export const bunPasswords: Passwords = {
  hash(plain) {
    return Bun.password.hash(plain, { algorithm: "argon2id" });
  },
  verify(plain, hash) {
    return Bun.password.verify(plain, hash);
  },
};
