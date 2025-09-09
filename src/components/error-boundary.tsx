import React, { Component, ReactNode, ErrorInfo } from "react";
import { Box, Text } from "ink";
import { Logger } from "../lib/logger/index.ts";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private logger: Logger;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.logger = new Logger(`ErrorBoundary:${props.name || 'default'}`);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logger.error('Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      name: this.props.name
    });
    
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = () => {
    this.logger.info('Resetting error boundary', { name: this.props.name });
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="red"
          padding={1}
          margin={1}
        >
          <Text color="red" bold>
            ⚠️ An error occurred in {this.props.name || 'the application'}
          </Text>
          <Box marginTop={1}>
            <Text color="yellow">
              {this.state.error.message}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press R to retry • Q to quit • Check logs for details
            </Text>
          </Box>
          {process.env.NODE_ENV === 'development' && (
            <Box marginTop={1} flexDirection="column">
              <Text color="gray" dimColor>Stack trace:</Text>
              <Text color="gray" dimColor wrap="truncate">
                {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
              </Text>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  name?: string,
  fallback?: (error: Error, resetError: () => void) => ReactNode
) {
  return (props: P) => (
    <ErrorBoundary name={name} fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}