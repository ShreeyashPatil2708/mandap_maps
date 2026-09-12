// The one content column. Every page and every piece of app chrome puts its
// contents inside one of these.
//
// The pattern is full-bleed background, contained content: the maroon navbar,
// the hero band and the footer still run edge to edge, but what sits inside
// them lines up on a single column that is full width on mobile and centred on
// desktop. Before this existed every page was edge to edge at any width, so on
// a laptop a `justify-between` row put its label at the far left and its value
// a thousand pixels away at the far right.
//
// `shell` (1100px) is for grids, lists and the app frame. `prose` (720px) is
// for reading columns, where a 1100px line length would be hard to read.
//
// Horizontal inset lives here and nowhere else. Do not add `px-gutter` or
// `px-gutter-lg` to children, or they will be inset twice.
export default function Container({ as: As = 'div', width = 'shell', className = '', children }) {
  const max = width === 'prose' ? 'max-w-prose' : 'max-w-shell';
  return <As className={`mx-auto w-full ${max} px-gutter-lg ${className}`}>{children}</As>;
}
