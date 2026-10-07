import React, { useId, useRef } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { defaultValueNumber: number; snapRadius?: number };

export default function SnapRange({ defaultValueNumber, snapRadius, onChange, onInput, ...props }: Props) {
  const id = useId();
  const dragging = useRef(false);
  const snap = (event: React.FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const radius = snapRadius ?? Math.max((Number(props.max ?? 100) - Number(props.min ?? 0)) * 0.025, Number(props.step ?? 1) * 1.1);
    if (dragging.current && Math.abs(Number(input.value) - defaultValueNumber) <= radius) {
      input.value = String(defaultValueNumber);
    }
  };
  return <><input {...props} type="range" list={snapRadius === undefined ? id : undefined}
    onPointerDown={() => { dragging.current = true; }}
    onPointerUp={() => { dragging.current = false; }}
    onPointerCancel={() => { dragging.current = false; }}
    onBlur={() => { dragging.current = false; }}
    onKeyDown={() => { dragging.current = false; }}
    onInput={event => { snap(event); onInput?.(event); }}
    onChange={event => { snap(event); onChange?.(event); }}
  /><datalist id={id}><option value={defaultValueNumber} /></datalist></>;
}
