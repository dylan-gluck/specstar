import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useApp, useFocusManager } from "ink";
import {
  SessionMonitor,
  type SessionData,
  type SessionStats,
  type SessionEvent,
} from "../lib/session-monitor";
import { SessionDashboard } from "../components/session-dashboard";
import { EmptyState } from "../components/empty-state";
import { join } from "node:path";

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
        // Update session in history if it exists
        setSessionHistory((prev) => {
          const updated = [...prev];
          const index = updated.findIndex(
            (s) => s.session_id === session.session_id,
          );
          if (index >= 0) {
            updated[index] = session;
          } else {
            // New session, add to history
            updated.unshift(session);
          }
          return updated;
        });

        // Update current session if it's the same one
        setCurrentSession((current) =>
          current?.session_id === session.session_id ? session : current,
        );

        // Update stats if this is the selected session
        if (selectedSessionId === session.session_id) {
          updateStats(session);
        }
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
        const firstSession = history[0];
        if (firstSession) {
          setSelectedSessionId(firstSession.session_id);
        }
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

  // Only update stats when selected session changes
  useEffect(() => {
    if (selectedSessionId) {
      const selected = sessionHistory.find(
        (s) => s.session_id === selectedSessionId,
      );
      if (selected) {
        updateStats(selected);
      }
    }
  }, [selectedSessionId, sessionHistory]);

  // Get selected session data - memoized to prevent recalculation
  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? sessionHistory.find((s) => s.session_id === selectedSessionId)
        : null,
    [selectedSessionId, sessionHistory],
  );

  return (
    <Box flexGrow={1} flexDirection="column">
      {/* Two-column layout as per ObserveViewContract */}
      <Box flexGrow={1} gap={1}>
        {/* Left Panel - Session List (30% width) */}
        <Box flexBasis="20%" minWidth={30} flexDirection="column">
          <Box
            borderStyle="classic"
            borderColor="green"
            flexGrow={1}
            paddingX={1}
            flexDirection="column"
            overflow="hidden"
          >
            <Text bold color="gray">
              Sessions
            </Text>
            {sessionHistory.length > 0 ? (
              <Box
                borderLeft={false}
                borderRight={false}
                borderBottom={false}
                borderStyle="classic"
                borderColor="gray"
                flexDirection="column"
              >
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
                      <Text color={session.session_active ? "yellow" : "gray"}>
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
        <Box flexBasis="80%" flexDirection="column">
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
      <Box>
        <Text color="gray" dimColor>
          ↑↓ Navigate • Enter Select • R Refresh • Q Quit
        </Text>
      </Box>
    </Box>
  );
}
