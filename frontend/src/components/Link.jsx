import { navigate } from '../router.js';

/**
 * In-app link. Renders a real <a href> so search engines can follow it and so
 * Cmd/Ctrl/middle click opens a new tab, but a plain left click is handled in
 * the client with pushState (no full page reload).
 *
 * The `mm-link` class keeps it looking exactly like the div it replaced: see
 * index.css, where the global link colour skips `.mm-link` and the class resets
 * display/colour/underline. Tailwind utilities on the element still win.
 */
export default function Link({ to, className = '', onClick, children, ...rest }) {
  const handleClick = (event) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented) return;
    // Let the browser handle modified clicks (new tab / window / download).
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} className={`mm-link ${className}`.trim()} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
