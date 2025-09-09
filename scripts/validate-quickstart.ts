#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "../src/lib/logger/index.ts";

/**
 * Validation script for quickstart.md instructions
 * Ensures all documented features and commands work correctly
 */

const logger = new Logger("QuickstartValidator");
const testDir = join(process.cwd(), ".test-specstar");
let errors: string[] = [];
let warnings: string[] = [];

// Color output helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

async function validatePrerequisites() {
  console.log(blue("\n📋 Validating Prerequisites..."));
  
  // Check Bun version
  try {
    const version = await $`bun --version`.text();
    const [major, minor] = version.trim().split('.').map(Number);
    
    if (major >= 1 && minor >= 1) {
      console.log(green("✓ Bun version is compatible: " + version.trim()));
    } else {
      errors.push(`Bun version ${version.trim()} is below required 1.1+`);
      console.log(red("✗ Bun version is incompatible: " + version.trim()));
    }
  } catch (error) {
    errors.push("Could not determine Bun version");
    console.log(red("✗ Could not determine Bun version"));
  }

  // Check terminal color support
  const termColors = process.env.TERM?.includes('256') || process.env.COLORTERM;
  if (termColors) {
    console.log(green("✓ Terminal supports 256 colors"));
  } else {
    warnings.push("Terminal may not support 256 colors");
    console.log(yellow("⚠ Terminal may not support 256 colors"));
  }
}

async function validateInstallation() {
  console.log(blue("\n📦 Validating Installation..."));
  
  // Check if node_modules exists
  if (existsSync("node_modules")) {
    console.log(green("✓ Dependencies installed"));
  } else {
    errors.push("Dependencies not installed - run 'bun install'");
    console.log(red("✗ Dependencies not installed"));
    return false;
  }

  // Check if all required dependencies are installed
  const requiredDeps = ["ink", "react", "meow", "marked"];
  const packageJson = await Bun.file("package.json").json();
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(green(`✓ ${dep} is listed in dependencies`));
    } else {
      errors.push(`Missing required dependency: ${dep}`);
      console.log(red(`✗ Missing required dependency: ${dep}`));
    }
  }

  return true;
}

async function validateBuildScripts() {
  console.log(blue("\n🔨 Validating Build Scripts..."));
  
  try {
    // Test main build
    console.log("  Testing main build...");
    await $`bun run build:main`.quiet();
    
    if (existsSync("dist/specstar")) {
      console.log(green("✓ Main build successful"));
    } else {
      errors.push("Main build did not produce dist/specstar");
      console.log(red("✗ Main build failed"));
    }
  } catch (error) {
    errors.push(`Build failed: ${error}`);
    console.log(red("✗ Build failed: " + error));
  }

  // Validate library CLI builds
  const libBuilds = [
    "session-monitor",
    "document-viewer", 
    "hook-integrator",
    "config-manager"
  ];

  for (const lib of libBuilds) {
    try {
      console.log(`  Testing ${lib} build...`);
      await $`bun run build:${lib}`.quiet();
      
      if (existsSync(`dist/${lib}`)) {
        console.log(green(`✓ ${lib} build successful`));
      } else {
        warnings.push(`${lib} build did not produce dist/${lib}`);
        console.log(yellow(`⚠ ${lib} build may have issues`));
      }
    } catch (error) {
      warnings.push(`${lib} build failed: ${error}`);
      console.log(yellow(`⚠ ${lib} build failed`));
    }
  }
}

async function validateInitCommand() {
  console.log(blue("\n🚀 Validating Init Command..."));
  
  // Create test directory
  await $`mkdir -p ${testDir}`.quiet();
  
  try {
    // Run init command
    console.log("  Testing --init flag...");
    await $`cd ${testDir} && ${join(process.cwd(), "dist/specstar")} --init`.quiet();
    
    // Check created structure
    const expectedFiles = [
      ".specstar/settings.json",
      ".specstar/sessions",
      ".specstar/hooks.ts"
    ];

    for (const file of expectedFiles) {
      const fullPath = join(testDir, file);
      if (existsSync(fullPath)) {
        console.log(green(`✓ Created ${file}`));
      } else {
        errors.push(`Init did not create ${file}`);
        console.log(red(`✗ Missing ${file}`));
      }
    }

    // Test force flag
    console.log("  Testing --init --force flag...");
    await $`cd ${testDir} && ${join(process.cwd(), "dist/specstar")} --init --force`.quiet();
    console.log(green("✓ Force init works"));

  } catch (error) {
    errors.push(`Init command failed: ${error}`);
    console.log(red("✗ Init command failed: " + error));
  } finally {
    // Cleanup test directory
    await $`rm -rf ${testDir}`.quiet();
  }
}

