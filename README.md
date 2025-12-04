🌿 PlantGuard – Plant Disease Detection Web App

PlantGuard is a full-stack machine learning web application that identifies plant diseases from images of leaves.
It uses a deep learning model (TensorFlow/Keras) served through a Flask backend, and a fast, modern React + Vite frontend.

🚀 Features

🌱 Upload leaf images for instant disease prediction

🤖 Trained deep learning model for classification

📡 REST API built with Flask

⚡ React + Vite frontend for fast UI

🧠 External ML model download (kept outside GitHub due to size)

🧪 Test script for API validation

📂 Project Structure
PlantGuard/
│
├── backend/
│   ├── app.py
│   ├── models/
│   │   └── model.h5   (Download separately)
│   ├── requirements.txt
│   └── ...
│
├── frontend_PlantGuard/
│   ├── src/
│   ├── public/
│   └── ...
│
├── test_api.py
├── README.md
└── .gitignore

🔥 Download the ML Model (Required)

GitHub does not allow files larger than 100MB, so the trained model is stored externally.

👉 Download model.h5 from Google Drive:

🔗 https://drive.google.com/drive/folders/1aYi8feY7Ow4r6brwSqxYsZ90RjbILwn8?usp=drive_link

After downloading, place the file here:

backend/models/model.h5


⚠️ The backend will NOT run unless the model exists in this exact directory.

🛠️ Backend Setup (Flask API — Conda Environment)

If you use a Conda environment (recommended):

1️⃣ Activate your Conda environment
conda activate plantenv


If you need to create it:

conda create -n plantenv python=3.10
conda activate plantenv

2️⃣ Install Python dependencies
pip install -r backend/requirements.txt

3️⃣ Run the backend

Use your Conda Python interpreter:

cd backend
& "G:\miniconda\envs\plantenv\python.exe" app.py


Flask server will start at:

http://127.0.0.1:5000

🎨 Frontend Setup (React + Vite)
cd frontend_PlantGuard
npm install
npm run dev


Frontend will start at:

http://localhost:5173

🔌 API Endpoint
POST /predict

Uploads an image and returns the predicted disease.

Request (form-data):

image: <file>


Example Response:

{
  "prediction": "Tomato Late Blight",
  "confidence": 0.94
}

🧪 Testing the API

Run the included test script:

python test_api.py

🧹 .gitignore Notes

The .gitignore file excludes:

model.h5

node_modules/

Conda/venv environments

__pycache__/

dist/, build/

logs

This makes the repository clean and prevents GitHub from rejecting large files.

👨‍💻 Author

Shivam Kumar