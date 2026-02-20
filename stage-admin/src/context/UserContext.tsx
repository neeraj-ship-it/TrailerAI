"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useSignInWithPassword } from "@/service";
import { signOutAction, signInAction } from "@/actions/userActions";
import { DecodedAccessToken, User } from "@/types/user";
import { jwtDecode } from "jwt-decode";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";

type UserContextType = {
  user: User | null;
  privileges: Array<string>;
  error: Error | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  checkPrivilege: (
    pageName: ProtectedRoutesEnum,
    permission: PrivilegeTypesEnum
  ) => boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  privileges: [],
  error: null,
  signOut: () => Promise.resolve(),
  isAuthenticated: false,
  isLoading: false,
  signInWithPassword: () => Promise.resolve(),
  checkPrivilege: () => false,
});

export const UserContextProvider = ({
  privileges: defaultPrivileges,
  children,
}: {
  privileges: Array<string>;
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [privileges, setPrivileges] =
    useState<Array<string>>(defaultPrivileges);
  const [isLoading] = useState(true);

  const {
    mutateAsync: signInWithPasswordMutation,
    error: signInWithPasswordError,
  } = useSignInWithPassword();

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await signInWithPasswordMutation({ email, password });
        const data = await response.json();
        const tokenPayload = jwtDecode<DecodedAccessToken>(data.accessToken);
        const userPrivileges = tokenPayload.privileges || [];
        setPrivileges(userPrivileges);
        await signInAction(tokenPayload, data.accessToken);
      } catch (e) {
        console.error(e);
      }
    },
    [signInWithPasswordMutation]
  );

  const signOut = useCallback(async () => {
    setUser(null);
    setPrivileges([]);
    await signOutAction();
  }, []);

  // Function to verify if the user has the necessary privileges to access a specific page.
  // Returns true if the user has:
  // - Full Access (FULL_ACCESS)
  // - Full access to the specific page (${pageName}_ALL)
  // - The specific permission for the page (${pageName}_${permission})
  const checkPrivilege = useCallback(
    (pageName: ProtectedRoutesEnum, permission: PrivilegeTypesEnum) => {
      return privileges.some((privilege) => {
        return (
          privilege === PrivilegeTypesEnum.FULL_ACCESS ||
          privilege === `${pageName}_${PrivilegeTypesEnum.ALL}` ||
          privilege === `${pageName}_${permission}`
        );
      });
    },
    [privileges]
  );

  const contextValues = useMemo(
    () => ({
      user,
      privileges,
      signInWithPassword,
      signOut,
      error: signInWithPasswordError,
      isAuthenticated: !!user && !isLoading,
      isLoading,
      checkPrivilege,
    }),
    [
      user,
      privileges,
      signInWithPassword,
      signOut,
      isLoading,
      signInWithPasswordError,
      checkPrivilege,
    ]
  );

  return (
    <UserContext.Provider value={contextValues}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
