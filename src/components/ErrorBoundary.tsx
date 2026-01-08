import React, { Component, ErrorInfo, ReactNode } from "react";
import ServerError from "@/pages/ServerError";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, this would send to error tracking service
    if (import.meta.env.PROD) {
      // Suppress console in production
      console.error = () => {};
      console.warn = () => {};
      console.log = () => {};
    } else {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return <ServerError />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
