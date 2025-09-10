import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useApp, useFocusManager } from "ink";
import {
  SessionMonitor,
  type SessionData,
  type SessionStats,
  type SessionEvent,
} from "../lib/session-monitor";
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

function stripPrefix(string: string, prefix: string) {
  if (string.startsWith(prefix)) {
    return string.slice(prefix.length);
  }
  return string;
}

// SessionDashboard component as per ObserveViewContract
const SessionDashboard = React.memo(
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
        <Box borderStyle="classic" borderColor="green" paddingX={1}>
          {/* Identity section */}
          <Box flexBasis="50%" flexDirection="column">
            <Text bold>
              {sessionData.session_title || "(untitled)"}
              <Text color={sessionData.session_active ? "yellow" : "gray"}>
                {" ●"}
              </Text>
            </Text>
            <Text wrap="truncate-end">{sessionId}</Text>
          </Box>

          {/* Status section */}
          <Box flexBasis="50%" flexDirection="column" alignItems="flex-end">
            <Text wrap="truncate-start">
              {new Date(sessionData.created_at).toLocaleString()}
            </Text>
            <Text wrap="truncate-start">
              {new Date(sessionData.updated_at).toLocaleString()}
            </Text>
          </Box>
        </Box>

        <Box width="100%" gap={1} flexGrow={1}>
          {/* Left Column */}
          <Box flexGrow={1} flexBasis="50%" flexDirection="column">
            {/* Agents section */}
            <Box
              paddingX={1}
              borderStyle="classic"
              borderColor="green"
              flexDirection="column"
              flexGrow={1}
            >
              <Text bold color="gray">
                Agents
              </Text>

              <Box flexDirection="column">
                <Box
                  borderLeft={false}
                  borderRight={false}
                  borderBottom={false}
                  borderStyle="classic"
                  borderColor="gray"
                  flexDirection="column"
                >
                  <Text>
                    Active:{" "}
                    <Text color="green">
                      {sessionData.agents_history.filter(
                        (agent) => !agent.completed_at,
                      ).length || "0"}
                    </Text>
                  </Text>
                  <Box flexDirection="column">
                    {sessionData.agents_history.filter(
                      (agent) => !agent.completed_at,
                    ).length > 0 &&
                      sessionData.agents_history
                        .filter((agent) => !agent.completed_at)
                        .map((agent, index) => (
                          <Box
                            key={index}
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Text color={"gray"}>{agent.name}</Text>
                            <Text wrap="truncate-start" color={"gray"} dimColor>
                              {new Date(agent.started_at).toLocaleTimeString()}
                            </Text>
                          </Box>
                        ))}
                  </Box>
                </Box>
                <Box
                  borderLeft={false}
                  borderRight={false}
                  borderBottom={false}
                  borderStyle="classic"
                  borderColor="gray"
                  flexDirection="column"
                >
                  <Text>
                    Completed:{" "}
                    <Text color="green">
                      {sessionData.agents_history.filter(
                        (agent) => agent.completed_at,
                      ).length || "0"}
                    </Text>
                  </Text>
                  <Box flexDirection="column">
                    {sessionData.agents_history.filter(
                      (agent) => agent.completed_at,
                    ).length > 0 &&
                      sessionData.agents_history
                        .filter((agent) => agent.completed_at)
                        .map((agent, index) => (
                          <Box
                            key={index}
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Text color={"gray"}>{agent.name}</Text>
                            <Text wrap="truncate-start" color={"gray"} dimColor>
                              {agent.completed_at &&
                                new Date(
                                  agent.completed_at,
                                ).toLocaleTimeString()}
                            </Text>
                          </Box>
                        ))}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Tools section */}
            <Box
              paddingX={1}
              borderStyle="classic"
              borderColor="green"
              flexDirection="column"
            >
              <Text bold color="gray">
                Tools
              </Text>
              <Box flexWrap="wrap">
                {Object.entries(sessionData.tools_used || {}).length > 0 ? (
                  Object.entries(sessionData.tools_used).map(
                    ([tool, count]) => (
                      <Box
                        borderStyle="classic"
                        borderLeft={false}
                        borderRight={false}
                        borderBottom={false}
                        borderColor="gray"
                        key={tool}
                        flexBasis="25%"
                        flexGrow={1}
                        flexShrink={1}
                      >
                        <Text>
                          {tool}: <Text color="green">{count}</Text>
                        </Text>
                      </Box>
                    ),
                  )
                ) : (
                  <Text color="gray">No tools used</Text>
                )}
              </Box>
            </Box>
          </Box>

          {/* Right Column */}
          <Box flexGrow={1} flexBasis="50%" flexDirection="column">
            {/* Files section */}
            <Box
              flexGrow={1}
              paddingX={1}
              borderStyle="classic"
              borderColor="green"
              flexDirection="column"
            >
              <Text bold color="gray">
                Files
              </Text>
              <Box
                borderLeft={false}
                borderRight={false}
                borderBottom={false}
                borderStyle="classic"
                borderColor="gray"
                flexDirection="column"
              >
                <Text>
                  New:{" "}
                  <Text color="green">
                    {sessionData.files?.new?.length || 0}
                  </Text>
                </Text>
                <Box flexDirection="column" paddingRight={2}>
                  {sessionData.files.new.length > 0 &&
                    sessionData.files.new.slice(-5).map((file, index) => (
                      <Text wrap="truncate-start" key={index} color={"gray"}>
                        {stripPrefix(file, process.cwd() + "/")}
                      </Text>
                    ))}
                </Box>
              </Box>
              <Box
                borderLeft={false}
                borderRight={false}
                borderBottom={false}
                borderStyle="classic"
                borderColor="gray"
                flexDirection="column"
              >
                <Text>
                  Edited:{" "}
                  <Text color="green">
                    {sessionData.files?.edited?.length || 0}
                  </Text>
                </Text>
                <Box flexDirection="column" paddingRight={2}>
                  {sessionData.files.edited.length > 0 &&
                    sessionData.files.edited.slice(-5).map((file, index) => (
                      <Text wrap="truncate-start" key={index} color={"gray"}>
                        {stripPrefix(file, process.cwd() + "/")}
                      </Text>
                    ))}
                </Box>
              </Box>
              <Box
                borderLeft={false}
                borderRight={false}
                borderBottom={false}
                borderStyle="classic"
                borderColor="gray"
                flexDirection="column"
              >
                <Text>
                  Read:{" "}
                  <Text color="green">
                    {sessionData.files?.read?.length || 0}
                  </Text>
                </Text>
                <Box flexDirection="column" paddingRight={2}>
                  {sessionData.files.read.length > 0 &&
                    sessionData.files.read.slice(-5).map((file, index) => (
                      <Text wrap="truncate-start" key={index} color={"gray"}>
                        {stripPrefix(file, process.cwd() + "/")}
                      </Text>
                    ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.sessionId === nextProps.sessionId &&
      prevProps.sessionData.updated_at === nextProps.sessionData.updated_at &&
      JSON.stringify(prevProps.sessionStats) ===
        JSON.stringify(nextProps.sessionStats)
    );
  },
);

// EmptyState component as per ObserveViewContract
function EmptyState() {
  return (
    <Box
      borderStyle="classic"
      borderColor="gray"
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
