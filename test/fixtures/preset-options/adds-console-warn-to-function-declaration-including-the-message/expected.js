/**
 * @deprecated Deprecated in favour of quux.
 */
function foo() {
  console.warn("Deprecated: Function \"foo\" is deprecated in /fixtures/preset-options/adds-console-warn-to-function-declaration-including-the-message/actual.js on line 4", {
    functionName: "foo",
    message: "Deprecated in favour of quux.",
    packageName: "bar",
    packageVersion: "1.0.0",
    scriptColumn: 0,
    scriptLine: 4,
    scriptPath: "fixtures/preset-options/adds-console-warn-to-function-declaration-including-the-message/actual.js"
  })
};
