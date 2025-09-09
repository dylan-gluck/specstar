#!/usr/bin/env bun

// Test script to verify components can be imported and rendered
import React from 'react';
import { render } from 'ink-testing-library';
import { FileList } from './src/components/file-list';
import { MarkdownViewer } from './src/components/markdown-viewer';
import PlanView from './src/views/plan-view';
import ObserveView from './src/views/ObserveView';
import App from './src/app';

console.log('Testing component imports...');

// Test FileList
try {
  const fileListTest = render(
    <FileList 
      id="test" 
      title="Test Files" 
      files={[
        { name: 'test1.md', path: '/test/test1.md' },
        { name: 'test2.md', path: '/test/test2.md' }
      ]} 
    />
  );
  console.log('✓ FileList component renders');
  fileListTest.unmount();
} catch (error) {
  console.error('✗ FileList component failed:', error.message);
}

// Test MarkdownViewer
try {
  const markdownTest = render(
    <MarkdownViewer 
      content="# Test\n\nThis is a test" 
      title="Test Document"
    />
  );
  console.log('✓ MarkdownViewer component renders');
  markdownTest.unmount();
} catch (error) {
  console.error('✗ MarkdownViewer component failed:', error.message);
}

// Test PlanView
try {
  const planViewTest = render(<PlanView />);
  console.log('✓ PlanView component renders');
  planViewTest.unmount();
} catch (error) {
  console.error('✗ PlanView component failed:', error.message);
}

// Test ObserveView
try {
  const observeViewTest = render(<ObserveView />);
  console.log('✓ ObserveView component renders');
  observeViewTest.unmount();
} catch (error) {
  console.error('✗ ObserveView component failed:', error.message);
}

// Test App
try {
  const appTest = render(<App />);
  console.log('✓ App component renders');
  
  // Get some basic info about the rendered output
  const { lastFrame } = appTest;
  console.log('\nApp initial frame preview:');
  console.log(lastFrame().split('\n').slice(0, 5).join('\n'));
  
  appTest.unmount();
} catch (error) {
  console.error('✗ App component failed:', error.message);
}

console.log('\nComponent tests complete!');