# backend/app.py
import os
import io
import json
from datetime import datetime
from typing import Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps
import numpy as np
import tensorflow as tf

# DB / Auth
from flask_sqlalchemy import SQLAlchemy
from passlib.hash import sha256_crypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
)

# --- App setup ---
app = Flask(__name__)

# -----------------------
# CORS configuration
# -----------------------
# Allow local dev frontends by default. You can override FRONTEND_ORIGINS env var
# as a comma-separated list (for example: "http://localhost:8080,http://localhost:3000").
_frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:8080,http://localhost:3000")
ORIGINS = [o.strip() for o in _frontend_origins.split(",") if o.strip()]
# Configure CORS headers to allow Authorization and Content-Type for preflight
app.config["CORS_HEADERS"] = "Content-Type,Authorization"
CORS(app, resources={r"/*": {"origins": ORIGINS}}, supports_credentials=True)

# Paths (assume model at backend/models/model.h5)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(BASE_DIR, "models", "model.h5"))
CLASS_NAMES_PATH = os.getenv(
    "CLASS_NAMES_PATH", os.path.join(BASE_DIR, "models", "class_names.json")
)
TREATMENTS_PATH = os.getenv("TREATMENTS_PATH", os.path.join(BASE_DIR, "data", "treatments.json"))

print("MODEL_PATH =", MODEL_PATH)
print("CLASS_NAMES_PATH =", CLASS_NAMES_PATH)
print("TREATMENTS_PATH =", TREATMENTS_PATH)

# Pillow resample compatibility
try:
    RESAMPLE = Image.Resampling.LANCZOS  # Pillow >= 9.1
except Exception:
    if hasattr(Image, "LANCZOS"):
        RESAMPLE = Image.LANCZOS
    elif hasattr(Image, "ANTIALIAS"):
        RESAMPLE = Image.ANTIALIAS
    else:
        RESAMPLE = Image.BICUBIC

# ---------------------------
# Database & JWT config
# ---------------------------
# Ensure data folder exists
os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "data", "plantguard.db"))
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# JWT secret (change for production via env var)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")

# Initialize DB & JWT
db = SQLAlchemy(app)
jwt = JWTManager(app)


# ---------------------------
# Models
# ---------------------------
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)

    # profile fields (optional)
    name = db.Column(db.String(150), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    bio = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "location": self.location,
            "bio": self.bio,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PredictionHistory(db.Model):
    __tablename__ = "prediction_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    label = db.Column(db.String(200))
    confidence = db.Column(db.Float)
    treatment = db.Column(db.Text)
    extra_metadata = db.Column(db.Text)

    def to_dict(self):
        # Parse treatment if stored as JSON string, else return as-is
        treatment_val = None
        if self.treatment:
            try:
                treatment_val = json.loads(self.treatment)
            except Exception:
                treatment_val = self.treatment

        metadata_val = None
        if self.extra_metadata:
            try:
                metadata_val = json.loads(self.extra_metadata)
            except Exception:
                metadata_val = self.extra_metadata

        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "label": self.label,
            "confidence": self.confidence,
            "treatment": treatment_val,
            "metadata": metadata_val,
        }


# Create tables
with app.app_context():
    db.create_all()
    print("Database initialized at:", DATABASE_PATH)


# ---------------------------
# Model loading
# ---------------------------
model: Optional[tf.keras.Model] = None
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print("Failed to load model:", e)
    model = None

# Load class names and treatments
if os.path.exists(CLASS_NAMES_PATH):
    try:
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            class_names = json.load(f)
        print("Loaded class names, count =", len(class_names))
    except Exception as e:
        print("Failed to load class_names.json:", e)
        class_names = None
else:
    class_names = None
    print("No class_names.json found. Predictions will return class_index.")

if os.path.exists(TREATMENTS_PATH):
    try:
        with open(TREATMENTS_PATH, "r", encoding="utf-8") as f:
            treatments = json.load(f)
        print("Loaded treatments mapping, count =", len(treatments))
    except Exception as e:
        print("Failed to load treatments.json:", e)
        treatments = {}
else:
    treatments = {}
    print("No treatments.json found. You can add one at", TREATMENTS_PATH)


# determine target size
def get_target_size():
    try:
        if model is None:
            raise RuntimeError("model not loaded")
        shape = model.input_shape
        if isinstance(shape, (list, tuple)) and len(shape) > 0 and isinstance(shape[0], (list, tuple)):
            shape = shape[0]
        if isinstance(shape, (list, tuple)) and len(shape) >= 3:
            h, w = int(shape[1]), int(shape[2])
            return (h, w)
    except Exception:
        pass
    return (224, 224)


TARGET_SIZE = get_target_size()
print("Using target size:", TARGET_SIZE)


