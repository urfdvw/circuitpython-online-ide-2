import json, sys, supervisor, time
from matcher import BracketMatcher, MatcherProcessor

CV_JSON_START = "<CV>"
CV_JSON_END = "</CV>"
LINE_END = "\n"
UPDATE_PERIOD = 0.5


def update(d, u):
    """Deep Update of dict class"""
    for k, v in u.items():
        if isinstance(v, dict):
            d[k] = update(d.get(k, {}), v)
        else:
            d[k] = v
    return d


class ConnectedVariables:
    def __init__(self):
        self.vars = {}
        self.cv_processor = MatcherProcessor(
            BracketMatcher(CV_JSON_START, CV_JSON_END),
            exit_action=self.exit_action,
        )
        self.last_time_stamp = time.monotonic()

    def update(self):
        self.serial_read()
        print(CV_JSON_START + json.dumps(self.vars) + CV_JSON_END, end="")

    def heart_beat(self):
        if time.monotonic() - self.last_time_stamp > UPDATE_PERIOD:
            self.update()
            self.last_time_stamp = time.monotonic()

    def exit_action(self, text, branch):
        try:
            # parse
            serial_updates_dict = json.loads(branch.strip())
            # check
            assert all(
                [key in self.vars for key in serial_updates_dict]
            ), "get unknown variable names from serial"
            # cast type
            for key, value in serial_updates_dict.items():
                serial_updates_dict[key] = type(self.vars[key])(value)
            # echo update
            print(CV_JSON_START + json.dumps(serial_updates_dict) + CV_JSON_END, end="")
            # update
            self.vars.update(serial_updates_dict)
        except Exception as e:
            self.serial_updates = ""  # clean up bad data
            print(e)

    def define(self, var_name, initdata):
        """
        define a connected variable
        """
        assert type(var_name) == type(""), "var_name should be string"
        self.vars[var_name] = initdata
        self.update()

    def serial_read(self):
        """
        read CDC data from serial buffer if any
        don't use input() in other parts of the code
        """
        # read from serial
        while n_bytes := supervisor.runtime.serial_bytes_available:
            self.cv_processor.push([sys.stdin.read(n_bytes)])

    def read(self, var_names):
        """
        read a defined variable or a list of defined variables
        """
        # type enforce
        ## convert the input to a list if it is not
        if type(var_names) != type([]):
            var_names = [var_names]
        assert all(
            [type(name) == type("") for name in var_names]
        ), "all names should be strings"
        # get updates
        self.serial_read()
        # get values
        output = [self.vars[name] for name in var_names]
        if len(output) == 1:
            return output[0]
        return output

    def write(self, var_names, var_values):
        # type enforce
        if type(var_names) != type([]):
            var_names = [var_names]
            var_values = [var_values]
        assert all(
            [type(name) == type("") for name in var_names]
        ), "all names should be strings in python"
        assert all(
            [
                type(self.vars[name]) == type(value)
                for name, value in zip(var_names, var_values)
            ]
        ), "variable type does not match in python"
        # update
        updates_dict = {name: value for name, value in zip(var_names, var_values)}
        self.vars.update(updates_dict)
        # send updates
        print(CV_JSON_START + json.dumps(updates_dict) + CV_JSON_END, end="")
