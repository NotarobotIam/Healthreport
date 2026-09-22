/**
 * Member-written text is always rendered as plain text. React escapes it, and
 * whitespace-pre-wrap keeps line breaks — there is no HTML or Markdown path
 * through which a post could inject markup or script.
 */
export function PostText({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`whitespace-pre-wrap break-words ${className}`}>{children}</p>;
}
