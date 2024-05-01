// https://stackoverflow.com/questions/59061266/can-i-import-dom-types-explicitly/59061859#59061859
/// <reference lib="dom" />

const STYLE_ATTR = 'unwrapper-style';
const ELEMENT_RELATION_ATTR = 'unwrapper-node-type';
const ELEMENT_PREV_SCROLL_Y_ATTR = 'unwrapper-prev-scroll-y';
const ELEMENT_PREV_SCROLL_X_ATTR = 'unwrapper-prev-scroll-x';
const HOLD_RELATION_OBSERVER = Symbol('hold relation observer ref');
const CHILDREN_OBSERVER = Symbol('children observer ref');

const STYLE = `
[${ELEMENT_RELATION_ATTR}='neighbor'],
[${ELEMENT_RELATION_ATTR}='neighbor']:before,
[${ELEMENT_RELATION_ATTR}='neighbor']:after {
  display: none !important;
}
[${ELEMENT_RELATION_ATTR}='parent']:not(html):not(body) {
  all: unset !important;
}
html[${ELEMENT_RELATION_ATTR}='parent'],
body[${ELEMENT_RELATION_ATTR}='parent'] {
  display: block !important;
  position: static !important;
  overflow: visible !important;
  height: auto !important;
  min-height: auto !important;
  max-height: unset !important;
  width: auto !important;
  min-width: auto !important;
  max-width: unset !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 none !important;
  transition: unset !important;
}
[${ELEMENT_RELATION_ATTR}='parent']:before,
[${ELEMENT_RELATION_ATTR}='parent']:after {
  display: none !important;
}

[${ELEMENT_RELATION_ATTR}='target'] {
  display: block !important;
}`;

/*
p1osition: static !important;
        d1isplay: block !important;
        o1verflow: visible !important;
        m1in-height: auto !important;
        h1eight: auto !important;
        m1ax-height: unset !important;
        m1in-width: auto !important;
        w1idth: auto !important;
        m1ax-width: unset !important;
        m1argin: 0 !important;
        p1adding: 0 !important;
        b1order: 0 none !important;
        t1ransition: unset !important;
        o1pacity: 1 !important;
        z1-index: auto !important;
        t1op: auto !important;
        r1ight: auto !important;
        b1ottom: auto !important;
        l1eft: auto !important;
 */

type ElementWithUnwrapData = (HTMLElement | Element) & {
  [HOLD_RELATION_OBSERVER]?: MutationObserver;
  [CHILDREN_OBSERVER]?: MutationObserver;
  [ELEMENT_RELATION_ATTR]?: string;
};

