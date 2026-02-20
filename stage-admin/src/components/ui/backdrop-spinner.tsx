import { Spinner } from "./spinner";

export const BackdropSpinner = () => {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
};
