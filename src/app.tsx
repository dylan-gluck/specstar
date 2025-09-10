import { useState, useEffect, useCallback } from "react";
import { useInput, useApp, Box, Text, useStdout } from "ink";
import PlanView from "./views/plan-view";
import ObserveView from "./views/ObserveView";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { ErrorBoundary } from "./components/error-boundary";
import { Logger } from "./lib/logger/index";
import { loadSettings } from "./lib/config/settings-loader";

type View = "plan" | "observe" | "help" | "welcome";

export default function App() {
  const [activeView, setActiveView] = useState<View | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 80, height: 24 });
  const [error, setError] = useState<Error | null>(null);
  const { exit } = useApp();
  const { stdout } = useStdout();
  const logger = new Logger("App");

  useInput((input) => {
    // Global navigation
    if (input === "p") {
      setActiveView("plan");
      logger.info("Switched to plan view");
    }
    if (input === "o") {
      setActiveView("observe");
      logger.info("Switched to observe view");
    }
    if (input === "h" || input === "?") {
      setActiveView("welcome");
      logger.info("Switched to welcome view");
    }
    // Error recovery
    if (input === "r" && error) {
      handleErrorRecovery();
    }
    // Global exit (when not in a specific view)
    if (input === "q" && activeView === "welcome") {
      logger.info("Exiting application");
      exit();
    }
  });

  useEffect(() => {
    // Initialize dimensions
    if (stdout) {
      setDimensions({
        width: stdout.columns || 80,
        height: stdout.rows || 24,
      });
    }

    // Load settings immediately without timer
    loadSettings()
      .then((settings) => {
        const startView =
          settings.startPage === "help" ? "welcome" : settings.startPage;
        setActiveView(startView as View);
        setSettingsLoaded(true);
        logger.info(
          `Initialized with ${startView} view (from settings.startPage: ${settings.startPage})`,
        );
      })
      .catch((error) => {
        // Fall back to welcome if settings fail to load
        setActiveView("welcome");
        setSettingsLoaded(true);
        logger.info(
          "Initialized with welcome view (fallback due to settings error)",
        );
      });
  }, [stdout]);

  // Handle terminal resize
  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      const newDimensions = {
        width: stdout.columns || 80,
        height: stdout.rows || 24,
      };
      setDimensions(newDimensions);
      logger.debug("Terminal resized", newDimensions);
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  // Error recovery handler
  const handleErrorRecovery = useCallback(() => {
    setError(null);
    setActiveView("welcome");
    logger.info("Error recovered, returning to welcome screen");
  }, []);

  // Loading state while settings are being loaded
  if (!settingsLoaded || activeView === null) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  // Global error fallback
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>
          Fatal Error
        </Text>
        <Text>{error.message}</Text>
        <Text color="gray">Press R to restart</Text>
      </Box>
    );
  }

  return (
    <ErrorBoundary
      name="App"
      fallback={(err, reset) => (
        <Box flexDirection="column" padding={1}>
          <Text color="red" bold>
            Application Error
          </Text>
          <Text>{err.message}</Text>
          <Text color="gray">Press R to retry • Q to quit</Text>
        </Box>
      )}
    >
      <Box flexDirection="column" flexGrow={1}>
        {/* Terminal size indicator in development */}
        {process.env.NODE_ENV === "development" && (
          <Box position="absolute" marginLeft={dimensions.width - 20}>
            <Text color="gray" dimColor>
              {dimensions.width}x{dimensions.height}
            </Text>
          </Box>
        )}

        {/* Welcome/Help Screen */}
        {activeView === "welcome" && (
          <ErrorBoundary name="WelcomeView">
            <Box
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              flexGrow={1}
            >
              <Gradient name="vice">
                <BigText font="tiny" text="SPECSTAR" />
              </Gradient>
              <Box width={31} marginTop={2} flexDirection="column">
                <Box
                  borderTop={false}
                  borderLeft={false}
                  borderRight={false}
                  borderStyle="classic"
                  borderColor="gray"
                  justifyContent="space-between"
                >
                  <Text bold>Plan</Text>
                  <Text bold color="green">
                    P
                  </Text>
                </Box>
                <Box
                  borderTop={false}
                  borderLeft={false}
                  borderRight={false}
                  borderStyle="classic"
                  borderColor="gray"
                  justifyContent="space-between"
                >
                  <Text bold>Observe</Text>
                  <Text bold color="green">
                    O
                  </Text>
                </Box>
                <Box
                  borderTop={false}
                  borderLeft={false}
                  borderRight={false}
                  borderStyle="classic"
                  borderColor="gray"
                  justifyContent="space-between"
                >
                  <Text bold>Quit</Text>
                  <Text bold color="green">
                    Q
                  </Text>
                </Box>
              </Box>
            </Box>
          </ErrorBoundary>
        )}

        {/* Plan View */}
        {activeView === "plan" && (
          <ErrorBoundary name="PlanView">
            <Box flexDirection="column" flexGrow={1} marginTop={1}>
              <Box
                borderStyle="classic"
                borderColor="green"
                paddingX={1}
                justifyContent="space-between"
              >
                <Text color="gray">
                  <Gradient name="vice">SS</Gradient> [PLAN]
                </Text>
                <Text color="gray">Press O for Observe • H for Help</Text>
              </Box>
              <PlanView />
            </Box>
          </ErrorBoundary>
        )}

        {/* Observe View */}
        {activeView === "observe" && (
          <ErrorBoundary name="ObserveView">
            <Box flexDirection="column" flexGrow={1} marginTop={1}>
              <Box
                borderStyle="classic"
                borderColor="green"
                paddingX={1}
                justifyContent="space-between"
              >
                <Text color="gray">
                  <Gradient name="vice">SS️</Gradient> [OBSERVE]
                </Text>
                <Text color="gray">Press P for Plan • H for Help</Text>
              </Box>
              <ObserveView />
            </Box>
          </ErrorBoundary>
        )}
      </Box>
    </ErrorBoundary>
  );
}
