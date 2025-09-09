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
      }),
  );

  const [currentSession, setCurrentSession] = useState<SessionData | null>(
    null,
  );
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SessionEvent[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
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
        // Select current session by default
        setSelectedSessionId(session.session_id);
      }

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start monitoring",
      );
    }
  };

  const loadHistory = async () => {
    try {
      const history = await monitor.getSessionHistory();
      setSessionHistory(history);
      // Select first session by default if none selected
      if (!selectedSessionId && history.length > 0) {
        setSelectedSessionId(history[0].session_id);
      }
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
    // Session list navigation
    if (key.upArrow && sessionHistory.length > 0) {
      const currentIndex = selectedSessionId
        ? sessionHistory.findIndex((s) => s.session_id === selectedSessionId)
        : -1;
      const newIndex = Math.max(0, currentIndex - 1);
      setSelectedSessionId(sessionHistory[newIndex]?.session_id || null);
    }
    if (key.downArrow && sessionHistory.length > 0) {
      const currentIndex = selectedSessionId
        ? sessionHistory.findIndex((s) => s.session_id === selectedSessionId)
        : -1;
      const newIndex = Math.min(sessionHistory.length - 1, currentIndex + 1);
      setSelectedSessionId(sessionHistory[newIndex]?.session_id || null);
    }

    // Select first session if none selected
    if (key.return && sessionHistory.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessionHistory[0]?.session_id || null);
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

  // Get selected session data
  const selectedSession = selectedSessionId
    ? sessionHistory.find((s) => s.session_id === selectedSessionId)
    : null;

  return (
    <Box minWidth={30} flexGrow={1} flexDirection="column">
      {/* Two-column layout as per ObserveViewContract */}
      <Box flexGrow={1} gap={1}>
        {/* Left Panel - Session List (30% width) */}
        <Box flexDirection="column">
          <Box
            borderStyle="round"
            borderColor="green"
            flexGrow={1}
            paddingX={1}
            flexDirection="column"
          >
            <Text bold color="yellow">
              Session List
            </Text>
            {sessionHistory.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                {sessionHistory.map((session) => (
                  <Box key={session.session_id}>
                    <Text
                      color={
                        selectedSessionId === session.session_id
                          ? "green"
                          : undefined
                      }
                      wrap="truncate-end"
                    >
                      <Text color={session.session_active ? "green" : "gray"}>
                        {"● "}
                      </Text>
                      {session.session_title || session.session_id}
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text color="gray">No sessions found</Text>
            )}
          </Box>
        </Box>

        {/* Right Panel - Session Dashboard (70% width) */}
        <Box flexGrow={1} flexDirection="column">
          {selectedSession ? (
            <SessionDashboard
              sessionId={selectedSession.session_id}
              sessionData={selectedSession}
              sessionStats={sessionStats}
            />
          ) : (
            <EmptyState />
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate • Enter Select • R Refresh • Q Quit
        </Text>
      </Box>
    </Box>
  );
}

// SessionDashboard component as per ObserveViewContract
function SessionDashboard({
  sessionId,
  sessionData,
  sessionStats,
}: {
  sessionId: string;
  sessionData: SessionData;
  sessionStats: SessionStats | null;
}) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Session data: Identity, Status, Created/Updated */}
      <Box
        width="100%"
        borderStyle="round"
        borderColor="green"
        flexDirection="column"
        paddingX={1}
      >
        {/* Identity section */}
        <Box width="100%" justifyContent="space-between" gap={1}>
          <Text bold color="yellow">
            {sessionData.session_title || "(untitled)"}
          </Text>
          <Text color={sessionData.session_active ? "green" : "gray"}>
            {sessionData.session_active ? "Active" : "Inactive"}
          </Text>
          <Text>
            Created: {new Date(sessionData.created_at).toLocaleString()}
          </Text>
        </Box>

        {/* Status section */}
        <Box width="100%" justifyContent="space-between" gap={1}>
          <Text>{sessionId}</Text>
          <Text>
            Updated: {new Date(sessionData.updated_at).toLocaleString()}
          </Text>
        </Box>
      </Box>

      <Box width="100%" gap={1} flexGrow={1}>
        <Box width="50%" flexGrow={1} flexDirection="column">
          {/* Agents section */}
          <Box
            width="100%"
            paddingX={1}
            borderStyle="round"
            borderColor="green"
            flexDirection="column"
            flexGrow={1}
          >
            <Text bold color="yellow">
              Agents
            </Text>
            <Text>Active: {sessionData.agents.join(", ") || "None"}</Text>
            <Text>History: {sessionData.agents_history.length} total</Text>
          </Box>

          {/* Tools section */}
          <Box
            paddingX={1}
            borderStyle="round"
            borderColor="green"
            flexDirection="column"
          >
            <Text bold color="yellow">
              Tools
            </Text>
            <Box width="100%" flexWrap="wrap">
              {Object.entries(sessionData.tools_used || {}).length > 0 ? (
                Object.entries(sessionData.tools_used).map(([tool, count]) => (
                  <Box width="33%">
                    <Text key={tool}>
                      {tool}: {count}
                    </Text>
                  </Box>
                ))
              ) : (
                <Text color="gray">No tools used</Text>
              )}
            </Box>
          </Box>
        </Box>

        {/* Files section */}
        <Box
          width="50%"
          paddingX={1}
          borderStyle="round"
          borderColor="green"
          flexDirection="column"
        >
          <Text bold color="yellow">
            Files
          </Text>
          <Text>
            New:{" "}
            <Text color="green">{sessionData.files?.new?.length || 0}</Text>
          </Text>
          <Text>
            Edited:{" "}
            <Text color="blue">{sessionData.files?.edited?.length || 0}</Text>
          </Text>
          <Text>
            Read:{" "}
            <Text color="gray">{sessionData.files?.read?.length || 0}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// EmptyState component as per ObserveViewContract
function EmptyState() {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      padding={2}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <Text color="gray" bold>
        No Session Selected
      </Text>
      <Text color="gray">
        Select a session from the left panel to view details
      </Text>
    </Box>
  );
}
