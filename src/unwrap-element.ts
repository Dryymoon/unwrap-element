// https://stackoverflow.com/questions/59061266/can-i-import-dom-types-explicitly/59061859#59061859
/// <reference lib="dom" />

const STYLE_ID = 'unwrapper-style';
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

type HtmlElementWithUnwrapData = (HTMLElement | Element) & {
  [HOLD_RELATION_OBSERVER]?: MutationObserver;
  [CHILDREN_OBSERVER]?: MutationObserver;
  [ELEMENT_RELATION_ATTR]?: string;
};

export default function (
  selectorOrNode: string | HTMLElement,
  options?: {
    beforeDestroy?: () => Promise<any | false>;
    afterDestroy?: () => Promise<any>;
    beforeRestoreScroll?: () => Promise<any>;
    bypassSelectorsOrNodes: (string | HTMLElement)[];
  },
) {
  const {
    beforeDestroy,
    afterDestroy,
    bypassSelectorsOrNodes = [],
  } = options || {};

  let unsafeTargetNode: HTMLElement | Element | null | undefined;
  if (typeof selectorOrNode === 'string') {
    unsafeTargetNode = document.querySelector(selectorOrNode);

    if (!unsafeTargetNode) {
      console.warn(`
unwrap-element: 
not found target element with selector:'${selectorOrNode}'
`);
      return;
    }
  } else if (isElement(selectorOrNode)) {
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

  const targetNode: HTMLElement | Element = unsafeTargetNode;

  addStyles();

  let oldNodes: HTMLElement[] = Object.values(
    document.querySelectorAll(`[${ELEMENT_RELATION_ATTR}]`),
  );

  targetNode.setAttribute(ELEMENT_PREV_SCROLL_Y_ATTR, String(window.scrollY));
  targetNode.setAttribute(ELEMENT_PREV_SCROLL_X_ATTR, String(window.scrollX));

  holdRelation(targetNode, 'target');

  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });

  oldNodes = oldNodes.filter((it) => it !== targetNode);

  let iterableNode: typeof targetNode & { [CHILDREN_OBSERVER]?: any };

  iterableNode = targetNode;

  // eslint-disable-next-line no-cond-assign
  while (iterableNode) {
    if (iterableNode?.parentNode) {
      Object.values(iterableNode?.parentNode.children).forEach((node) => {
        if (node === document.head) return;
        if (node === iterableNode) return;
        if (matchNodeBySelectorsList(node, bypassSelectorsOrNodes)) return;
        processChildElement(node);
      });
    }

    if (
      !iterableNode[CHILDREN_OBSERVER] &&
      iterableNode !== targetNode &&
      !matchNodeBySelectorsList(iterableNode, bypassSelectorsOrNodes)
    ) {
      const mutationCallback: MutationCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
          for (const addedNode of Object.values(
            mutation.addedNodes,
          ) as HTMLElement[]) {
            if (matchNodeBySelectorsList(addedNode, bypassSelectorsOrNodes))
              continue;
            processChildElement(addedNode);
          }
          for (const removedNode of Object.values(mutation.removedNodes)) {
            if (
              'getAttribute' in removedNode &&
              typeof removedNode.getAttribute === 'function'
            ) {
              const relation = removedNode.getAttribute(
                ELEMENT_RELATION_ATTR,
              ) as string | undefined;
              if (relation === 'parent' || relation === 'target') {
                destroyUnwrap(targetNode).then();
              }
            }
          }
        }
      };

      const observer = new MutationObserver(mutationCallback);
      observer.observe(iterableNode, { childList: true });

      iterableNode[CHILDREN_OBSERVER] = observer;
    }

    oldNodes = oldNodes.filter((it) => it !== iterableNode);

    if (!iterableNode.parentNode) break;
    if (iterableNode.parentNode === document) break;

    if (
      !matchNodeBySelectorsList(iterableNode.parentNode, bypassSelectorsOrNodes)
    ) {
      holdRelation(iterableNode.parentNode as HTMLElement, 'parent');
    }

    iterableNode = <Element>iterableNode.parentNode;
  }

  for (const node of oldNodes) destroyUnwrapNodeHandlers(node);

  return () => destroyUnwrap(targetNode, { beforeDestroy, afterDestroy });
}

async function destroyUnwrap(
  targetNode: HTMLElement | Element,
  options?: {
    beforeDestroy?: () => Promise<any | false>;
    afterDestroy?: () => Promise<any>;
    beforeRestoreScroll?: () => Promise<any>;
  },
) {
  const { beforeDestroy, afterDestroy, beforeRestoreScroll } = options || {};

  if (beforeDestroy) {
    const beforeDestroyResult = await beforeDestroy();
    if (beforeDestroyResult === false) return;
  }

  if (!targetNode.getAttribute(ELEMENT_RELATION_ATTR)) return;

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
  if (beforeRestoreScroll) {
    const beforeRestoreScrollResult = await beforeRestoreScroll();
    if (beforeRestoreScrollResult === false) shouldRestoreScroll = false;
  }

  if (shouldRestoreScroll) {
    window.scrollTo({ left: prevXNum, top: prevYNum, behavior: 'auto' });
  }

  removeStyles();

  if (afterDestroy) await afterDestroy();
}

function destroyUnwrapNodeHandlers(node: HtmlElementWithUnwrapData) {
  node[HOLD_RELATION_OBSERVER]?.disconnect();
  node[HOLD_RELATION_OBSERVER] = undefined;
  node[CHILDREN_OBSERVER]?.disconnect();
  node[CHILDREN_OBSERVER] = undefined;
  node.removeAttribute(ELEMENT_RELATION_ATTR);
}

function processChildElement(node: HTMLElement | Element) {
  if (node.tagName === 'SCRIPT') return;
  if (node.tagName === 'STYLE') return;

  holdRelation(node, 'neighbor');
}

function holdRelation(node: HtmlElementWithUnwrapData, relation: string) {
  if (node.getAttribute(ELEMENT_RELATION_ATTR) === relation) return;

  if (
    HOLD_RELATION_OBSERVER in node &&
    node[HOLD_RELATION_OBSERVER] &&
    'disconnect' in node[HOLD_RELATION_OBSERVER] &&
    typeof node[HOLD_RELATION_OBSERVER].disconnect === 'function'
  ) {
    node[HOLD_RELATION_OBSERVER].disconnect();
    node[HOLD_RELATION_OBSERVER] = undefined;
  }

  node.setAttribute(ELEMENT_RELATION_ATTR, relation);

  const mutationCallback: MutationCallback = (mutationsList) => {
    for (const mutation of mutationsList) {
      const { target, attributeName } = mutation;
      if (
        attributeName === ELEMENT_RELATION_ATTR &&
        'getAttribute' in target &&
        typeof target.getAttribute === 'function' &&
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
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.type = 'text/css';
  style.id = STYLE_ID;
  style.innerHTML = STYLE;
  document.head.appendChild(style);
}

function removeStyles() {
  document.getElementById(STYLE_ID)?.remove();
}

function matchNodeBySelectorsList(
  node: HTMLElement | Element | Node,
  selectorsOrNodesList: (string | HTMLElement | Element)[],
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

function isElement(element: any) {
  return element instanceof Element || element instanceof Document;
}
