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

        this.registerMarkdownCodeBlockProcessor('better-table', (source, el, ctx) => {
            this.renderBetterTable(source, el, ctx);
        });

        this.addCommand({
            id: 'create-better-table',
            name: 'Create Better Table',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const defaultData: TableData = {
                    headers: ['Column 1', 'Column 2'],
                    rows: [['', '']]
                };
                const tableCode = tableDataToCode(defaultData);
                const tableMarkdown = `\`\`\`better-table\n${tableCode}\n\`\`\``;
                
                editor.replaceSelection(tableMarkdown);
                
                setTimeout(() => {
                    const leaf = this.app.workspace.activeLeaf;
                    if (leaf && leaf.view instanceof MarkdownView) {
                        //@ts-ignore
                        leaf.view.setState({
                            ...leaf.view.getState(),
                            mode: 'preview'
                        });
                        setTimeout(() => {
                            //@ts-ignore
                            leaf.view.setState({
                                ...leaf.view.getState(),
                                mode: 'source'
                            });
                        }, 100);
                    }
                }, 50);
            }
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    renderBetterTable(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const data = parseTableData(source);
        
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
        document.querySelectorAll('.better-table-wrapper').forEach(el => {
            const root = (el as any).__reactRoot;
            if (root) {
                root.unmount();
            }
        });

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
