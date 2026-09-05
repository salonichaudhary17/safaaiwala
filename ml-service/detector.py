import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# Expanded training data representing baseline e-waste market ratios
# Format: [weight_kg, estimated_value_in_inr]
training_data = np.array([
    [10, 1200],    
    [25, 3500],    
    [5, 600],      
    [50, 6000],    
    [2, 250],      
    [100, 12000],
    [15, 1800],
    [30, 3600],
    [8, 960],
    [40, 4800]
])

# Train model with a higher sensitivity to outliers
model = IsolationForest(contamination=0.2, random_state=42)
model.fit(training_data)

def check_transaction(weight, value):
    input_data = np.array([[weight, value]])
    prediction = model.predict(input_data)
    
    if prediction[0] == -1:
        return {"status": "Suspicious", "message": "Weight-to-value ratio is unusual. Manual review recommended."}
    else:
        return {"status": "Normal", "message": "Transaction parameters are within expected market bounds."}

if __name__ == "__main__":
    print("Test 1 (Normal):", check_native := check_transaction(15, 1800))
    print("Test 2 (Anomaly):", check_transaction(2, 500000))