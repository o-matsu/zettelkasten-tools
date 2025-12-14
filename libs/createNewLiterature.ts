import { App } from "obsidian";
import moment from "moment";

function getLiteratureTemplate() {
	const now = moment().format("YYYY/MM/DD HH:mm");
	return `
---
source:
tags:
created_at: ${now}
updated_at: ${now}
---
`;
}

export default async function createNewLiterature(app: App, folder: string) {
	const newFileName = `_001`;
	const newFile = await app.vault.create(
		`${folder}/${newFileName}.md`,
		getLiteratureTemplate()
	);
	app.workspace.openLinkText(newFile.path, newFile.basename, true);
}
