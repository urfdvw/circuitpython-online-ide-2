import { useEffect, useRef } from "react";

export default function useMomentaryButton(name, send) {
    const active = useRef(null);
    const release = () => {
        const press = active.current;
        if (!press) return;
        active.current = null;
        press.send(press.name, false);
    };
    const press = () => {
        if (active.current || !name) return;
        active.current = { name, send };
        send(name, true);
    };
    useEffect(() => {
        return () => {
            const press = active.current;
            active.current = null;
            if (press) press.send(press.name, false);
        };
    }, [name]);
    return {
        onPointerDown: (event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            press();
        },
        onPointerUp: release,
        onPointerCancel: release,
        onLostPointerCapture: release,
        onKeyDown: (event) => {
            if ([" ", "Enter"].includes(event.key)) {
                event.preventDefault();
                if (!event.repeat) press();
            }
        },
        onKeyUp: (event) => {
            if ([" ", "Enter"].includes(event.key)) release();
        },
        onBlur: release,
    };
}
