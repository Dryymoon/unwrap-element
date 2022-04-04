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

export function unwrap(selectorOrNode, { beforeDestroy, afterDestroy } = {}) {
  let targetNode;
  if (typeof selectorOrNode === 'string') {
    targetNode = document.querySelector(selectorOrNode);
  } else {
    targetNode = selectorOrNode;
  }

  if (!document.body.contains(targetNode)) {
    console.warn('unwrap-element: no target element found');
    return;
  }

  addStyles();

  let oldNodes = [...document.querySelectorAll(`[${ELEMENT_RELATION_ATTR}]`)];

  targetNode.setAttribute(ELEMENT_PREV_SCROLL_Y_ATTR, window.pageYOffset);
  targetNode.setAttribute(ELEMENT_PREV_SCROLL_X_ATTR, window.pageXOffset);

  holdRelation(targetNode, 'target');

  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });

  oldNodes = oldNodes.filter(it => it !== targetNode);

  let iterableNode = targetNode;
  // eslint-disable-next-line no-cond-assign
  while (iterableNode) {
    [...iterableNode?.parentNode.children].forEach((node) => {
      if (node === document.head) return;
      if (node === iterableNode) return;
      processChildElement(node);
    });

    if (!iterableNode[CHILDREN_OBSERVER]) {
      const mutationCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
          for (const addedNode of mutation.addedNodes) {
            processChildElement(addedNode);
          }
          for (const removedNode of mutation.removedNodes) {
            const relation = removedNode.getAttribute(ELEMENT_RELATION_ATTR);
            if (relation === 'parent' || relation === 'target') {
              destroyUnwrap(targetNode);
            }
          }
        }
      };

      const observer = new MutationObserver(mutationCallback);
      observer.observe(iterableNode, { childList: true });

      iterableNode[CHILDREN_OBSERVER] = observer;
    }

    iterableNode = iterableNode?.parentNode;

    if (iterableNode === document) break;

    holdRelation(iterableNode, 'parent');
    oldNodes = oldNodes.filter(it => it !== iterableNode);
  }

  for (const node of oldNodes) destroyUnwrapNodeHandlers(node);

  return () => destroyUnwrap(targetNode, { beforeDestroy, afterDestroy });
}

export function destroyUnwrap(targetNode, { beforeDestroy, afterDestroy } = {}) {
  if (beforeDestroy) {
    const beforeDestroyResult = beforeDestroy();
    if (beforeDestroyResult === false) return;
  }

  if (!targetNode.getAttribute(ELEMENT_RELATION_ATTR)) return;

  const nodes = document.querySelectorAll(`[${ELEMENT_RELATION_ATTR}]`);

  for (const node of nodes) destroyUnwrapNodeHandlers(node);

  // document.getElementById(STYLE_ID)?.remove();

  const prevX = targetNode.getAttribute(ELEMENT_PREV_SCROLL_X_ATTR);
  const prevY = targetNode.getAttribute(ELEMENT_PREV_SCROLL_Y_ATTR);

  targetNode.removeAttribute(ELEMENT_PREV_SCROLL_X_ATTR);
  targetNode.removeAttribute(ELEMENT_PREV_SCROLL_Y_ATTR);

  window.scrollTo({ left: prevX, top: prevY, behavior: 'auto' });

  if (afterDestroy) afterDestroy();
}

function destroyUnwrapNodeHandlers(node) {
  node[HOLD_RELATION_OBSERVER]?.disconnect();
  node[HOLD_RELATION_OBSERVER] = undefined;
  node[CHILDREN_OBSERVER]?.disconnect();
  node[CHILDREN_OBSERVER] = undefined;
  node.removeAttribute(ELEMENT_RELATION_ATTR);
}

function processChildElement(node) {
  if (node.tagName === 'SCRIPT') return;
  if (node.tagName === 'STYLE') return;

  holdRelation(node, 'neighbor');
}

function holdRelation(node, relation) {
  if (node.getAttribute(ELEMENT_RELATION_ATTR) === relation) return;

  if (node[HOLD_RELATION_OBSERVER]) {
    node[HOLD_RELATION_OBSERVER]?.disconnect();
    node[HOLD_RELATION_OBSERVER] = undefined;
  }

  node.setAttribute(ELEMENT_RELATION_ATTR, relation);

  function mutationCallback(mutationsList) {
    for (const mutation of mutationsList) {
      const { target, attributeName } = mutation;
      if (attributeName === ELEMENT_RELATION_ATTR && target.getAttribute(attributeName) !== relation) {
        node.setAttribute(ELEMENT_RELATION_ATTR, relation);
      }
    }
  }

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


export default unwrap;
export const install = addStyles;
export const unInstall = removeStyles;