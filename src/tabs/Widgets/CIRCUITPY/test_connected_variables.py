import time
from connected_variables import ConnectedVariables

cv = ConnectedVariables()
cv.define("a", 1)
cv.define("b", 1.0)
cv.define("c", [255, 255, 100])
cv.define("d", "Hello")
cv.write("a", 10)
cv.write(["a", "b"], [100, 0.1])
print(cv.read("a"))
print(cv.read(["a", "b"]))

while True:
    cv.heart_beat()
    cv.write("a", cv.read("a") + 1)
    print(cv.read(["a", "b"]))
    time.sleep(1)
