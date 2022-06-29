import sys
print('hee')
a = 0
b = 0

try:
  a = sys.argv[1]
  b = sys.argv[2]
except:
  print("DATA_MISSING")

sys.stdout.write("{}".format(int(a) + int(b)))