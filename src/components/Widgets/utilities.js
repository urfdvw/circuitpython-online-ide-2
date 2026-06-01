import { useState, useEffect } from "react";

export const useSlowChangeState = (inState, interval) => {
    const [lastTime, setLastTime] = useState(new Date());
    const [outState, setOutState] = useState(inState);

    useEffect(() => {
        const curTime = new Date();
        const timeDiff = (curTime - lastTime) / 1000;
        if (timeDiff > interval) {
            setOutState(inState);
            setLastTime(curTime);
        }
    }, [inState]);

    return outState;
};