export default function (
  selectorOrNode: string | Element,
  options?: {
    bypassSelectorsOrNodes?: (string | Element)[];
    beforeDestroy?: () => Promise<void | false>;
    afterDestroy?: () => Promise<void>;
    beforeInitialScroll?: (
      options: ScrollToOptions,
    ) => void | false | ScrollToOptions;
    beforeRestoreScroll?: (
      options: ScrollToOptions,
    ) => Promise<void | false | ScrollToOptions>;
  },
) {
  const {
    bypassSelectorsOrNodes = [],
    beforeDestroy,
    afterDestroy,
    beforeInitialScroll,
    beforeRestoreScroll,
  } = options || {};

  let unsafeTargetNode: Element | null | undefined;
  if (typeof selectorOrNode === 'string') {
    unsafeTargetNode = document.querySelector(selectorOrNode);

    if (!unsafeTargetNode) {
      console.warn(`
unwrap-element: 
not found target element with selector:'${selectorOrNode}'
`);
      return;
    }
  } else if (selectorOrNode instanceof Element) {
    unsafeTargetNode = selectorOrNode;
    if (!document.body.contains(<Node>unsafeTargetNode)) {
      console.warn(`
unwrap-element: 
not found provided target element in Body
`);
      return;
    }
  } else {
    console.warn(
      `
unwrap-element: 
unknown type of provided target element, 
supported 'querySelector' and 'DomNode'
`,
    );
  }

  if (!unsafeTargetNode) return; // Warnings consoled upper

  const targetNode: Element = unsafeTargetNode;

  addStyles();

  let oldNodes: Element[] = Object.values(
    document.querySelectorAll(`[${ELEMENT_RELATION_ATTR}]`),
  );

  const initialScrollParams: ScrollToOptions = {
    top: window.scrollY,
    left: window.scrollX,
    behavior: 'instant',
  };

  if (
    !targetNode.getAttribute(ELEMENT_PREV_SCROLL_Y_ATTR) &&
    !targetNode.getAttribute(ELEMENT_PREV_SCROLL_X_ATTR)
  ) {
    targetNode.setAttribute(
      ELEMENT_PREV_SCROLL_Y_ATTR,
      String(initialScrollParams.top),
    );
    targetNode.setAttribute(
      ELEMENT_PREV_SCROLL_X_ATTR,
      String(initialScrollParams.left),
    );
  }

  holdRelation(targetNode, 'target');

  let shouldScroll = true;
  let scrollParams: ScrollToOptions = { left: 0, top: 0, behavior: 'instant' };
  if (beforeInitialScroll) {
    const result: any | false | ScrollToOptions =
      beforeInitialScroll(initialScrollParams); // { left?: number; top?: number; behavior?: string } =
    if (result === false) shouldScroll = false;
    if (typeof result === 'object')
      scrollParams = { ...scrollParams, ...result };
  }
  if (shouldScroll) {
    window.scrollTo(scrollParams);
  }

  let iterableNode: typeof targetNode & { [CHILDREN_OBSERVER]?: any };

  iterableNode = targetNode;

  // eslint-disable-next-line no-cond-assign
  while (iterableNode) {
    if (iterableNode.parentNode) {
      for (const node of Object.values(
        iterableNode.parentNode.children,
      ) as ElementWithUnwrapData[]) {
        if (CHILDREN_OBSERVER in node) {
          node[CHILDREN_OBSERVER]?.disconnect();
          node[CHILDREN_OBSERVER] = undefined;
          delete node[CHILDREN_OBSERVER];
        }
      }

      for (const node of Object.values(iterableNode.parentNode.children)) {
        if (node === document.head) continue;
        if (node === iterableNode) continue;
        if (matchNodeBySelectorsList(node, bypassSelectorsOrNodes)) continue;
        processNeighborElement(node);
        oldNodes = oldNodes.filter(it => it !== node);
      }
    }

    if (
      iterableNode !== targetNode && // No need to observe children in targetNode
      !iterableNode[CHILDREN_OBSERVER] &&
      !matchNodeBySelectorsList(iterableNode, bypassSelectorsOrNodes)
    ) {
      const mutationCallback: MutationCallback = mutationsList => {
        for (const mutation of mutationsList) {
          for (const addedNode of Object.values(mutation.addedNodes)) {
            if (matchNodeBySelectorsList(addedNode, bypassSelectorsOrNodes))
              continue;
            processNeighborElement(addedNode);
          }

          for (const removedNode of Object.values(mutation.removedNodes)) {
            if (removedNode instanceof Element) {
              const relation = removedNode.getAttribute(
                ELEMENT_RELATION_ATTR,
              ) as string | undefined;
              if (relation === 'parent' || relation === 'target') {
                destroyUnwrap(targetNode, {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  beforeDestroy,
                  afterDestroy,
                  beforeRestoreScroll,
                  $force: true,
                }).then();
              }
            }
          }
        }
      };

      const observer = new MutationObserver(mutationCallback);
      observer.observe(iterableNode, { childList: true });

      iterableNode[CHILDREN_OBSERVER] = observer;
    }

    oldNodes = oldNodes.filter(it => it !== iterableNode);

    const parentElement = iterableNode.parentNode as
      | Element
      | Document
      | undefined
      | null;

    if (!parentElement) break;
    if (parentElement === document) break;

    const parentElement2 = parentElement as Element;

    if (!matchNodeBySelectorsList(parentElement2, bypassSelectorsOrNodes)) {
      holdRelation(parentElement2, 'parent');
    }

    iterableNode = parentElement2;
  }

  for (const node of oldNodes) destroyUnwrapNodeHandlers(node);

  return () =>
    destroyUnwrap(targetNode, {
      beforeDestroy,
      afterDestroy,
      beforeRestoreScroll,
    });
}

