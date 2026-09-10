module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Required by react-native-reanimated (a dependency of
    // react-native-draggable-flatlist, used for hint reordering) -
    // must be listed last per its own setup docs.
    plugins: ["react-native-reanimated/plugin"],
  };
};
