export const Loader = () => {
  return (
    <div className="flex gap-4 justify-center items-center  h-full w-full dark:invert">
      <span className="sr-only">Loading...</span>
      <div className="h-4 w-4 bg-black rounded-full animate-bounce [animation-delay:-0.2s]"></div>
      <div className="h-4 w-4 bg-black rounded-full animate-bounce [animation-delay:-0.1s]"></div>
      <div className="h-4 w-4 bg-black rounded-full animate-bounce"></div>
    </div>
  );
};
