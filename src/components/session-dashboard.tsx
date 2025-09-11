import React from "react";
import { Box, Text } from "ink";
import { type SessionData, type SessionStats } from "../lib/session-monitor";

function stripPrefix(string: string, prefix: string) {
  if (string.startsWith(prefix)) {
    return string.slice(prefix.length);
  }
  return string;
}

// SessionDashboard component as per ObserveViewContract
export const SessionDashboard = React.memo(
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
              overflow="hidden"
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
                        flexBasis="50%"
                        flexGrow={1}
                        flexShrink={0}
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
                    sessionData.files.new.slice(-10).map((file, index) => (
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
                    sessionData.files.edited.slice(-10).map((file, index) => (
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
                    sessionData.files.read.slice(-10).map((file, index) => (
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
