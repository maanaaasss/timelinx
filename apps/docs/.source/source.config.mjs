// source.config.ts
import { defineConfig } from "fumadocs-mdx/config";
import { remarkMdxMermaid } from "fumadocs-mermaid";
var source_config_default = defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid]
  }
});
export {
  source_config_default as default
};
