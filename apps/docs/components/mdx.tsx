import defaultComponents from 'fumadocs-ui/mdx';

export function getMDXComponents(overrides?: Record<string, unknown>) {
  return {
    ...defaultComponents,
    ...overrides,
  };
}
