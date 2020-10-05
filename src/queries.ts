import * as vscode from "vscode";
import fetch, { RequestInit } from "node-fetch";

const fetchWrapper = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  console.log(response.status);

  const json = await response.json();
  console.log(json);

  // show alert if the cookie has expired
  if (json && json.msg && json.msg === "not authorized") {
    vscode.window.showErrorMessage(
      "Your session has expired, log back in at https://app.dyspatch.io and choose a block"
    );
  }
  return json;
};

const defaultOptions = (cookie: string, body: string) => ({
  method: "post",
  headers: {
    "content-type": "application/json; charset=utf-8",
    cookie,
  },
  body,
});

export const singleBlockQuery = async (
  blockId: string,
  url: string,
  cookie: string
) => {
  const baseURL = url;
  const id = blockId;

  const query = {
    query: `query SingleBlockQuery($blockId: String!) {
          block(blockId: $blockId) {
                  id
                  name
                  html
                  renderedHtml
                  }
                }`,
    variables: { blockId: id },
    operationName: "SingleBlockQuery",
  };

  const response = await fetchWrapper(
    baseURL,
    defaultOptions(cookie, JSON.stringify(query))
  );
  return response;
};

export const blockListQuery = async (url: string, cookie: string) => {
  const baseURL = url;

  const query = {
    query: `{ blocks {
              nodes {
                      id
                      name
                      }
                  }
              }`,
  };

  const response = await fetchWrapper(
    baseURL,
    defaultOptions(cookie, JSON.stringify(query))
  );
  return response;
};

export const renderBlock = async (dml: string, url: string, cookie: string) => {
  const baseURL = url;

  const renderInput = (dmlString: string) => ({
    context: "{}",
    dml: dmlString,
    groupRevisionId: "",
    initialAmpState: "{}",
    lcid: "",
    mapping: {},
    strict: true,
  });

  const query = {
    operationName: "renderUnsavedBlock",
    variables: {
      input: renderInput(dml),
    },
    query: `mutation renderUnsavedBlock($input: RenderUnsavedBlockInput!) {
            renderUnsavedBlock(input: $input) {
                html
                ampHtml
                localizableFields {
                    id
                    defaultValue
                }
            }
        }`,
  };

  const response = await fetchWrapper(
    baseURL,
    defaultOptions(cookie, JSON.stringify(query))
  );
  return response;
};

export const saveBlock = async (
  dml: string,
  blockId: string,
  url: string,
  cookie: string
) => {
  const baseURL = url;

  const query = {
    operationName: "saveBlock",
    variables: {
      input: {
        id: blockId,
        html: dml,
        previewData: "",
        ampState: "",
        localizations: [],
      },
    },
    query: `mutation saveBlock($input: UpdateBlockInput!) {
          updateBlock(input: $input) {
              id
              created
              modified
              name
              html
              previewData
              ampState
              latestRevisionId
          }
      }`,
  };

  const response = await fetchWrapper(
    baseURL,
    defaultOptions(cookie, JSON.stringify(query))
  );
  return response;
};
