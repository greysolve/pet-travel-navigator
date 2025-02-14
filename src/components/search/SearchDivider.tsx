
export const SearchDivider = () => {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white/80 px-2 text-muted-foreground text-[1.15em] font-bold">
          Or
        </span>
      </div>
    </div>
  );
};

