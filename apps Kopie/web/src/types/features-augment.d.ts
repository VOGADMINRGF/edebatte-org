// Spezifische Shims für named exports aus @features/*

// @features/user/context/UserContext → { UserProvider }
declare module "@features/user/context/UserContext" {
  export const UserProvider: any;
  export default UserProvider;
}

// @features/user/components/UserHydrator → default + type User
declare module "@features/user/components/UserHydrator" {
  const UserHydrator: any;
  export default UserHydrator;
  export type User = any;
}