def preprocess_image(img_pil, target_size=TARGET_SIZE):
    img = img_pil.convert("RGB")
    img = ImageOps.fit(img, target_size, RESAMPLE)
    arr = np.array(img).astype("float32")

    # Try ImageNet preprocessing
    try:
        from tensorflow.keras.applications.imagenet_utils import preprocess_input
        arr = preprocess_input(arr)
    except Exception:
        arr = arr / 255.0

    arr = np.expand_dims(arr, 0)
    return arr


# ---------------------------
# Helper: get uid from JWT and convert to int if possible
# ---------------------------
def get_current_user_id():
    """
    Read identity from JWT and try to convert to int.
    Returns int user_id or None.
    """
    raw = get_jwt_identity()
    if raw is None:
        return None
    try:
        return int(raw)
    except Exception:
        # if it's a string not representing int, return raw as-is (fallback)
        return raw


# ---------------------------
# Auth endpoints
# ---------------------------
@app.route("/auth/signup", methods=["POST"])
def signup():
    payload = request.get_json(force=True) or {}
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "User already exists"}), 400

    pw_hash = sha256_crypt.hash(password)
    user = User(email=email, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()

    # create token with string subject
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": user.to_dict(), "access_token": access_token}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(force=True) or {}
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    try:
        ok = sha256_crypt.verify(password, user.password_hash)
    except Exception:
        ok = False

    if not ok:
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": user.to_dict(), "access_token": access_token}), 200


# ---------------------------
# Profile endpoints
# ---------------------------
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@app.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(force=True) or {}
    for k in ("name", "location", "bio"):
        if k in data:
            setattr(user, k, data[k])
    db.session.commit()
    return jsonify({"success": True, "user": user.to_dict()}), 200


# ---------------------------
# History endpoints
# ---------------------------
@app.route("/history", methods=["POST"])
@jwt_required()
def save_history():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(force=True) or {}
    label = data.get("label")
    confidence = data.get("confidence")
    treatment = data.get("treatment")
    metadata = data.get("metadata")

    entry = PredictionHistory(
        user_id=user_id,
        label=label,
        confidence=float(confidence) if confidence is not None else None,
        treatment=json.dumps(treatment) if treatment is not None else None,
        extra_metadata=json.dumps(metadata) if metadata is not None else None,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"success": True, "entry": entry.to_dict()}), 201


@app.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Unauthorized"}), 401

    rows = (
        PredictionHistory.query.filter_by(user_id=user_id)
        .order_by(PredictionHistory.created_at.desc())
        .limit(500)
        .all()
    )
    # return a plain list (frontend HistoryPage expects an array)
    return jsonify([r.to_dict() for r in rows]), 200


# ---------------------------
# Prediction endpoint
# ---------------------------
@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "PlantGuard backend running"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    # handle model not loaded
    if model is None:
        return jsonify({"error": "Model not loaded on server."}), 500

    if "image" not in request.files:
        return jsonify({"error": "No image file sent. Use form field 'image'."}), 400

    f = request.files["image"]
    try:
        img = Image.open(io.BytesIO(f.read()))
    except Exception as e:
        return jsonify({"error": "Cannot open image: " + str(e)}), 400

    x = preprocess_image(img)
    try:
        preds = model.predict(x)
    except Exception as e:
        return jsonify({"error": "Model prediction failed: " + str(e)}), 500

    # normalize preds ---> probs
    if preds.ndim == 2 and preds.shape[0] == 1:
        preds = preds[0]
    try:
        probs = tf.nn.softmax(preds).numpy()
    except Exception:
        probs = np.array(preds, dtype=float)
        s = probs.sum()
        if s != 0:
            probs = probs / s

    top_idx = int(np.argmax(probs))
    confidence = float(probs[top_idx])

    if class_names:
        label = class_names[top_idx] if top_idx < len(class_names) else str(top_idx)
    else:
        label = str(top_idx)

    treatment = treatments.get(label, None)

    response = {
        "label": label,
        "class_index": top_idx,
        "confidence": float(confidence),
        "treatment": treatment,
    }

    # TRY saving to history if JWT provided (optional)
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_current_user_id()
        if user_id:
            entry = PredictionHistory(
                user_id=user_id,
                label=label,
                confidence=confidence,
                treatment=json.dumps(treatment) if treatment is not None else None,
                extra_metadata=json.dumps({"source": "predict_endpoint"})
            )
            db.session.add(entry)
            db.session.commit()
            response["saved_history_id"] = entry.id
    except Exception:
        # no valid token provided or error reading it — skip saving
        pass

    return jsonify(response), 200


# ---------------------------
# Run
# ---------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    # debug=False for development to avoid interactive console
    app.run(host="0.0.0.0", port=port, debug=False)
