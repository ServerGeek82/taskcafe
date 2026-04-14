import React, { useEffect, useRef, useCallback } from 'react';

type AutoSizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onResize?: (e: Event) => void;
};

const AutoSizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoSizeTextareaProps>(
  ({ onResize, style, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = internalRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, []);

    useEffect(() => {
      resize();
    });

    const setRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        internalRef.current = el;
        if (typeof forwardedRef === 'function') {
          forwardedRef(el);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }
      },
      [forwardedRef],
    );

    return (
      <textarea
        ref={setRef}
        style={{ ...style, overflow: 'hidden', resize: 'none' }}
        {...props}
      />
    );
  },
);

AutoSizeTextarea.displayName = 'AutoSizeTextarea';

export default AutoSizeTextarea;
