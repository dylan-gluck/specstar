import { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useFocusManager } from "ink";
import {
  SessionMonitor,
  type SessionData,
  type SessionStats,
  type SessionEvent,
} from "../lib/session-monitor";
import { join } from "node:path";
import chalk from "chalk";

export default function ObserveView() {
  const { exit } = useApp();
  const { focus } = useFocusManager();

  const [monitor] = useState(
    () =>
      new SessionMonitor({
        sessionPath: join(process.cwd(), ".specstar", "sessions"),
        claudePath: join(process.cwd(), ".claude"),
        pollingInterval: 100,
        debounceDelay: 50,
      })
  );

  const [currentSession, setCurrentSession] = useState<SessionData | null>(
    null
  );
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SessionEvent[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [activePane, setActivePane] = useState<"current" | "history" | "stats">(
    "current"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Start monitoring
    startMonitoring();

    // Cleanup on unmount
    return () => {
      monitor.stop();
    };
  }, []);

  const startMonitoring = async () => {
    try {
      await monitor.start();

      // Set up event listeners
      monitor.onUpdate((session) => {
        setCurrentSession(session);
        updateStats(session);
      });

      monitor.on("sessionStart", (session: SessionData) => {
        addEvent({
          type: "session_start",
          timestamp: new Date().toISOString(),
          data: session,
        });
      });

      monitor.on("sessionEnd", (data: any) => {
        addEvent({
          type: "session_end",
          timestamp: new Date().toISOString(),
          data,
        });
        loadHistory(); // Refresh history when session ends
      });

      monitor.on("fileChange", (file: any) => {
        addEvent({
          type: "file_change",
          timestamp: new Date().toISOString(),
          data: file,
        });
      });

      monitor.on("command", (cmd: any) => {
        addEvent({
          type: "command",
          timestamp: new Date().toISOString(),
          data: cmd,
        });
      });

      monitor.on("error", (err: any) => {
        setError(err.message || "Unknown error");
        addEvent({
          type: "error",
          timestamp: new Date().toISOString(),
          data: err,
        });
      });

      // Load initial data
      const session = monitor.getCurrentSession();
      setCurrentSession(session);
      if (session) {
        updateStats(session);
      }

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start monitoring"
      );
    }
  };

  const loadHistory = async () => {
    try {
      const history = await monitor.getSessionHistory();
      setSessionHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  };

  const updateStats = (session: SessionData) => {
    const stats = monitor.getSessionStats(session.session_id);
    setSessionStats(stats);
  };

  const addEvent = (event: SessionEvent) => {
    setRecentEvents((prev) => [event, ...prev].slice(0, 10)); // Keep last 10 events
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  useInput((input, key) => {
    // Pane navigation
    if (input === "1") {
      setActivePane("current");
      focus("current-session");
    }
    if (input === "2") {
      setActivePane("history");
      focus("session-history");
    }
    if (input === "3") {
      setActivePane("stats");
      focus("session-stats");
    }

    // History navigation
    if (activePane === "history") {
      if (key.upArrow && selectedHistoryIndex > 0) {
        setSelectedHistoryIndex(selectedHistoryIndex - 1);
      }
      if (key.downArrow && selectedHistoryIndex < sessionHistory.length - 1) {
        setSelectedHistoryIndex(selectedHistoryIndex + 1);
      }
    }

    // Refresh
    if (input === "r") {
      loadHistory();
    }

    // Exit
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    focus("current-session");
  }, []);

  return (
    <Box flexGrow={1} flexDirection="column" marginTop={2} marginX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Session Monitor
        </Text>
        {error && <Text color="red"> - Error: {error}</Text>}
      </Box>

      {/* Main content area */}
      <Box flexGrow={1} gap={1}>
        {/* Left column - Current Session and Events */}
        <Box width="50%" flexDirection="column" gap={1}>
          {/* Current Session */}
          <Box
            borderStyle="round"
            borderColor={activePane === "current" ? "green" : "gray"}
            flexGrow={1}
            padding={1}
            flexDirection="column"
          >
            <Text bold>[1] Current Session</Text>
            {currentSession ? (
              <Box flexDirection="column" marginTop={1}>
                <Text>
                  ID: <Text color="yellow">{currentSession.session_id.slice(0, 8)}...</Text>
                </Text>
                <Text>
                  Title: <Text color="cyan">{currentSession.session_title || "(untitled)"}</Text>
                </Text>
                <Text>
                  Started:{" "}
                  <Text color="green">
                    {formatTimestamp(currentSession.created_at)}
                  </Text>
                </Text>
                <Text>
                  Updated:{" "}
                  <Text color="blue">
                    {formatTimestamp(currentSession.updated_at)}
                  </Text>
                </Text>
                <Text>
                  Status:{" "}
                  <Text color={currentSession.session_active ? "green" : "yellow"}>
                    {currentSession.session_active ? "Active" : "Inactive"}
                  </Text>
                </Text>
                <Text>
                  Active Agents:{" "}
                  <Text color="magenta">
                    {currentSession.agents.length > 0 
                      ? currentSession.agents.join(", ")
                      : "None"}
                  </Text>
                </Text>
                <Text>
                  Files:{" "}
                  <Text color="green">+{currentSession.files?.new?.length || 0}</Text>{" "}
                  <Text color="yellow">~{currentSession.files?.edited?.length || 0}</Text>{" "}
                  <Text color="blue">⟳{currentSession.files?.read?.length || 0}</Text>
                </Text>
              </Box>
            ) : (
              <Text color="gray">No active session</Text>
            )}
          </Box>

          {/* Recent Events */}
          <Box
            borderStyle="round"
            borderColor="gray"
            flexGrow={1}
            padding={1}
            flexDirection="column"
          >
            <Text bold>Recent Events</Text>
            {recentEvents.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                {recentEvents.map((event, index) => (
                  <Box key={index} marginBottom={0}>
                    <Text color="gray">
                      {formatTimestamp(event.timestamp)}{" "}
                    </Text>
                    <Text
                      color={
                        event.type === "session_start"
                          ? "green"
                          : event.type === "session_end"
                          ? "yellow"
                          : event.type === "file_change"
                          ? "blue"
                          : event.type === "command"
                          ? "magenta"
                          : event.type === "error"
                          ? "red"
                          : "white"
                      }
                    >
                      {event.type.replace("_", " ")}
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text color="gray">No recent events</Text>
            )}
          </Box>
        </Box>

        {/* Right column - History and Stats */}
        <Box width="50%" flexDirection="column" gap={1}>
          {/* Session History */}
          <Box
            borderStyle="round"
            borderColor={activePane === "history" ? "green" : "gray"}
            flexGrow={1}
            padding={1}
            flexDirection="column"
          >
            <Text bold>[2] Session History</Text>
            {sessionHistory.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                {sessionHistory.slice(0, 5).map((session, index) => (
                  <Box
                    key={session.session_id}
                    backgroundColor={
                      activePane === "history" && selectedHistoryIndex === index
                        ? "gray"
                        : undefined
                    }
                  >
                    <Text color={session.session_active ? "green" : "white"}>
                      {formatTimestamp(session.created_at)} -{" "}
                      {session.session_id.slice(0, 8)}
                      {session.session_active && <Text color="green"> [ACTIVE]</Text>}
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text color="gray">No session history</Text>
            )}
          </Box>

          {/* Session Stats */}
          <Box
            borderStyle="round"
            borderColor={activePane === "stats" ? "green" : "gray"}
            flexGrow={1}
            padding={1}
            flexDirection="column"
          >
            <Text bold>[3] Session Statistics</Text>
            {sessionStats ? (
              <Box flexDirection="column" marginTop={1}>
                <Text>
                  Duration:{" "}
                  <Text color="cyan">
                    {formatDuration(sessionStats.duration)}
                  </Text>
                </Text>
                <Text>
                  Files: <Text color="green">+{sessionStats.filesCreated}</Text>{" "}
                  <Text color="yellow">~{sessionStats.filesModified}</Text>{" "}
                  <Text color="blue">⟳{sessionStats.filesRead || 0}</Text>
                </Text>
                <Text>
                  Commands:{" "}
                  <Text color="green">{sessionStats.commandsSucceeded} OK</Text>{" "}
                  <Text color="red">{sessionStats.commandsFailed} Failed</Text>
                </Text>
                <Text>
                  Total Commands:{" "}
                  <Text color="blue">{sessionStats.commandsExecuted}</Text>
                </Text>
              </Box>
            ) : (
              <Text color="gray">No statistics available</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          [1-3] Switch Panes • [R] Refresh • [Q] Quit • ↑↓ Navigate History
        </Text>
      </Box>
    </Box>
  );
}
