'use client';

import { useEffect, useRef } from 'react';
import { useLocaleContext } from '@/contexts/LocaleContext';
import { translateMaybe } from '@/lib/i18n/translate';

const TEXT_ORIGINAL = new WeakMap<Text, string>();

function translateAttributes(element: Element, translate: (value?: string | null) => string) {
  for (const attribute of ['placeholder', 'title', 'aria-label']) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const original = element.getAttribute(`data-i18n-original-${attribute}`) || current;
    element.setAttribute(`data-i18n-original-${attribute}`, original);
    element.setAttribute(attribute, translate(original));
  }
}

function translateNode(node: Node, translate: (value?: string | null) => string) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    const current = textNode.nodeValue || '';
    const original = TEXT_ORIGINAL.get(textNode) || current;
    TEXT_ORIGINAL.set(textNode, original);
    const next = translate(original);
    if (next !== current) {
      textNode.nodeValue = next;
    }
    return;
  }

  if (!(node instanceof Element)) return;
  translateAttributes(node, translate);
  for (const child of Array.from(node.childNodes)) {
    translateNode(child, translate);
  }
}

export function LocaleAutoTranslate() {
  const { locale } = useLocaleContext();
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const translate = (value?: string | null) => translateMaybe(locale, value);
    const run = () => translateNode(document.body, translate);

    run();

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      run();
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => observerRef.current?.disconnect();
  }, [locale]);

  return null;
}
