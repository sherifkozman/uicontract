/**
 * Manifest validation, building, and serialization.
 *
 * Validation is implemented manually (no ajv/JSON Schema library)
 * to keep runtime dependencies at zero.
 */

import type { Manifest, ManifestElement, NamedElement } from '../types.js';

/** A single validation error */
export interface ValidationError {
  path: string;
  code: string;
  message: string;
}

/** Result of validating a manifest */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const SCHEMA_VERSION_PATTERN = /^\d+\.\d+$/;
const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function validateElement(element: unknown, index: number, errors: ValidationError[]): void {
  const prefix = `elements[${String(index)}]`;

  if (!isRecord(element)) {
    errors.push({
      path: prefix,
      code: 'INVALID_TYPE',
      message: `Element at index ${String(index)} must be an object.`,
    });
    return;
  }

  // agentId
  if (typeof element['agentId'] !== 'string') {
    errors.push({
      path: `${prefix}.agentId`,
      code: 'REQUIRED_FIELD',
      message: 'agentId is required and must be a string.',
    });
  } else if (element['agentId'].length === 0) {
    errors.push({
      path: `${prefix}.agentId`,
      code: 'EMPTY_AGENT_ID',
      message: 'agentId must not be empty.',
    });
  } else if (!AGENT_ID_PATTERN.test(element['agentId'])) {
    errors.push({
      path: `${prefix}.agentId`,
      code: 'INVALID_AGENT_ID',
      message: `agentId "${element['agentId']}" must match pattern ^[a-z][a-z0-9.-]*$ (lowercase, starts with letter, contains only letters, digits, dots, hyphens).`,
    });
  }

  // type
  if (typeof element['type'] !== 'string' || element['type'].length === 0) {
    errors.push({
      path: `${prefix}.type`,
      code: 'REQUIRED_FIELD',
      message: 'type is required and must be a non-empty string.',
    });
  }

  // filePath
  if (typeof element['filePath'] !== 'string' || element['filePath'].length === 0) {
    errors.push({
      path: `${prefix}.filePath`,
      code: 'REQUIRED_FIELD',
      message: 'filePath is required and must be a non-empty string.',
    });
  }

  // line
  if (typeof element['line'] !== 'number' || !Number.isInteger(element['line']) || element['line'] < 1) {
    errors.push({
      path: `${prefix}.line`,
      code: 'INVALID_TYPE',
      message: 'line must be a positive integer.',
    });
  }

  // column
  if (
    typeof element['column'] !== 'number' ||
    !Number.isInteger(element['column']) ||
    element['column'] < 1
  ) {
    errors.push({
      path: `${prefix}.column`,
      code: 'INVALID_TYPE',
      message: 'column must be a positive integer.',
    });
  }

  // nullable string fields
  const nullableFields = ['componentName', 'route', 'label', 'handler'] as const;
  for (const field of nullableFields) {
    if (!(field in element)) {
      errors.push({
        path: `${prefix}.${field}`,
        code: 'REQUIRED_FIELD',
        message: `${field} is required (can be null).`,
      });
    } else if (!isStringOrNull(element[field])) {
      errors.push({
        path: `${prefix}.${field}`,
        code: 'INVALID_TYPE',
        message: `${field} must be a string or null.`,
      });
    }
  }

  // attributes
  if (!isRecord(element['attributes'])) {
    errors.push({
      path: `${prefix}.attributes`,
      code: 'REQUIRED_FIELD',
      message: 'attributes is required and must be an object.',
    });
  } else {
    for (const [key, value] of Object.entries(element['attributes'])) {
      if (typeof value !== 'string') {
        errors.push({
          path: `${prefix}.attributes.${key}`,
          code: 'INVALID_TYPE',
          message: `attributes["${key}"] must be a string.`,
        });
      }
    }
  }

  // boolean fields
  const booleanFields = ['conditional', 'dynamic'] as const;
  for (const field of booleanFields) {
    if (typeof element[field] !== 'boolean') {
      errors.push({
        path: `${prefix}.${field}`,
        code: 'REQUIRED_FIELD',
        message: `${field} is required and must be a boolean.`,
      });
    }
  }
}

