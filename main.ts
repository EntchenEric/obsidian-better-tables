import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext } from 'obsidian';
import * as React from 'react';
import { Root, createRoot } from 'react-dom/client';
import { BetterTable } from './components/BetterTable';
import { AppContext } from './contexts/AppContext';
import { TableData, MyPluginSettings } from './types';
import { parseTableData, tableDataToCode } from './utils/tableUtils';

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

export default class BetterTablePlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // Add CSS styles for better UX
        this.addStyle();

        // Register the code block processor for better-table
        this.registerMarkdownCodeBlockProcessor('better-table', (source, el, ctx) => {
            this.renderBetterTable(source, el, ctx);
        });

        // Add command to create new table - NO MODAL, direct creation
        this.addCommand({
            id: 'create-better-table',
            name: 'Create Better Table',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                // Create default 2 cols x 1 row table with placeholder content
                const defaultData: TableData = {
                    headers: ['Column 1', 'Column 2'],
                    rows: [['', '']]
                };
                const tableCode = tableDataToCode(defaultData);
                const tableMarkdown = `\`\`\`better-table\n${tableCode}\n\`\`\``;
                
                editor.replaceSelection(tableMarkdown);
                
                // Force switch to reading mode to render the table
                setTimeout(() => {
                    const leaf = this.app.workspace.activeLeaf;
                    if (leaf && leaf.view instanceof MarkdownView) {
                        // Switch to reading mode to show the rendered table
                        leaf.view.setState({
                            ...leaf.view.getState(),
                            mode: 'preview'
                        });
                        
                        // Then switch back to live preview mode for editing
                        setTimeout(() => {
                            leaf.view.setState({
                                ...leaf.view.getState(),
                                mode: 'source'
                            });
                        }, 100);
                    }
                }, 50);
            }
        });

        // Add settings tab
        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    addStyle() {
        const css = `
            /* Better Table Container */
            .better-table-wrapper {
                margin: 16px 0;
                border-radius: var(--radius-m);
                overflow: hidden;
            }

            .better-table-container {
                font-family: var(--font-interface);
            }

            .better-table-controls {
                margin-bottom: 16px;
                display: flex;
                gap: 12px;
                align-items: center;
            }

            /* BEAUTIFUL BUTTONS */
            .better-table-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border: none;
                border-radius: var(--radius-m);
                background: linear-gradient(135deg, var(--interactive-accent), var(--interactive-accent-hover));
                color: var(--text-on-accent);
                cursor: pointer;
                font-size: var(--font-ui-medium);
                font-weight: var(--font-weight-medium);
                font-family: var(--font-interface);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
            }

            .better-table-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.6s;
            }

            .better-table-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                filter: brightness(1.1);
            }

            .better-table-btn:hover::before {
                left: 100%;
            }

            .better-table-btn:active {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }

            .better-table-btn .btn-icon {
                font-size: 16px;
                font-weight: bold;
            }

            .better-table-btn .btn-text {
                font-weight: var(--font-weight-medium);
            }

            .add-row-btn {
                background: linear-gradient(135deg, #10b981, #059669);
            }

            .add-col-btn {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
            }

            /* SCROLLABLE TABLE CONTAINER */
            .better-table-scroll-container {
                max-height: 70vh;
                overflow-y: auto;
                overflow-x: auto;
                border: 1px solid var(--background-modifier-border);
                border-radius: var(--radius-s);
                background: var(--background-primary);
                box-shadow: var(--shadow-s);
            }

            /* Custom scrollbars */
            .better-table-scroll-container::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .better-table-scroll-container::-webkit-scrollbar-track {
                background: var(--background-secondary);
                border-radius: 4px;
            }

            .better-table-scroll-container::-webkit-scrollbar-thumb {
                background: var(--background-modifier-border);
                border-radius: 4px;
                border: 1px solid var(--background-secondary);
            }

            .better-table-scroll-container::-webkit-scrollbar-thumb:hover {
                background: var(--background-modifier-border-hover);
            }

            .better-table-scroll-container::-webkit-scrollbar-corner {
                background: var(--background-secondary);
            }

            /* Table styling */
            .better-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 400px;
                font-size: var(--font-ui-medium);
            }

            /* STICKY HEADERS for scrolling */
            .better-table-header {
                background: var(--background-secondary);
                border-bottom: 2px solid var(--background-modifier-border);
                padding: 0;
                position: sticky;
                top: 0;
                z-index: 10;
                box-shadow: inset 0 -1px 0 var(--background-modifier-border);
            }

            .better-table-header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                min-height: 48px;
            }

            .better-table-header-text {
                font-weight: var(--font-weight-semibold);
                color: var(--text-normal);
                cursor: pointer;
                flex: 1;
                padding: 6px 8px;
                border-radius: var(--radius-xs);
                transition: all 0.15s ease;
                font-size: var(--font-ui-medium);
            }

            .better-table-header-text:hover {
                background: var(--background-modifier-hover);
                color: var(--text-accent);
            }

            /* Table cells */
            .better-table-cell {
                border-bottom: 1px solid var(--background-modifier-border);
                border-right: 1px solid var(--background-modifier-border);
                padding: 0;
                vertical-align: top;
                transition: background-color 0.15s ease;
            }

            .better-table-cell:last-child {
                border-right: none;
            }

            .better-table-cell:hover {
                background: var(--background-modifier-hover);
            }

            .better-table-cell-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                min-height: 44px;
            }

            .better-table-cell-text {
                cursor: text;
                flex: 1;
                padding: 6px 8px;
                border-radius: var(--radius-xs);
                transition: all 0.15s ease;
                color: var(--text-normal);
                line-height: 1.5;
                min-height: 20px;
            }

            .better-table-cell-text:hover {
                background: var(--background-modifier-hover);
            }

            .better-table-placeholder {
                color: var(--text-faint);
                font-style: italic;
            }

            /* BEAUTIFUL INLINE EDITING */
            .better-table-input {
                width: 100%;
                border: 2px solid var(--interactive-accent);
                border-radius: var(--radius-s);
                background: var(--background-primary);
                color: var(--text-normal);
                padding: 8px 12px;
                font-size: var(--font-ui-medium);
                font-family: var(--font-interface);
                outline: none;
                box-shadow: 0 0 0 4px var(--color-accent-2);
                transition: all 0.2s ease;
            }

            .better-table-input:focus {
                border-color: var(--interactive-accent-hover);
                box-shadow: 0 0 0 4px var(--color-accent-2), 0 2px 8px rgba(0,0,0,0.1);
                transform: translateY(-1px);
            }

            .better-table-input.header-input {
                font-weight: var(--font-weight-semibold);
                background: var(--background-secondary);
                border-color: var(--interactive-accent);
            }

            .better-table-input.header-input:focus {
                background: var(--background-primary);
            }

            /* Delete buttons with great UX */
            .better-table-delete-btn {
                background: none;
                border: none;
                color: var(--text-faint);
                cursor: pointer;
                font-size: 18px;
                width: 24px;
                height: 24px;
                border-radius: var(--radius-xs);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                margin-left: 8px;
                opacity: 0;
                transform: scale(0.8);
            }

            .better-table-header:hover .better-table-delete-btn,
            .better-table-cell:hover .better-table-delete-btn {
                opacity: 1;
                transform: scale(1);
            }

            .better-table-delete-btn:hover {
                background: var(--background-modifier-error);
                color: var(--text-error);
                transform: scale(1.1);
            }

            .better-table-delete-btn.row-delete {
                margin-left: 4px;
            }

            /* Row highlighting */
            .better-table tbody tr:hover {
                background: var(--background-modifier-hover-alt);
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .better-table-scroll-container {
                    max-height: 50vh;
                }
                
                .better-table {
                    min-width: 300px;
                }

                .better-table-header-content,
                .better-table-cell-content {
                    padding: 8px 12px;
                    min-height: 40px;
                }

                .better-table-btn {
                    padding: 6px 12px;
                    font-size: var(--font-ui-small);
                }
            }

            /* Focus indicators for accessibility */
            .better-table-header-text:focus,
            .better-table-cell-text:focus {
                outline: 2px solid var(--interactive-accent);
                outline-offset: 2px;
            }

            /* Animation for new rows/columns */
            .better-table tr,
            .better-table th,
            .better-table td {
                animation: slideIn 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        (this as any).styleEl = style;
    }

    renderBetterTable(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const data = parseTableData(source);
        
        // REMOVE CODE VIEW - only show table interface
        el.empty();
        el.addClass('better-table-wrapper');
        
        const root = createRoot(el);
        
        root.render(
            React.createElement(React.StrictMode, {}, 
                React.createElement(AppContext.Provider, { value: this.app }, 
                    React.createElement(BetterTable, {
                        data: data,
                        onSave: (newData: any) => this.saveTableData(newData, ctx, el),
                        onAddRow: () => this.addRow(data, ctx, el),
                        onAddColumn: () => this.addColumn(data, ctx, el)
                    })
                )
            )
        );

        (el as any).__reactRoot = root;
    }

    saveTableData(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const editor = view.editor;
        const tableCode = tableDataToCode(data);
        
        const info = ctx.getSectionInfo(el);
        if (info) {
            const startLine = info.lineStart;
            const endLine = info.lineEnd;
            
            const newContent = `\`\`\`better-table\n${tableCode}\n\`\`\``;
            editor.replaceRange(newContent, 
                { line: startLine, ch: 0 },
                { line: endLine, ch: editor.getLine(endLine).length }
            );
        }
    }

    addRow(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        const newData = {
            ...data,
            rows: [...data.rows, Array(data.headers.length).fill('')]
        };
        this.saveTableData(newData, ctx, el);
    }

    addColumn(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        const newData = {
            headers: [...data.headers, `Column ${data.headers.length + 1}`],
            rows: data.rows.map(row => [...row, ''])
        };
        this.saveTableData(newData, ctx, el);
    }

    onunload() {
        // Clean up React roots
        document.querySelectorAll('.better-table-wrapper').forEach(el => {
            const root = (el as any).__reactRoot;
            if (root) {
                root.unmount();
            }
        });

        // Remove injected styles
        if ((this as any).styleEl) {
            (this as any).styleEl.remove();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: BetterTablePlugin;

    constructor(app: App, plugin: BetterTablePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Better Tables Settings')
            .setDesc('Configure your better tables experience')
            .addText(text => text
                .setPlaceholder('Enter your setting')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
