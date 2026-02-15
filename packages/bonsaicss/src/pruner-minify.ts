import * as csstree from 'css-tree';

/**
 * Remove all comment nodes from the AST.
 * This is a dedicated pass so minification guarantees comment-free output.
 */
export function removeComments(ast: csstree.CssNode): void {
    const commentsToRemove: Array<{
        list: csstree.List<csstree.CssNode>;
        item: csstree.ListItem<csstree.CssNode>;
    }> = [];

    csstree.walk(ast, {
        visit: 'Comment',
        enter(_node, item, list) {
            commentsToRemove.push({ list, item });
        },
    });

    commentsToRemove.forEach(({ list, item }) => {
        list.remove(item);
    });
}
