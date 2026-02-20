import React from "react";

import { FaSignOutAlt } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useUser } from "@/context/UserContext";

export const UserInfo = () => {
  const { signOut } = useUser();
  return (
    <Popover>
      <PopoverTrigger className="flex items-center absolute right-6 cursor-pointer">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="w-auto bg-popover">
        <div
          onClick={signOut}
          className="flex justify-between items-center hover:bg-background py-2 px-4 m-1 cursor-pointer"
        >
          <FaSignOutAlt className="mr-2" /> {/* Logout icon */}
          Logout
        </div>
      </PopoverContent>
    </Popover>
  );
};
