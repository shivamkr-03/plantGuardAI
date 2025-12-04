import requests

img_path = r"C:\Users\Shivam Kumar\OneDrive\Desktop\test_apple_black_rot.jpg"

files = {"image": open(img_path, "rb")}
resp = requests.post("http://localhost:5000/predict", files=files, timeout=60)

print("status:", resp.status_code)
print("---- response text (raw) ----")
print(resp.text)
