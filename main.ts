import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import * as React from 'react';
import { Root, createRoot } from 'react-dom/client';
import { BetterTable } from './components/BetterTable';
import { AppContext } from './contexts/AppContext';
import { TableData, MyPluginSettings } from './types';
import { parseTableData, tableDataToCode } from './utils/tableUtils';

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
};

class BetterTableRenderChild extends MarkdownRenderChild {
    private root: Root;
    private plugin: BetterTablePlugin;
    private data: TableData;
    private ctx: MarkdownPostProcessorContext;

    constructor(
        containerEl: HTMLElement, 
        plugin: BetterTablePlugin, 
        data: TableData, 
        ctx: MarkdownPostProcessorContext
    ) {
        super(containerEl);
        this.plugin = plugin;
        this.data = data;
        this.ctx = ctx;
    }

    onload() {
        try {
            this.containerEl.empty();
            this.containerEl.addClass('better-table-wrapper');
            
            this.root = createRoot(this.containerEl);
            
            this.root.render(
                React.createElement(React.StrictMode, {}, 
                    React.createElement(AppContext.Provider, { value: this.plugin.app }, 
                        React.createElement(BetterTable, {
                            data: this.data,
                            onSave: (newData: TableData) => this.plugin.saveTableData(newData, this.ctx, this.containerEl),
                            onAddRow: () => this.plugin.addRow(this.data, this.ctx, this.containerEl),
                            onAddColumn: () => this.plugin.addColumn(this.data, this.ctx, this.containerEl)
                        })
                    )
                )
            );
        } catch (error) {
            console.error('Failed to render better table:', error);
            this.containerEl.createEl('div', { 
                text: 'Error: Failed to render table. Check console for details.',
                cls: 'better-table-error'
            });
        }
    }

    onunload() {
        try {
            if (this.root) {
                this.root.unmount();
            }
        } catch (error) {
            console.error('Error during React cleanup:', error);
        }
    }
}

export default class BetterTablePlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.registerMarkdownCodeBlockProcessor('better-table', (source, el, ctx) => {
            this.renderBetterTable(source, el, ctx);
        });

        this.addCommand({
            id: 'create-better-table',
            name: 'Create Better Table',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                try {
                    const defaultData: TableData = {
                        headers: ['Column 1', 'Column 2'],
                        rows: [['', '']]
                    };
                    const tableCode = tableDataToCode(defaultData);
                    const tableMarkdown = `\`\`\`better-table\n${tableCode}\n\`\`\``;
                    
                    editor.replaceSelection(tableMarkdown);
                    
                    this.refreshView(view);
                } catch (error) {
                    console.error('Failed to create better table:', error);
                }
            }
        });

        this.addSettingTab(new BetterTableSettingTab(this.app, this));
    }

    private refreshView(view: MarkdownView) {
        const currentMode = view.getMode();
        if (currentMode === 'source') {
            view.setEphemeralState({ focus: true });
            requestAnimationFrame(() => {
                view.setState({ mode: 'preview' }, { history: false });
                requestAnimationFrame(() => {
                    view.setState({ mode: 'source' }, { history: false });
                });
            });
        }
    }

    renderBetterTable(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        try {
            const data = parseTableData(source);
            
            const renderChild = new BetterTableRenderChild(el, this, data, ctx);
            ctx.addChild(renderChild);
            
        } catch (error) {
            console.error('Failed to render better table:', error);
            el.createEl('div', { 
                text: 'Error: Failed to render table. Check console for details.',
                cls: 'better-table-error'
            });
        }
    }

    saveTableData(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) {
                console.warn('No active markdown view found');
                return;
            }

            const editor = view.editor;
            const tableCode = tableDataToCode(data);
            
            const info = ctx.getSectionInfo(el);
            if (info) {
                const startLine = info.lineStart;
                const endLine = info.lineEnd;
                
                const newContent = `\`\`\`better-table\n${tableCode}\n\`\`\``;
                editor.replaceRange(newContent, 
                    { line: startLine, ch: 0 },
                    { line: endLine, ch: editor.getLine(endLine)?.length || 0 }
                );
            }
        } catch (error) {
            console.error('Failed to save table data:', error);
        }
    }

    addRow(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        try {
            const newData: TableData = {
                ...data,
                rows: [...data.rows, Array(data.headers.length).fill('')]
            };
            this.saveTableData(newData, ctx, el);
        } catch (error) {
            console.error('Failed to add row:', error);
        }
    }

    addColumn(data: TableData, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
        try {
            const newData: TableData = {
                headers: [...data.headers, `Column ${data.headers.length + 1}`],
                rows: data.rows.map(row => [...row, ''])
            };
            this.saveTableData(newData, ctx, el);
        } catch (error) {
            console.error('Failed to add column:', error);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class BetterTableSettingTab extends PluginSettingTab {
    plugin: BetterTablePlugin;

    constructor(app: App, plugin: BetterTablePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('p', { 
            text: 'Configure your better tables experience',
            cls: 'setting-item-description'
        });
    }
}
