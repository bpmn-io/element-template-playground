import * as monaco from 'monaco-editor';

import BpmnModeler from 'camunda-bpmn-js/lib/camunda-cloud/Modeler';

import jsonSchema from '@camunda/zeebe-element-templates-json-schema/resources/schema.json';

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

const jsonCode = `{
  "$schema": "${schemaUri}",
  "name": "asd",
  "id": "asd",
  "appliesTo": ["bpmn:Task"],
  "properties": []
}`;

const readOnlyRanges = [
  {
    // Start of File
    startLineNumber: 0,
    endLineNumber: 4,
  }
]

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
  model: model,
  lineNumbers: true,
  minimap: {
    enabled: false
  },
  useTabStops: false,
  tabSize: 2,
  automaticLayout: true,
  folding: true,
  formatOnPaste: true
});

jsonEditor.createDecorationsCollection(
  readOnlyRanges.map((range) => ({
    range: {
      ...range
    },
    options: {
      isWholeLine: true,
      className: 'readOnlyLine',
      marginClassName: 'readOnlyLine'
    }
  }))
);



const bpmnModeler = new BpmnModeler({
  container: document.querySelector('#diagram-container'),
  propertiesPanel: {
    parent: document.querySelector('#properties-container')
  }
});

const BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="sid-38422fae-e03e-43a3-bef4-bd33b32041b2" targetNamespace="http://bpmn.io/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="9.0.3">
  <process id="Process_1" isExecutable="false" />
  <bpmndi:BPMNDiagram id="BpmnDiagram_1">
    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</definitions>
`;

bpmnModeler.on('elementTemplates.errors', event => {

  for (const error of event.errors) {
    handleError(error);
  }
});

function clearErrors() {
  document.querySelector('#error-panel').textContent = '';
}

function handleError(error) {
  document.querySelector('#error-panel').textContent += '\n\n' + String(error);
}

function updatePreview() {

  clearErrors();

  const templateText = jsonEditor.getModel().getLinesContent().join('\n');

  try {
    const templateDefinition = JSON.parse(templateText);

    bpmnModeler.invoke([
      'elementTemplatesLoader',
      'elementTemplates',
      'elementFactory',
      'bpmnFactory',
      'modeling', 'canvas',
      'selection', (
      elementTemplatesLoader,
      elementTemplates,
      elementFactory,
      bpmnFactory,
      modeling, canvas,
      selection) => {

      elementTemplatesLoader.setTemplates([
        templateDefinition
      ]);

      const template = elementTemplates.get(templateDefinition.id);

      if (!template) {
        return handleError(new Error('failed to parse template'));
      }

      const type = template.elementType && template.elementType.value || template.appliesTo[0];

      bpmnModeler.importXML(BPMN_XML).then(() => {

        const [ task ] = modeling.createElements([
          elementFactory.create('shape', {
            type: type,
            businessObject: bpmnFactory.create(type, {
              name: type.replace('bpmn:', '')
            })
          })
        ], { x: 200, y: 200 }, canvas.getRootElement());

        elementTemplates.applyTemplate(task, template);

        selection.select(task);
      });

    }]);

  } catch (error) {
    return handleError(error);
  }

}

const readonlyRange = new monaco.Range(0, 0, 5, 0)
jsonEditor.onKeyDown(e => {
  console.log(e);

  // allow cursor movement
  if (e.keyCode >= 13 && e.keyCode <= 18) { 
    return;
  }

  const contains = jsonEditor.getSelections().findIndex(range => readonlyRange.intersectRanges(range))
  
  if (contains !== -1) {
      e.stopPropagation()
      e.preventDefault() // for Ctrl+C, Ctrl+V
  }
});

jsonEditor.onDidChangeModelContent(event => {
  updatePreview();
});

updatePreview();