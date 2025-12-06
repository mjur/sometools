import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const loadBtn = qs('#load');
const copyBtn = qs('#copy');
const exampleBtn = qs('#example');

// Load state from URL or localStorage
const storageKey = 'openapi-viewer-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}

// Example OpenAPI
const exampleOpenAPI = JSON.stringify({
  "openapi": "3.0.0",
  "info": {
    "title": "Sample API",
    "version": "1.0.0",
    "description": "A sample API for demonstration"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get users",
        "responses": {
          "200": {
            "description": "List of users",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": { "type": "integer" },
                      "name": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}, null, 2);

function renderOpenAPI(spec) {
  let html = '';
  
  // Info section
  if (spec.info) {
    html += `<h2>${spec.info.title || 'API'}</h2>`;
    if (spec.info.version) {
      html += `<p><strong>Version:</strong> ${spec.info.version}</p>`;
    }
    if (spec.info.description) {
      html += `<p>${spec.info.description}</p>`;
    }
    html += '<hr>';
  }
  
  // Servers
  if (spec.servers && spec.servers.length > 0) {
    html += '<h3>Servers</h3><ul>';
    spec.servers.forEach(server => {
      html += `<li><code>${server.url}</code>${server.description ? ` - ${server.description}` : ''}</li>`;
    });
    html += '</ul><hr>';
  }
  
  // Paths
  if (spec.paths) {
    html += '<h3>Endpoints</h3>';
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      html += `<div style="margin-bottom: 2rem; padding: 1rem; background: var(--bg); border-radius: 4px; border: 1px solid var(--border);">`;
      html += `<h4><code>${path}</code></h4>`;
      
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
          html += `<div style="margin-left: 1rem; margin-top: 1rem;">`;
          html += `<strong style="text-transform: uppercase; color: var(--primary);">${method}</strong>`;
          if (operation.summary) {
            html += ` - ${operation.summary}`;
          }
          if (operation.description) {
            html += `<p style="margin-top: 0.5rem; color: var(--muted);">${operation.description}</p>`;
          }
          
          // Parameters
          if (operation.parameters && operation.parameters.length > 0) {
            html += '<p style="margin-top: 0.5rem;"><strong>Parameters:</strong></p><ul>';
            operation.parameters.forEach(param => {
              html += `<li><code>${param.name}</code> (${param.in}) - ${param.schema?.type || 'string'}${param.required ? ' <strong>required</strong>' : ''}</li>`;
            });
            html += '</ul>';
          }
          
          // Responses
          if (operation.responses) {
            html += '<p style="margin-top: 0.5rem;"><strong>Responses:</strong></p><ul>';
            for (const [status, response] of Object.entries(operation.responses)) {
              html += `<li><code>${status}</code> - ${response.description || ''}</li>`;
            }
            html += '</ul>';
          }
          
          html += '</div>';
        }
      }
      html += '</div>';
    }
  }
  
  return html;
}

function load() {
  const text = input.value.trim();
  
  if (!text) {
    output.innerHTML = '<p style="color: var(--muted);">Load an OpenAPI specification to view documentation</p>';
    return;
  }
  
  try {
    // Try parsing as JSON first
    let spec;
    const jsonResult = safeParse(text);
    
    if (jsonResult.success) {
      spec = jsonResult.data;
    } else {
      // Try parsing as YAML (basic YAML parsing)
      // For now, show error - full YAML parsing would require a library
      output.innerHTML = '<p style="color: var(--error);">YAML parsing not yet supported. Please provide JSON format.</p>';
      return;
    }
    
    // Validate it's an OpenAPI spec
    if (!spec.openapi && !spec.swagger) {
      output.innerHTML = '<p style="color: var(--error);">This does not appear to be an OpenAPI/Swagger specification.</p>';
      return;
    }
    
    const html = renderOpenAPI(spec);
    output.innerHTML = html;
    
    // Save state
    saveStateWithStorage({ input: text }, storageKey);
  } catch (error) {
    output.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
  }
}

// Load button
on(loadBtn, 'click', load);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    load();
  }
});

// Copy button
on(copyBtn, 'click', async () => {
  await copy(input.value, 'Input copied to clipboard!');
});

// Example button
on(exampleBtn, 'click', () => {
  input.value = exampleOpenAPI;
  load();
});

// Auto-load on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (input.value.trim()) {
      load();
    }
  }, 1000);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    load();
  }
}

// Initial load if there's content
if (input.value) {
  load();
}

