import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import setParent from "./libs/setParent";
import updateTimestamp from "libs/updateTimestamp";
import setAliases from "libs/setAliases";
import createNewZettelkasten from "libs/createNewZettelkasten";
import createNewLiterature from "libs/createNewLiterature";

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	literatureFolder: string;
	zettelkastenFolder: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	literatureFolder: "00_Insights",
	zettelkastenFolder: "10_Zettels",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		this.addCommand({
			id: "obsidian-tools-on-save",
			name: "On save",
			editorCallback: async (_editor: Editor, _view: MarkdownView) => {
				try {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile?.path.includes("10_Zettelkasten")) {
						await setParent(this.app);
						await setAliases(this.app);
					}
					await updateTimestamp(this.app);
					new Notice("saved", 2000);
				} catch (error) {
					console.error(error);
					new Notice("failed to save", 2000);
				}
			},
		});

		this.addCommand({
			id: "obsidian-tools-new-zettelkasten",
			name: "New zettelkasten",
			callback: async () => {
				try {
					await createNewZettelkasten(
						this.app,
						this.settings.zettelkastenFolder
					);
					new Notice("new zettelkasten note created", 2000);
				} catch (error) {
					console.error(error);
					new Notice("failed to create new zettelkasten note", 2000);
				}
			},
		});

		this.addCommand({
			id: "obsidian-tools-new-literature",
			name: "New literature",
			callback: async () => {
				try {
					await createNewLiterature(this.app, this.settings.literatureFolder);
					new Notice("new literature note created", 2000);
				} catch (error) {
					console.error(error);
					new Notice("failed to create new literature note", 2000);
				}
			},
		});

		// ---

		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const zettelkastenIconEl = this.addRibbonIcon(
			"plus",
			"New Zettelkasten",
			async (_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				await createNewZettelkasten(this.app, this.settings.zettelkastenFolder);
				new Notice("new zettelkasten note created", 2000);
			}
		);
		// Perform additional things with the ribbon
		zettelkastenIconEl.addClass("accent-ribbon-class");
		this.addRibbonIcon(
			"file-plus-2",
			"New Literature",
			async (_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				await createNewLiterature(this.app, this.settings.literatureFolder);
				new Notice("new literature note created", 2000);
			}
		);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Literature folder")
			.setDesc("The folder where the literature notes are stored")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder name")
					.setValue(this.plugin.settings.literatureFolder)
					.onChange(async (value) => {
						this.plugin.settings.literatureFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Zettelkasten folder")
			.setDesc("The folder where the zettelkasten notes are stored")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder name")
					.setValue(this.plugin.settings.zettelkastenFolder)
					.onChange(async (value) => {
						this.plugin.settings.zettelkastenFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
