
import { useLocation, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const error = useRouteError();

  useEffect(() => {
    if (isRouteErrorResponse(error)) {
      console.error(
        "Route Error:",
        error.status,
        error.statusText,
        "at path:",
        location.pathname
      );
    } else if (error instanceof Error) {
      console.error(
        "Application Error:",
        error.message,
        "at path:",
        location.pathname
      );
    } else {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
