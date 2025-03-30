
import React from "react";

export const NoResults = ({ message }: { message: string }) => {
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 text-left">
      <p>{message}</p>
    </div>
  );
};
