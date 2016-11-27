// @flow

import {
  dirname,
  relative
} from 'path';
import {
  readFileSync
} from 'fs';
import {
  parse as parseComment
} from 'doctrine';
import findPackageJsonPath from './findPackageJsonPath';

type SeverityCategoryType = 'log' | 'info' | 'warn' | 'error';

type SourceLocationType = {|
  functionName: string,
  message: string | null,
  packageName: string,
  packageVersion: string,
  scriptColumn: number,
  scriptLine: number,
  scriptPath: string
|};

const getCommentDeprecatedTagDescriptions = (comment: string): Array<string> => {
  const {
    tags
  } = parseComment(comment, {
    unwrap: true
  });

  return tags
    .filter((tag) => {
      return tag.title === 'deprecated';
    })
    .map((tag) => {
      return tag.description;
    });
};

export default ({
  types: t
}: {
  types: Object
}) => {
  const getFunctionName = (path) => {
    if (t.isFunctionDeclaration(path)) {
      return path.node.id.name;
    }

    if (t.isAssignmentExpression(path.parent)) {
      return path.parent.left.name;
    }

    if (t.isVariableDeclarator(path.parent)) {
      return path.parent.id.name;
    }

    // @todo This is failing in a large codebase. Inspect what conditions are uncovered. Temporarily report function as "anonymous".
    // throw new Error('Cannot get node name.');

    return 'anonymous';
  };

  const createConsoleCallExpression = (severityCategory: SeverityCategoryType, message: string, sourceLocation: SourceLocationType) => {
    return t.callExpression(
      t.memberExpression(
        t.identifier('console'),
        t.identifier(severityCategory)
      ),
      [
        t.stringLiteral(message),
        t.objectExpression([
          t.objectProperty(
            t.identifier('functionName'),
            t.stringLiteral(sourceLocation.functionName)
          ),
          t.objectProperty(
            t.identifier('message'),
            sourceLocation.message === null ? t.nullLiteral() : t.stringLiteral(sourceLocation.message)
          ),
          t.objectProperty(
            t.identifier('packageName'),
            t.stringLiteral(sourceLocation.packageName)
          ),
          t.objectProperty(
            t.identifier('packageVersion'),
            t.stringLiteral(sourceLocation.packageVersion)
          ),
          t.objectProperty(
            t.identifier('scriptColumn'),
            t.numericLiteral(sourceLocation.scriptColumn)
          ),
          t.objectProperty(
            t.identifier('scriptLine'),
            t.numericLiteral(sourceLocation.scriptLine)
          ),
          t.objectProperty(
            t.identifier('scriptPath'),
            t.stringLiteral(sourceLocation.scriptPath)
          )
        ])
      ]
    );
  };

  const createMessage = (functionName: string, line: number, relativeScriptPath: string): string => {
    return 'Deprecated: Function "' + functionName + '" is deprecated in /' + relativeScriptPath + ' on line ' + line;
  };

  const processNode = (path, state, comments): void => {
    const {
      column,
      line
    } = path.node.loc.start;

    const packagePath = findPackageJsonPath(dirname(state.file.opts.filename));
    const packageConfiguration = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const relativeScriptPath = relative(dirname(packagePath), state.file.opts.filename);
    const functionName = getFunctionName(path);

    comments
      .map((comment) => {
        return comment.value;
      })
      .map(getCommentDeprecatedTagDescriptions)
      .reduce((accumulator, currentValue) => {
        return accumulator.concat(currentValue);
      }, [])
      .forEach((message) => {
        const consoleCallExpression = createConsoleCallExpression('warn', createMessage(functionName, line, relativeScriptPath), {
          functionName,
          message,
          packageName: packageConfiguration.name,
          packageVersion: packageConfiguration.version,
          scriptColumn: column,
          scriptLine: line,
          scriptPath: relativeScriptPath
        });

        path.get('body').unshiftContainer('body', consoleCallExpression);
      });
  };

  return {
    visitor: {
      'ArrowFunctionExpression|FunctionExpression' (path: Object, state: Object) {
        if (!path.parentPath.parent.leadingComments || path.parentPath.parent.leadingComments.length === 0) {
          return;
        }

        processNode(path, state, path.parentPath.parent.leadingComments);
      },
      'FunctionDeclaration' (path: Object, state: Object) {
        if (!path.node.leadingComments || path.node.leadingComments.length === 0) {
          return;
        }

        processNode(path, state, path.node.leadingComments);
      }
    }
  };
};
