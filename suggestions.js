/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements and licensed to you under a proprietary license.
 * You may not use this file except in compliance with the proprietary license.
 */

import * as monaco from 'monaco-editor';


const OPENING_BRACKETS = ['{', '['];
const CLOSING_BRACKETS = ['}', ']'];

function createProposals(range, monaco) {
  // returning a static list of proposals, filtering is done by the Monaco editor
  return [
    {
      label: 'BPMN Property',
      kind: monaco.languages.CompletionItemKind.Function,
      detail: 'property',
      documentation: 'Template a simple property',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:String}",
  "binding": {
      "type": "property",
      "name": "\${3:property name}"
  },
  "value": "\${4:default value}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'Task definition type',
      kind: monaco.languages.CompletionItemKind.Function,
      detail: 'zeebe:taskDefinition',
      documentation: 'Template the task definition type',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:Hidden}",
  "binding": {
      "type": "zeebe:taskDefinition:type"
  },
  "value": "\${3:task definition type}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'Input',
      detail: 'zeebe:input',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: 'Template an input mapping',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:String}",
  "feel": "required",
  "binding": {
      "type": "zeebe:input",
      "name": "\${3:variable name}"
  },
  "value": "\${4:=default expression}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'Output',
      kind: monaco.languages.CompletionItemKind.Function,
      detail: 'zeebe:output',
      documentation: 'Template an output mapping',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:String}",
  "binding": {
      "type": "zeebe:output",
      "source": "\${3:=output expression}"
  },
  "value": "\${4:default variable name}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'Zeebe Property',
      kind: monaco.languages.CompletionItemKind.Function,
      detail: 'zeebe:property',
      documentation: 'Template a zeebe property',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:String}",
  "binding": {
    "type": "zeebe:property",
    "name": "\${3:property name}"
  },
  "value": "\${4:default property value name}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'Task Header',
      kind: monaco.languages.CompletionItemKind.Function,
      detail: 'zeebe:header',
      documentation: 'Template a task header',
      insertText: `{
  "label": "\${1:Property label}",
  "type": "\${2:String}",
  "binding": {
    "type": "zeebe:taskHeader",
    "key": "\${3:task header name}"
  },
  "value": "\${4:default task header value}"
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    }
  ];
}

const provider =
{
  provideCompletionItems: function (model, position) {
    if (!monaco) {
      return { suggestions: [] };
    }

    var textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const isInProperties = checkIsInProperties(textUntilPosition);

    if (!isInProperties) {
      return { suggestions: [] };
    }

    var textAfterPosition = model.getValue().substring(textUntilPosition.length);

    var word = model.getWordUntilPosition(position);
    var range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    let suggestions = createProposals(range, monaco);
    const isLastProperty = textAfterPosition.trim().startsWith(']');

    if (!isLastProperty) {
      suggestions = suggestions.map((suggestion) => {
        suggestion.insertText = suggestion.insertText + ',';
        return suggestion;
      });
    }

    return {
      suggestions
    };
  }
}

monaco.languages.registerCompletionItemProvider("json", provider);


// helpers //////////////////////
function checkIsInProperties(textUntilPosition) {
  const match = /"properties"[\s\S]*?$/.exec(textUntilPosition);

  // We are before the properties array
  if (!match) {
    return false;
  }

  // Check if we are inside the properties object
  const properties = textUntilPosition.slice(match.index);

  let nestingLevel = 0;

  for (let char of properties) {
    if (OPENING_BRACKETS.includes(char)) {
      nestingLevel++;
    }
    if (CLOSING_BRACKETS.includes(char)) {
      nestingLevel--;

      if (nestingLevel === 0) {
        // We have left the properties object, return false
        return false;
      }
    }
  }

  // only suggest properties when we are on the root level of the properties array
  return nestingLevel === 1;
}
