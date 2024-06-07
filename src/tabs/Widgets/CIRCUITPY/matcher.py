class State:
    def __init__(self, val=0):
        self._val = val
        self._last = val

    @property
    def now(self):
        return self._val

    @now.setter
    def now(self, val):
        self._last = self._val
        self._val = val

    @property
    def diff(self):
        return self._val - self._last


class TargetMatcher:
    def __init__(self, target=None):
        if target is None:
            self.clear_target()
        else:
            self.target = target
        self.segment = ""
        self.mood = State()

    def push(self, segment):
        result = []
        segment = self.segment + segment
        self.segment = ""
        for i in range(len(segment) - len(self.target), len(segment)):
            if i < 0:
                continue
            tail = segment[i:]
            if tail == self.target:
                break
            if tail == self.target[: len(tail)]:
                self.segment = tail
                segment = segment[: len(segment) - len(tail)]
                break
            else:
                self.segment = ""
        parts = segment.split(self.target)
        for i in range(len(parts)):
            if i != 0:
                self.mood.now = 1
                result.append([self.target, self.mood.now, self.mood.diff])
            if len(parts[i]) > 0:
                self.mood.now = 0
                result.append([parts[i], self.mood.now, self.mood.diff])
        return result

    def clear_target(self):
        self.target = "You shall not pass! (∩๏‿‿๏)⊃━☆ﾟ.*"


class BracketMatcher:
    def __init__(self, begin_str, end_str):
        self.begin_matcher = TargetMatcher(begin_str)
        self.end_matcher = TargetMatcher(end_str)
        self.mood = State()
        self.matcher = self.begin_matcher

    def push(self, segment):
        outlet = []
        parts = self.matcher.push(segment)
        while len(parts) > 0:
            current = parts.pop(0)
            if len(current[0]) == 0:
                continue
            if current[1] == 0:
                outlet.append([current[0], self.mood.now, self.mood.diff])
                self.mood.now = self.mood.now
            else:
                self.mood.now = 1 - self.mood.now
                if self.mood.now == 1:
                    self.matcher = self.end_matcher
                else:
                    self.matcher = self.begin_matcher
                rest = [p[0] for p in parts]
                text = "".join(rest)
                parts = self.matcher.push(text)
        return outlet


def none_fun(text, branch):
    return None


class MatcherProcessor:
    def __init__(
        self,
        matcher,
        in_action=none_fun,
        enter_action=none_fun,
        exit_action=none_fun,
        out_action=none_fun,
    ):
        self.matcher = matcher
        self.in_action = in_action
        self.enter_action = enter_action
        self.exit_action = exit_action
        self.out_action = out_action
        self.through = False
        self.branch = []

    def push(self, parts):
        outlet = []
        for part_in in parts:
            for part_out in self.matcher.push(part_in):
                text = part_out[0]
                mood = part_out[1]
                diff = part_out[2]

                # print('debug', part_out)
                if diff == 1:
                    self.enter_action(text, "".join(self.branch))
                if mood == 1:
                    self.in_action(text, "".join(self.branch))
                    if self.through:
                        outlet.append(text)
                    else:
                        self.branch.append(text)
                if diff == -1:
                    self.exit_action(text, "".join(self.branch))
                    self.branch = []
                if mood == 0:
                    self.out_action(text, "".join(self.branch))
                    outlet.append(text)
        return outlet
