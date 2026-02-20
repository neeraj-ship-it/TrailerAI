"use client";
import { signOutAction } from "@/actions/userActions";
import { useVerifyToken } from "@/service";
import { useEffect, useState } from "react";
import { Spinner } from "./ui/spinner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isValidUser, setIsValidUser] = useState(false);
  const { mutateAsync: verifyTokenMutation } = useVerifyToken();

  useEffect(() => {
    verifyTokenMutation()
      .then((response) => {
        if (response.status !== 200) {
          signOutAction();
        } else {
          setIsValidUser(true);
        }
      })
      .catch(() => {
        signOutAction();
      });
    setIsValidUser(true);
  }, []);

  if (!isValidUser)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner />
      </div>
    );

  return children;
};

export default ProtectedRoute;
