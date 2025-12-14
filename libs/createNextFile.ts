import { App, TFile } from "obsidian";
import moment from "moment";
import { Settings } from "main";

function getZettelkastenTemplate(parent: string) {
	const now = moment().format("YYYY/MM/DD HH:mm");
	return `---
aliases:
parent: "[[${parent}]]"
created_at: ${now}
updated_at: ${now}
---
`;
}
function getLiteratureTemplate(source: string | undefined | null) {
	const now = moment().format("YYYY/MM/DD HH:mm");
	return `---
source: ${source ?? ""}
tags:
created_at: ${now}
updated_at: ${now}
---
`;
}

/**
 * sourceFileの命名規則に基づいて次のファイル名を生成する
 * 命名規則: {title}_{index(3桁0詰め)}.md
 * 例: クマにあったらどうするか_001.md → クマにあったらどうするか_002.md
 */
export default async function createNextFile(app: App, settings: Settings) {
	const sourceFile = app.workspace.getActiveFile();
	if (!sourceFile) {
		throw new Error("アクティブなファイルが見つかりません");
	}
	const sourceFolder = sourceFile.parent?.path;
	let newFile: TFile | undefined;
	switch (sourceFolder) {
		case settings.literatureFolder:
			newFile = await createNextLiterature(
				app,
				sourceFile,
				settings.literatureFolder
			);
			break;
		case settings.zettelkastenFolder:
			newFile = await createNextZettelkasten(
				app,
				sourceFile,
				settings.zettelkastenFolder
			);
			break;
		default:
			throw new Error("アクティブなファイルのフォルダが不正です");
	}

	const leaf = app.workspace.getLeaf("split");
	await leaf.openFile(newFile);
}

async function createNextLiterature(
	app: App,
	sourceFile: TFile,
	folder: string
) {
	// ファイル名から {title} と {index} を抽出
	// パターン: {title}_{index(3桁0詰め)}.md
	const basename = sourceFile.basename;
	const match = basename.match(/^(.+)_(\d{3})$/);

	if (!match) {
		throw new Error(
			`ファイル名が命名規則に合致しません: ${basename}\n期待される形式: {title}_{index(3桁0詰め)}`
		);
	}

	const title = match[1];
	const currentIndex = parseInt(match[2], 10);
	const nextIndex = currentIndex + 1;

	// 3桁0詰めでフォーマット
	const nextIndexStr = nextIndex.toString().padStart(3, "0");
	const newFileName = `${title}_${nextIndexStr}`;

	const cache = app.metadataCache.getFileCache(sourceFile);
	const source = cache?.frontmatter?.source;

	return await app.vault.create(
		`${folder}/${newFileName}.md`,
		getLiteratureTemplate(source)
	);
}

/**
 * sourceFileの命名規則に基づいて次のzettelkastenファイル名を生成する
 * 命名規則: {ID}_{keyword}.md
 * IDは数字とアルファベットが交互に並び、数字から始まる
 * 例: 5a1a1a1_xxx.md → 5a1a1a1a_.md
 *     5a1a1a1a_xxx.md → 5a1a1a1b_.md (5a1a1a1a_で始まるファイルが存在する場合)
 */
async function createNextZettelkasten(
	app: App,
	sourceFile: TFile,
	folder: string
) {
	// ファイル名から {ID} と {keyword} を抽出
	// パターン: {ID}_{keyword}.md
	const basename = sourceFile.basename;
	const match = basename.match(/^(.+?)_(.+)$/);

	if (!match) {
		throw new Error(
			`ファイル名が命名規則に合致しません: ${basename}\n期待される形式: {ID}_{keyword}`
		);
	}

	const sourceId = match[1];
	const lastChar = sourceId[sourceId.length - 1];

	// IDの最後の文字に基づいて次のIDを生成
	let nextId: string;
	if (/^\d$/.test(lastChar)) {
		// 最後が数字の場合、'a'を追加
		nextId = sourceId + "a";
	} else if (/^[a-z]$/.test(lastChar)) {
		// 最後がアルファベットの場合、'1'を付与
		nextId = sourceId + "1";
	} else {
		throw new Error(
			`IDの形式が不正です: ${sourceId}\n期待される形式: 数字とアルファベットが交互に並ぶ形式`
		);
	}

	// nextIdで始まるファイルのみを取得（後続の処理を簡略化するため）
	const files = app.vault
		.getFiles()
		.filter(
			(file) =>
				file.path.startsWith(folder + "/") &&
				file.extension === "md" &&
				file.basename.startsWith(sourceId)
		);

	// 新しいIDで始まるファイルが存在するかチェックし、存在する場合は次のIDを試す
	// 最後の文字がアルファベットの場合は数字をインクリメント、数字の場合はアルファベットをインクリメント
	let candidateId = nextId;
	const maxAttempts = 100; // 数字とアルファベットの組み合わせなので、十分な回数を設定
	let attempts = 0;

	while (attempts < maxAttempts) {
		// このIDで始まるファイルが存在するかチェック
		const exists = files.some((file) => {
			const fileBasename = file.basename;
			const fileMatch = fileBasename.match(/^(.+?)_/);
			if (!fileMatch) return false;
			const fileId = fileMatch[1];
			return fileId === candidateId || fileId.startsWith(candidateId);
		});

		if (!exists) {
			// 存在しないIDが見つかった
			break;
		}

		// 存在する場合、最後の文字に応じて次のIDを生成
		const lastCandidateChar = candidateId[candidateId.length - 1];
		if (/^[a-z]$/.test(lastCandidateChar)) {
			// 最後がアルファベットの場合、次のアルファベットに変更
			const nextChar = String.fromCharCode(lastCandidateChar.charCodeAt(0) + 1);
			candidateId = candidateId.slice(0, -1) + nextChar;
			attempts++;
		} else if (/^\d$/.test(lastCandidateChar)) {
			// 最後が数字の場合、最後の連続する数字を抽出してインクリメント
			const numMatch = candidateId.match(/(\d+)$/);
			if (numMatch) {
				const currentNum = parseInt(numMatch[1], 10);
				const nextNum = currentNum + 1;
				candidateId =
					candidateId.slice(0, -numMatch[1].length) + nextNum.toString();
			} else {
				// 数字が見つからない場合はエラー（通常は発生しない）
				throw new Error(`予期しないエラー: ${candidateId}`);
			}
			attempts++;
		} else {
			// 予期しない文字の場合はエラー
			throw new Error(`予期しないエラー: ${candidateId}`);
		}
	}

	if (attempts >= maxAttempts) {
		throw new Error(
			`利用可能なIDが見つかりませんでした: ${nextId}から始まるIDが全て使用されています`
		);
	}

	// 新しいファイル名を生成（keywordは空文字列）
	const newFileName = `${candidateId}_`;

	return await app.vault.create(
		`${folder}/${newFileName}.md`,
		getZettelkastenTemplate(sourceFile.basename)
	);
}
