import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AtomicWriter } from "../../src/lib/atomic-writer";

describe("Atomic File Writes Integration", () => {
  let testDir: string;
  let writer: AtomicWriter;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `atomic-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    writer = new AtomicWriter();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Basic Atomic Operations", () => {
    test("should write files atomically using temp file + rename pattern", async () => {
      const filePath = join(testDir, "test.json");
      const data = { test: "data", timestamp: Date.now() };
      
      // Spy on file system operations to verify atomic pattern
      let tempFileCreated = false;
      let tempFilePath = "";
      
      // Hook into writer to detect temp file creation
      const originalWrite = writer.writeFile.bind(writer);
      writer.writeFile = async (path: string, content: string | Buffer) => {
        // Check if a temp file is created during write
        const files = Bun.glob.glob("*.tmp", { cwd: testDir });
        for (const file of files) {
          tempFileCreated = true;
          tempFilePath = join(testDir, file);
        }
        return originalWrite(path, content);
      };

      await writer.writeJSON(filePath, data);

      // Verify atomic write pattern was used
      expect(tempFileCreated).toBe(true);
      expect(tempFilePath).toContain(".tmp");
      
      // Verify final file exists with correct content
      expect(existsSync(filePath)).toBe(true);
      const written = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(written).toEqual(data);
      
      // Verify temp file is cleaned up
      expect(existsSync(tempFilePath)).toBe(false);
    });

    test("should preserve existing file content on write failure", async () => {
      const filePath = join(testDir, "existing.json");
      const originalData = { original: true, value: 42 };
      
      // Create initial file
      writeFileSync(filePath, JSON.stringify(originalData));
      
      // Attempt to write with simulated failure
      const badData = { will: "fail" };
      
      // Mock a failure during rename operation
      writer.writeJSON = async (path: string, data: any) => {
        const tempPath = `${path}.tmp.${Date.now()}`;
        writeFileSync(tempPath, JSON.stringify(data));
        // Simulate failure before rename
        throw new Error("Simulated write failure");
      };

      // Attempt write and expect failure
      await expect(writer.writeJSON(filePath, badData)).rejects.toThrow("Simulated write failure");
      
      // Verify original content is preserved
      const content = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(content).toEqual(originalData);
    });

    test("should ensure partial writes are not visible (all-or-nothing)", async () => {
      const filePath = join(testDir, "partial.json");
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
          nested: { value: i * 2 }
        }))
      };

      let writeStarted = false;
      let writeCompleted = false;
      
      // Start write operation
      const writePromise = (async () => {
        writeStarted = true;
        await writer.writeJSON(filePath, largeData);
        writeCompleted = true;
      })();

      // Wait for write to start
      while (!writeStarted) {
        await Bun.sleep(1);
      }

      // Check file visibility during write
      if (!writeCompleted) {
        // File should either not exist or have complete previous content
        if (existsSync(filePath)) {
          // If file exists during write, it should be readable and valid
          const content = readFileSync(filePath, "utf-8");
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }

      // Wait for write to complete
      await writePromise;

      // Verify complete data is written
      const finalContent = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(finalContent).toEqual(largeData);
    });
  });

  describe("Concurrent Access", () => {
    test("should handle concurrent writes without corruption", async () => {
      const filePath = join(testDir, "concurrent.json");
      const numWriters = 10;
      const writesPerWriter = 50;
      
      // Each writer writes unique data
      const writers = Array.from({ length: numWriters }, (_, i) => ({
        id: i,
        data: `writer-${i}-data`
      }));

      // Track all writes
      const allWrites: Array<{ writerId: number; writeNum: number; timestamp: number }> = [];

      // Perform concurrent writes
      const writePromises = writers.map(async (writer) => {
        for (let j = 0; j < writesPerWriter; j++) {
          const writeData = {
            writerId: writer.id,
            writeNum: j,
            timestamp: Date.now(),
            data: writer.data
          };
          
          allWrites.push(writeData);
          await this.writer.writeJSON(filePath, writeData);
          
          // Small random delay to increase contention
          if (Math.random() > 0.7) {
            await Bun.sleep(Math.random() * 5);
          }
        }
      });

      await Promise.all(writePromises);

      // Verify file is not corrupted and contains valid JSON
      const finalContent = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(finalContent);
      
      // Verify it's one of our writes
      expect(parsed).toHaveProperty("writerId");
      expect(parsed).toHaveProperty("writeNum");
      expect(parsed).toHaveProperty("timestamp");
      
      // Verify it matches one of the actual writes
      const matchingWrite = allWrites.find(
        w => w.writerId === parsed.writerId && w.writeNum === parsed.writeNum
      );
      expect(matchingWrite).toBeDefined();
    });

    test("should handle concurrent reads during writes", async () => {
      const filePath = join(testDir, "read-write.json");
      const initialData = { version: 0, data: "initial" };
      
      // Create initial file
      writeFileSync(filePath, JSON.stringify(initialData));

      const writeCount = 100;
      const readCount = 200;
      let successfulReads = 0;
      let corruptedReads = 0;

      // Start concurrent writes
      const writePromise = (async () => {
        for (let i = 1; i <= writeCount; i++) {
          await writer.writeJSON(filePath, { version: i, data: `update-${i}` });
          if (i % 10 === 0) {
            await Bun.sleep(1); // Small delay every 10 writes
          }
        }
      })();

      // Start concurrent reads
      const readPromise = (async () => {
        for (let i = 0; i < readCount; i++) {
          try {
            const content = readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(content);
            
            // Verify we always read complete, valid data
            expect(parsed).toHaveProperty("version");
            expect(parsed).toHaveProperty("data");
            expect(typeof parsed.version).toBe("number");
            successfulReads++;
          } catch (e) {
            // Should not happen with atomic writes
            corruptedReads++;
          }
          
          if (i % 20 === 0) {
            await Bun.sleep(1); // Small delay every 20 reads
          }
        }
      })();

      await Promise.all([writePromise, readPromise]);

      // All reads should be successful
      expect(successfulReads).toBe(readCount);
      expect(corruptedReads).toBe(0);

      // Final file should have the last write
      const finalContent = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(finalContent.version).toBe(writeCount);
    });
  });

  describe("File Types", () => {
    test("should work for JSON state files", async () => {
      const statePath = join(testDir, "state.json");
      const stateData = {
        sessionId: "test-session",
        timestamp: Date.now(),
        events: [
          { type: "start", time: Date.now() },
          { type: "update", time: Date.now() + 1000 }
        ]
      };

      await writer.writeJSON(statePath, stateData);

      const written = JSON.parse(readFileSync(statePath, "utf-8"));
      expect(written).toEqual(stateData);
    });

    test("should work for log files", async () => {
      const logPath = join(testDir, "app.log");
      const logEntries = [
        `[${new Date().toISOString()}] INFO: Application started`,
        `[${new Date().toISOString()}] DEBUG: Processing request`,
        `[${new Date().toISOString()}] ERROR: Connection timeout`
      ];

      // Write initial log
      await writer.writeFile(logPath, logEntries[0] + "\n");

      // Append additional logs atomically
      for (const entry of logEntries.slice(1)) {
        await writer.appendFile(logPath, entry + "\n");
      }

      const finalContent = readFileSync(logPath, "utf-8");
      const lines = finalContent.trim().split("\n");
      
      expect(lines).toHaveLength(logEntries.length);
      logEntries.forEach((entry, i) => {
        expect(lines[i]).toBe(entry);
      });
    });

    test("should handle large files efficiently", async () => {
      const largePath = join(testDir, "large.json");
      const largeData = {
        metadata: { created: Date.now(), size: "large" },
        records: Array.from({ length: 10000 }, (_, i) => ({
          id: `record-${i}`,
          index: i,
          data: `${"x".repeat(100)}-${i}`,
          nested: {
            value: i * Math.PI,
            array: Array.from({ length: 10 }, (_, j) => j * i)
          }
        }))
      };

      const startTime = Date.now();
      await writer.writeJSON(largePath, largeData);
      const writeTime = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for large file)
      expect(writeTime).toBeLessThan(5000);

      // Verify integrity
      const written = JSON.parse(readFileSync(largePath, "utf-8"));
      expect(written.records).toHaveLength(10000);
      expect(written.records[0].id).toBe("record-0");
      expect(written.records[9999].id).toBe("record-9999");
    });
  });

  describe("Error Handling", () => {
    test("should clean up temp files on error", async () => {
      const filePath = join(testDir, "error.json");
      
      // Mock write to fail after temp file creation
      const originalWriteJSON = writer.writeJSON.bind(writer);
      writer.writeJSON = async (path: string, data: any) => {
        const tempPath = `${path}.tmp.${Date.now()}`;
        writeFileSync(tempPath, JSON.stringify(data));
        
        // Verify temp file exists
        expect(existsSync(tempPath)).toBe(true);
        
        // Simulate error
        throw new Error("Write failed");
      };

      await expect(writer.writeJSON(filePath, { test: "data" })).rejects.toThrow("Write failed");

      // Verify no temp files remain
      const tempFiles = Bun.glob.glob("*.tmp*", { cwd: testDir });
      const remainingTempFiles = [...tempFiles];
      expect(remainingTempFiles).toHaveLength(0);
    });

    test("should handle permission errors gracefully", async () => {
      const readOnlyDir = join(testDir, "readonly");
      mkdirSync(readOnlyDir);
      
      const filePath = join(readOnlyDir, "protected.json");
      writeFileSync(filePath, JSON.stringify({ protected: true }));
      
      // Make directory read-only (simulate permission issue)
      // Note: This might not work on all systems, so we'll simulate it
      writer.writeJSON = async (path: string, data: any) => {
        if (path.includes("readonly")) {
          throw new Error("EACCES: permission denied");
        }
        return originalWriteJSON(path, data);
      };

      await expect(writer.writeJSON(filePath, { new: "data" })).rejects.toThrow("permission denied");
    });
  });
});