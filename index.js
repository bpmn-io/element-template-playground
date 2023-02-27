import * as monaco from 'monaco-editor';

import download from 'downloadjs';

import BpmnModeler from 'camunda-bpmn-js/lib/camunda-cloud/Modeler';

import 'camunda-bpmn-js/dist/assets/camunda-cloud-modeler.css';

import jsonSchema from '@camunda/zeebe-element-templates-json-schema/resources/schema.json';

import defaultTemplates from './defaultTemplates.json';

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './json.worker.bundle.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return './css.worker.bundle.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return './html.worker.bundle.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.bundle.js';
    }
    return './editor.worker.bundle.js';
  }
};

const schemaUri = 'https://unpkg.com/browse/@camunda/zeebe-element-templates-json-schema/resources/schema.json';

const jsonCode = JSON.stringify(
  defaultTemplates.map(t => ({ ...t, $schema: schemaUri })), null, 2);

const modelUri = monaco.Uri.parse('a://b/foo.json');
const model = monaco.editor.createModel(jsonCode, 'json', modelUri);

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  validate: true,
  schemas: [
    {
      uri: 'https://unpkg.com/browse/@camunda/zeebe-element-templates-json-schema/resources/schema.json',
      fileMatch: [modelUri.toString()],
      schema: jsonSchema
    }
  ]
});

const jsonEditor = monaco.editor.create(document.querySelector('#code-container'), {
  automaticLayout: true,
  model: model,
  lineNumbers: false,
  minimap: {
    enabled: false
  },
  useTabStops: false,
  tabSize: 2
});

jsonEditor.onDidChangeModelContent(() => {
  updateTemplates();
});

const bpmnModeler = new BpmnModeler({
  container: document.querySelector('#diagram-container'),
  propertiesPanel: {
    parent: document.querySelector('#properties-container')
  }
});

bpmnModeler.on('elementTemplates.errors', event => {

  for (const error of event.errors) {
    handleError(error);
  }
});

bpmnModeler.createDiagram().then(() => {
  updateTemplates();
});

document.getElementById('download-bpmn').addEventListener('click', () => {
  bpmnModeler.saveXML({ format: true }, (err, xml) => {
    download(xml, 'diagram.bpmn', 'application/bpmn20-xml');
  });
});

document.getElementById('download-templates').addEventListener('click', () => {
  const templates = jsonEditor.getModel().getLinesContent().join('\n');

  download(templates, 'templates.json', 'application/json');
});

function clearErrors() {
  document.querySelector('#error-panel').textContent = '';
}

function handleError(error) {
  document.querySelector('#error-panel').textContent += '\n\n' + String(error);
}

function updateTemplates() {

  clearErrors();

  const templateText = jsonEditor.getModel().getLinesContent().join('\n');

  try {
    const templateDefinition = JSON.parse(templateText);

    bpmnModeler.invoke([ 'elementTemplatesLoader', (elementTemplatesLoader) => {
      elementTemplatesLoader.setTemplates(Array.isArray(templateDefinition) ? templateDefinition : [
        templateDefinition
      ]);
    }]);

  } catch (error) {
    return handleError(error);
  }
}
