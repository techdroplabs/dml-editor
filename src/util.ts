// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

export const openInUntitled = async (content: string) => {
  const document = await vscode.workspace.openTextDocument({
    language: "xml",
    content,
  });

  vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  return document;
};
