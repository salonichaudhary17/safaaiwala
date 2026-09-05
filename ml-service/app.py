from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest

app = FastAPI()

# Training data & model setup
training_data = np.array([
    [10, 1200], [25, 3500], [5, 600], [50, 6000],
    [2, 250], [100, 12000], [15, 1800], [30, 3600],
    [8, 960], [40, 4800]
])

model = IsolationForest(contamination=0.2, random_state=42)
model.fit(training_data)

# Define the expected JSON structure from Node.js
class TransactionInput(BaseModel):
    weight: float
    value: float

@app.post("/check-transaction")
def evaluate_transaction(data: TransactionInput):
    input_data = np.array([[data.weight, data.value]])
    prediction = model.predict(input_data)
    
    if prediction[0] == -1:
        return {
            "status": "Suspicious", 
            "message": "Weight-to-value ratio is unusual. Manual review recommended."
        }
    else:
        return {
            "status": "Normal", 
            "message": "Transaction parameters are within expected market bounds."
        }