import {
	App,
	Editor,
	MarkdownView,
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

interface Settings {
	literatureFolder: string;
	zettelkastenFolder: string;
}

const DEFAULT_SETTINGS: Settings = {
	literatureFolder: "00_Insights",
	zettelkastenFolder: "10_Zettels",
};

export default class ZettelkastenTools extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		const zettelkastenIconEl = this.addRibbonIcon(
			"plus",
			"New Zettelkasten",
			async (_evt: MouseEvent) => {
				await createNewZettelkasten(this.app, this.settings.zettelkastenFolder);
				new Notice("new zettelkasten note created", 2000);
			}
		);
		zettelkastenIconEl.addClass("accent-ribbon-class");
		this.addRibbonIcon(
			"file-plus-2",
			"New Literature",
			async (_evt: MouseEvent) => {
				await createNewLiterature(this.app, this.settings.literatureFolder);
				new Notice("new literature note created", 2000);
			}
		);

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

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Status Bar Text");

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText("Woah!");
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }

class SettingTab extends PluginSettingTab {
	plugin: ZettelkastenTools;

	constructor(app: App, plugin: ZettelkastenTools) {
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
