# Data Model: Document Viewer

## Entities

### MarkdownViewerProps
Interface for the markdown viewer component properties.

**Fields**:
- `id?: string` - Component identifier for focus management
- `filePath?: string` - Path to markdown file to display
- `title?: string` - Display title for the viewer
- `scrollable?: boolean` - Enable/disable scrolling functionality
- `content?: string` - Direct content (alternative to filePath)

**Validation**:
- Either filePath or content must be provided
- Title defaults to filename if not provided
- Scrollable defaults to true

### ViewerState
Internal state management for the viewer component.

**Fields**:
- `content: string` - Raw markdown content
- `renderedContent: string[]` - Processed lines for display
- `frontmatter: any` - Parsed YAML frontmatter
- `title: string` - Document title
- `author?: string` - Document author from frontmatter
- `scrollOffset: number` - Current scroll position
- `loading: boolean` - Loading state indicator
- `error: string | null` - Error message if any

**Validation**:
- scrollOffset must be >= 0
- scrollOffset cannot exceed content length
- error and loading are mutually exclusive

### DocumentViewerOptions
Configuration for the document processing library.

**Fields**:
- `theme: object` - Color theme for syntax highlighting
- `maxWidth: number` - Maximum line width for wrapping
- `pageSize: number` - Lines per page for pagination
- `wrapText: boolean` - Enable text wrapping
- `syntaxHighlight: boolean` - Enable code highlighting

**Validation**:
- maxWidth must be > 0 and <= terminal width
- pageSize must be > 0
- All fields have sensible defaults

### LayoutProps
Flex layout properties for proper container filling.

**Fields**:
- `flexGrow: number` - Flex grow factor (1 for fill)
- `flexDirection: "column" | "row"` - Layout direction
- `flexBasis?: string` - Initial size before flex
- `overflow: "hidden" | "visible"` - Overflow behavior
- `minHeight?: number` - Minimum height constraint
- `maxHeight?: number` - Maximum height constraint

**Validation**:
- flexGrow must be >= 0
- flexDirection required for containers
- overflow should be "hidden" for scrollable content

## Relationships

```
MarkdownViewerProps
    |
    v
MarkdownViewer (component)
    |
    ├── ViewerState (internal)
    |
    ├── DocumentViewerOptions
    |   |
    |   v
    |   DocumentViewer (library)
    |
    └── LayoutProps (styling)
```

## State Transitions

1. **Initial Load**:
   - loading: true
   - content: empty
   - error: null

2. **Content Loaded**:
   - loading: false
   - content: populated
   - renderedContent: processed

3. **Error State**:
   - loading: false
   - error: error message
   - content: empty or partial

4. **Scrolling**:
   - scrollOffset: updated
   - renderedContent: sliced for viewport

## Constraints

- File size: Component must remain under 250 lines
- Memory: Rendered content cached to avoid reprocessing
- Performance: Scroll updates must be immediate
- Compatibility: Must work with all markdown formats