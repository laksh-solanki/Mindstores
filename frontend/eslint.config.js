import vuetify from "eslint-config-vuetify";

export default vuetify({
  rules: {
    "vue/block-lang": "off",
    // Pinia action methods are object-method syntax, but this generic rule
    // mistakes their store `this` binding for an unsafe top-level use.
    "unicorn/no-this-outside-of-class": "off",
    // Vue templates use adjacent tags intentionally; enforcing blank lines
    // produces a large formatting-only diff with no readability benefit.
    "vue/padding-line-between-tags": "off",
    // Vue's documented v-model event uses a colon in its event name.
    "vue/custom-event-name-casing": "off",
    "unicorn/consistent-compound-words": "off",
    "perfectionist/sort-imports": "off",
  },
});