async function validateProjectStructure() {
  console.log(blue("\n📁 Validating Project Structure..."));
  
  const expectedStructure = [
    "src/app.tsx",
    "src/cli.tsx",
    "src/components",
    "src/views",
    "src/lib",
    "src/models",
    "package.json",
    "quickstart.md",
    "scripts/validate-quickstart.ts"
  ];

  for (const path of expectedStructure) {
    if (existsSync(path)) {
      console.log(green(`✓ ${path} exists`));
    } else {
      errors.push(`Missing expected file/directory: ${path}`);
      console.log(red(`✗ Missing ${path}`));
    }
  }
}

async function validateTestCommands() {
  console.log(blue("\n🧪 Validating Test Commands..."));
  
  const testCommands = [
    { cmd: "bun test --help", desc: "Test framework available" },
    { cmd: "bun run clean", desc: "Clean command works" }
  ];

  for (const test of testCommands) {
    try {
      await $`${test.cmd}`.quiet();
      console.log(green(`✓ ${test.desc}`));
    } catch (error) {
      warnings.push(`${test.desc} failed`);
      console.log(yellow(`⚠ ${test.desc} may have issues`));
    }
  }
}

async function validateDocumentation() {
  console.log(blue("\n📚 Validating Documentation..."));
  
  // Check if quickstart.md exists and has content
  if (existsSync("quickstart.md")) {
    const content = await Bun.file("quickstart.md").text();
    const requiredSections = [
      "## Installation",
      "## Usage",
      "## Features",
      "## Configuration",
      "## Troubleshooting"
    ];

    for (const section of requiredSections) {
      if (content.includes(section)) {
        console.log(green(`✓ Documentation includes ${section}`));
      } else {
        warnings.push(`Documentation missing section: ${section}`);
        console.log(yellow(`⚠ Documentation missing ${section}`));
      }
    }

    // Check for code blocks
    const codeBlocks = content.match(/```/g)?.length || 0;
    if (codeBlocks >= 10) {
      console.log(green(`✓ Documentation has ${codeBlocks/2} code examples`));
    } else {
      warnings.push("Documentation could use more code examples");
      console.log(yellow(`⚠ Documentation has only ${codeBlocks/2} code examples`));
    }
  } else {
    errors.push("quickstart.md not found");
    console.log(red("✗ quickstart.md not found"));
  }
}

async function runValidation() {
  console.log(blue("=".repeat(60)));
  console.log(blue("🚀 Specstar Quickstart Validation"));
  console.log(blue("=".repeat(60)));

  logger.info("Starting quickstart validation");

  // Run all validations
  await validatePrerequisites();
  
  const canContinue = await validateInstallation();
  if (canContinue) {
    await validateBuildScripts();
    await validateInitCommand();
  }
  
  await validateProjectStructure();
  await validateTestCommands();
  await validateDocumentation();

  // Summary
  console.log(blue("\n" + "=".repeat(60)));
  console.log(blue("📊 Validation Summary"));
  console.log(blue("=".repeat(60)));

  if (errors.length === 0 && warnings.length === 0) {
    console.log(green("\n✅ All validations passed successfully!"));
    console.log(green("The quickstart instructions are valid and working."));
    logger.info("Validation completed successfully");
    process.exit(0);
  } else {
    if (errors.length > 0) {
      console.log(red(`\n❌ Found ${errors.length} error(s):`));
      errors.forEach(err => console.log(red(`   • ${err}`)));
      logger.error("Validation failed", { errors });
    }

    if (warnings.length > 0) {
      console.log(yellow(`\n⚠️  Found ${warnings.length} warning(s):`));
      warnings.forEach(warn => console.log(yellow(`   • ${warn}`)));
      logger.warn("Validation has warnings", { warnings });
    }

    console.log("\nPlease fix the issues above to ensure the quickstart guide works correctly.");
    process.exit(errors.length > 0 ? 1 : 0);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  logger.error("Unhandled rejection", error as Error);
  console.error(red("\n💥 Unexpected error during validation:"));
  console.error(error);
  process.exit(1);
});

// Run validation
runValidation().catch((error) => {
  logger.error("Validation script failed", error);
  console.error(red("\n💥 Validation script failed:"));
  console.error(error);
  process.exit(1);
});