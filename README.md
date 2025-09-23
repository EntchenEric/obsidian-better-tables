# BetterTable for Obsidian

Transform your Obsidian tables into powerful, Excel-like editing experiences with beautiful UI and seamless navigation.

## ✨ Features

### 🚀 **Excel-Like Navigation**
- **TAB**: Move to next column (creates new columns automatically)
- **ENTER**: Move to next row at original column position
- **Arrow Keys**: Navigate in all directions
- **ESC**: Exit editing mode

### 🎨 **Beautiful Design**
- Seamlessly integrates with Obsidian's design system
- Smooth animations and hover effects
- Gradient buttons with shimmer animations
- Sticky headers for large tables
- Custom scrollbars matching Obsidian theme

### 📊 **Smart Table Management**
- **Vertical Scrolling**: Tables with `max-height: 70vh` and custom scrollbars
- **Auto-Creation**: Dynamic row/column creation via keyboard navigation
- **Inline Editing**: Click any cell to edit with beautiful focus indicators

### ⌨️ **Keyboard Shortcuts**
| Key | Action |
|-----|--------|
| `TAB` | Next column (creates if needed) |
| `ENTER` | Next row (Excel behavior) |
| `ESC` | Exit editing |
| `↑↓←→` | Navigate cells |
| `Click` | Edit cell |
| `Double-click` | Edit cell |

## 🛠️ Installation

### Manual Installation
1. Download the latest release
2. Extract files to `VaultFolder/.obsidian/plugins/better-table/`
3. Reload Obsidian
4. Enable "BetterTable" in Community Plugins

### From Community Plugins
1. Open Settings → Community Plugins
2. Search for "BetterTable"
3. Install and enable

## 📖 Usage

### Creating a Table
1. Use Command Palette (`Ctrl/Cmd + P`)
2. Search for "Create Better Table"
3. Table appears instantly with 2 columns and 1 row

### Editing Tables
- **Click any cell** to start editing
- **TAB through cells** - automatically creates new columns
- **ENTER to next row** - automatically creates new rows
- **Delete rows/columns** using hover buttons


## 🎯 Excel-Like Behavior

BetterTable replicates Excel's navigation perfectly:

1. **Start in cell A1**
2. **TAB → TAB → TAB** (moves to B1, C1, D1 - creates column D)
3. **ENTER** (moves to A2 - returns to original column!)
4. **TAB** (moves to B2)
5. **ENTER** (moves to A3 - Excel behavior maintained)

### Responsiveness
- **Mobile optimized** with smaller buttons and padding
- **Adaptive scrolling** (50vh on mobile, 70vh on desktop)
- **Flexible table width** with minimum 400px on desktop

## 🔧 Technical Details

### Architecture
- **React Components**: Modern React with hooks and TypeScript
- **CSS Injection**: Styles injected directly into document head
- **No External Dependencies**: Pure Obsidian + React implementation
- **Smart State Management**: Local state with debounced saves

### Performance
- **Efficient Rendering**: Only re-renders when necessary
- **Debounced Saves**: Prevents excessive markdown updates
- **Smart Focus Management**: Maintains focus during dynamic creation
- **Memory Cleanup**: Proper cleanup on plugin unload

## 🔮 Roadmap (unsorted)

- [ ] **Table sorting** by clicking column headers
- [ ] **Cell formatting** (bold, italic, colors)
- [ ] **Formula support** for calculations
- [ ] **Import/Export** CSV functionality
- [ ] **Table templates** for common layouts
- [ ] **Collaborative editing** support
- [ ] **Advanced filtering** options

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the 0BSD license License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/entcheneric/better-table/issues)
- **Discussions**: [GitHub Discussions](https://github.com/entcheneric/better-table/discussions)

---

*Transform your table editing experience today!*