export async function destroyUnwrap(
  targetNode: Element,
  options?: {
    beforeDestroy?: () => Promise<void | false>;
    afterDestroy?: () => Promise<void>;
    beforeRestoreScroll?: (
      options: ScrollToOptions,
    ) => Promise<void | false | ScrollToOptions>;
    $force?: boolean;
  },
) {
  const { beforeDestroy, afterDestroy, beforeRestoreScroll, $force } =
    options || {};

  if (beforeDestroy) {
    const beforeDestroyResult = await beforeDestroy();
    if (!$force && beforeDestroyResult === false) return;
  }

  if (!$force && targetNode.getAttribute(ELEMENT_RELATION_ATTR) !== 'target') {
    return;
  }

  const nodes = Object.values(
    document.querySelectorAll(`[${ELEMENT_RELATION_ATTR}]`),
  );

  for (const node of nodes) destroyUnwrapNodeHandlers(node);

  const prevXStr = targetNode.getAttribute(ELEMENT_PREV_SCROLL_X_ATTR);
  let prevXNum: number | undefined = undefined;
  if (prevXStr) prevXNum = +prevXStr;
  let prevYNum: number | undefined = undefined;
  const prevYStr = targetNode.getAttribute(ELEMENT_PREV_SCROLL_Y_ATTR);
  if (prevYStr) prevYNum = +prevYStr;

  targetNode.removeAttribute(ELEMENT_PREV_SCROLL_X_ATTR);
  targetNode.removeAttribute(ELEMENT_PREV_SCROLL_Y_ATTR);

  let shouldRestoreScroll = true;
  let scrollParams: ScrollToOptions = {
    top: prevYNum,
    left: prevXNum,
    behavior: 'instant',
  };
  if (beforeRestoreScroll) {
    const result: any | false | ScrollToOptions = await beforeRestoreScroll({
      top: prevYNum,
      left: prevXNum,
      behavior: 'instant',
    });
    if (result === false) shouldRestoreScroll = false;
    if (typeof result === 'object')
      scrollParams = { ...scrollParams, ...result };
  }

  if (shouldRestoreScroll) {
    window.scrollTo(scrollParams);
  }

  if (afterDestroy) await afterDestroy();
}

function destroyUnwrapNodeHandlers(node: ElementWithUnwrapData) {
  node[HOLD_RELATION_OBSERVER]?.disconnect();
  node[HOLD_RELATION_OBSERVER] = undefined;
  delete node[HOLD_RELATION_OBSERVER];
  node[CHILDREN_OBSERVER]?.disconnect();
  node[CHILDREN_OBSERVER] = undefined;
  delete node[CHILDREN_OBSERVER];
  if (node instanceof Element) {
    node.removeAttribute(ELEMENT_RELATION_ATTR);
  }
}

function processNeighborElement(node: Node) {
  if (node instanceof Element) {
    if (node.tagName === 'SCRIPT') return;
    if (node.tagName === 'STYLE') return;

    holdRelation(node, 'neighbor');
  }
}

function holdRelation(node: ElementWithUnwrapData, relation: string) {
  node[HOLD_RELATION_OBSERVER]?.disconnect();
  node[HOLD_RELATION_OBSERVER] = undefined;
  delete node[HOLD_RELATION_OBSERVER];

  node.setAttribute(ELEMENT_RELATION_ATTR, relation);

  const mutationCallback: MutationCallback = mutationsList => {
    for (const mutation of mutationsList) {
      const { target, attributeName } = mutation;
      if (
        attributeName === ELEMENT_RELATION_ATTR &&
        target instanceof Element &&
        target.getAttribute(attributeName) !== relation
      ) {
        node.setAttribute(ELEMENT_RELATION_ATTR, relation);
      }
    }
  };

  const observer = new MutationObserver(mutationCallback);
  observer.observe(node, { attributes: true });

  node[HOLD_RELATION_OBSERVER] = observer;
}

function addStyles() {
  let style: HTMLStyleElement | null;
  style = document.querySelector(STYLE_ATTR);
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style');
    style.setAttribute(STYLE_ATTR, '');
    style.innerHTML = STYLE;
  }
  document.head.appendChild(style);
}

/**
 * We don`t use removeStyles because in some cases when Unwrap and then
 * call Unwrap child element and next close Unwrap,
 * child unwrap removed styles and parent won`t show
 */

function matchNodeBySelectorsList(
  node: Element | Node,
  selectorsOrNodesList: (string | Element)[],
) {
  for (const selectorOrNode of selectorsOrNodesList) {
    if (
      'classList' in node &&
      typeof selectorOrNode === 'string' &&
      selectorOrNode.startsWith('.')
    ) {
      if (node.classList.contains(selectorOrNode)) return true;
    } else if (
      'id' in node &&
      typeof selectorOrNode === 'string' &&
      selectorOrNode.startsWith('#')
    ) {
      if (node.id === selectorOrNode) return true;
    } else if (
      typeof selectorOrNode === 'string' &&
      selectorOrNode.startsWith('[')
    ) {
      console.error(
        'bypassSelectorOrNode match by attributes not supported for now',
      );
      // TODO Data attributes check
      return;
    } else if ('tagName' in node && typeof selectorOrNode === 'string') {
      if (node.tagName === selectorOrNode.toUpperCase()) return true;
    } else {
      if (node === selectorOrNode) return true;
    }
  }
}