/** Validate a manifest object against the v1 schema. */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRecord(manifest)) {
    errors.push({
      path: '',
      code: 'INVALID_TYPE',
      message: 'Manifest must be an object.',
    });
    return { valid: false, errors };
  }

  // schemaVersion
  if (typeof manifest['schemaVersion'] !== 'string') {
    errors.push({
      path: 'schemaVersion',
      code: 'REQUIRED_FIELD',
      message: 'schemaVersion is required and must be a string.',
    });
  } else if (!SCHEMA_VERSION_PATTERN.test(manifest['schemaVersion'])) {
    errors.push({
      path: 'schemaVersion',
      code: 'INVALID_FORMAT',
      message: 'schemaVersion must match format "major.minor" (e.g., "1.0").',
    });
  } else {
    const major = parseInt(manifest['schemaVersion'].split('.')[0] ?? '0', 10);
    if (major !== 1) {
      errors.push({
        path: 'schemaVersion',
        code: 'VERSION_UNSUPPORTED',
        message: `schemaVersion major version ${String(major)} is not supported. Only version 1.x is supported. Please update @uic/core to handle this manifest version.`,
      });
    }
  }

  // generatedAt
  if (typeof manifest['generatedAt'] !== 'string') {
    errors.push({
      path: 'generatedAt',
      code: 'REQUIRED_FIELD',
      message: 'generatedAt is required and must be an ISO 8601 datetime string.',
    });
  }

  // generator
  if (!isRecord(manifest['generator'])) {
    errors.push({
      path: 'generator',
      code: 'REQUIRED_FIELD',
      message: 'generator is required and must be an object with name and version.',
    });
  } else {
    if (typeof manifest['generator']['name'] !== 'string' || manifest['generator']['name'].length === 0) {
      errors.push({
        path: 'generator.name',
        code: 'REQUIRED_FIELD',
        message: 'generator.name is required and must be a non-empty string.',
      });
    }
    if (typeof manifest['generator']['version'] !== 'string' || manifest['generator']['version'].length === 0) {
      errors.push({
        path: 'generator.version',
        code: 'REQUIRED_FIELD',
        message: 'generator.version is required and must be a non-empty string.',
      });
    }
  }

  // metadata
  if (!isRecord(manifest['metadata'])) {
    errors.push({
      path: 'metadata',
      code: 'REQUIRED_FIELD',
      message: 'metadata is required and must be an object.',
    });
  } else {
    const meta = manifest['metadata'];
    if (typeof meta['framework'] !== 'string' || meta['framework'].length === 0) {
      errors.push({
        path: 'metadata.framework',
        code: 'REQUIRED_FIELD',
        message: 'metadata.framework is required and must be a non-empty string.',
      });
    }
    if (typeof meta['projectRoot'] !== 'string' || meta['projectRoot'].length === 0) {
      errors.push({
        path: 'metadata.projectRoot',
        code: 'REQUIRED_FIELD',
        message: 'metadata.projectRoot is required and must be a non-empty string.',
      });
    }
    if (typeof meta['filesScanned'] !== 'number' || !Number.isInteger(meta['filesScanned'])) {
      errors.push({
        path: 'metadata.filesScanned',
        code: 'INVALID_TYPE',
        message: 'metadata.filesScanned must be an integer.',
      });
    }
    if (typeof meta['elementsDiscovered'] !== 'number' || !Number.isInteger(meta['elementsDiscovered'])) {
      errors.push({
        path: 'metadata.elementsDiscovered',
        code: 'INVALID_TYPE',
        message: 'metadata.elementsDiscovered must be an integer.',
      });
    }
    if (typeof meta['warnings'] !== 'number' || !Number.isInteger(meta['warnings'])) {
      errors.push({
        path: 'metadata.warnings',
        code: 'INVALID_TYPE',
        message: 'metadata.warnings must be an integer.',
      });
    }
  }

  // elements
  if (!Array.isArray(manifest['elements'])) {
    errors.push({
      path: 'elements',
      code: 'REQUIRED_FIELD',
      message: 'elements is required and must be an array.',
    });
  } else {
    for (let i = 0; i < manifest['elements'].length; i++) {
      validateElement(manifest['elements'][i], i, errors);
    }

    // Check for duplicate agentIds
    const seenIds = new Set<string>();
    for (let i = 0; i < manifest['elements'].length; i++) {
      const el = manifest['elements'][i];
      if (isRecord(el) && typeof el['agentId'] === 'string' && el['agentId'].length > 0) {
        if (seenIds.has(el['agentId'])) {
          errors.push({
            path: `elements[${String(i)}].agentId`,
            code: 'DUPLICATE_AGENT_ID',
            message: `Duplicate agentId "${el['agentId']}". Each element must have a unique agentId.`,
          });
        }
        seenIds.add(el['agentId']);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Build a manifest from named elements and metadata. */
export function buildManifest(options: {
  elements: NamedElement[];
  framework: string;
  projectRoot: string;
  filesScanned: number;
  warnings: number;
  generatorVersion: string;
}): Manifest {
  const manifestElements: ManifestElement[] = options.elements.map((el) => ({
    ...el,
    attributes: { ...el.attributes },
  }));

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generator: {
      name: '@uic/cli',
      version: options.generatorVersion,
    },
    metadata: {
      framework: options.framework,
      projectRoot: options.projectRoot,
      filesScanned: options.filesScanned,
      elementsDiscovered: manifestElements.length,
      warnings: options.warnings,
    },
    elements: manifestElements,
  };
}

/** Serialize a manifest to a pretty-printed JSON string. */
export function serializeManifest(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2);
}

/** Deserialize a JSON string to a manifest, validating it in the process. */
export function deserializeManifest(json: string): Manifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error(
      'Failed to parse manifest JSON. Ensure the file contains valid JSON.',
    );
  }

  const result = validateManifest(parsed);
  if (!result.valid) {
    const details = result.errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    throw new Error(
      `Invalid manifest:\n${details}\n\nEnsure your manifest matches the v1 schema.`,
    );
  }

  return parsed as Manifest;
}
