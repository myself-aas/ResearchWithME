'use client';

import { createElement } from 'react';
import { LinkPlugin } from '@platejs/link/react';
import { PlateElement, type PlateElementProps } from 'platejs/react';
import { platePlugins } from '@/lib/editor/plate-markdown';
import { sanitizeMdxUrl } from '@/lib/v34/mdx-security';

/**
 * Links are inline elements, but Plate's base renderer leaves them as a
 * generic inline box. Rendering through `PlateElement as="a"` keeps the
 * document model while giving the browser a real, keyboard-activatable link.
 */
function LinkElement(props: PlateElementProps) {
  const url = typeof props.element.url === 'string' ? sanitizeMdxUrl(props.element.url) ?? undefined : undefined;
  return createElement(PlateElement, {
    ...props,
    as: 'a',
    href: url,
    rel: 'noopener noreferrer',
    className: 'text-brand underline underline-offset-2',
  } as never);
}

const linkWithAnchor = LinkPlugin.withComponent(LinkElement as never);

export const editorPlugins = platePlugins.map((plugin) => (plugin === LinkPlugin ? linkWithAnchor : plugin));
