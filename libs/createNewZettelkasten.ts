import { App } from "obsidian";
import moment from "moment";

function getZettelkastenTemplate() {
	const now = moment().format("YYYY/MM/DD HH:mm");
	return `
---
aliases:
parent:
created_at: ${now}
updated_at: ${now}
---
`;
}

export default async function createNewZettelkasten(app: App, folder: string) {
	// フォルダ内のファイルを取得
	const files = app.vault
		.getFiles()
		.filter(
			(file) => file.path.startsWith(folder + "/") && file.extension === "md"
		);

	// 各ファイル名からIDの先頭数字を抽出
	const leadingNumbers: number[] = [];
	for (const file of files) {
		const match = file.basename.match(/^(\d+)/);
		if (match) {
			leadingNumbers.push(parseInt(match[1], 10));
		}
	}

	// 最も大きい数字を特定（ファイルがない場合は0）
	const maxNumber = leadingNumbers.length > 0 ? Math.max(...leadingNumbers) : 0;

	// インクリメントして新しいファイル名を生成
	const newNumber = maxNumber + 1;
	const newFileName = `${newNumber}_`;
	const newFile = await app.vault.create(
		`${folder}/${newFileName}.md`,
		getZettelkastenTemplate()
	);
	app.workspace.openLinkText(newFile.path, newFile.basename, true);
}
