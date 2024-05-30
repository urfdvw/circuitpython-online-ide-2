from matcher import BracketMatcher, TargetMatcher, MatcherProcessor

# target matcher test start
print("INFO", "test started")
test_target_matcher = TargetMatcher("@#$")

texts = ["", "12345", "12@#$345", "12345@#", "$12345", "12@#$@#$345", "12345@#$"]

for text in texts:
    parts = test_target_matcher.push(text)
    print("DEBUG", [text], parts, test_target_matcher.mood)

print("INFO", "test ended")
# target matcher test end

# BracketMatcher test start
print("INFO", "test started")

test_bracket_matcher = BracketMatcher("{{", "}}")

texts = ["", "123456", "12{{34}}56", "12{{34}}{{56}}", "12{{3456", "1234}}{{56}}78"]

for text in texts:
    parts = test_bracket_matcher.push(text)
    print("DEBUG", [text])
    print("DEBUG", parts)

print("INFO", "test ended")
# BracketMatcher test end

echo_matcher = TargetMatcher('print("Hello CircuitPython!")')
echo_processor = MatcherProcessor(echo_matcher)

fake_echo_matcher = BracketMatcher("{{{", "}}}")
fake_echo_processor = MatcherProcessor(fake_echo_matcher)

print(echo_processor.push(['print("Hello CircuitPy']))
print(echo_processor.branch)
print(echo_processor.push(['thon!")', "1234"]))
print(echo_processor.branch)

print(fake_echo_processor.push(['{{{print("Hello CircuitPy']))
print(fake_echo_processor.branch)
print(fake_echo_processor.push(['thon!")}}}', "1234"]))
print(fake_echo_processor.branch)


def enter_action(text, branch):
    print("enter:", text, branch)


def in_action(text, branch):
    print("in:", text, branch)


def exit_action(text, branch):
    print("exit:", text, branch)


def out_action(text, branch):
    print("out:", text, branch)


cv_processor = MatcherProcessor(
    BracketMatcher("<CV>", "</CV>"),
    enter_action=enter_action,
    in_action=in_action,
    exit_action=exit_action,
    out_action=out_action,
)

cv_processor.push(["out"])
cv_processor.push(["<CV>"])
cv_processor.push(["in"])
cv_processor.push(["</CV>"])
cv_processor.push(["<CV>in</CV>"])
cv_processor.push(["out"])
cv_processor.push(["<C"])
cv_processor.push(["V>in</CV>"])
cv_processor.push(["<CV>"])
cv_processor.push(["in"])
cv_processor.push(["in"])
cv_processor.push(["in"])
cv_processor.push(["in"])
cv_processor.push(["</CV>"])
cv_processor.push(["out"])
