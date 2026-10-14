import React from 'react';
import { PageId } from '../types';
import { pathForPage } from '../seo/routes';

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  page: PageId;
  onNavigate: (page: PageId) => void;
  onAfterClick?: () => void;
}

// A real <a href="/about-us/"> so search engines can follow it, which still navigates without
// a full page reload for visitors (middle-click / "open in new tab" keep working).
export const Link: React.FC<LinkProps> = ({ page, onNavigate, onAfterClick, children, ...rest }) => (
  <a
    {...rest}
    href={pathForPage(page)}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(page);
      onAfterClick?.();
    }}
  >
    {children}
  </a>
);
