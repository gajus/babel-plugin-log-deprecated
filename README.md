# babel-plugin-log-deprecated

[![Travis build status](http://img.shields.io/travis/gajus/babel-plugin-log-deprecated/master.svg?style=flat-square)](https://travis-ci.org/gajus/babel-plugin-log-deprecated)
[![NPM version](http://img.shields.io/npm/v/babel-plugin-log-deprecated.svg?style=flat-square)](https://www.npmjs.org/package/babel-plugin-log-deprecated)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

Adds a `console.warn` statement to the functions annotated with the [JSDoc `@deprecated` tag](http://usejsdoc.org/tags-deprecated.html).

The `console.warn` is added at the beginning of the function body.

* [Example transpilation](#example-transpilation)
* [Motivation](#motivation)
* [Using in production](#using-in-production)
* [Implementation](#implementation)
  * [Deprecation message fields](#deprecation-message-filds)
  * [`package.json` resolution](#packagejson-resolution)

## Example transpilation

Input:

```js
/**
 * @deprecated Deprecated in favour of quux.
 */
function foo () {
  bar();
};

```

Output:

```js
/**
 * @deprecated Deprecated in favour of quux.
 */
function foo () {
  console.warn("Deprecated: Function \"foo\" is deprecated in /fixtures/preset-options/adds-console-warn-to-function-declaration/actual.js on line 4", {
    functionName: "foo",
    message: "Deprecated in favour of quux.",
    packageName: "bar",
    packageVersion: "1.0.0",
    scriptColumn: 0,
    scriptLine: 4,
    scriptPath: "fixtures/preset-options/adds-console-warn-to-function-declaration/actual.js"
  });

  bar();
};

```

## Motivation

Working on a code base that has a large public API surface requires a method to instruct the consumer about deprecation of methods. The most common approach at the moment is to add an ad-hoc `console.warn` statement used to warn the consumer. There are multiple problems with this approach:

1. It duplicates the role of the [JSDoc `@deprecated` tag](http://usejsdoc.org/tags-deprecated.html).
1. It restricts the developer to the amount of the information that can be included in the deprecation message.
1. It leads to a proliferation of arbitrary format `console.log` messages that can be hard to filter out.

To address these issues, `babel-plugin-log-deprecated`:

1. Uses JSDoc `@deprecated` tag to construct the deprecation log `message` property.
1. Utilises build time information (`package.json` configuration, script path) to enrich the deprecation message.
1. Enforces a consistent error message format.

## Using in production

This transpiler can be used to produce code for client-side use and Node.js. Whether to leave the warnings in the production build depends on the use case.

Regarding the client-side use, I have been asked:

> inu-no-policemen:
>
> Wouldn't it make more sense to get these messages at compile time?
>
> Messages which only appear if a particular path is taken through the application are easy to miss.

– https://www.reddit.com/r/javascript/comments/5f71la/i_have_written_a_babel_transpiler_that_adds/dai062z/

I am using this plugin to add warning messages that are visible at a runtime on purpose. Think about large organizations that have multiple teams working on a frontend of the same website. There is a lot of code in the `window` namespace:

|Website|`Object.keys(window).length`|
|---|---|
|https://www.google.com/blank.html|181 (base figure)|
|https://www.ft.com/|229 (+48)|
|https://www.theguardian.com/uk|269 (+88)|
|http://www.dailymail.co.uk/home/index.html|599 (+418)|
|http://time.com/|669 (+488)|

Furthermore, this is just the count of the properties in the `window` namespace. A number of these properties will expose complex APIs that tie together the entire website (think user targeting, advertising, utilities, etc.).

You cannot simply remove properties because you risk of breaking things. Therefore, a sensible solution is to communicate the upcoming changes to the other teams and add deprecation warnings well ahead of making the change.

In a similar fashion, a public library can use the deprecation warning to inform the consumers of the upcoming changes.

## Implementation

### Deprecation message fields

|Name|Value|
|---|---|
|`functionName`|Name of the function that has the `@deprecated` tag associated with. In case of an anonymous function - name of the left hand side identifier.|
|`message`|Message provided in the description of the [JSDoc `@deprecated` tag](http://usejsdoc.org/tags-deprecated.html)|
|`packageName`|Value of the `name` property in the `package.json`. See [`package.json` resolution](#packagejson-resolution).|
|`packageVersion`|Value of the `version` property in the `package.json`. See [`package.json` resolution](#packagejson-resolution).|
|`scriptColumn`|Number of the column where the function is declared.|
|`scriptLine`|Number of the line where the function is declared.|
|`scriptPath`|Path to the script file relative to `package.json`. See [`package.json` resolution](#packagejson-resolution).|

### `package.json` resolution

`package.json` is resolved relative to the file being transpiled.
