import { useState } from "react";

export const useDialog = <T>() => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogData, _setDialogdata] = useState<T>();

  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  const openDialog = (data?: T) => {
    setIsDialogOpen(true);
    if (data) setDialogdata(data);
  };

  const setDialogdata = (data: T) => {
    _setDialogdata(data);
  };

  return {
    isDialogOpen,
    closeDialog,
    openDialog,
    dialogData
  };
};
