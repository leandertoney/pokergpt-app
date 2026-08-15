module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    // Required by react-native-reanimated 4. Without it worklets are not
    // compiled and every animation silently no-ops at runtime rather than
    // failing loudly at build time. Must stay last in the plugin list.
    plugins: ["react-native-worklets/plugin"],
  };
};
