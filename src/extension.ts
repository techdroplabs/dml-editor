// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { URLSearchParams } from "url";
import { openInUntitled } from "./util";
import {
  blockListQuery,
  renderBlock,
  saveBlock,
  singleBlockQuery,
} from "./queries";

export function activate(context: vscode.ExtensionContext) {
  const url: string = context.globalState.get("url") || "";
  const cookie: string = context.globalState.get("accessToken") || "";

  const renderSingleBlock = async (id: string, url: string, cookie: string) => {
    const response: any = await singleBlockQuery(id, url, cookie);

    const codeDocument = await openInUntitled(response.data.block.html);

    const currOpenEditor = await vscode.window.showTextDocument(
      codeDocument,
      vscode.ViewColumn.One
    );

    const webPanel = vscode.window.createWebviewPanel(
      "dmlPreview",
      "DML Preview",
      vscode.ViewColumn.Two,
      {}
    );

    webPanel.webview.html = response.data.block.renderedHtml;

    const renderBlockFunc = async (dml: string) => {
      const renderResponse = await renderBlock(dml, url, cookie);
      webPanel.webview.html = renderResponse.data.renderUnsavedBlock.html;
    };

    if (currOpenEditor) {
      // In this example, we want to start watching the currently open doc
      let currActiveDoc = currOpenEditor.document;

      const onDidChangeDisposable = vscode.workspace.onDidChangeTextDocument(
        (event: vscode.TextDocumentChangeEvent) => {
          // watched doc changed
          if (event.document === currActiveDoc) {
            renderBlockFunc(event.document.getText());
          }
        }
      );

      const onDidCloseDisposable = vscode.workspace.onDidCloseTextDocument(
        (closedDoc: vscode.TextDocument) => {
          if (closedDoc === currActiveDoc) {
            // clear the key if it is closed
            context.globalState.update(closedDoc.fileName, undefined);
          } else {
            console.log("non watched doc closed");
          }
        }
      );
    }

    context.globalState.update(currOpenEditor.document.fileName, id);
  };

  const dmlStart = vscode.commands.registerCommand(
    "dml-editor.start",
    renderSingleBlock
  );
  context.subscriptions.push(dmlStart);

  const dmlLoad = vscode.commands.registerCommand(
    "dml-editor.load",
    async () => {
      // show loading state first while we fetch the block list
      vscode.window.showQuickPick(["Loading..."]);

      const response: any = await blockListQuery(url, cookie);

      const quickPickItems = response.data.blocks.nodes.map(
        (n: { name: string; id: string }) => {
          const item = `${n.name} - ${n.id}`;
          return item;
        }
      );

      // quick pick returns the selectedItem
      const selectedItem = await vscode.window.showQuickPick(quickPickItems);

      if (selectedItem) {
        const regex = /blk_.*/g;
        const found = selectedItem.match(regex);
        const blockId = found && found[0] ? found[0] : null;

        if (blockId) {
          await renderSingleBlock(blockId, url, cookie);
        }
      }
    }
  );
  context.subscriptions.push(dmlLoad);

  const dmlSave = vscode.commands.registerCommand(
    "dml-editor.save",
    async () => {
      const currActiveEditor = vscode.window.activeTextEditor;

      // if current active editor has changes and is untitled
      if (
        currActiveEditor &&
        currActiveEditor.document.isDirty &&
        currActiveEditor.document.isUntitled
      ) {
        const blockId: string | undefined = context.globalState.get(
          currActiveEditor.document.fileName
        );
        if (blockId) {
          const dml = currActiveEditor.document.getText();
          vscode.window.showInformationMessage(
            `Please wait while your block saves`
          );
          await saveBlock(dml, blockId, url, cookie);
          vscode.window.showInformationMessage(
            `Successfully saved block to dyspatch`
          );
        }
      }
    }
  );
  context.subscriptions.push(dmlSave);

  const urlHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      const searchParams = new URLSearchParams(uri.query);

      const blockId = searchParams.get("blockId") || "";
      const accessToken = searchParams.get("accessToken");
      const baseUrl = searchParams.get("url") || "";

      try {
        await vscode.commands.executeCommand(
          "dml-editor.start",
          blockId,
          `${baseUrl}/api/graphql`,
          `access_token=${accessToken}`
        );
      } catch (err) {
        console.error(err);
      }

      context.globalState.update("accessToken", `access_token=${accessToken}`);
      context.globalState.update("url", `${baseUrl}/api/graphql`);
    },
  });
  context.subscriptions.push(urlHandler);
}
