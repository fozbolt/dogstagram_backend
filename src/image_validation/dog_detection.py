import sys
import dlib, cv2, os
import fileinput
import base64
from imutils import face_utils
import numpy as np
#import matplotlib.pyplot as plt


base64_img = input()

#save to file and generate base64 image online for test
# file1 = open('text.txt', 'w')
# file1.write(base64_img)

#base64 to cv
def base64_cv2(base64_str):
  header, data = base64_str.split(',', 1)
  imgString = base64.b64decode(data)
  nparr = np.frombuffer(imgString,np.uint8) 
  image = cv2.imdecode(nparr,cv2.IMREAD_UNCHANGED)
  image = cv2.resize(image, (100,100)) #ako zelimo mijenjati brzinu obrade samo mijenjati velicinu slike (paziti na omjer kvalitete obade i brzine)
  return image



img = None
try:
    img = base64_cv2(base64_img)

except: print('error while converting base64 string to opencv img')

img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

detector = dlib.cnn_face_detection_model_v1('dogHeadDetector.dat')
predictor = dlib.shape_predictor('landmarkDetector.dat')


dets = detector(img, upsample_num_times=1)
#print(dets)
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
#img_result = img.copy()


shapes = []

for i, d in enumerate(dets):
    shape = predictor(img, d.rect)
    shape = face_utils.shape_to_np(shape)
    
    for i, p in enumerate(shape):
        shapes.append(shape)
        #cim je nadena jedna faca odnosno 6 shapeova prekini?
        if len(shapes) >5:
            break
        # cv2.circle(img_result, center=tuple(p), radius=3, color=(0,0,255), thickness=-1, lineType=cv2.LINE_AA)
        # cv2.putText(img_result, str(i), tuple(p), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1, cv2.LINE_AA)



if len(shapes) > 0: print(True)
else: print(False)




#complete detection code: https://colab.research.google.com/drive/12UAyJpCs49cSzcSkDYalsdCclM9OooFn#scrollTo=lcqr-l2KL_8Q